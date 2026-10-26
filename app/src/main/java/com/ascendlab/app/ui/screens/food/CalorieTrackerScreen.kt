package com.ascendlab.app.ui.screens.food

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun CalorieTrackerScreen(navController: NavHostController) = PlaceholderScreen(
    number = "11",
    title = "Calorie tracker",
    section = "Food tab",
    purpose = "Daily calories in and out",
    keyElements = listOf(
        "Total vs target",
        "Meals logged",
        "Calories burned",
    ),
    primary = PageLink("Add food") { navController.navigate(Routes.ADD_FOOD) },
    secondary = listOf(
        PageLink("Nutrition planner") { navController.navigate(Routes.NUTRITION_PLANNER) },
    ),
)
