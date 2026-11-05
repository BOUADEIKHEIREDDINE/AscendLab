package com.ascendlab.app.ui.screens.profile

import com.ascendlab.app.ui.components.MealPhoto
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material3.OutlinedButton
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.data.BodyChecks
import com.ascendlab.app.data.BodyRepository
import com.ascendlab.app.data.Convert
import com.ascendlab.app.data.PlanCalculator
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SocialRepository
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.data.Units
import com.ascendlab.app.data.WeightEntry
import com.ascendlab.app.ui.components.Avatar
import com.ascendlab.app.ui.components.BarChart
import com.ascendlab.app.ui.components.FeedCard
import com.ascendlab.app.ui.components.LineChart
import com.ascendlab.app.ui.components.PostCard
import com.ascendlab.app.ui.components.SectionTitle
import com.ascendlab.app.ui.components.Skeleton
import com.ascendlab.app.ui.components.TabHeader
import com.ascendlab.app.ui.components.formatKcal
import com.ascendlab.app.ui.components.pressable
import com.ascendlab.app.ui.components.rememberHaptics
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.screens.home.FeedViewModel
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

private const val WEEKS_SHOWN = 8

/** Weekly workout counts, oldest first, plus the current week streak. */
private data class WorkoutStats(val total: Int, val capped: Boolean, val perWeek: List<Int>, val weekStarts: List<Long>, val streak: Int) {
    val thisWeek get() = perWeek.lastOrNull() ?: 0
}

private fun weekStart(t: Long): Long = Calendar.getInstance().apply {
    timeInMillis = t
    firstDayOfWeek = Calendar.MONDAY
    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    val shift = (get(Calendar.DAY_OF_WEEK) + 5) % 7 // days since Monday
    add(Calendar.DAY_OF_YEAR, -shift)
}.timeInMillis

private fun statsFrom(times: List<Long>, limit: Int): WorkoutStats {
    val week = 7L * 24 * 3600 * 1000
    val now = System.currentTimeMillis()
    val current = weekStart(now)
    // Each week start is re-normalised with weekStart(): plain "minus 7 days in ms" drifts by
    // an hour across a daylight-saving change and would miss every week before it.
    val starts = (WEEKS_SHOWN - 1 downTo 0).map { weekStart(now - it * week) }
    val byWeek = times.groupingBy { weekStart(it) }.eachCount()
    // A streak counts back from this week; an empty current week doesn't break it yet.
    fun previous(w: Long) = weekStart(w - 3 * 24 * 3600 * 1000L)
    var streak = 0
    var w = if ((byWeek[current] ?: 0) > 0) current else previous(current)
    while ((byWeek[w] ?: 0) > 0) { streak++; w = previous(w) }
    return WorkoutStats(times.size, times.size >= limit, starts.map { byWeek[it] ?: 0 }, starts, streak)
}

