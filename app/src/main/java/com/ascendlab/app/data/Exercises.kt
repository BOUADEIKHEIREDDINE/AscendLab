package com.ascendlab.app.data

enum class Muscle(val label: String) {
    CHEST("Chest"),
    BACK("Back"),
    SHOULDERS("Shoulders"),
    ARMS("Arms"),
    LEGS("Legs"),
    GLUTES("Glutes"),
    CORE("Core"),
    CARDIO("Cardio"),
    OTHER("Other"),
}

enum class Equipment(val label: String) {
    BARBELL("Barbell"),
    DUMBBELL("Dumbbell"),
    MACHINE("Machine"),
    CABLE("Cable"),
    BODYWEIGHT("Bodyweight"),
    KETTLEBELL("Kettlebell"),
    BAND("Band"),
    OTHER("Other"),
}

/** One movement. Custom exercises use an id starting with "custom:". */
data class Exercise(val id: String, val name: String, val muscle: Muscle, val equipment: Equipment) {
    val isBodyweight get() = equipment == Equipment.BODYWEIGHT
}

/** The built-in exercise library. Ids never change, since workouts and routines refer to them. */
object ExerciseLibrary {
    private fun e(id: String, name: String, m: Muscle, eq: Equipment) = Exercise(id, name, m, eq)

    val all: List<Exercise> = listOf(
        // Chest
        e("bench_press", "Bench Press", Muscle.CHEST, Equipment.BARBELL),
        e("incline_bench_press", "Incline Bench Press", Muscle.CHEST, Equipment.BARBELL),
        e("db_bench_press", "Dumbbell Bench Press", Muscle.CHEST, Equipment.DUMBBELL),
        e("incline_db_press", "Incline Dumbbell Press", Muscle.CHEST, Equipment.DUMBBELL),
        e("chest_fly_machine", "Chest Fly (Machine)", Muscle.CHEST, Equipment.MACHINE),
        e("cable_crossover", "Cable Crossover", Muscle.CHEST, Equipment.CABLE),
        e("chest_press_machine", "Chest Press (Machine)", Muscle.CHEST, Equipment.MACHINE),
        e("push_up", "Push-up", Muscle.CHEST, Equipment.BODYWEIGHT),
        e("knee_push_up", "Knee Push-up", Muscle.CHEST, Equipment.BODYWEIGHT),
        e("dips", "Dips", Muscle.CHEST, Equipment.BODYWEIGHT),
        // Back
        e("deadlift", "Deadlift", Muscle.BACK, Equipment.BARBELL),
        e("barbell_row", "Barbell Row", Muscle.BACK, Equipment.BARBELL),
        e("db_row", "Dumbbell Row", Muscle.BACK, Equipment.DUMBBELL),
        e("lat_pulldown", "Lat Pulldown", Muscle.BACK, Equipment.CABLE),
        e("seated_cable_row", "Seated Cable Row", Muscle.BACK, Equipment.CABLE),
        e("pull_up", "Pull-up", Muscle.BACK, Equipment.BODYWEIGHT),
        e("chin_up", "Chin-up", Muscle.BACK, Equipment.BODYWEIGHT),
        e("inverted_row", "Inverted Row", Muscle.BACK, Equipment.BODYWEIGHT),
        e("band_row", "Band Row", Muscle.BACK, Equipment.BAND),
        e("back_extension", "Back Extension", Muscle.BACK, Equipment.BODYWEIGHT),
        // Shoulders
        e("overhead_press", "Overhead Press", Muscle.SHOULDERS, Equipment.BARBELL),
        e("db_shoulder_press", "Dumbbell Shoulder Press", Muscle.SHOULDERS, Equipment.DUMBBELL),
        e("lateral_raise", "Lateral Raise", Muscle.SHOULDERS, Equipment.DUMBBELL),
        e("face_pull", "Face Pull", Muscle.SHOULDERS, Equipment.CABLE),
        e("rear_delt_fly", "Rear Delt Fly", Muscle.SHOULDERS, Equipment.DUMBBELL),
        e("pike_push_up", "Pike Push-up", Muscle.SHOULDERS, Equipment.BODYWEIGHT),
        e("shoulder_press_machine", "Shoulder Press (Machine)", Muscle.SHOULDERS, Equipment.MACHINE),
        // Arms
        e("barbell_curl", "Barbell Curl", Muscle.ARMS, Equipment.BARBELL),
        e("db_curl", "Dumbbell Curl", Muscle.ARMS, Equipment.DUMBBELL),
        e("hammer_curl", "Hammer Curl", Muscle.ARMS, Equipment.DUMBBELL),
        e("cable_curl", "Cable Curl", Muscle.ARMS, Equipment.CABLE),
        e("triceps_pushdown", "Triceps Pushdown", Muscle.ARMS, Equipment.CABLE),
        e("skull_crusher", "Skull Crusher", Muscle.ARMS, Equipment.BARBELL),
        e("overhead_triceps_ext", "Overhead Triceps Extension", Muscle.ARMS, Equipment.DUMBBELL),
        e("bench_dip", "Bench Dip", Muscle.ARMS, Equipment.BODYWEIGHT),
        // Legs
        e("squat", "Squat", Muscle.LEGS, Equipment.BARBELL),
        e("front_squat", "Front Squat", Muscle.LEGS, Equipment.BARBELL),
        e("goblet_squat", "Goblet Squat", Muscle.LEGS, Equipment.DUMBBELL),
        e("bodyweight_squat", "Bodyweight Squat", Muscle.LEGS, Equipment.BODYWEIGHT),
        e("leg_press", "Leg Press", Muscle.LEGS, Equipment.MACHINE),
        e("leg_extension", "Leg Extension", Muscle.LEGS, Equipment.MACHINE),
        e("leg_curl", "Leg Curl", Muscle.LEGS, Equipment.MACHINE),
        e("lunge", "Lunge", Muscle.LEGS, Equipment.BODYWEIGHT),
        e("db_lunge", "Dumbbell Lunge", Muscle.LEGS, Equipment.DUMBBELL),
        e("bulgarian_split_squat", "Bulgarian Split Squat", Muscle.LEGS, Equipment.DUMBBELL),
        e("romanian_deadlift", "Romanian Deadlift", Muscle.LEGS, Equipment.BARBELL),
        e("db_romanian_deadlift", "Dumbbell Romanian Deadlift", Muscle.LEGS, Equipment.DUMBBELL),
        e("calf_raise", "Calf Raise", Muscle.LEGS, Equipment.BODYWEIGHT),
        e("standing_calf_raise_machine", "Standing Calf Raise (Machine)", Muscle.LEGS, Equipment.MACHINE),
        // Glutes
        e("hip_thrust", "Hip Thrust", Muscle.GLUTES, Equipment.BARBELL),
        e("glute_bridge", "Glute Bridge", Muscle.GLUTES, Equipment.BODYWEIGHT),
        e("kettlebell_swing", "Kettlebell Swing", Muscle.GLUTES, Equipment.KETTLEBELL),
        e("cable_kickback", "Cable Kickback", Muscle.GLUTES, Equipment.CABLE),
        e("step_up", "Step-up", Muscle.GLUTES, Equipment.BODYWEIGHT),
        // Core
        e("plank", "Plank (seconds)", Muscle.CORE, Equipment.BODYWEIGHT),
        e("crunch", "Crunch", Muscle.CORE, Equipment.BODYWEIGHT),
        e("hanging_leg_raise", "Hanging Leg Raise", Muscle.CORE, Equipment.BODYWEIGHT),
        e("russian_twist", "Russian Twist", Muscle.CORE, Equipment.BODYWEIGHT),
        e("cable_crunch", "Cable Crunch", Muscle.CORE, Equipment.CABLE),
        e("dead_bug", "Dead Bug", Muscle.CORE, Equipment.BODYWEIGHT),
        e("mountain_climber", "Mountain Climber", Muscle.CORE, Equipment.BODYWEIGHT),
        // Cardio
        e("burpee", "Burpee", Muscle.CARDIO, Equipment.BODYWEIGHT),
        e("jumping_jack", "Jumping Jack", Muscle.CARDIO, Equipment.BODYWEIGHT),
        e("rowing_machine", "Rowing Machine (minutes)", Muscle.CARDIO, Equipment.MACHINE),
        e("jump_rope", "Jump Rope (minutes)", Muscle.CARDIO, Equipment.OTHER),
    )

