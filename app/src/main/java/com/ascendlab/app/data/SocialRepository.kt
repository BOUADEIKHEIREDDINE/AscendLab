package com.ascendlab.app.data

import com.google.firebase.FirebaseNetworkException
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.util.Date

/** The feed as the screen sees it: posts, or why they couldn't be loaded. */
data class FeedState(
    val posts: List<FeedPost> = emptyList(),
    val loading: Boolean = true,
    val error: String? = null,
)

/**
 * Friends and the meal feed, in Firestore:
 *  - `publicProfiles/{uid}`: name, friend code and friend list (readable by signed-in users who know the uid).
 *  - `friendCodes/{code}`: points a friend code to its owner, so a code is all you need to add someone.
 *  - `posts/{id}`: one logged meal. [FeedPost] fields plus `audience`, the author and their friends at
 *    posting time; only people in the audience can read it (see firestore.rules).
 */
object SocialRepository {
    private const val PROFILES = "publicProfiles"
    private const val CODES = "friendCodes"
    private const val POSTS = "posts"
    const val MAX_FRIENDS = 30
    private const val FEED_DAYS = 7
    private const val RETRY_MS = 15_000L
    // No 0/O or 1/I, so codes read out loud or typed by hand don't get mixed up.
    private const val CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

    private val db get() = FirebaseFirestore.getInstance()
    val uid: String? get() = FirebaseAuth.getInstance().currentUser?.uid

    private val _me = MutableStateFlow<PublicProfile?>(null)
    val me: StateFlow<PublicProfile?> = _me

    /** Loads (or on first use creates) the signed-in person's public profile and friend code. */
    suspend fun ensureMe(): PublicProfile? {
        val id = uid ?: return null
        _me.value?.takeIf { it.uid == id }?.let { return it }
        val existing = db.collection(PROFILES).document(id).get().await()
        if (existing.exists()) return existing.toProfile().also { _me.value = it }

        val code = reserveCode(id)
        val profile = PublicProfile(id, defaultName(), code, emptyList())
        db.collection(PROFILES).document(id)
            .set(mapOf("name" to profile.name, "code" to code, "friends" to emptyList<String>())).await()
        _me.value = profile
        return profile
    }

    suspend fun rename(name: String) {
        val me = ensureMe() ?: return
        val clean = name.trim().take(30)
        if (clean.isEmpty()) return
        db.collection(PROFILES).document(me.uid).update("name", clean).await()
        _me.value = me.copy(name = clean)
    }

    /** Adds a friend from their code. Friendship goes both ways, in a single write. Returns an error or null. */
    suspend fun addFriend(rawCode: String): String? = friendly {
        val me = ensureMe() ?: return@friendly "You're not signed in."
        val code = rawCode.trim().uppercase().filter { it.isLetterOrDigit() }
        if (code.length != 6) return@friendly "A friend code has 6 characters."
        if (code == me.code) return@friendly "That's your own code. Share it with a friend instead."
        if (me.friends.size >= MAX_FRIENDS) return@friendly "You can have up to $MAX_FRIENDS friends."
        val friendUid = db.collection(CODES).document(code).get().await().getString("uid")
            ?: return@friendly "No one has this code. Check it and try again."
        if (friendUid in me.friends) return@friendly "You're already friends."

        db.batch()
            .update(db.collection(PROFILES).document(me.uid), "friends", FieldValue.arrayUnion(friendUid))
            .update(db.collection(PROFILES).document(friendUid), "friends", FieldValue.arrayUnion(me.uid))
            .commit().await()
        _me.value = me.copy(friends = me.friends + friendUid)
        null
    }

    suspend fun removeFriend(friendUid: String) {
        val me = ensureMe() ?: return
        db.batch()
            .update(db.collection(PROFILES).document(me.uid), "friends", FieldValue.arrayRemove(friendUid))
            .update(db.collection(PROFILES).document(friendUid), "friends", FieldValue.arrayRemove(me.uid))
            .commit().await()
        _me.value = me.copy(friends = me.friends - friendUid)
    }

    /** Re-reads the friend list, since friends can add or remove us from their side. */
    suspend fun refreshMe(): PublicProfile? {
        val id = uid ?: return null
        val snap = runCatching { db.collection(PROFILES).document(id).get().await() }.getOrNull()
        if (snap == null || !snap.exists()) return ensureMe()
        return snap.toProfile().also { _me.value = it }
    }

    suspend fun friendProfiles(): List<PublicProfile> {
        val me = refreshMe() ?: return emptyList()
        return me.friends.mapNotNull { id ->
            runCatching { db.collection(PROFILES).document(id).get().await() }.getOrNull()
                ?.takeIf { it.exists() }?.toProfile()
        }.sortedBy { it.name.lowercase() }
    }

