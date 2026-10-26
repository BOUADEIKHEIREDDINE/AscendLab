package com.ascendlab.app.ui.screens.home

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun HomeScreen(navController: NavHostController) = PlaceholderScreen(
    number = "7 + 15",
    title = "Home (Today + Feed)",
    section = "Home tab",
    purpose = "One clear next step each day, and motivation through progress posts",
    keyElements = listOf(
        "Today's workout card",
        "Calories left",
        "Streak",
        "Feed: workout and calorie posts",
        "Likes and comments",
    ),
    primary = PageLink("Create post") { navController.navigate(Routes.CREATE_POST) },
    secondary = listOf(
        PageLink("Start today's workout") { navController.navigate(Routes.WORKOUT_SESSION) },
    ),
)
