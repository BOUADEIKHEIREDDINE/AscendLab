package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.navigation.finishOnboarding

@Composable
fun PlanReadyScreen(navController: NavHostController) = PlaceholderScreen(
    number = "6",
    title = "Your plan is ready",
    section = "Onboarding",
    purpose = "Show the AI result simply",
    keyElements = listOf(
        "Weekly plan summary",
        "Daily calorie target",
    ),
    primary = PageLink("Start") { navController.finishOnboarding() },
    secondary = listOf(
    ),
)