    /** Live feed: the last week of meals from the signed-in person and their friends, newest first. */
    fun feed(): Flow<FeedState> = callbackFlow {
        val id = uid
        if (id == null) {
            trySend(FeedState(loading = false)); close(); return@callbackFlow
        }
        val since = Timestamp(Date(System.currentTimeMillis() - FEED_DAYS * 24L * 3600 * 1000))
        val query = db.collection(POSTS)
            .whereArrayContains("audience", id)
            .whereGreaterThanOrEqualTo("createdAt", since)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .limit(200)
        var registration: ListenerRegistration? = null
        var retry: Job? = null
        // A failed listener stops for good, so it is restarted after a pause (e.g. while
        // the server index is still building, or after a network hiccup).
        fun listen() {
            registration = query.addSnapshotListener { snap, e ->
                if (e != null) {
                    trySend(FeedState(loading = false, error = errorMessage(e)))
                    registration?.remove()
                    retry = launch { delay(RETRY_MS); listen() }
                } else if (snap != null) {
                    trySend(FeedState(snap.documents.mapNotNull { FeedPost.fromMap(it.id, it.data ?: return@mapNotNull null) }, loading = false))
                }
            }
        }
        listen()
        awaitClose { retry?.cancel(); registration?.remove() }
    }

    /**
     * Logs a meal and shares it with friends. The write goes to the local cache at once,
     * so the post appears instantly and syncs when the phone is online.
     */
    suspend fun logMeal(type: MealType, description: String, calories: Int, protein: Int, carbs: Int, fat: Int, photo: String?): String? = friendly {
        val me = refreshMe() ?: return@friendly "You're not signed in."
        val plan = ProfileRepository.profile.value?.takeIf { it.hasEverythingForPlan }
            ?.let { PlanCalculator.nutrition(it) }
        val doc = db.collection(POSTS).document()
        doc.set(
            mapOf(
                "uid" to me.uid,
                "authorName" to me.name,
                "audience" to listOf(me.uid) + me.friends,
                "dayKey" to Days.key(),
                "mealType" to type.name,
                "description" to description.trim(),
                "calories" to calories,
                "target" to (plan?.calories ?: 0),
                "protein" to protein,
                "proteinTarget" to (plan?.proteinG ?: 0),
                "carbs" to carbs,
                "fat" to fat,
                "photo" to photo,
                "likes" to emptyList<String>(),
                "createdAt" to Timestamp.now(),
            ),
        )
        // Not awaited: offline, the write is queued and the server confirms later.
        StatsRepository.addCalories(Days.key(), calories)
        null
    }

    /** Shares a finished workout with friends. */
    suspend fun publishWorkout(info: WorkoutInfo, caption: String): String? = friendly {
        val me = refreshMe() ?: return@friendly "You're not signed in."
        db.collection(POSTS).document().set(
            mapOf(
                "kind" to "workout",
                "uid" to me.uid,
                "authorName" to me.name,
                "audience" to listOf(me.uid) + me.friends,
                "dayKey" to Days.key(),
                "title" to info.title.take(60),
                "description" to caption.trim().take(300),
                "durationSec" to info.durationSec,
                "volumeKg" to info.volumeKg,
                "sets" to info.sets,
                "records" to info.records,
                "exercises" to info.exercises.take(40).map { mapOf("name" to it.name.take(60), "sets" to it.sets, "best" to it.best.take(30)) },
                "likes" to emptyList<String>(),
                "createdAt" to Timestamp.now(),
            ),
        )
        null
    }

    /** The signed-in person's posts, newest first (for the profile grid). */
    fun myPosts(limit: Long = 90): Flow<List<FeedPost>?> = callbackFlow {
        val id = uid ?: run { trySend(emptyList()); close(); return@callbackFlow }
        // Sorted on the phone: ordering in the query would need another server index.
        val reg = db.collection(POSTS).whereEqualTo("uid", id).limit(limit).addSnapshotListener { snap, _ ->
            snap ?: return@addSnapshotListener
            trySend(snap.documents.mapNotNull { FeedPost.fromMap(it.id, it.data ?: return@mapNotNull null) }.sortedByDescending { it.createdAt })
        }
        awaitClose { reg.remove() }
    }

    /** One post by id (live), for posts older than the feed's window. */
    fun post(postId: String): Flow<FeedPost?> = callbackFlow {
        val reg = db.collection(POSTS).document(postId).addSnapshotListener { snap, _ ->
            trySend(snap?.data?.let { FeedPost.fromMap(snap.id, it) })
        }
        awaitClose { reg.remove() }
    }

    // ---------- Comments ----------

