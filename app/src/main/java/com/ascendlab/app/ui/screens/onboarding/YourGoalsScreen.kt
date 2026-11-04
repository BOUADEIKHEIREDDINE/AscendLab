package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.SportsGymnastics
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.Goal
import com.ascendlab.app.data.PlanCalculator
import com.ascendlab.app.data.TrainingPlace
import com.ascendlab.app.data.UserProfile
import com.ascendlab.app.ui.components.Appear
import com.ascendlab.app.ui.components.ChoiceCard
import com.ascendlab.app.ui.components.HelpNote
import com.ascendlab.app.ui.components.OnboardingScaffold
import com.ascendlab.app.ui.components.SectionLabel
import com.ascendlab.app.ui.navigation.Routes
import kotlinx.coroutines.launch

@Composable
fun YourGoalsScreen(navController: NavHostController, viewModel: OnboardingViewModel) {
    val scope = rememberCoroutineScope()
    val draft = viewModel.draft
    var showErrors by rememberSaveable { mutableStateOf(false) }
    val complete = draft.goal != null && draft.daysPerWeek != null && draft.place != null

    OnboardingScaffold(
        step = 3,
        title = "Your goals",
        subtitle = "Three quick choices and your plan is ready.",
        primaryLabel = "Build my plan",
        onBack = { navController.popBackStack() },
        onPrimary = {
            showErrors = true
            if (complete) {
                scope.launch { viewModel.saveProgress() }
                navController.navigate(Routes.PLAN_READY)
            }
        },
    ) {
        GoalsForm(
            goal = draft.goal,
            days = draft.daysPerWeek,
            place = draft.place,
            onGoal = { g -> viewModel.update { it.copy(goal = g) } },
            onDays = { d -> viewModel.update { it.copy(daysPerWeek = d) } },
            onPlace = { p -> viewModel.update { it.copy(place = p) } },
            showErrors = showErrors,
        )
    }
}

private val Goal.icon
    get() = when (this) {
        Goal.LOSE_FAT -> Icons.Filled.LocalFireDepartment
        Goal.BUILD_MUSCLE -> Icons.Filled.FitnessCenter
        Goal.GET_FIT -> Icons.Filled.SportsGymnastics
    }

private val TrainingPlace.icon
    get() = when (this) {
        TrainingPlace.GYM -> Icons.Filled.FitnessCenter
        TrainingPlace.HOME -> Icons.Filled.Home
    }

/** Goal, days per week and gym or home. Shared by onboarding and Settings > Edit goals. */
@Composable
fun GoalsForm(
    goal: Goal?,
    days: Int?,
    place: TrainingPlace?,
    onGoal: (Goal) -> Unit,
    onDays: (Int) -> Unit,
    onPlace: (TrainingPlace) -> Unit,
    showErrors: Boolean,
    firstIndex: Int = 1,
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Appear(firstIndex) { SectionLabel("What's your main goal?") }
        Goal.entries.forEachIndexed { i, g ->
            Appear(firstIndex + 1 + i) {
                ChoiceCard(
                    selected = goal == g,
                    onClick = { onGoal(g) },
                    title = g.label,
                    description = g.description,
                    icon = g.icon,
                )
            }
        }
        MissingChoice(showErrors && goal == null, "Pick the goal that matters most to you right now.")

        Appear(firstIndex + 4) { SectionLabel("How many days a week can you train?") }
        Appear(firstIndex + 5) { DaysPicker(days, onDays) }
        // The advice slides in each time the number changes, explaining what that choice means.
        AnimatedContent(
            targetState = days,
            transitionSpec = {
                (fadeIn() + slideInVertically { it / 2 }) togetherWith (fadeOut() + slideOutVertically { -it / 2 })
            },
            label = "days advice",
        ) { d ->
            if (d != null) {
                HelpNote(PlanCalculator.daysAdvice(d))
            } else {
                HelpNote("Be realistic: a plan you can keep beats a perfect plan you skip. 3 days is a great start.")
            }
        }
        MissingChoice(showErrors && days == null, "Pick how many days you can train.")

        Appear(firstIndex + 6) { SectionLabel("Where will you train?") }
        Appear(firstIndex + 7) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TrainingPlace.entries.forEach { p ->
                    ChoiceCard(
                        selected = place == p,
                        onClick = { onPlace(p) },
                        title = p.label,
                        description = p.description,
                        icon = p.icon,
                        tall = true,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
        }
        MissingChoice(showErrors && place == null, "Pick where you'll train.")
        Appear(firstIndex + 8) {
            HelpNote("Not sure? Choose what's easiest for you today. You can change all of this later in Settings.")
        }
    }
}

/** A row of round number buttons, 2 to 6. The chosen one fills with mint and grows a little. */
@Composable
private fun DaysPicker(selected: Int?, onSelect: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        (UserProfile.MIN_DAYS..UserProfile.MAX_DAYS).forEach { d ->
            val isSelected = selected == d
            val background by animateColorAsState(
                if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainer,
                label = "day background",
            )
            val content by animateColorAsState(
                if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
                label = "day text",
            )
            val scale by animateFloatAsState(
                if (isSelected) 1.08f else 1f,
                spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                label = "day scale",
            )
            Surface(
                onClick = { onSelect(d) },
                shape = CircleShape,
                color = background,
                contentColor = content,
                border = if (isSelected) null else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                modifier = Modifier
                    .weight(1f)
                    .aspectRatio(1f)
                    .scale(scale)
                    .semantics {
                        this.selected = isSelected
                        role = Role.RadioButton
                        contentDescription = "$d days a week"
                    },
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text("$d", style = MaterialTheme.typography.titleLarge)
                }
            }
        }
    }
}

@Composable
private fun MissingChoice(visible: Boolean, message: String) {
    androidx.compose.animation.AnimatedVisibility(visible = visible) {
        Text(message, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
    }
}
