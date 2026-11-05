package com.ascendlab.app.ui.screens.food

import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.data.Days
import com.ascendlab.app.data.MealType
import com.ascendlab.app.data.PlanCalculator
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SocialRepository
import com.ascendlab.app.ui.components.FeedCard
import com.ascendlab.app.ui.components.MacroCard
import com.ascendlab.app.ui.components.PageHeader
import com.ascendlab.app.ui.components.SectionTitle
import com.ascendlab.app.ui.components.formatKcal
import com.ascendlab.app.ui.screens.home.FeedViewModel
import com.ascendlab.app.ui.theme.Apricot


/** Daily targets, and a per-meal budget filled in by what's been logged today. */
@Composable
fun NutritionPlannerScreen(navController: NavHostController, vm: FeedViewModel = viewModel()) {
    val profile by ProfileRepository.profile.collectAsState()
    val feed by vm.feed.collectAsStateWithLifecycle()
    val today = Days.key()
    val myUid = SocialRepository.uid
    val meals = feed.posts.filter { it.isMeal && it.uid == myUid && it.dayKey == today }
    val targets = profile?.takeIf { it.hasEverythingForPlan }?.let { PlanCalculator.nutrition(it) }

    Column(Modifier.fillMaxSize()) {
        PageHeader("Nutrition planner", onBack = { navController.popBackStack() })
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (targets == null) {
                Text("Finish setting up your goals to see your plan.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = Gutter))
            } else {
            SectionTitle("Today, meal by meal")
            FeedCard {
                Column(Modifier.padding(vertical = 4.dp)) {
                    MealType.entries.forEachIndexed { i, type ->
                        if (i > 0) Hairline(Modifier.padding(start = Gutter))
                        val budget = (targets.calories * type.share).toInt() / 10 * 10
                        val eaten = meals.filter { it.mealType == type }.sumOf { it.calories }
                        MealBudgetRow(type.label, eaten, budget)
                    }
                }
            }
            Text(
                "A guide, not a rule: move calories between meals as you like. What matters is the daily total.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Gutter),
            )
            SectionTitle("Daily targets")
            FeedCard {
                Row(Modifier.padding(horizontal = Gutter, vertical = 8.dp), verticalAlignment = Alignment.Bottom) {
                    Text(formatKcal(targets.calories), style = MaterialTheme.typography.headlineMedium)
                    Text("  kcal a day", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(bottom = 4.dp))
                }
            }
            MacroCard(targets, Modifier.padding(horizontal = Gutter))
            }
        }
    }
}

@Composable
private fun MealBudgetRow(label: String, eaten: Int, budget: Int) {
    val progress by animateFloatAsState(if (budget > 0) (eaten.toFloat() / budget).coerceIn(0f, 1f) else 0f, tween(700), label = label)
    Column(Modifier.padding(horizontal = Gutter, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
            Text(
                if (eaten == 0) "about ${formatKcal(budget)} kcal" else "${formatKcal(eaten)} / ${formatKcal(budget)} kcal",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
            color = if (eaten > budget * 1.15) Apricot else MaterialTheme.colorScheme.primary,
            trackColor = MaterialTheme.colorScheme.surfaceContainerHigh,
            drawStopIndicator = {},
        )
    }
}
