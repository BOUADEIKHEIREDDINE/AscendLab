package com.ascendlab.app.ui.screens.train

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun TrainingPlanScreen(navController: NavHostController) = PlaceholderScreen(
    number = "8",
    title = "Training plan",
    section = "Train tab",
    purpose = "See the week at a glance",
    keyElements = listOf(
        "Week calendar",
        "Session cards",
        "Regenerate plan",
    ),
    primary = PageLink("Open session") { navController.navigate(Routes.WORKOUT_SESSION) },
    secondary = listOf(
    ),
)
