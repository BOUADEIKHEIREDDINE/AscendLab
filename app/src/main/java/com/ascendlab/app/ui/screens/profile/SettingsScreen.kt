package com.ascendlab.app.ui.screens.profile

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun SettingsScreen(navController: NavHostController) = PlaceholderScreen(
    number = "18",
    title = "Settings",
    section = "Profile tab",
    purpose = "Manage account and plan",
    keyElements = listOf(
        "Edit goals",
        "Units",
        "Notifications",
        "Language",
        "Account",
    ),
    primary = PageLink("Back") { navController.popBackStack() },
    secondary = listOf(
    ),
)
