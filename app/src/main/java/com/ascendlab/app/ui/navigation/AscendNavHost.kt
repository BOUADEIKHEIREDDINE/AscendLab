package com.ascendlab.app.ui.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ascendlab.app.ui.screens.food.AddFoodScreen
import com.ascendlab.app.ui.screens.food.CalorieTrackerScreen
import com.ascendlab.app.ui.screens.food.MealDetailScreen
import com.ascendlab.app.ui.screens.food.NutritionPlannerScreen
import com.ascendlab.app.ui.screens.home.CreatePostScreen
import com.ascendlab.app.ui.screens.home.HomeScreen
import com.ascendlab.app.ui.screens.onboarding.ChooseVersionScreen
import com.ascendlab.app.ui.screens.onboarding.PlanReadyScreen
import com.ascendlab.app.ui.screens.onboarding.SignUpScreen
import com.ascendlab.app.ui.screens.onboarding.WelcomeScreen
import com.ascendlab.app.ui.screens.onboarding.YourBodyScreen
import com.ascendlab.app.ui.screens.onboarding.YourGoalsScreen
import com.ascendlab.app.ui.screens.profile.ProfileScreen
import com.ascendlab.app.ui.screens.profile.SettingsScreen
import com.ascendlab.app.ui.screens.train.ExerciseDetailScreen
import com.ascendlab.app.ui.screens.train.TrainingPlanScreen
import com.ascendlab.app.ui.screens.train.WorkoutSessionScreen

private val onboardingRoutes = setOf(
    Routes.WELCOME, Routes.SIGN_UP, Routes.CHOOSE_VERSION,
    Routes.YOUR_BODY, Routes.YOUR_GOALS, Routes.PLAN_READY,
)

@Composable
fun AscendNavHost(navController: NavHostController = rememberNavController()) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showTabs = currentRoute != null && currentRoute !in onboardingRoutes

    Scaffold(
        bottomBar = {
            if (showTabs) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                    Tab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = backStackEntry?.destination?.hierarchyContains(tab) == true,
                            onClick = { navController.navigateToTab(tab) },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = Routes.WELCOME,
            modifier = Modifier.padding(padding),
        ) {
            // Onboarding
            composable(Routes.WELCOME) { WelcomeScreen(navController) }
            composable(Routes.SIGN_UP) { SignUpScreen(navController) }
            composable(Routes.CHOOSE_VERSION) { ChooseVersionScreen(navController) }
            composable(Routes.YOUR_BODY) { YourBodyScreen(navController) }
            composable(Routes.YOUR_GOALS) { YourGoalsScreen(navController) }
            composable(Routes.PLAN_READY) { PlanReadyScreen(navController) }

            // Home tab
            composable(Routes.HOME) { HomeScreen(navController) }
            composable(Routes.CREATE_POST) { CreatePostScreen(navController) }

            // Train tab
            composable(Routes.TRAINING_PLAN) { TrainingPlanScreen(navController) }
            composable(Routes.WORKOUT_SESSION) { WorkoutSessionScreen(navController) }
            composable(Routes.EXERCISE_DETAIL) { ExerciseDetailScreen(navController) }

            // Food tab
            composable(Routes.CALORIE_TRACKER) { CalorieTrackerScreen(navController) }
            composable(Routes.ADD_FOOD) { AddFoodScreen(navController) }
            composable(Routes.NUTRITION_PLANNER) { NutritionPlannerScreen(navController) }
            composable(Routes.MEAL_DETAIL) { MealDetailScreen(navController) }

            // Profile tab
            composable(Routes.PROFILE) { ProfileScreen(navController) }
            composable(Routes.SETTINGS) { SettingsScreen(navController) }
        }
    }
}

private val tabPages = mapOf(
    Tab.HOME to setOf(Routes.HOME, Routes.CREATE_POST),
    Tab.TRAIN to setOf(Routes.TRAINING_PLAN, Routes.WORKOUT_SESSION, Routes.EXERCISE_DETAIL),
    Tab.FOOD to setOf(Routes.CALORIE_TRACKER, Routes.ADD_FOOD, Routes.NUTRITION_PLANNER, Routes.MEAL_DETAIL),
    Tab.PROFILE to setOf(Routes.PROFILE, Routes.SETTINGS),
)

private fun androidx.navigation.NavDestination.hierarchyContains(tab: Tab): Boolean =
    route in tabPages.getValue(tab)

// Home is the root of the back stack once onboarding is done (the graph's start
// destination, Welcome, has been popped by then), so tabs pop back to Home.
private fun NavHostController.navigateToTab(tab: Tab) {
    navigate(tab.route) {
        popUpTo(Routes.HOME) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

/** Leaves onboarding for good and lands on Home, clearing everything before it. */
fun NavHostController.finishOnboarding() {
    navigate(Routes.HOME) {
        popUpTo(graph.id) { inclusive = true }
        launchSingleTop = true
    }
}