@Composable
fun ProfileScreen(navController: NavHostController, feedVm: FeedViewModel = viewModel()) {
    val profile by ProfileRepository.profile.collectAsState()
    val me by SocialRepository.me.collectAsState()
    val feed by feedVm.feed.collectAsStateWithLifecycle()
    val weights by remember { BodyRepository.weights() }.collectAsStateWithLifecycle(initialValue = null)
    var stats by remember { mutableStateOf<WorkoutStats?>(null) }
    var loggingWeight by remember { mutableStateOf(false) }
    val units = profile?.units ?: Units.METRIC
    val allMyPosts by remember { SocialRepository.myPosts() }.collectAsStateWithLifecycle(initialValue = null)

    LaunchedEffect(Unit) {
        if (profile == null) ProfileRepository.load()
        runCatching { SocialRepository.ensureMe() }
        stats = statsFrom(TrainRepository.workoutTimes(200), 200)
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            TabHeader(me?.name ?: "Profile") {
                IconButton(onClick = { navController.navigate(Routes.SETTINGS) }) { Icon(Icons.Filled.Settings, "Settings") }
            }
        }

        // Avatar, then the numbers that matter, the way social profiles do it.
        item {
            val s = stats
            Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                val name = me?.name
                if (name != null) Avatar(name, me!!.uid, size = 76) else Skeleton(Modifier.width(76.dp), height = 76.dp, corner = 38.dp)
                Row(Modifier.weight(1f).padding(start = 16.dp)) {
                    HeaderStat(s?.let { if (it.capped) "${it.total}+" else "${it.total}" }, "workouts", Modifier.weight(1f))
                    HeaderStat(s?.streak?.toString(), "week streak", Modifier.weight(1f))
                    HeaderStat(me?.friends?.size?.toString(), "friends", Modifier.weight(1f)) { navController.navigate(Routes.FRIENDS) }
                }
            }
        }
        item {
            // Dashboard: the doors to everything you've logged.
            Row(Modifier.padding(horizontal = Gutter, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                DashButton(Icons.Filled.BarChart, "Statistics", Modifier.weight(1f)) { navController.navigate(Routes.STATISTICS) }
                DashButton(Icons.Filled.FitnessCenter, "Exercises", Modifier.weight(1f)) { navController.navigate(Routes.EXERCISE_LIBRARY) }
                DashButton(Icons.Filled.CalendarMonth, "Calendar", Modifier.weight(1f)) { navController.navigate(Routes.CALENDAR) }
                DashButton(Icons.Filled.Groups, "Compare", Modifier.weight(1f)) { navController.navigate(Routes.COMPARE) }
            }
        }

        item {
            SectionTitle("Workouts per week")
        }
        item {
            val s = stats
            Box(Modifier.padding(horizontal = Gutter, vertical = 8.dp)) {
                if (s == null) {
                    Skeleton(Modifier.fillMaxWidth(), height = 140.dp)
                } else {
                    val fmt = remember { SimpleDateFormat("d/M", Locale.getDefault()) }
                    BarChart(
                        values = s.perWeek,
                        labels = s.weekStarts.map { fmt.format(Date(it)) },
                        valueLabel = { i, v ->
                            val label = if (i == s.perWeek.lastIndex) "This week" else "Week of ${fmt.format(Date(s.weekStarts[i]))}"
                            val goal = profile?.daysPerWeek?.takeIf { i == s.perWeek.lastIndex }?.let { " of $it planned" } ?: ""
                            "$label: $v workout${if (v == 1) "" else "s"}$goal"
                        },
                    )
                }
            }
        }

        item {
            SectionTitle("Body weight") {
                if (!weights.isNullOrEmpty()) {
                    TextButton(onClick = { loggingWeight = true }) { Icon(Icons.Filled.Add, null); Text(" Log") }
                }
            }
        }
        item { WeightCard(weights, profile?.weightKg, units) { loggingWeight = true } }

        profile?.takeIf { it.hasEverythingForPlan }?.let { p ->
            val t = PlanCalculator.nutrition(p)
            item { SectionTitle("Goal") }
            item {
                Row(
                    Modifier.fillMaxWidth().pressable { navController.navigate(Routes.EDIT_GOALS) }.padding(horizontal = Gutter, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(p.goal?.label ?: "", style = MaterialTheme.typography.bodyLarge)
                        Text(
                            "${formatKcal(t.calories)} kcal · ${t.proteinG} g protein · ${p.daysPerWeek} days a week",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }

        // Instagram-style grid of everything you've posted.
        item { SectionTitle("Posts") }
        val grid = allMyPosts
        if (grid == null) {
            item { Skeleton(Modifier.fillMaxWidth().padding(horizontal = Gutter), height = 120.dp) }
        } else if (grid.isEmpty()) {
            item {
                Text(
                    "Your meals and workouts will show up here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Gutter, vertical = 8.dp),
                )
            }
        }
        items(grid.orEmpty().chunked(3)) { row ->
            Row(Modifier.fillMaxWidth().padding(bottom = 2.dp), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                row.forEach { post ->
                    GridTile(post, Modifier.weight(1f)) { navController.navigate(Routes.comments(post.id)) }
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }

    if (loggingWeight) {
        LogWeightDialog(units, current = weights?.lastOrNull()?.kg ?: profile?.weightKg, onDismiss = { loggingWeight = false })
    }
}

@Composable
private fun DashButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = modifier, contentPadding = PaddingValues(horizontal = 4.dp, vertical = 10.dp)) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null)
            Text(label, style = MaterialTheme.typography.labelMedium, modifier = Modifier.padding(top = 4.dp))
        }
    }
}

/** A square in the posts grid: the photo, or a small cover with the key number. */
@Composable
private fun GridTile(post: com.ascendlab.app.data.FeedPost, modifier: Modifier, onClick: () -> Unit) {
    Box(modifier.aspectRatio(1f).pressable(onClick = onClick)) {
        when {
            post.photo != null -> MealPhoto(post.photo, Modifier.matchParentSize())
            else -> Box(
                Modifier.matchParentSize().background(
                    androidx.compose.ui.graphics.Brush.linearGradient(
                        if (post.workout != null) listOf(androidx.compose.ui.graphics.Color(0xFF15302B), androidx.compose.ui.graphics.Color(0xFF1C2934))
                        else listOf(androidx.compose.ui.graphics.Color(0xFF1C3A3A), androidx.compose.ui.graphics.Color(0xFF2A2420)),
                    ),
                ),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(8.dp)) {
                    if (post.workout != null) {
                        Icon(Icons.Filled.FitnessCenter, null, tint = MaterialTheme.colorScheme.primary)
                        Text(post.workout.title, style = MaterialTheme.typography.labelLarge, color = androidx.compose.ui.graphics.Color.White, maxLines = 2, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    } else {
                        Text(formatKcal(post.calories), style = MaterialTheme.typography.titleLarge, color = androidx.compose.ui.graphics.Color.White)
                        Text("kcal · ${post.mealType.label.lowercase()}", style = MaterialTheme.typography.labelSmall, color = androidx.compose.ui.graphics.Color.White.copy(alpha = 0.7f))
                    }
                }
            }
        }
        if (post.commentCount > 0 || post.likes.isNotEmpty()) {
            Text(
                "♥ ${post.likes.size}",
                style = MaterialTheme.typography.labelSmall,
                color = androidx.compose.ui.graphics.Color.White,
                modifier = Modifier.align(Alignment.BottomStart).padding(6.dp),
            )
        }
    }
}

@Composable
private fun HeaderStat(value: String?, label: String, modifier: Modifier, onClick: (() -> Unit)? = null) {
    Column(
        (if (onClick != null) modifier.pressable(onClick = onClick) else modifier).padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (value != null) Text(value, style = MaterialTheme.typography.titleLarge)
        else Skeleton(Modifier.width(28.dp), height = 24.dp)
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun WeightCard(entries: List<WeightEntry>?, profileKg: Double?, units: Units, onLog: () -> Unit) {
    val fmt = remember { SimpleDateFormat("d MMM", Locale.getDefault()) }
    FeedCard {
        Column(Modifier.padding(horizontal = Gutter, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            when {
                entries == null -> Skeleton(Modifier.fillMaxWidth(), height = 120.dp)
                entries.isEmpty() -> {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(profileKg?.let { Convert.formatWeight(it, units) } ?: "–", style = MaterialTheme.typography.headlineSmall)
                            Text("Log your weight regularly to see the trend.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    FilledTonalButton(onClick = onLog, modifier = Modifier.fillMaxWidth()) { Text("Log today's weight") }
                }
                else -> {
                    val latest = entries.last()
                    val change = latest.kg - entries.first().kg
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(formatPrecise(latest.kg, units), style = MaterialTheme.typography.headlineSmall)
                        Spacer(Modifier.width(10.dp))
                        if (entries.size > 1) {
                            val sign = if (change > 0) "+" else if (change < 0) "−" else "±"
                            Text(
                                "$sign${formatPrecise(abs(change), units)} since ${fmt.format(Date(entries.first().at))}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 3.dp),
                            )
                        }
                    }
                    if (entries.size > 1) {
                        LineChart(
                            points = entries.map { it.at to it.kg },
                            pointLabel = { (at, kg) -> "${fmt.format(Date(at))}: ${formatPrecise(kg, units)}" },
                        )
                    } else {
                        Text("Log again on another day to start your trend line.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

private fun formatPrecise(kg: Double, units: Units): String {
    val v = if (units == Units.IMPERIAL) Convert.kgToLb(kg) else kg
    return "${(v * 10).roundToInt() / 10.0} ${units.weightUnit}"
}

@Composable
private fun LogWeightDialog(units: Units, current: Double?, onDismiss: () -> Unit) {
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()
    val initial = current?.let { if (units == Units.IMPERIAL) Convert.kgToLb(it) else it }?.let { ((it * 10).roundToInt() / 10.0).toString() }.orEmpty()
    var text by remember { mutableStateOf(initial) }
    val typed = text.replace(',', '.').toDoubleOrNull()
    val kg = typed?.let { if (units == Units.IMPERIAL) Convert.lbToKg(it) else it }
    val error = if (text.isEmpty()) null else BodyChecks.weight(kg, units)

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Log weight") },
        text = {
            OutlinedTextField(
                value = text,
                onValueChange = { v -> text = v.filter { it.isDigit() || it == '.' || it == ',' }.take(5) },
                suffix = { Text(units.weightUnit) },
                singleLine = true,
                isError = error != null,
                supportingText = { Text(error ?: "Weigh yourself at the same time of day for a fair trend.") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )
        },
        confirmButton = {
            TextButton(
                enabled = kg != null && error == null,
                onClick = {
                    val value = kg ?: return@TextButton
                    haptics.confirm()
                    scope.launch { BodyRepository.log(value) }
                    onDismiss()
                },
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
    )
}
