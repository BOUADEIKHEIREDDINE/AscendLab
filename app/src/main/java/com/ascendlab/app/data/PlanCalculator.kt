package com.ascendlab.app.data

import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/** Daily nutrition targets. */
data class NutritionTargets(
    val calories: Int,
    val proteinG: Int,
    val carbsG: Int,
    val fatG: Int,
    /** Calories the body burns at rest. */
    val bmr: Int,
    /** Calories burned on a normal day, activity included (the "maintenance" level). */
    val maintenance: Int,
)

/** One training day in the week. [dayIndex] runs 0 (Monday) to 6 (Sunday). */
data class PlannedDay(val dayIndex: Int, val title: String, val focus: String)

data class TrainingWeek(
    val splitName: String,
    val splitExplanation: String,
    val days: List<PlannedDay>,
    val setsAndReps: String,
    val minutesPerSession: Int,
)

/**
 * Turns a profile into a calorie target and a weekly training plan.
 * Pure functions: the same answers always give the same plan, so editing goals
 * simply runs this again.
 */
object PlanCalculator {

    fun nutrition(p: UserProfile): NutritionTargets {
        val weight = requireNotNull(p.weightKg)
        val height = requireNotNull(p.heightCm)
        val age = requireNotNull(p.age)

        // Mifflin-St Jeor equation, the most accurate common formula for resting calories.
        val sexOffset = if (p.sex == Sex.WOMAN) -161 else 5
        val bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset
        val maintenance = bmr * requireNotNull(p.activity).multiplier

        // A moderate 20% deficit or 10% surplus: steady progress without extreme dieting.
        val minimum = if (p.sex == Sex.WOMAN) 1200.0 else 1500.0
        val calories = when (requireNotNull(p.goal)) {
            Goal.LOSE_FAT -> max(maintenance * 0.80, minimum)
            Goal.BUILD_MUSCLE -> maintenance * 1.10
            Goal.GET_FIT -> maintenance
        }.roundTo(10)

        // Protein is set per kg of body weight. Above a BMI of 27 we use the weight at
        // BMI 27 instead, so the target stays sensible for larger bodies.
        val meters = height / 100
        val referenceWeight = min(weight, 27 * meters * meters)
        val proteinPerKg = when (p.goal) {
            Goal.LOSE_FAT -> 2.0
            Goal.BUILD_MUSCLE -> 1.8
            else -> 1.6
        }
        val protein = (referenceWeight * proteinPerKg).roundToInt()
        val fat = (calories * 0.25 / 9).roundToInt()
        val carbs = max(((calories - protein * 4 - fat * 9) / 4.0).roundToInt(), 50)

        return NutritionTargets(
            calories = calories,
            proteinG = protein,
            carbsG = carbs,
            fatG = fat,
            bmr = bmr.roundTo(10),
            maintenance = maintenance.roundTo(10),
        )
    }

    fun training(p: UserProfile): TrainingWeek {
        val days = requireNotNull(p.daysPerWeek).coerceIn(UserProfile.MIN_DAYS, UserProfile.MAX_DAYS)
        val home = p.place == TrainingPlace.HOME

        // Rest days are spread out so each muscle gets time to recover.
        val schedule = when (days) {
            2 -> listOf(0, 3)
            3 -> listOf(0, 2, 4)
            4 -> listOf(0, 1, 3, 4)
            5 -> listOf(0, 1, 2, 4, 5)
            else -> listOf(0, 1, 2, 3, 4, 5)
        }

        val fullBody = "Full body" to if (home) "Squats, push-ups, rows and core" else "Squat, bench press, row and core"
        val upper = "Upper body" to "Chest, back, shoulders and arms"
        val lower = "Lower body" to "Legs, glutes and core"
        val push = "Push" to "Chest, shoulders and triceps"
        val pull = "Pull" to "Back and biceps"
        val legs = "Legs" to "Thighs, glutes and calves"

        val (splitName, explanation, sessions) = when (days) {
            2, 3 -> Triple(
                "Full body",
                "Each session trains your whole body. It's the best start for beginners: " +
                    "every muscle gets worked several times a week.",
                List(days) { fullBody },
            )
            4 -> Triple(
                "Upper / Lower",
                "You alternate upper-body and lower-body days, so one half rests while the other trains.",
                listOf(upper, lower, upper, lower),
            )
            5 -> Triple(
                "Upper / Lower + Push / Pull / Legs",
                "Two half-body days, then three focused days. Every muscle is trained twice a week.",
                listOf(upper, lower, push, pull, legs),
            )
            else -> Triple(
                "Push / Pull / Legs",
                "Pushing muscles, pulling muscles, then legs, twice a week. Great once you have a routine.",
                listOf(push, pull, legs, push, pull, legs),
            )
        }

        val setsAndReps = when (p.goal) {
            Goal.BUILD_MUSCLE -> "3 to 4 sets of 8 to 12 reps, resting about 90 seconds"
            Goal.LOSE_FAT -> "3 sets of 12 to 15 reps, with short rests of about 45 seconds"
            else -> "2 to 3 sets of 10 to 15 reps, resting about 60 seconds"
        }

        return TrainingWeek(
            splitName = splitName,
            splitExplanation = explanation,
            days = schedule.zip(sessions) { day, (title, focus) -> PlannedDay(day, title, focus) },
            setsAndReps = setsAndReps,
            minutesPerSession = if (days <= 3) 50 else 45,
        )
    }

    /** A one-line tip shown under each days-per-week option. */
    fun daysAdvice(days: Int): String = when (days) {
        2 -> "A gentle start. Easy to fit into a busy week."
        3 -> "The sweet spot for beginners: real progress with plenty of rest."
        4 -> "A solid routine if you already move regularly."
        5 -> "Ambitious. Best if you've trained before."
        else -> "For experienced lifters. Rest and sleep matter a lot here."
    }

    private fun Double.roundTo(step: Int): Int = (this / step).roundToInt() * step
}
