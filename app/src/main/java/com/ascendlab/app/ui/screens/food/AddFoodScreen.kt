package com.ascendlab.app.ui.screens.food

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun AddFoodScreen(navController: NavHostController) = PlaceholderScreen(
    number = "12",
    title = "Add food",
    section = "Food tab",
    purpose = "Log a meal fast",
    keyElements = listOf(
        "Search",
        "Barcode scan",
        "Recent foods",
        "Portion size",
    ),
    primary = PageLink("Log meal") { navController.popBackStack() },
    secondary = listOf(
    ),
)
