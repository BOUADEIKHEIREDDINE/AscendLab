package com.ascendlab.app.data

import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import kotlin.math.roundToInt

/** An exercise inside a routine, with how many sets and reps to aim for. */
data class RoutineExercise(
    val exerciseId: String,
    val name: String,
    val sets: Int = 3,
    val reps: Int = 10,
) {
    fun toMap() = mapOf("exerciseId" to exerciseId, "name" to name, "sets" to sets, "reps" to reps)

    companion object {
        fun fromMap(m: Map<*, *>) = RoutineExercise(
            exerciseId = m["exerciseId"] as? String ?: "",
            name = m["name"] as? String ?: "Exercise",
            sets = (m["sets"] as? Number)?.toInt() ?: 3,
            reps = (m["reps"] as? Number)?.toInt() ?: 10,
        )
    }
}

/** A saved session you can start again and again (Hevy calls these routines). */
data class Routine(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val exercises: List<RoutineExercise>,
) {
    fun toMap() = mapOf("id" to id, "name" to name, "exercises" to exercises.map { it.toMap() })

    companion object {
        fun fromMap(m: Map<*, *>) = Routine(
            id = m["id"] as? String ?: UUID.randomUUID().toString(),
            name = m["name"] as? String ?: "Routine",
            exercises = (m["exercises"] as? List<*>)?.mapNotNull { (it as? Map<*, *>)?.let(RoutineExercise::fromMap) } ?: emptyList(),
        )
    }
}

/** A group of routines, e.g. "Push / Pull / Legs". One program is active at a time. */
data class Program(
    val id: String,
    val name: String,
    val routines: List<Routine>,
    val createdAt: Long,
)

// ---------- Live workout ----------

/** Hevy-style set types. Warm-ups never count toward records. */
enum class SetType(val short: String, val label: String) {
    NORMAL("", "Normal set"),
    WARMUP("W", "Warm-up set"),
    FAILURE("F", "Failure set"),
    DROP("D", "Drop set"),
}

/** One set while training. Weight and reps are kept as typed, in the person's units. */
data class SetEntry(
    val weight: String = "",
    val reps: String = "",
    val done: Boolean = false,
    val type: SetType = SetType.NORMAL,
)

data class ActiveExercise(
    val exerciseId: String,
    val name: String,
    val sets: List<SetEntry>,
    val targetReps: Int? = null,
)

data class ActiveWorkout(
    val title: String,
    val routineId: String?,
    val startedAt: Long,
    val exercises: List<ActiveExercise>,
    /** When the current rest countdown ends (epoch ms), or null when not resting. */
    val restEndsAt: Long? = null,
    val restSeconds: Int = 90,
) {
    val doneSets get() = exercises.sumOf { e -> e.sets.count { it.done } }

    fun toJson(): String = JSONObject().apply {
        put("title", title); put("routineId", routineId ?: JSONObject.NULL); put("startedAt", startedAt)
        put("restEndsAt", restEndsAt ?: JSONObject.NULL); put("restSeconds", restSeconds)
        put("exercises", JSONArray().apply {
            exercises.forEach { e ->
                put(JSONObject().apply {
                    put("exerciseId", e.exerciseId); put("name", e.name); put("targetReps", e.targetReps ?: JSONObject.NULL)
                    put("sets", JSONArray().apply {
                        e.sets.forEach { s -> put(JSONObject().apply { put("w", s.weight); put("r", s.reps); put("d", s.done); put("t", s.type.name) }) }
                    })
                })
            }
        })
    }.toString()

    companion object {
        fun fromJson(json: String): ActiveWorkout? = runCatching {
            val o = JSONObject(json)
            val ex = o.getJSONArray("exercises")
            ActiveWorkout(
                title = o.getString("title"),
                routineId = o.optString("routineId").takeIf { !o.isNull("routineId") },
                startedAt = o.getLong("startedAt"),
                restEndsAt = if (o.isNull("restEndsAt")) null else o.getLong("restEndsAt"),
                restSeconds = o.optInt("restSeconds", 90),
                exercises = (0 until ex.length()).map { i ->
                    val e = ex.getJSONObject(i)
                    val sets = e.getJSONArray("sets")
                    ActiveExercise(
                        exerciseId = e.getString("exerciseId"),
                        name = e.getString("name"),
                        targetReps = if (e.isNull("targetReps")) null else e.getInt("targetReps"),
                        sets = (0 until sets.length()).map { j ->
                            val s = sets.getJSONObject(j)
                            SetEntry(
                                s.optString("w"), s.optString("r"), s.optBoolean("d"),
                                SetType.entries.firstOrNull { it.name == s.optString("t") } ?: SetType.NORMAL,
                            )
                        },
                    )
                },
            )
        }.getOrNull()
    }
}

// ---------- Finished workouts ----------