    fun comments(postId: String): Flow<List<Comment>?> = callbackFlow {
        val reg = db.collection(POSTS).document(postId).collection("comments")
            .orderBy("createdAt").limit(300)
            .addSnapshotListener { snap, _ ->
                snap ?: return@addSnapshotListener
                trySend(snap.documents.mapNotNull { d ->
                    Comment(
                        id = d.id,
                        uid = d.getString("uid") ?: return@mapNotNull null,
                        authorName = d.getString("authorName") ?: "Someone",
                        text = d.getString("text").orEmpty(),
                        photo = d.getString("photo"),
                        createdAt = d.getTimestamp("createdAt")?.toDate() ?: Date(),
                    )
                })
            }
        awaitClose { reg.remove() }
    }

    /** Adds a comment and bumps the post's comment count in one write. Returns an error or null. */
    suspend fun addComment(post: FeedPost, text: String, photo: String?): String? = friendly {
        val me = ensureMe() ?: return@friendly "You're not signed in."
        val postRef = db.collection(POSTS).document(post.id)
        db.batch()
            .set(postRef.collection("comments").document(), mapOf(
                "uid" to me.uid,
                "authorName" to me.name,
                "text" to text.trim().take(500),
                "photo" to photo,
                "createdAt" to Timestamp.now(),
            ))
            .update(postRef, "commentCount", FieldValue.increment(1))
            .commit()
        null
    }

    fun deleteComment(post: FeedPost, comment: Comment) {
        val postRef = db.collection(POSTS).document(post.id)
        db.batch()
            .delete(postRef.collection("comments").document(comment.id))
            .update(postRef, "commentCount", FieldValue.increment(-1))
            .commit()
    }

    fun toggleLike(post: FeedPost) {
        val id = uid ?: return
        val change = if (id in post.likes) FieldValue.arrayRemove(id) else FieldValue.arrayUnion(id)
        db.collection(POSTS).document(post.id).update("likes", change)
    }

    fun deletePost(post: FeedPost) {
        db.collection(POSTS).document(post.id).delete()
        if (post.isMeal && post.uid == uid) StatsRepository.addCalories(post.dayKey, -post.calories)
    }

    /** Removes everything social about the signed-in person (used when deleting the account). */
    suspend fun deleteCurrent() {
        val id = uid ?: return
        val mine = db.collection(POSTS).whereEqualTo("uid", id).get().await()
        mine.documents.chunked(400).forEach { chunk ->
            db.batch().apply { chunk.forEach { delete(it.reference) } }.commit().await()
        }
        val profileDoc = db.collection(PROFILES).document(id).get().await()
        if (profileDoc.exists()) {
            val me = profileDoc.toProfile()
            me.friends.forEach { friend ->
                runCatching {
                    db.collection(PROFILES).document(friend).update("friends", FieldValue.arrayRemove(id)).await()
                }
            }
            runCatching { db.collection(CODES).document(me.code).delete().await() }
            profileDoc.reference.delete().await()
        }
        _me.value = null
    }

    fun clearSession() {
        _me.value = null
    }

    private suspend fun reserveCode(owner: String): String {
        repeat(10) {
            val code = (1..6).map { CODE_ALPHABET.random() }.joinToString("")
            val ref = db.collection(CODES).document(code)
            val taken = db.runTransaction { tx ->
                if (tx.get(ref).exists()) true else { tx.set(ref, mapOf("uid" to owner)); false }
            }.await()
            if (!taken) return code
        }
        error("Couldn't create a friend code. Please try again.")
    }

    private fun defaultName(): String {
        val user = FirebaseAuth.getInstance().currentUser
        user?.displayName?.takeIf { it.isNotBlank() }?.let { return it.trim().take(30) }
        val local = user?.email?.substringBefore('@').orEmpty()
            .replace(Regex("[._\\-0-9]+"), " ").trim()
        return local.split(' ').filter { it.isNotEmpty() }.joinToString(" ") { w -> w.replaceFirstChar { it.uppercase() } }
            .ifEmpty { "Ascender" }.take(30)
    }

    @Suppress("UNCHECKED_CAST")
    private fun com.google.firebase.firestore.DocumentSnapshot.toProfile() = PublicProfile(
        uid = id,
        name = getString("name") ?: "Someone",
        code = getString("code") ?: "",
        friends = (get("friends") as? List<String>) ?: emptyList(),
    )

    private inline fun friendly(block: () -> String?): String? = try {
        block()
    } catch (e: Exception) {
        errorMessage(e)
    }

    private fun errorMessage(e: Exception): String = when {
        e is FirebaseNetworkException -> "No internet connection. Check your network and try again."
        e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.UNAVAILABLE ->
            "No internet connection. Check your network and try again."
        e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.PERMISSION_DENIED ->
            "The server refused this. Make sure the app is up to date."
        e is FirebaseFirestoreException && e.code == FirebaseFirestoreException.Code.FAILED_PRECONDITION ->
            "The feed is still being set up on the server. Try again in a few minutes."
        else -> e.localizedMessage ?: "Something went wrong. Please try again."
    }
}
