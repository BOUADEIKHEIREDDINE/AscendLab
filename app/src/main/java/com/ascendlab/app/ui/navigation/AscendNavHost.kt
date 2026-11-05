package com.ascendlab.app.ui.navigation

import com.ascendlab.app.ui.screens.home.StoryScreen
import com.ascendlab.app.ui.screens.home.CompareScreen
import com.ascendlab.app.ui.screens.home.CommentsScreen
import com.ascendlab.app.ui.screens.train.CalendarScreen
import com.ascendlab.app.ui.screens.train.ExerciseLibraryScreen
import com.ascendlab.app.ui.screens.train.StatisticsScreen
import com.ascendlab.app.ui.screens.train.ExerciseDetailScreen
import com.ascendlab.app.ui.screens.train.WorkoutDetailScreen
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Column
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.rememberHaptics
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
import com.ascendlab.app.ui.screens.food.CalorieTrackerScreen
import com.ascendlab.app.ui.screens.food.NutritionPlannerScreen
import com.ascendlab.app.ui.screens.home.CreatePostScreen
import com.ascendlab.app.ui.screens.home.FriendsScreen
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
import com.ascendlab.app.ui.screens.train.ProgramsScreen
import com.ascendlab.app.ui.screens.train.RoutineEditorScreen
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
    // The live workout takes the whole screen, like a dedicated training mode.
    val showTabs = currentRoute != null && currentRoute !in onboardingRoutes && currentRoute != Routes.WORKOUT_SESSION && currentRoute != Routes.STORY
    val haptics = rememberHaptics()

    Scaffold(
        bottomBar = {
            if (showTabs) {
                // Same colour as the page with a hairline on top, instead of a raised slab.
                Column {
                Hairline()
                NavigationBar(containerColor = MaterialTheme.colorScheme.background, tonalElevation = 0.dp) {
                    Tab.entries.forEach { tab ->
                        NavigationBarItem(
                            selected = backStackEntry?.destination?.hierarchyContains(tab) == true,
                            onClick = { haptics.tick(); navController.navigateToTab(tab) },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                indicatorColor = androidx.compose.ui.graphics.Color.Transparent,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
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
            composable(Routes.FRIENDS) { FriendsScreen(navController) }
            composable(Routes.COMMENTS) { e -> CommentsScreen(navController, e.arguments?.getString("postId").orEmpty()) }
            composable(Routes.COMPARE) { CompareScreen(navController) }
            composable(Routes.STORY) { e -> StoryScreen(navController, e.arguments?.getString("uid").orEmpty()) }

            // Train tab
            composable(Routes.TRAINING_PLAN) { TrainingPlanScreen(navController) }
            composable(Routes.WORKOUT_SESSION) { WorkoutSessionScreen(navController) }
            composable(Routes.PROGRAMS) { ProgramsScreen(navController) }
            composable(Routes.WORKOUT_DETAIL) { e -> WorkoutDetailScreen(navController, e.arguments?.getString("workoutId").orEmpty()) }
            composable(Routes.EXERCISE_DETAIL) { e ->
                ExerciseDetailScreen(navController, e.arguments?.getString("exerciseId").orEmpty(), e.arguments?.getString("name").orEmpty())
            }
            composable(Routes.STATISTICS) { StatisticsScreen(navController) }
            composable(Routes.EXERCISE_LIBRARY) { ExerciseLibraryScreen(navController) }
            composable(Routes.CALENDAR) { CalendarScreen(navController) }
            composable(Routes.ROUTINE_EDITOR) { entry ->
                RoutineEditorScreen(
                    navController,
                    programId = entry.arguments?.getString("programId").orEmpty(),
                    routineId = entry.arguments?.getString("routineId")?.takeIf { it != "new" },
                )
            }

            // Food tab
            composable(Routes.CALORIE_TRACKER) { CalorieTrackerScreen(navController) }
            composable(Routes.ADD_FOOD) { e ->
                val type = com.ascendlab.app.data.MealType.entries.firstOrNull { it.name == e.arguments?.getString("type") }
                CreatePostScreen(navController, initialType = type)
            }
            composable(Routes.NUTRITION_PLANNER) { NutritionPlannerScreen(navController) }

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
    Tab.HOME to setOf(Routes.HOME, Routes.CREATE_POST, Routes.FRIENDS, Routes.COMMENTS, Routes.STORY),
    Tab.TRAIN to setOf(Routes.TRAINING_PLAN, Routes.WORKOUT_SESSION, Routes.PROGRAMS, Routes.ROUTINE_EDITOR, Routes.WORKOUT_DETAIL, Routes.EXERCISE_DETAIL),
    Tab.FOOD to setOf(Routes.CALORIE_TRACKER, Routes.ADD_FOOD, Routes.NUTRITION_PLANNER),
    Tab.PROFILE to setOf(Routes.PROFILE, Routes.SETTINGS, Routes.EDIT_GOALS, Routes.STATISTICS, Routes.EXERCISE_LIBRARY, Routes.CALENDAR, Routes.COMPARE),
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
