package com.ascendlab.app.ui.screens.train

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun WorkoutSessionScreen(navController: NavHostController) = PlaceholderScreen(
    number = "9",
    title = "Workout session",
    section = "Train tab",
    purpose = "Guide the user through a workout",
    keyElements = listOf(
        "Exercise list",
        "Sets and reps",
        "Rest timer",
        "Mark done",
    ),
    primary = PageLink("Mark done") { navController.popBackStack() },
    secondary = listOf(
        PageLink("View exercise") { navController.navigate(Routes.EXERCISE_DETAIL) },
    ),
)
