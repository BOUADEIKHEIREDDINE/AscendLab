package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun YourGoalsScreen(navController: NavHostController) = PlaceholderScreen(
    number = "5",
    title = "Your goals",
    section = "Onboarding",
    purpose = "Set direction and constraints",
    keyElements = listOf(
        "Goal: lose fat, build muscle, get fit",
        "Days per week",
        "Gym or home",
    ),
    primary = PageLink("Generate my plan") { navController.navigate(Routes.PLAN_READY) },
    secondary = listOf(
    ),
)
