package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun ChooseVersionScreen(navController: NavHostController) = PlaceholderScreen(
    number = "3",
    title = "Choose your version",
    section = "Onboarding",
    purpose = "Pick the men or women version",
    keyElements = listOf(
        "Card: Man",
        "Card: Woman",
    ),
    primary = PageLink("Continue") { navController.navigate(Routes.YOUR_BODY) },
    secondary = listOf(
    ),
)
