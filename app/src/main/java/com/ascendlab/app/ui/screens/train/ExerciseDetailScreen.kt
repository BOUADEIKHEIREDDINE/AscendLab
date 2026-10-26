package com.ascendlab.app.ui.screens.train

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun ExerciseDetailScreen(navController: NavHostController) = PlaceholderScreen(
    number = "10",
    title = "Exercise detail",
    section = "Train tab",
    purpose = "Teach one move simply",
    keyElements = listOf(
        "Short video",
        "3 key cues",
        "Common mistakes",
    ),
    primary = PageLink("Back") { navController.popBackStack() },
    secondary = listOf(
    ),
)
