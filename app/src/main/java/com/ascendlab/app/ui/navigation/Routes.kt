package com.ascendlab.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.ui.graphics.vector.ImageVector

object Routes {
    // Onboarding (shown once)
    const val WELCOME = "welcome"
    const val SIGN_UP = "sign_up"
    const val LOG_IN = "log_in"
    const val CHOOSE_VERSION = "choose_version"
    const val YOUR_BODY = "your_body"
    const val YOUR_GOALS = "your_goals"
    const val PLAN_READY = "plan_ready"

    // Home tab (Home and Feed are the same page)
    const val HOME = "home"
    const val CREATE_POST = "create_post"
    const val FRIENDS = "friends"
    const val COMMENTS = "comments/{postId}"
    fun comments(postId: String) = "comments/$postId"
    const val COMPARE = "compare"
    const val STORY = "story/{uid}"
    fun story(uid: String) = "story/$uid"

    // Train tab
    const val TRAINING_PLAN = "training_plan"
    const val WORKOUT_SESSION = "workout_session"
    const val PROGRAMS = "programs"
    const val WORKOUT_DETAIL = "workout/{workoutId}"
    fun workoutDetail(id: String) = "workout/$id"
    const val EXERCISE_DETAIL = "exercise/{exerciseId}?name={name}"
    fun exerciseDetail(id: String, name: String) = "exercise/${android.net.Uri.encode(id)}?name=${android.net.Uri.encode(name)}"
    const val STATISTICS = "statistics"
    const val EXERCISE_LIBRARY = "exercise_library"
    const val CALENDAR = "calendar"
    const val ROUTINE_EDITOR = "routine_editor/{programId}/{routineId}"
    fun routineEditor(programId: String, routineId: String?) = "routine_editor/$programId/${routineId ?: "new"}"

    // Food tab
    const val CALORIE_TRACKER = "calorie_tracker"
    const val ADD_FOOD = "add_food?type={type}"
    fun addFood(type: com.ascendlab.app.data.MealType? = null) = "add_food?type=${type?.name ?: ""}"
    const val NUTRITION_PLANNER = "nutrition_planner"

    // Profile tab
    const val PROFILE = "profile"
    const val SETTINGS = "settings"
    const val EDIT_GOALS = "edit_goals"
}

enum class Tab(val route: String, val label: String, val icon: ImageVector) {
    HOME(Routes.HOME, "Home", Icons.Filled.Home),
    TRAIN(Routes.TRAINING_PLAN, "Train", Icons.Filled.FitnessCenter),
    FOOD(Routes.CALORIE_TRACKER, "Food", Icons.Filled.Restaurant),
    PROFILE(Routes.PROFILE, "Profile", Icons.Filled.Person),
}
