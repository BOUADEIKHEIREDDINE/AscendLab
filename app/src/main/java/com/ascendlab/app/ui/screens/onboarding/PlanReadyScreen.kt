package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.PlanCalculator
import com.ascendlab.app.ui.components.Appear
import com.ascendlab.app.ui.components.CalorieCard
import com.ascendlab.app.ui.components.MacroCard
import com.ascendlab.app.ui.components.OnboardingScaffold
import com.ascendlab.app.ui.components.WeekCard
import com.ascendlab.app.ui.navigation.finishOnboarding
import com.ascendlab.app.ui.theme.Apricot
import com.ascendlab.app.ui.theme.MidnightBlue
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val BuildSteps = listOf(
    "Working out your daily energy needs",
    "Setting your calorie and macro targets",
    "Choosing the right training split",
    "Spreading your sessions across the week",
)

@Composable
fun PlanReadyScreen(navController: NavHostController, viewModel: OnboardingViewModel) {
    val draft = viewModel.draft
    // The short build sequence plays once; coming back to this page shows the result directly.
    var built by rememberSaveable { mutableStateOf(false) }

    if (!draft.hasEverythingForPlan) {
        // Can only happen if the page is opened out of order; send the person back to fill the gaps.
        LaunchedEffect(Unit) { navController.popBackStack() }
        return
    }

    AnimatedContent(
        targetState = built,
        transitionSpec = { fadeIn(tween(500)) togetherWith fadeOut(tween(300)) },
        label = "plan build",
    ) { isBuilt ->
        if (isBuilt) PlanResult(navController, viewModel) else BuildingPlan(onDone = { built = true })
    }
}

/** A short "we're building your plan" moment: each step ticks off in turn. */
@Composable
private fun BuildingPlan(onDone: () -> Unit) {
    var done by remember { mutableIntStateOf(0) }
    LaunchedEffect(Unit) {
        delay(300)
        while (done < BuildSteps.size) {
            delay(650)
            done++
        }
        delay(450)
        onDone()
    }

    Column(
        Modifier.fillMaxSize().padding(horizontal = 32.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Building your plan", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.size(28.dp))
        BuildSteps.forEachIndexed { i, label ->
            Appear(i) {
                Row(Modifier.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(28.dp), contentAlignment = Alignment.Center) {
                        when {
                            i < done -> PoppingCheck()
                            i == done -> CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
                            else -> Box(Modifier.size(10.dp).background(MaterialTheme.colorScheme.outlineVariant, CircleShape))
                        }
                    }
                    Spacer(Modifier.width(16.dp))
                    Text(
                        label,
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (i <= done) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

@Composable
private fun PlanResult(navController: NavHostController, viewModel: OnboardingViewModel) {
    val scope = rememberCoroutineScope()
    val draft = viewModel.draft
    val targets = remember(draft) { PlanCalculator.nutrition(draft) }
    val week = remember(draft) { PlanCalculator.training(draft) }
    var saving by remember { mutableStateOf(false) }

    OnboardingScaffold(
        step = null,
        title = "Your plan is ready",
        subtitle = "Here's what we built for you. Start whenever you're ready: small steps, every week.",
        primaryLabel = "Let's start",
        loading = saving,
        onBack = { navController.popBackStack() },
        onPrimary = {
            saving = true
            scope.launch {
                viewModel.finish()
                navController.finishOnboarding()
            }
        },
    ) {
        Appear(1) { MilestoneBadge() }
        Appear(2) { CalorieCard(targets, requireNotNull(draft.goal)) }
        Appear(3) { MacroCard(targets) }
        Appear(4) { WeekCard(week) }
    }
}

@Composable
private fun PoppingCheck() {
    val state = remember { MutableTransitionState(false).apply { targetState = true } }
    AnimatedVisibility(visibleState = state, enter = scaleIn(spring(dampingRatio = Spring.DampingRatioMediumBouncy))) {
        Box(
            Modifier.size(28.dp).background(MaterialTheme.colorScheme.primary, CircleShape),
            contentAlignment = Alignment.Center,
        ) { Icon(Icons.Filled.Check, null, tint = MaterialTheme.colorScheme.onPrimary, modifier = Modifier.size(18.dp)) }
    }
}

/** Apricot is the brand's milestone accent: used here to celebrate the finished setup. */
@Composable
private fun MilestoneBadge() {
    Row(
        Modifier.background(Apricot, CircleShape).padding(horizontal = 14.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.EmojiEvents, null, tint = MidnightBlue, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(6.dp))
        Text("Setup complete", style = MaterialTheme.typography.labelLarge, color = MidnightBlue)
    }
}
