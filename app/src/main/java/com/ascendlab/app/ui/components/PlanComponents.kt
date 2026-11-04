package com.ascendlab.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.ascendlab.app.data.Goal
import com.ascendlab.app.data.NutritionTargets
import com.ascendlab.app.data.TrainingWeek
import com.ascendlab.app.ui.theme.Apricot
import com.ascendlab.app.ui.theme.LightGray
import com.ascendlab.app.ui.theme.MintGreen
import kotlinx.coroutines.delay
import java.text.NumberFormat

private val DayLetters = listOf("M", "T", "W", "T", "F", "S", "S")
private val DayNames = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

fun formatKcal(value: Int): String = NumberFormat.getIntegerInstance().format(value)

@Composable
private fun PlanCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
    ) { Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { content() } }
}

/** A number that counts up from [from] to [value] (or from its previous value when it changes). */
@Composable
fun CountingNumber(value: Int, from: Int = 0, style: androidx.compose.ui.text.TextStyle, color: Color = Color.Unspecified) {
    val animated = remember { Animatable(from.toFloat()) }
    LaunchedEffect(value) { animated.animateTo(value.toFloat(), tween(1200, easing = FastOutSlowInEasing)) }
    Text(
        formatKcal(animated.value.toInt()),
        style = style,
        color = color,
        modifier = Modifier.semantics { contentDescription = formatKcal(value) },
    )
}

/** Daily calories in big counting numbers, with a plain-language reason for that number. */
@Composable
fun CalorieCard(targets: NutritionTargets, goal: Goal, modifier: Modifier = Modifier) {
    PlanCard(modifier) {
        Text("Daily calorie target", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(verticalAlignment = Alignment.Bottom) {
            CountingNumber(targets.calories, style = MaterialTheme.typography.displayMedium, color = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.width(8.dp))
            Text("kcal a day", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(bottom = 8.dp))
        }
        Text(calorieReason(targets, goal), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

fun calorieReason(t: NutritionTargets, goal: Goal): String {
    val normal = "Your body uses about ${formatKcal(t.maintenance)} kcal on a normal day."
    return when (goal) {
        // Normally the target is 20% under maintenance. When that would drop below a safe
        // minimum, the minimum is used instead, so the explanation changes too.
        Goal.LOSE_FAT -> if (t.calories <= t.maintenance * 0.81) {
            "$normal Eating a little less than that means steady fat loss without going hungry."
        } else {
            "$normal We keep your target at a safe minimum, so you lose fat gently and stay energised."
        }
        Goal.BUILD_MUSCLE -> "$normal Eating a bit more than that gives your muscles the extra energy they need to grow."
        Goal.GET_FIT -> "$normal Eating about that much keeps your weight steady while you get fitter."
    }
}

/** Protein, carbs and fat in grams, each with a bar that fills in turn and one line on what it does. */
@Composable
fun MacroCard(targets: NutritionTargets, modifier: Modifier = Modifier) {
    val macros = listOf(
        Triple("Protein", targets.proteinG, "Builds and repairs muscle") to targets.proteinG * 4,
        Triple("Carbs", targets.carbsG, "Your main fuel for training") to targets.carbsG * 4,
        Triple("Fat", targets.fatG, "Keeps hormones and energy steady") to targets.fatG * 9,
    )
    val colors = listOf(MintGreen, Apricot, LightGray)
    val total = macros.sumOf { it.second }.coerceAtLeast(1)

    PlanCard(modifier) {
        Text("Your daily macros", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        macros.forEachIndexed { i, (macro, kcal) ->
            val (name, grams, purpose) = macro
            val fill = remember { Animatable(0f) }
            LaunchedEffect(grams) {
                delay(250L * i)
                fill.animateTo(kcal / total.toFloat(), tween(900, easing = FastOutSlowInEasing))
            }
            Column(
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.clearAndSetSemantics { contentDescription = "$name: $grams grams a day. $purpose." },
            ) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
                    Text(name, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Text("$grams g", style = MaterialTheme.typography.titleMedium)
                }
                Box(Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceContainerHigh)) {
                    Box(Modifier.fillMaxHeight().fillMaxWidth(fill.value).clip(CircleShape).background(colors[i]))
                }
                Text(purpose, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

/** The week at a glance (training days pop in one by one), then each session in words. */
@Composable
fun WeekCard(week: TrainingWeek, modifier: Modifier = Modifier) {
    val trainingDays = week.days.associateBy { it.dayIndex }
    PlanCard(modifier) {
        Text("Your training week", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Row(
            Modifier.fillMaxWidth().clearAndSetSemantics {
                contentDescription = "Training on " + week.days.joinToString { DayNames[it.dayIndex] }
            },
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            DayLetters.forEachIndexed { i, letter ->
                val training = i in trainingDays
                val pop = remember { Animatable(if (training) 0f else 1f) }
                LaunchedEffect(training) {
                    if (training) {
                        delay(120L * i)
                        pop.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow))
                    } else {
                        pop.snapTo(1f)
                    }
                }
                Box(
                    Modifier
                        .weight(1f)
                        .aspectRatio(1f)
                        .graphicsLayer { scaleX = pop.value; scaleY = pop.value }
                        .clip(CircleShape)
                        .background(if (training) MaterialTheme.colorScheme.primary else Color.Transparent)
                        .border(1.dp, if (training) Color.Transparent else MaterialTheme.colorScheme.outlineVariant, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        letter,
                        style = MaterialTheme.typography.labelLarge,
                        color = if (training) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Text(
            "${week.days.size} sessions · about ${week.minutesPerSession} min each · rest on the other days",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(4.dp))
        Text(week.splitName, style = MaterialTheme.typography.titleMedium)
        Text(week.splitExplanation, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        week.days.forEach { day ->
            Row(verticalAlignment = Alignment.Top) {
                Text(
                    DayNames[day.dayIndex].take(3),
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.width(44.dp),
                )
                Column {
                    Text(day.title, style = MaterialTheme.typography.bodyLarge)
                    Text(day.focus, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        // Lighter than the card behind it so the note stands out.
        HelpNote("Each exercise: ${week.setsAndReps}.", containerColor = MaterialTheme.colorScheme.surfaceContainerHigh)
    }
}
