package com.ascendlab.app.data

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await

/** One person's daily numbers, as their friends can see them. */
data class PersonStats(
    val uid: String,
    val name: String,
    /** dayKey -> calories eaten that day. */
    val kcal: Map<String, Int>,
    /** dayKey -> body weight in kg (empty when they don't share it). */
    val weights: Map<String, Double>,
    val sharesWeight: Boolean,
)

/**
 * `stats/{uid}`: calories per day and weigh-ins, readable by the owner and their friends
 * (see firestore.rules). It powers the "compare with friends" charts without anyone
 * reading another person's posts or private profile.
 */
object StatsRepository {
    private const val STATS = "stats"
    private val db get() = FirebaseFirestore.getInstance()
    private val uid get() = FirebaseAuth.getInstance().currentUser?.uid
    private fun doc(id: String) = db.collection(STATS).document(id)

    fun addCalories(dayKey: String, delta: Int) {
        val id = uid ?: return
        doc(id).set(mapOf("kcal" to mapOf(dayKey to FieldValue.increment(delta.toLong()))), SetOptions.merge())
    }

    /** Set once the shared numbers were rebuilt for the signed-in person (reset on sign-out). */
    var syncedThisSession = false

    /** Whether the signed-in person shares their weight; refreshed by [syncMine]. */
    var sharesWeight = true
        private set

    fun setWeight(dayKey: String, kg: Double) {
        val id = uid ?: return
        if (!sharesWeight) return
        // Merge writes deep-merge maps, so this only touches that one day.
        doc(id).set(mapOf("weights" to mapOf(dayKey to kg)), SetOptions.merge())
    }

    /** Turns weight sharing on (copies the weigh-ins in) or off (removes them from the shared doc). */
    suspend fun setShareWeight(share: Boolean) {
        val id = uid ?: return
        val weights = if (share) {
            db.collection("users").document(id).collection("weights").get().await().documents
                .mapNotNull { d -> d.getDouble("kg")?.let { d.id to it } }.toMap()
        } else emptyMap()
        sharesWeight = share
        doc(id).set(mapOf("shareWeight" to share), SetOptions.merge()).await()
        // A plain update on "weights" (not a deep merge) so turning sharing off really clears them.
        doc(id).update("weights", weights).await()
    }

    /**
     * Rebuilds the signed-in person's shared numbers from their own data, so the charts are
     * right even for meals logged before this existed. Cheap enough to run once per app start.
     */
    suspend fun syncMine() {
        val id = uid ?: return
        val me = runCatching { doc(id).get().await() }.getOrNull()
        val share = me?.getBoolean("shareWeight") ?: true
        sharesWeight = share
        val meals = runCatching {
            db.collection("posts").whereEqualTo("uid", id).limit(500).get().await().documents
        }.getOrNull() ?: return
        val kcal = meals.filter { it.getString("kind") == null }
            .groupBy { it.getString("dayKey").orEmpty() }
            .filterKeys { it.isNotEmpty() }
            .mapValues { (_, d) -> d.sumOf { it.getLong("calories") ?: 0L } }
        val weights = if (share) {
            runCatching { db.collection("users").document(id).collection("weights").get().await().documents }
                .getOrNull().orEmpty().mapNotNull { d -> d.getDouble("kg")?.let { d.id to it } }.toMap()
        } else emptyMap()
        // Deep merge: days found in posts and weigh-ins are rewritten, other days are kept.
        val fields = mutableMapOf<String, Any>("kcal" to kcal, "shareWeight" to share)
        if (share) fields["weights"] = weights
        doc(id).set(fields, SetOptions.merge()).await()
    }

    suspend fun deleteCurrent() {
        val id = uid ?: return
        runCatching { doc(id).delete().await() }
    }

    /** Stats for the signed-in person and the given friends (those that can be read). */
    suspend fun load(people: List<Pair<String, String>>): List<PersonStats> = people.mapNotNull { (id, name) ->
        val d = runCatching { doc(id).get().await() }.getOrNull() ?: return@mapNotNull null
        @Suppress("UNCHECKED_CAST")
        PersonStats(
            uid = id,
            name = name,
            kcal = (d.get("kcal") as? Map<String, Any?>).orEmpty().mapNotNull { (k, v) -> (v as? Number)?.toInt()?.let { k to it } }.toMap(),
            weights = (d.get("weights") as? Map<String, Any?>).orEmpty().mapNotNull { (k, v) -> (v as? Number)?.toDouble()?.let { k to it } }.toMap(),
            sharesWeight = d.getBoolean("shareWeight") ?: true,
        )
    }
}
