package com.ascendlab.app.ui.screens.profile

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun ProfileScreen(navController: NavHostController) = PlaceholderScreen(
    number = "17",
    title = "Profile and progress",
    section = "Profile tab",
    purpose = "Show how far the user has come",
    keyElements = listOf(
        "Weight chart",
        "Progress photos",
        "Own posts",
        "Streak",
    ),
    primary = PageLink("Settings") { navController.navigate(Routes.SETTINGS) },
    secondary = listOf(
    ),
)