/** A completed set, always stored in kg. */
data class LoggedSet(val weightKg: Double, val reps: Int, val type: SetType = SetType.NORMAL) {
    val volume get() = weightKg * reps
    /** Estimated one-rep max (Epley). A single rep is its own max. */
    val oneRepMax get() = if (reps <= 1) weightKg else weightKg * (1 + reps / 30.0)
    val countsForRecords get() = type != SetType.WARMUP && reps > 0
}

data class LoggedExercise(val exerciseId: String, val name: String, val sets: List<LoggedSet>)

/** A finished workout as stored in history. */
data class WorkoutRecord(
    val id: String,
    val title: String,
    val startedAt: Long,
    val finishedAt: Long,
    val durationSec: Int,
    val volumeKg: Double,
    val records: Int,
    val exercises: List<LoggedExercise>,
) {
    val setCount get() = exercises.sumOf { it.sets.size }
}

/** Personal bests for one exercise, computed from history. */
data class ExerciseRecords(
    val heaviestKg: Double = 0.0,
    val best1RmKg: Double = 0.0,
    val bestSetVolumeKg: Double = 0.0,
    val bestSessionVolumeKg: Double = 0.0,
    val mostReps: Int = 0,
    /** Heaviest weight lifted for each rep count (1..15). */
    val byReps: Map<Int, Double> = emptyMap(),
) {
    companion object {
        fun from(sessions: List<List<LoggedSet>>): ExerciseRecords {
            val sets = sessions.flatten().filter { it.countsForRecords }
            if (sets.isEmpty()) return ExerciseRecords()
            val byReps = mutableMapOf<Int, Double>()
            sets.filter { it.reps in 1..15 }.forEach { s -> byReps[s.reps] = maxOf(byReps[s.reps] ?: 0.0, s.weightKg) }
            return ExerciseRecords(
                heaviestKg = sets.maxOf { it.weightKg },
                best1RmKg = sets.maxOf { it.oneRepMax },
                bestSetVolumeKg = sets.maxOf { it.volume },
                bestSessionVolumeKg = sessions.maxOf { s -> s.filter { it.countsForRecords }.sumOf { it.volume } },
                mostReps = sets.maxOf { it.reps },
                byReps = byReps,
            )
        }
    }

    /** Which records [set] would beat, as short labels (empty when none). */
    fun beatenBy(set: LoggedSet): List<String> {
        if (!set.countsForRecords) return emptyList()
        return buildList {
            if (set.weightKg > 0 && set.weightKg > heaviestKg) add("Heaviest weight")
            if (set.weightKg > 0 && set.oneRepMax > best1RmKg + 0.01) add("Best 1RM")
            if (set.weightKg > 0 && set.volume > bestSetVolumeKg + 0.01) add("Best set volume")
            if (set.weightKg <= 0 && set.reps > mostReps) add("Most reps")
        }
    }
}

/** What the feed shows about a finished workout. */
data class WorkoutInfo(
    val title: String,
    val durationSec: Int,
    val volumeKg: Int,
    val sets: Int,
    /** Per exercise: name, number of sets and the best set, already formatted. */
    val exercises: List<WorkoutLine>,
    /** Personal records set in this workout. */
    val records: Int = 0,
)

data class WorkoutLine(val name: String, val sets: Int, val best: String)

object WorkoutMath {
    fun volumeKg(exercises: List<LoggedExercise>): Double =
        exercises.sumOf { e -> e.sets.sumOf { it.weightKg * it.reps } }

    fun formatKg(kg: Double, units: Units): String = formatWeight(kg, units)

    /** Heaviest set (ties broken by reps), e.g. "80 kg × 8" or "12 reps" for bodyweight. */
    fun bestSet(sets: List<LoggedSet>, units: Units): String {
        val best = sets.maxWithOrNull(compareBy({ it.weightKg }, { it.reps })) ?: return ""
        return if (best.weightKg <= 0.0) "${best.reps} reps"
        else "${formatWeight(best.weightKg, units)} × ${best.reps}"
    }

    fun formatWeight(kg: Double, units: Units): String {
        val v = if (units == Units.IMPERIAL) Convert.kgToLb(kg) else kg
        val text = if (v % 1.0 == 0.0) v.toInt().toString() else ((v * 10).roundToInt() / 10.0).toString()
        return "$text ${units.weightUnit}"
    }

    fun formatDuration(sec: Int): String {
        val h = sec / 3600; val m = (sec % 3600) / 60
        return when {
            h > 0 -> "${h}h ${m}min"
            m > 0 -> "${m}min"
            else -> "${sec}s"
        }
    }

    fun formatVolume(kg: Double, units: Units): String {
        val v = if (units == Units.IMPERIAL) Convert.kgToLb(kg) else kg
        return "${java.text.NumberFormat.getIntegerInstance().format(v.roundToInt())} ${units.weightUnit}"
    }
}
