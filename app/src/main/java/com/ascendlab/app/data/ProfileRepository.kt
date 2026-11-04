package com.ascendlab.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject

/**
 * Stores each person's profile in Firestore at `users/{uid}` (only they can read or
 * write it; see the Firestore rules). A copy is kept on the device so the app opens
 * instantly and keeps working offline; Firestore syncs any pending write once the
 * phone is back online.
 */
object ProfileRepository {
    private const val COLLECTION = "users"
    private const val NETWORK_TIMEOUT_MS = 6_000L

    private lateinit var prefs: SharedPreferences

    private val _profile = MutableStateFlow<UserProfile?>(null)

    /** The signed-in person's saved profile, or null before it is loaded or when signed out. */
    val profile: StateFlow<UserProfile?> = _profile

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences("profiles", Context.MODE_PRIVATE)
    }

    private val uid: String? get() = FirebaseAuth.getInstance().currentUser?.uid
    private fun doc(uid: String) = FirebaseFirestore.getInstance().collection(COLLECTION).document(uid)

    /** Profile saved on this device for the signed-in person, read without any network call. */
    fun cached(): UserProfile? {
        val id = uid ?: return null
        val json = prefs.getString(id, null) ?: return null
        return runCatching { UserProfile.fromMap(JSONObject(json).toMap()) }.getOrNull()
            ?.also { _profile.value = it }
    }

    /**
     * Loads the profile: the device copy if there is one, otherwise Firestore.
     * Returns null for someone who has never saved a profile (or when offline on a new phone).
     */
    suspend fun load(): UserProfile? {
        cached()?.let { return it }
        val id = uid ?: return null
        val snapshot = withTimeoutOrNull(NETWORK_TIMEOUT_MS) {
            runCatching { doc(id).get().await() }.getOrNull()
        }
        val data = snapshot?.data ?: return null
        return UserProfile.fromMap(data).also { remember(id, it) }
    }

    /**
     * Saves the profile. The device copy is updated at once; the Firestore write is
     * waited on for a few seconds at most, so a slow network never blocks the person.
     */
    suspend fun save(profile: UserProfile) {
        val id = uid ?: return
        remember(id, profile)
        withTimeoutOrNull(NETWORK_TIMEOUT_MS) {
            runCatching { doc(id).set(profile.toMap(), SetOptions.merge()).await() }
        }
    }

    /** Deletes the signed-in person's stored profile, on the server and on the device. */
    suspend fun deleteCurrent() {
        val id = uid ?: return
        doc(id).delete().await()
        forget(id)
    }

    /** Clears what is held in memory (called on log out; the device copy stays for next login). */
    fun clearSession() {
        _profile.value = null
    }

    private fun remember(id: String, profile: UserProfile) {
        prefs.edit().putString(id, JSONObject(profile.toMap()).toString()).apply()
        _profile.value = profile
    }

    private fun forget(id: String) {
        prefs.edit().remove(id).apply()
        _profile.value = null
    }

    private fun JSONObject.toMap(): Map<String, Any?> =
        keys().asSequence().associateWith { key -> opt(key).takeUnless { it == JSONObject.NULL } }
}
