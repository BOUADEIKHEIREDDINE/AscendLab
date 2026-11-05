package com.ascendlab.app.ui.screens.food

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Cookie
import androidx.compose.material.icons.filled.DinnerDining
import androidx.compose.material.icons.filled.FreeBreakfast
import androidx.compose.material.icons.filled.LunchDining
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.data.Days
import com.ascendlab.app.data.FeedPost
import com.ascendlab.app.data.MealType
import com.ascendlab.app.data.PlanCalculator
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SocialRepository
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.ui.components.CountingNumber
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.MealPhoto
import com.ascendlab.app.ui.components.SectionTitle
import com.ascendlab.app.ui.components.TabHeader
import com.ascendlab.app.ui.components.formatKcal
import com.ascendlab.app.ui.components.pressable
import com.ascendlab.app.ui.components.rememberHaptics
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.screens.home.FeedViewModel
import com.ascendlab.app.ui.theme.Apricot
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

/** Strength training burns roughly 5 kcal per kg of body weight per hour (MET 5). */
private const val STRENGTH_MET = 5.0

/**
 * Food diary for today: a gauge of calories left, macro bars, then each meal with its own
 * ring, the foods logged in it and a quick + to add more.
 */
@Composable
fun CalorieTrackerScreen(navController: NavHostController, vm: FeedViewModel = viewModel()) {
    val feed by vm.feed.collectAsStateWithLifecycle()
    val profile by ProfileRepository.profile.collectAsState()
    val history by remember { TrainRepository.history(20) }.collectAsStateWithLifecycle(initialValue = null)
    val myUid = SocialRepository.uid
    val today = Days.key()
    val meals = feed.posts.filter { it.isMeal && it.uid == myUid && it.dayKey == today }.sortedBy { it.createdAt }
    val targets = profile?.takeIf { it.hasEverythingForPlan }?.let { PlanCalculator.nutrition(it) }
    val target = targets?.calories ?: 0
    val eaten = meals.sumOf { it.calories }
    val trainedSec = history.orEmpty().filter { Days.key(Date(it.finishedAt)) == today }.sumOf { it.durationSec }
    val burned = (STRENGTH_MET * (profile?.weightKg ?: 70.0) * trainedSec / 3600.0).roundToInt()
    val dateLabel = remember { SimpleDateFormat("EEEE d MMMM", Locale.getDefault()).format(Date()) }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 24.dp)) {
        TabHeader("Today", subtitle = dateLabel)

        SectionTitle("Summary") {
            TextButton(onClick = { navController.navigate(Routes.NUTRITION_PLANNER) }) { Text("Details") }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            SideNumber(eaten, "Eaten", Modifier.weight(1f))
            CalorieGauge(eaten, target, Modifier.size(168.dp))
            SideNumber(burned, "Burned", Modifier.weight(1f))
        }
        if (targets != null) {
            Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(20.dp)) {
                MacroBar("Carbs", meals.sumOf { it.carbs }, targets.carbsG, Modifier.weight(1f))
                MacroBar("Protein", meals.sumOf { it.protein }, targets.proteinG, Modifier.weight(1f))
                MacroBar("Fat", meals.sumOf { it.fat }, targets.fatG, Modifier.weight(1f))
            }
        }

        SectionTitle("Meals") {
            TextButton(onClick = { navController.navigate(Routes.NUTRITION_PLANNER) }) { Text("Planner") }
        }
        MealType.entries.forEachIndexed { i, type ->
            if (i > 0) Hairline(Modifier.padding(start = Gutter))
            MealSection(
                type = type,
                items = meals.filter { it.mealType == type },
                budget = (target * type.share).toInt() / 10 * 10,
                onAdd = { navController.navigate(Routes.addFood(type)) },
            )
        }
        Hairline()
    }
}

