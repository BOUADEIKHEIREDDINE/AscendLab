package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun SignUpScreen(navController: NavHostController) = PlaceholderScreen(
    number = "2",
    title = "Sign up / Log in",
    section = "Onboarding",
    purpose = "Create or open an account",
    keyElements = listOf(
        "Email sign-in",
        "Google sign-in",
        "Apple sign-in",
    ),
    primary = PageLink("Continue") { navController.navigate(Routes.CHOOSE_VERSION) },
    secondary = listOf(
    ),
)
