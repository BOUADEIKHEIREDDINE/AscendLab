package com.ascendlab.app.ui.screens.home

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun CreatePostScreen(navController: NavHostController) = PlaceholderScreen(
    number = "16",
    title = "Create post",
    section = "Home tab",
    purpose = "Share a workout or a day",
    keyElements = listOf(
        "Auto-made summary card",
        "Photo",
        "Caption",
    ),
    primary = PageLink("Post") { navController.popBackStack() },
    secondary = listOf(
    ),
)
