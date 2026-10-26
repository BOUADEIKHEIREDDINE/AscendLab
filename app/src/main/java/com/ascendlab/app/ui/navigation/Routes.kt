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
    const val CHOOSE_VERSION = "choose_version"
    const val YOUR_BODY = "your_body"
    const val YOUR_GOALS = "your_goals"
    const val PLAN_READY = "plan_ready"

    // Home tab (Home and Feed are the same page)
    const val HOME = "home"
    const val CREATE_POST = "create_post"

    // Train tab
    const val TRAINING_PLAN = "training_plan"
    const val WORKOUT_SESSION = "workout_session"
    const val EXERCISE_DETAIL = "exercise_detail"

    // Food tab
    const val CALORIE_TRACKER = "calorie_tracker"
    const val ADD_FOOD = "add_food"
    const val NUTRITION_PLANNER = "nutrition_planner"
    const val MEAL_DETAIL = "meal_detail"

    // Profile tab
    const val PROFILE = "profile"
    const val SETTINGS = "settings"
}

enum class Tab(val route: String, val label: String, val icon: ImageVector) {
    HOME(Routes.HOME, "Home", Icons.Filled.Home),
    TRAIN(Routes.TRAINING_PLAN, "Train", Icons.Filled.FitnessCenter),
    FOOD(Routes.CALORIE_TRACKER, "Food", Icons.Filled.Restaurant),
    PROFILE(Routes.PROFILE, "Profile", Icons.Filled.Person),
}
