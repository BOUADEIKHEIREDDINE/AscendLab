package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun WelcomeScreen(navController: NavHostController) = PlaceholderScreen(
    number = "1",
    title = "Welcome",
    section = "Onboarding",
    purpose = "First impression and promise",
    keyElements = listOf(
        "Logo",
        "One-line promise",
    ),
    primary = PageLink("Get started") { navController.navigate(Routes.SIGN_UP) },
    secondary = listOf(
        PageLink("Log in") { navController.navigate(Routes.SIGN_UP) },
    ),
)
