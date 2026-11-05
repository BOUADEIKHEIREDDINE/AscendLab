package com.ascendlab.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.firebase.Timestamp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreException
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.MetadataChanges
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

/** The Train tab's state as screens see it. */
data class TrainState(
    val programs: List<Program> = emptyList(),
    val activeProgramId: String? = null,
    val loading: Boolean = true,
    val error: String? = null,
) {
    val activeProgram: Program? get() = programs.firstOrNull { it.id == activeProgramId } ?: programs.firstOrNull()
}

/**
 * Programs, routines and workout history, private to each person, under `users/{uid}/`:
 *  - `programs/{id}`: name and its routines (embedded, they're small).
 *  - `meta/train`: which program is active, and whether the starter program was made.
 *  - `workouts/{id}`: every finished workout, set by set (used for "Previous" values).
 * The workout in progress lives on the device only, so it survives the app being closed.
 */
object TrainRepository {
    private lateinit var prefs: SharedPreferences

    private val db get() = FirebaseFirestore.getInstance()
    private val uid get() = FirebaseAuth.getInstance().currentUser?.uid
    private fun userDoc(id: String) = db.collection("users").document(id)

    private val _active = MutableStateFlow<ActiveWorkout?>(null)
    /** The workout being trained right now, or null. */
    val active: StateFlow<ActiveWorkout?> = _active

    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences("workouts", Context.MODE_PRIVATE)
        restoreActive()
    }

    // ---------- Programs ----------

    /** Live programs plus the active one. Creates a starter program from the person's plan the first time. */
    fun state(): Flow<TrainState> = callbackFlow {
        val id = uid ?: run { trySend(TrainState(loading = false)); close(); return@callbackFlow }
        // The starter program is built from the profile, so it must be loaded first.
        if (ProfileRepository.profile.value == null) ProfileRepository.load()
        var programs: List<Program>? = null
        var activeId: String? = null
        var seeded: Boolean? = null
        fun emit() {
            val p = programs ?: return
            trySend(TrainState(p, activeId, loading = seeded == null))
        }

        val programsQuery = userDoc(id).collection("programs").orderBy("createdAt")
        val metaDoc = userDoc(id).collection("meta").document("train")
        var programsReg: ListenerRegistration? = null
        var metaReg: ListenerRegistration? = null
        var retry: Job? = null
        var restart: () -> Unit = {}
        var seedingStarted = false

        // A failed listener stops for good: show why, then try again after a pause.
        fun fail(e: Exception) {
            programsReg?.remove(); metaReg?.remove()
            trySend(TrainState(programs.orEmpty(), activeId, loading = false, error = trainError(e)))
            retry?.cancel()
            retry = launch { delay(15_000); restart() }
        }

        fun listen() {
            programsReg = programsQuery.addSnapshotListener { snap, e ->
                if (e != null) { fail(e); return@addSnapshotListener }
                snap ?: return@addSnapshotListener
                programs = snap.documents.map { d ->
                    Program(
                        id = d.id,
                        name = d.getString("name") ?: "Program",
                        routines = (d.get("routines") as? List<*>)?.mapNotNull { (it as? Map<*, *>)?.let(Routine::fromMap) } ?: emptyList(),
                        createdAt = d.getLong("createdAt") ?: 0L,
                    )
                }
                emit()
            }
            // Metadata changes are included so we hear when the server confirms "no settings yet":
            // without them, a cached "missing" followed by the same answer from the server sends no event.
            metaReg = metaDoc.addSnapshotListener(MetadataChanges.INCLUDE) { snap, e ->
                if (e != null) { fail(e); return@addSnapshotListener }
                snap ?: return@addSnapshotListener
                activeId = snap.getString("activeProgramId")
                val wasSeeded = snap.getBoolean("seeded") == true
                val confirmed = !snap.metadata.isFromCache
                // Only trust "not seeded" from the server, so an empty offline cache never creates duplicates.
                if (!wasSeeded && confirmed && !seedingStarted) {
                    seedingStarted = true
                    createStarterProgram(id)
                }
                if (wasSeeded || confirmed) seeded = true
                emit()
            }
        }
        restart = { listen() }
        listen()
        awaitClose { retry?.cancel(); programsReg?.remove(); metaReg?.remove() }
    }

    private fun trainError(e: Exception): String = when ((e as? FirebaseFirestoreException)?.code) {
        FirebaseFirestoreException.Code.PERMISSION_DENIED -> "The server refused to load your programs. It may still be updating; retrying shortly."
        FirebaseFirestoreException.Code.UNAVAILABLE -> "No internet connection. Your programs will load once you're back online."
        else -> "Couldn't load your programs. Retrying shortly."
    }

    private fun createStarterProgram(id: String) {
        val profile = ProfileRepository.profile.value?.takeIf { it.hasEverythingForPlan }
        val meta = userDoc(id).collection("meta").document("train")
        if (profile == null) {
            meta.set(mapOf("seeded" to true), SetOptions.merge())
            return
        }
        val week = PlanCalculator.training(profile)
        val home = profile.place == TrainingPlace.HOME
        val reps = when (profile.goal) { Goal.BUILD_MUSCLE -> 10; else -> 12 }
        val routines = week.days.map { it.title }.distinct().map { title ->
            Routine(
                name = title,
                exercises = ExerciseLibrary.starterExercises(title, home).mapNotNull(ExerciseLibrary::find)
                    .map { RoutineExercise(it.id, it.name, sets = 3, reps = reps) },
            )
        }
        val ref = userDoc(id).collection("programs").document()
        db.batch()
            .set(ref, programMap("My AscendLab plan", routines))
            .set(meta, mapOf("seeded" to true, "activeProgramId" to ref.id), SetOptions.merge())
            .commit()
    }

    private fun programMap(name: String, routines: List<Routine>, createdAt: Long = System.currentTimeMillis()) = mapOf(
        "name" to name,
        "routines" to routines.map { it.toMap() },
        "createdAt" to createdAt,
    )

    fun createProgram(name: String): String? {
        val id = uid ?: return null
        val ref = userDoc(id).collection("programs").document()
        ref.set(programMap(name.trim().ifEmpty { "New program" }, emptyList()))
        selectProgram(ref.id)
        return ref.id
    }

    fun renameProgram(programId: String, name: String) {
        val id = uid ?: return
        userDoc(id).collection("programs").document(programId).update("name", name.trim().ifEmpty { "Program" })
    }

    fun deleteProgram(programId: String) {
        val id = uid ?: return
        userDoc(id).collection("programs").document(programId).delete()
    }

    fun selectProgram(programId: String) {
        val id = uid ?: return
        userDoc(id).collection("meta").document("train").set(mapOf("activeProgramId" to programId), SetOptions.merge())
    }

    /** Adds or replaces [routine] inside [program]. */
    fun saveRoutine(program: Program, routine: Routine) {
        val id = uid ?: return
        val routines = if (program.routines.any { it.id == routine.id }) {
            program.routines.map { if (it.id == routine.id) routine else it }
        } else program.routines + routine
        userDoc(id).collection("programs").document(program.id).update("routines", routines.map { it.toMap() })
    }

    fun deleteRoutine(program: Program, routineId: String) {
        val id = uid ?: return
        userDoc(id).collection("programs").document(program.id)
            .update("routines", program.routines.filter { it.id != routineId }.map { it.toMap() })
    }

    // ---------- Live workout ----------

    /**
     * Starts a workout. When [previous] holds the last session of an exercise, its set layout
     * (warm-ups included) is repeated, so "Previous" lines up set by set, as in Hevy.
     */
    fun start(routine: Routine?, previous: Map<String, List<LoggedSet>> = emptyMap()) {
        _active.value = ActiveWorkout(
            title = routine?.name ?: "Workout",
            routineId = routine?.id,
            startedAt = System.currentTimeMillis(),
            exercises = routine?.exercises?.map { re ->
                val last = previous[re.exerciseId]
                val sets = if (last.isNullOrEmpty()) List(re.sets.coerceAtLeast(1)) { SetEntry() }
                else last.map { SetEntry(type = it.type) }
                ActiveExercise(re.exerciseId, re.name, sets, re.reps)
            } ?: emptyList(),
            restSeconds = restSecondsForGoal(),
        )
        persist()
    }

    fun update(transform: (ActiveWorkout) -> ActiveWorkout) {
        _active.value = _active.value?.let(transform)
        persist()
    }

    fun discard() {
        _active.value = null
        persist()
    }

    private fun restSecondsForGoal() = when (ProfileRepository.profile.value?.goal) {
        Goal.BUILD_MUSCLE -> 90
        Goal.LOSE_FAT -> 45
        else -> 60
    }

    private fun persist() {
        val key = uid ?: return
        prefs.edit().apply {
            val w = _active.value
            if (w == null) remove("active_$key") else putString("active_$key", w.toJson())
        }.apply()
    }

    /** Called at start-up and after signing in, so a workout in progress comes back. */
    fun restoreActive() {
        val key = uid
        _active.value = key?.let { prefs.getString("active_$it", null) }?.let(ActiveWorkout::fromJson)
    }

    /**
     * Saves the finished workout to history and, when [share] is on, posts it to the feed.
     * Sets that weren't ticked off are dropped. Returns an error message or null.
     */
    suspend fun finish(caption: String, share: Boolean): String? {
        val id = uid ?: return "You're not signed in."
        val w = _active.value ?: return null
        val units = ProfileRepository.profile.value?.units ?: Units.METRIC
        val logged = w.exercises.map { e ->
            LoggedExercise(
                e.exerciseId, e.name,
                e.sets.filter { it.done }.map { s ->
                    val typed = s.weight.replace(',', '.').toDoubleOrNull() ?: 0.0
                    val kg = if (units == Units.IMPERIAL) Convert.lbToKg(typed) else typed
                    LoggedSet(kg, s.reps.toIntOrNull() ?: 0, s.type)
                },
            )
        }.filter { it.sets.isNotEmpty() }
        if (logged.isEmpty()) return "Tick off at least one set before finishing."

        val records = countRecords(logged, recordsByExercise(loadHistory()))
        val durationSec = ((System.currentTimeMillis() - w.startedAt) / 1000).toInt().coerceIn(0, 86_400)
        val volume = WorkoutMath.volumeKg(logged)
        userDoc(id).collection("workouts").document().set(
            mapOf(
                "title" to w.title,
                "routineId" to w.routineId,
                "startedAt" to w.startedAt,
                "finishedAt" to System.currentTimeMillis(),
                "durationSec" to durationSec,
                "volumeKg" to volume,
                "records" to records,
                "exercises" to logged.map { e ->
                    mapOf("exerciseId" to e.exerciseId, "name" to e.name,
                        "sets" to e.sets.map { mapOf("weightKg" to it.weightKg, "reps" to it.reps, "type" to it.type.name) })
                },
            ),
        )
        if (share) {
            val info = WorkoutInfo(
                title = w.title,
                durationSec = durationSec,
                volumeKg = volume.toInt(),
                sets = logged.sumOf { it.sets.size },
                exercises = logged.map { WorkoutLine(it.name, it.sets.size, WorkoutMath.bestSet(it.sets, units)) },
                records = records,
            )
            SocialRepository.publishWorkout(info, caption)?.let { return it }
        }
        discard()
        return null
    }

    /** Counts sets that beat a personal record, updating records as it goes (so two PRs in a row count twice). */
    fun countRecords(logged: List<LoggedExercise>, before: Map<String, ExerciseRecords>): Int {
        var count = 0
        logged.forEach { e ->
            var rec = before[e.exerciseId] ?: ExerciseRecords()
            e.sets.forEach { set ->
                if (rec.beatenBy(set).isNotEmpty()) {
                    // The first time an exercise is logged sets the baseline, not a record.
                    if (e.exerciseId in before) count++
                    rec = ExerciseRecords(
                        heaviestKg = maxOf(rec.heaviestKg, set.weightKg),
                        best1RmKg = maxOf(rec.best1RmKg, set.oneRepMax),
                        bestSetVolumeKg = maxOf(rec.bestSetVolumeKg, set.volume),
                        bestSessionVolumeKg = rec.bestSessionVolumeKg,
                        mostReps = maxOf(rec.mostReps, set.reps),
                        byReps = rec.byReps,
                    )
                }
            }
        }
        return count
    }

    fun recordsByExercise(history: List<WorkoutRecord>): Map<String, ExerciseRecords> =
        history.flatMap { w -> w.exercises.map { it.exerciseId to it.sets } }
            .groupBy({ it.first }, { it.second })
            .mapValues { (_, sessions) -> ExerciseRecords.from(sessions) }

    private fun parseWorkout(d: com.google.firebase.firestore.DocumentSnapshot): WorkoutRecord = WorkoutRecord(
        id = d.id,
        title = d.getString("title") ?: "Workout",
        startedAt = d.getLong("startedAt") ?: 0L,
        finishedAt = d.getLong("finishedAt") ?: 0L,
        durationSec = d.getLong("durationSec")?.toInt() ?: 0,
        volumeKg = d.getDouble("volumeKg") ?: 0.0,
        records = d.getLong("records")?.toInt() ?: 0,
        exercises = (d.get("exercises") as? List<*>)?.mapNotNull { e ->
            val m = e as? Map<*, *> ?: return@mapNotNull null
            LoggedExercise(
                exerciseId = m["exerciseId"] as? String ?: return@mapNotNull null,
                name = m["name"] as? String ?: "Exercise",
                sets = (m["sets"] as? List<*>)?.mapNotNull { s ->
                    (s as? Map<*, *>)?.let {
                        LoggedSet(
                            (it["weightKg"] as? Number)?.toDouble() ?: 0.0,
                            (it["reps"] as? Number)?.toInt() ?: 0,
                            SetType.entries.firstOrNull { t -> t.name == it["type"] } ?: SetType.NORMAL,
                        )
                    }
                } ?: emptyList(),
            )
        } ?: emptyList(),
    )

    private fun workoutsQuery(id: String, limit: Long) =
        userDoc(id).collection("workouts").orderBy("finishedAt", Query.Direction.DESCENDING).limit(limit)

    /** Live workout history, newest first. Powers History, Statistics, records and exercise pages. */
    fun history(limit: Long = 300): Flow<List<WorkoutRecord>?> = callbackFlow {
        val id = uid ?: run { trySend(emptyList()); close(); return@callbackFlow }
        val reg = workoutsQuery(id, limit).addSnapshotListener { snap, _ ->
            snap ?: return@addSnapshotListener
            trySend(snap.documents.map(::parseWorkout))
        }
        awaitClose { reg.remove() }
    }

    suspend fun loadHistory(limit: Long = 300): List<WorkoutRecord> {
        val id = uid ?: return emptyList()
        return runCatching { workoutsQuery(id, limit).get().await().documents.map(::parseWorkout) }.getOrElse { emptyList() }
    }

    fun deleteWorkout(workoutId: String) {
        val id = uid ?: return
        userDoc(id).collection("workouts").document(workoutId).delete()
    }

    /** Last time each exercise was done: exerciseId -> its sets. Powers the "Previous" column. */
    suspend fun previousSets(): Map<String, List<LoggedSet>> {
        val result = mutableMapOf<String, List<LoggedSet>>()
        loadHistory(30).forEach { w -> w.exercises.forEach { e -> if (e.exerciseId !in result) result[e.exerciseId] = e.sets } }
        return result
    }

    /** When each recent workout finished (epoch ms), newest first. Powers Profile stats. */
    suspend fun workoutTimes(limit: Long = 200): List<Long> = loadHistory(limit).map { it.finishedAt }

    /** Deletes programs, history and settings (used when deleting the account). */
    suspend fun deleteCurrent() {
        val id = uid ?: return
        listOf("programs", "workouts", "meta", "weights").forEach { name ->
            val docs = userDoc(id).collection(name).get().await().documents
            docs.chunked(400).forEach { chunk ->
                db.batch().apply { chunk.forEach { delete(it.reference) } }.commit().await()
            }
        }
        prefs.edit().remove("active_$id").apply()
        _active.value = null
    }

    fun clearSession() {
        _active.value = null
    }
}
