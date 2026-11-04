package com.ascendlab.app.data

/** Which version of the app the person picked. Also drives the calorie formula. */
enum class Sex(val label: String) {
    MAN("Man"),
    WOMAN("Woman"),
}

/**
 * How active someone is outside of planned workouts. [multiplier] scales resting
 * calories (BMR) into daily calories, using the standard activity factors.
 */
enum class ActivityLevel(
    val label: String,
    val description: String,
    val example: String,
    val multiplier: Double,
) {
    SEDENTARY("Mostly sitting", "Little movement during the day", "Office job, car commute", 1.2),
    LIGHT("Lightly active", "On your feet now and then", "Short walks, some stairs", 1.375),
    MODERATE("Active", "Moving for a good part of the day", "Teacher, waiter, daily long walks", 1.55),
    VERY("Very active", "Physical work or lots of movement", "Construction, delivery by bike", 1.725),
}

enum class Goal(val label: String, val description: String) {
    LOSE_FAT("Lose fat", "Slim down steadily while keeping your strength"),
    BUILD_MUSCLE("Build muscle", "Get stronger and add lean muscle"),
    GET_FIT("Get fit", "Feel better, move better, build a routine"),
}

enum class TrainingPlace(val label: String, val description: String) {
    GYM("At the gym", "Machines, barbells and dumbbells"),
    HOME("At home", "Your body weight and simple equipment"),
}

enum class Units(val label: String, val weightUnit: String, val heightUnit: String) {
    METRIC("Metric", "kg", "cm"),
    IMPERIAL("Imperial", "lb", "ft / in"),
}

/**
 * Everything onboarding collects. Body data is always stored in metric
 * (cm, kg); [units] only changes how it is shown and typed.
 */
data class UserProfile(
    val sex: Sex? = null,
    val age: Int? = null,
    val heightCm: Double? = null,
    val weightKg: Double? = null,
    val activity: ActivityLevel? = null,
    val goal: Goal? = null,
    val daysPerWeek: Int? = null,
    val place: TrainingPlace? = null,
    val units: Units = Units.METRIC,
    val onboardingComplete: Boolean = false,
) {
    /** True once every answer needed to build a plan is present. */
    val hasEverythingForPlan: Boolean
        get() = sex != null && age != null && heightCm != null && weightKg != null &&
            activity != null && goal != null && daysPerWeek != null && place != null

    fun toMap(): Map<String, Any?> = mapOf(
        "sex" to sex?.name,
        "age" to age,
        "heightCm" to heightCm,
        "weightKg" to weightKg,
        "activity" to activity?.name,
        "goal" to goal?.name,
        "daysPerWeek" to daysPerWeek,
        "place" to place?.name,
        "units" to units.name,
        "onboardingComplete" to onboardingComplete,
    )

    companion object {
        const val MIN_DAYS = 2
        const val MAX_DAYS = 6

        /** Reads a stored profile; unknown or missing values come back as null instead of crashing. */
        fun fromMap(map: Map<String, Any?>): UserProfile = UserProfile(
            sex = enumOrNull<Sex>(map["sex"]),
            age = (map["age"] as? Number)?.toInt(),
            heightCm = (map["heightCm"] as? Number)?.toDouble(),
            weightKg = (map["weightKg"] as? Number)?.toDouble(),
            activity = enumOrNull<ActivityLevel>(map["activity"]),
            goal = enumOrNull<Goal>(map["goal"]),
            daysPerWeek = (map["daysPerWeek"] as? Number)?.toInt(),
            place = enumOrNull<TrainingPlace>(map["place"]),
            units = enumOrNull<Units>(map["units"]) ?: Units.METRIC,
            onboardingComplete = map["onboardingComplete"] as? Boolean ?: false,
        )

        private inline fun <reified E : Enum<E>> enumOrNull(value: Any?): E? =
            enumValues<E>().firstOrNull { it.name == value }
    }
}