    private val byId = all.associateBy { it.id }

    fun find(id: String): Exercise? = byId[id]

    fun custom(name: String): Exercise =
        Exercise("custom:" + name.trim().lowercase().replace(Regex("[^a-z0-9]+"), "_"), name.trim(), Muscle.OTHER, Equipment.OTHER)

    /** Muscle group for any exercise id, including custom ones. */
    fun muscleOf(id: String): Muscle = find(id)?.muscle ?: Muscle.OTHER

    /** Starter routines built from the person's AscendLab plan (see [PlanCalculator.training]). */
    fun starterExercises(title: String, home: Boolean): List<String> = when (title) {
        "Full body" -> if (home) listOf("bodyweight_squat", "push_up", "inverted_row", "glute_bridge", "plank")
        else listOf("squat", "bench_press", "barbell_row", "romanian_deadlift", "plank")
        "Upper body" -> if (home) listOf("push_up", "inverted_row", "pike_push_up", "bench_dip", "band_row")
        else listOf("bench_press", "lat_pulldown", "db_shoulder_press", "seated_cable_row", "db_curl", "triceps_pushdown")
        "Lower body" -> if (home) listOf("bodyweight_squat", "lunge", "glute_bridge", "calf_raise", "dead_bug")
        else listOf("squat", "romanian_deadlift", "leg_press", "leg_curl", "standing_calf_raise_machine", "hanging_leg_raise")
        "Push" -> if (home) listOf("push_up", "pike_push_up", "bench_dip", "knee_push_up")
        else listOf("bench_press", "overhead_press", "incline_db_press", "lateral_raise", "triceps_pushdown")
        "Pull" -> if (home) listOf("inverted_row", "band_row", "back_extension", "russian_twist")
        else listOf("deadlift", "pull_up", "barbell_row", "face_pull", "barbell_curl", "hammer_curl")
        "Legs" -> if (home) listOf("bodyweight_squat", "bulgarian_split_squat", "glute_bridge", "step_up", "calf_raise")
        else listOf("squat", "leg_press", "romanian_deadlift", "leg_extension", "leg_curl", "standing_calf_raise_machine")
        else -> emptyList()
    }
}
