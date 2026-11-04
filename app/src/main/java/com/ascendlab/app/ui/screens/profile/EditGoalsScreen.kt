package com.ascendlab.app.ui.screens.profile

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import com.ascendlab.app.data.PlanCalculator
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.UserProfile
import com.ascendlab.app.ui.components.Appear
import com.ascendlab.app.ui.components.CalorieCard
import com.ascendlab.app.ui.components.OnboardingScaffold
import com.ascendlab.app.ui.components.WeekCard
import com.ascendlab.app.ui.components.formatKcal
import com.ascendlab.app.ui.screens.onboarding.GoalsForm
import kotlinx.coroutines.launch

/**
 * Change goal, training days or place. The new calorie target and week are previewed
 * live, and saving regenerates the plan from the updated answers.
 */
@Composable
fun EditGoalsScreen(navController: NavHostController) {
    val saved by ProfileRepository.profile.collectAsState()
    LaunchedEffect(Unit) { if (saved == null) ProfileRepository.load() }

    val original = saved
    if (original == null || !original.hasEverythingForPlan) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        return
    }
    EditGoalsContent(navController, original)
}

@Composable
private fun EditGoalsContent(navController: NavHostController, original: UserProfile) {
    val scope = rememberCoroutineScope()
    var edited by remember { mutableStateOf(original) }
    var saving by remember { mutableStateOf(false) }
    val changed = edited.goal != original.goal || edited.daysPerWeek != original.daysPerWeek || edited.place != original.place

    val before = remember(original) { PlanCalculator.nutrition(original) }
    val after = remember(edited) { PlanCalculator.nutrition(edited) }
    val week = remember(edited) { PlanCalculator.training(edited) }

    OnboardingScaffold(
        step = null,
        title = "Edit goals",
        subtitle = "Change what you're working towards. Your plan and calorie target update to match.",
        primaryLabel = if (changed) "Save and update my plan" else "No changes yet",
        primaryEnabled = changed,
        loading = saving,
        onBack = { navController.popBackStack() },
        onPrimary = {
            saving = true
            scope.launch {
                ProfileRepository.save(edited)
                navController.popBackStack()
            }
        },
    ) {
        GoalsForm(
            goal = edited.goal,
            days = edited.daysPerWeek,
            place = edited.place,
            onGoal = { edited = edited.copy(goal = it) },
            onDays = { edited = edited.copy(daysPerWeek = it) },
            onPlace = { edited = edited.copy(place = it) },
            showErrors = false,
            firstIndex = 0,
        )

        Appear(9) { CalorieCard(after, requireNotNull(edited.goal)) }
        AnimatedVisibility(
            visible = after.calories != before.calories,
            enter = fadeIn() + expandVertically(),
            exit = fadeOut() + shrinkVertically(),
        ) {
            Text(
                "Before: ${formatKcal(before.calories)} kcal a day",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Appear(10) { WeekCard(week) }
    }
}