@Composable
private fun SideNumber(value: Int, label: String, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        CountingNumber(value, style = MaterialTheme.typography.titleLarge)
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** A 270° arc that fills as you eat, with what's left (or how much over) in the middle. */
@Composable
private fun CalorieGauge(eaten: Int, target: Int, modifier: Modifier) {
    val fraction by animateFloatAsState(
        if (target > 0) (eaten.toFloat() / target).coerceIn(0f, 1f) else 0f,
        tween(900, easing = FastOutSlowInEasing), label = "gauge",
    )
    val over = target in 1 until eaten
    val track = MaterialTheme.colorScheme.surfaceContainerHigh
    val fill = if (over) Apricot else MaterialTheme.colorScheme.primary
    Box(
        modifier.semantics {
            contentDescription = if (over) "${eaten - target} kilocalories over your goal" else "${target - eaten} kilocalories remaining"
        },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = 12.dp.toPx()
            val inset = stroke / 2
            val arcSize = Size(size.width - stroke, size.height - stroke)
            drawArc(track, 135f, 270f, false, Offset(inset, inset), arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
            if (fraction > 0f) {
                drawArc(fill, 135f, 270f * fraction, false, Offset(inset, inset), arcSize, style = Stroke(stroke, cap = StrokeCap.Round))
            }
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CountingNumber(if (over) eaten - target else (target - eaten).coerceAtLeast(0), style = MaterialTheme.typography.displaySmall)
            Text(if (over) "Over" else "Remaining", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun MacroBar(label: String, grams: Int, target: Int, modifier: Modifier) {
    val fill by animateFloatAsState((grams.toFloat() / target.coerceAtLeast(1)).coerceIn(0f, 1f), tween(800), label = label)
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Box(Modifier.fillMaxWidth().height(6.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceContainerHigh)) {
            Box(Modifier.fillMaxHeight().fillMaxWidth(fill).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
        }
        Text("$grams / $target g", style = MaterialTheme.typography.labelLarge)
    }
}

private fun MealType.icon(): ImageVector = when (this) {
    MealType.BREAKFAST -> Icons.Filled.FreeBreakfast
    MealType.LUNCH -> Icons.Filled.LunchDining
    MealType.DINNER -> Icons.Filled.DinnerDining
    MealType.SNACK -> Icons.Filled.Cookie
}

/** One meal: a ring around its icon showing calories against that meal's budget, then its foods. */
@Composable
private fun MealSection(type: MealType, items: List<FeedPost>, budget: Int, onAdd: () -> Unit) {
    val haptics = rememberHaptics()
    val eaten = items.sumOf { it.calories }
    val fraction by animateFloatAsState(
        if (budget > 0) (eaten.toFloat() / budget).coerceIn(0f, 1f) else 0f,
        tween(800, easing = FastOutSlowInEasing), label = type.name,
    )
    val track = MaterialTheme.colorScheme.surfaceContainerHigh
    val fill = if (budget > 0 && eaten > budget * 1.15) Apricot else MaterialTheme.colorScheme.primary

    Column(Modifier.fillMaxWidth().pressable(onClick = onAdd)) {
        Row(Modifier.padding(start = Gutter, end = 12.dp, top = 14.dp, bottom = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(56.dp), contentAlignment = Alignment.Center) {
                Canvas(Modifier.fillMaxSize()) {
                    val stroke = 5.dp.toPx()
                    val inset = stroke / 2
                    val s = Size(size.width - stroke, size.height - stroke)
                    drawArc(track, -90f, 360f, false, Offset(inset, inset), s, style = Stroke(stroke))
                    if (fraction > 0f) drawArc(fill, -90f, 360f * fraction, false, Offset(inset, inset), s, style = Stroke(stroke, cap = StrokeCap.Round))
                }
                Icon(type.icon(), null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(24.dp))
            }
            Column(Modifier.weight(1f).padding(start = 16.dp)) {
                Text(type.label, style = MaterialTheme.typography.titleMedium)
                Text(
                    if (budget > 0) "${formatKcal(eaten)} / ${formatKcal(budget)} kcal" else "${formatKcal(eaten)} kcal",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            FilledIconButton(
                onClick = { haptics.tick(); onAdd() },
                modifier = Modifier.size(44.dp),
                colors = IconButtonDefaults.filledIconButtonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
            ) { Icon(Icons.Filled.Add, contentDescription = "Add to ${type.label}") }
        }
        items.forEach { meal -> FoodLine(meal) }
        if (items.isNotEmpty()) Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun FoodLine(meal: FeedPost) {
    val macros = listOfNotNull(
        meal.protein.takeIf { it > 0 }?.let { "P $it g" },
        meal.carbs.takeIf { it > 0 }?.let { "C $it g" },
        meal.fat.takeIf { it > 0 }?.let { "F $it g" },
    ).joinToString("  ")
    Row(Modifier.fillMaxWidth().padding(start = Gutter + 72.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        if (meal.photo != null) {
            MealPhoto(meal.photo, Modifier.size(32.dp).clip(MaterialTheme.shapes.small))
            Spacer(Modifier.width(10.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(meal.description.ifBlank { meal.mealType.label }, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            if (macros.isNotEmpty()) Text(macros, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Text("${formatKcal(meal.calories)} kcal", style = MaterialTheme.typography.labelLarge, textAlign = TextAlign.End)
        IconButton(onClick = { SocialRepository.deletePost(meal) }) {
            Icon(Icons.Filled.Close, contentDescription = "Remove ${meal.description}", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
        }
    }
}

