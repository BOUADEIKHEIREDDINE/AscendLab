package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun YourBodyScreen(navController: NavHostController) = PlaceholderScreen(
    number = "4",
    title = "Your body",
    section = "Onboarding",
    purpose = "Collect data for the AI plan",
    keyElements = listOf(
        "Age",
        "Height",
        "Weight",
        "Activity level",
    ),
    primary = PageLink("Continue") { navController.navigate(Routes.YOUR_GOALS) },
    secondary = listOf(
    ),
)
