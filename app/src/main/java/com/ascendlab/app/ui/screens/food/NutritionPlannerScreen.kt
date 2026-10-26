package com.ascendlab.app.ui.screens.food

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun NutritionPlannerScreen(navController: NavHostController) = PlaceholderScreen(
    number = "13",
    title = "Nutrition planner",
    section = "Food tab",
    purpose = "Weekly meals matched to the target",
    keyElements = listOf(
        "Day-by-day meals",
        "Swap a meal",
        "Grocery list",
    ),
    primary = PageLink("Open meal") { navController.navigate(Routes.MEAL_DETAIL) },
    secondary = listOf(
    ),
)
