package com.ascendlab.app.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope.SlideDirection
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.ascendlab.app.R
import com.ascendlab.app.data.AuthRepository
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.UserProfile
import com.ascendlab.app.ui.screens.food.AddFoodScreen
import com.ascendlab.app.ui.screens.food.CalorieTrackerScreen
import com.ascendlab.app.ui.screens.food.MealDetailScreen
import com.ascendlab.app.ui.screens.food.NutritionPlannerScreen
import com.ascendlab.app.ui.screens.home.CreatePostScreen
import com.ascendlab.app.ui.screens.home.HomeScreen
import com.ascendlab.app.ui.screens.onboarding.ChooseVersionScreen
import com.ascendlab.app.ui.screens.onboarding.OnboardingViewModel
import com.ascendlab.app.ui.screens.onboarding.PlanReadyScreen
import com.ascendlab.app.ui.screens.onboarding.SignUpScreen
import com.ascendlab.app.ui.screens.onboarding.WelcomeScreen
import com.ascendlab.app.ui.screens.onboarding.YourBodyScreen
import com.ascendlab.app.ui.screens.onboarding.YourGoalsScreen
import com.ascendlab.app.ui.screens.profile.EditGoalsScreen
import com.ascendlab.app.ui.screens.profile.ProfileScreen
import com.ascendlab.app.ui.screens.profile.SettingsScreen
import com.ascendlab.app.ui.screens.train.ExerciseDetailScreen
import com.ascendlab.app.ui.screens.train.TrainingPlanScreen
import com.ascendlab.app.ui.screens.train.WorkoutSessionScreen

private val onboardingRoutes = setOf(
    Routes.WELCOME, Routes.SIGN_UP, Routes.LOG_IN, Routes.CHOOSE_VERSION,
    Routes.YOUR_BODY, Routes.YOUR_GOALS, Routes.PLAN_READY,
)

/** Where a person lands when the app opens, from what is known about them. */
private fun startFor(profile: UserProfile?): String = when {
    !AuthRepository.isSignedIn -> Routes.WELCOME
    profile?.onboardingComplete == true -> Routes.HOME
    else -> Routes.CHOOSE_VERSION // signed in but setup unfinished: resume it
}

@Composable
fun AscendNavHost(navController: NavHostController = rememberNavController()) {
    val onboarding: OnboardingViewModel = viewModel()

    // The device copy usually answers instantly. Only a signed-in person on a new phone
    // needs a network check, during which the logo is shown.
    var start by remember {
        mutableStateOf(
            if (!AuthRepository.isSignedIn) Routes.WELCOME
            else ProfileRepository.cached()?.let { startFor(it) },
        )
    }
    LaunchedEffect(Unit) {
        if (start == null) start = startFor(ProfileRepository.load())
        onboarding.resumeFrom(ProfileRepository.profile.value?.takeUnless { it.onboardingComplete })
    }

    val startDestination = start
    if (startDestination == null) {
        Splash()
        return
    }

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
            startDestination = startDestination,
            modifier = Modifier.padding(padding),
            // Pages slide in from the right when moving forward and back out when returning.
            enterTransition = { slideIntoContainer(SlideDirection.Start, tween(350)) { it / 4 } + fadeIn(tween(350)) },
            exitTransition = { fadeOut(tween(200)) },
            popEnterTransition = { fadeIn(tween(300)) },
            popExitTransition = { slideOutOfContainer(SlideDirection.End, tween(300)) { it / 4 } + fadeOut(tween(300)) },
        ) {
            // Onboarding
            composable(Routes.WELCOME) { WelcomeScreen(navController) }
            composable(Routes.SIGN_UP) { SignUpScreen(navController, onboarding) }
            composable(Routes.LOG_IN) { SignUpScreen(navController, onboarding, startInLogIn = true) }
            composable(Routes.CHOOSE_VERSION) { ChooseVersionScreen(navController, onboarding) }
            composable(Routes.YOUR_BODY) { YourBodyScreen(navController, onboarding) }
            composable(Routes.YOUR_GOALS) { YourGoalsScreen(navController, onboarding) }
            composable(Routes.PLAN_READY) { PlanReadyScreen(navController, onboarding) }

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
            composable(Routes.EDIT_GOALS) { EditGoalsScreen(navController) }
        }
    }
}

@Composable
private fun Splash() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Image(
            painter = painterResource(R.drawable.ascendlab_logo),
            contentDescription = stringResource(R.string.app_name),
            modifier = Modifier.fillMaxWidth(0.6f),
        )
    }
}

private val tabPages = mapOf(
    Tab.HOME to setOf(Routes.HOME, Routes.CREATE_POST),
    Tab.TRAIN to setOf(Routes.TRAINING_PLAN, Routes.WORKOUT_SESSION, Routes.EXERCISE_DETAIL),
    Tab.FOOD to setOf(Routes.CALORIE_TRACKER, Routes.ADD_FOOD, Routes.NUTRITION_PLANNER, Routes.MEAL_DETAIL),
    Tab.PROFILE to setOf(Routes.PROFILE, Routes.SETTINGS, Routes.EDIT_GOALS),
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

/** Signs out and returns to Welcome with nothing behind it. */
fun NavHostController.signOut() {
    AuthRepository.signOut()
    navigate(Routes.WELCOME) {
        popUpTo(graph.id) { inclusive = true }
        launchSingleTop = true
    }
}
