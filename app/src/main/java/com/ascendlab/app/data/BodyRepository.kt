package com.ascendlab.app.data

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow

/** One weigh-in, in kg. */
data class WeightEntry(val dayKey: String, val kg: Double, val at: Long)

/**
 * Body weight log at `users/{uid}/weights/{dayKey}`: one entry per day, the latest wins.
 * Logging a weight also updates the profile, so calorie and protein targets follow.
 */
object BodyRepository {
    private val db get() = FirebaseFirestore.getInstance()
    private val uid get() = FirebaseAuth.getInstance().currentUser?.uid

    fun weights(): Flow<List<WeightEntry>> = callbackFlow {
        val id = uid ?: run { trySend(emptyList()); close(); return@callbackFlow }
        val reg = db.collection("users").document(id).collection("weights")
            .orderBy("at", Query.Direction.DESCENDING).limit(60)
            .addSnapshotListener { snap, _ ->
                snap ?: return@addSnapshotListener
                trySend(
                    snap.documents.mapNotNull { d ->
                        val kg = d.getDouble("kg") ?: return@mapNotNull null
                        WeightEntry(d.id, kg, d.getLong("at") ?: 0L)
                    }.sortedBy { it.at },
                )
            }
        awaitClose { reg.remove() }
    }

    suspend fun log(kg: Double) {
        val id = uid ?: return
        val day = Days.key()
        db.collection("users").document(id).collection("weights").document(day)
            .set(mapOf("kg" to kg, "at" to System.currentTimeMillis()))
        StatsRepository.setWeight(day, kg)
        ProfileRepository.profile.value?.let { ProfileRepository.save(it.copy(weightKg = kg)) }
    }
}
