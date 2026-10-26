package com.ascendlab.app.ui.screens.food

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun MealDetailScreen(navController: NavHostController) = PlaceholderScreen(
    number = "14",
    title = "Meal detail",
    section = "Food tab",
    purpose = "Show how to make a planned meal",
    keyElements = listOf(
        "Ingredients",
        "Calories and macros",
        "Steps",
    ),
    primary = PageLink("Back") { navController.popBackStack() },
    secondary = listOf(
    ),
)
