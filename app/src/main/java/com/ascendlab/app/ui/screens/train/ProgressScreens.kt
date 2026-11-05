package com.ascendlab.app.ui.screens.train

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.data.ExerciseLibrary
import com.ascendlab.app.data.ExerciseRecords
import com.ascendlab.app.data.LoggedSet
import com.ascendlab.app.data.Muscle
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SetType
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.data.Units
import com.ascendlab.app.data.WorkoutMath
import com.ascendlab.app.data.WorkoutRecord
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.LineChart
import com.ascendlab.app.ui.components.PageHeader
import com.ascendlab.app.ui.components.SectionTitle
import com.ascendlab.app.ui.components.SkeletonCard
import com.ascendlab.app.ui.components.pressable
import com.ascendlab.app.ui.components.rememberHaptics
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.theme.Apricot
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private const val DAY_MS = 24L * 3600 * 1000

@Composable
private fun units(): Units = ProfileRepository.profile.collectAsState().value?.units ?: Units.METRIC

private fun kg(v: Double, units: Units) = WorkoutMath.formatWeight(v, units)

private fun setLabel(s: LoggedSet, units: Units) =
    if (s.weightKg > 0) "${kg(s.weightKg, units)} × ${s.reps}" else "${s.reps} reps"

/** A row of plain numbers with small labels underneath, used at the top of detail pages. */
@Composable
private fun StatRow(vararg stats: Pair<String, String>) {
    Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 10.dp)) {
        stats.forEach { (label, value) ->
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.titleMedium)
            }
        }
    }
}

// ---------------------------------------------------------------- Workout detail

@Composable
fun WorkoutDetailScreen(navController: NavHostController, workoutId: String, vm: TrainViewModel = viewModel()) {
    val history by vm.history.collectAsStateWithLifecycle()
    val units = units()
    val workout = history?.firstOrNull { it.id == workoutId }
    var menu by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    Column(Modifier.fillMaxSize()) {
        PageHeader(workout?.title ?: "Workout", onBack = { navController.popBackStack() }) {
            Box {
                IconButton(onClick = { menu = true }) { Icon(Icons.Filled.MoreVert, "More") }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Delete workout") }, onClick = { menu = false; confirmDelete = true })
                }
            }
        }
        when {
            history == null -> SkeletonCard()
            workout == null -> Text("This workout was deleted.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(Gutter))
            else -> LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                item {
                    Text(
                        SimpleDateFormat("EEEE d MMMM yyyy, HH:mm", Locale.getDefault()).format(Date(workout.startedAt)),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = Gutter),
                    )
                }
                item {
                    StatRow(
                        "Time" to WorkoutMath.formatDuration(workout.durationSec),
                        "Volume" to WorkoutMath.formatVolume(workout.volumeKg, units),
                        "Sets" to "${workout.setCount}",
                        "Records" to "${workout.records}",
                    )
                    Hairline()
                }
                items(workout.exercises) { e ->
                    Column(Modifier.padding(vertical = 12.dp)) {
                        Text(
                            e.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.pressable { navController.navigate(Routes.exerciseDetail(e.exerciseId, e.name)) }
                                .padding(horizontal = Gutter, vertical = 4.dp),
                        )
                        Row(Modifier.padding(horizontal = Gutter, vertical = 4.dp)) {
                            Text("SET", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.width(48.dp))
                            Text("WEIGHT & REPS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        var normal = 0
                        e.sets.forEach { s ->
                            if (s.type == SetType.NORMAL) normal++
                            Row(Modifier.padding(horizontal = Gutter, vertical = 4.dp)) {
                                SetBadge(s.type, normal, Modifier.width(48.dp))
                                Text(setLabel(s, units), style = MaterialTheme.typography.bodyLarge)
                            }
                        }
                    }
                    Hairline()
                }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete this workout?") },
            text = { Text("It's removed from your history and stats. A post in the feed stays until you delete it there.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    TrainRepository.deleteWorkout(workoutId)
                    navController.popBackStack()
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        )
    }
}

/** "1", "2"… for normal sets, or a coloured W / F / D for the other set types. */
@Composable
fun SetBadge(type: SetType, normalIndex: Int, modifier: Modifier = Modifier) {
    val (text, color) = when (type) {
        SetType.NORMAL -> "$normalIndex" to MaterialTheme.colorScheme.onSurface
        SetType.WARMUP -> "W" to Apricot
        SetType.FAILURE -> "F" to MaterialTheme.colorScheme.error
        SetType.DROP -> "D" to MaterialTheme.colorScheme.primary
    }
    Text(text, style = MaterialTheme.typography.titleSmall, color = color, fontWeight = FontWeight.SemiBold, modifier = modifier)
}

// ---------------------------------------------------------------- Exercise detail

private enum class Metric(val label: String) { HEAVIEST("Heaviest weight"), ONE_RM("Best 1RM"), SESSION_VOLUME("Session volume"), REPS("Most reps") }

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailScreen(navController: NavHostController, exerciseId: String, fallbackName: String, vm: TrainViewModel = viewModel()) {
    val history by vm.history.collectAsStateWithLifecycle()
    val units = units()
    val exercise = ExerciseLibrary.find(exerciseId)
    val name = exercise?.name ?: fallbackName.ifBlank { "Exercise" }
    var tab by remember { mutableIntStateOf(0) }
    val haptics = rememberHaptics()

    // Oldest first, only sessions that include this exercise.
    val sessions = remember(history) {
        history.orEmpty().mapNotNull { w -> w.exercises.firstOrNull { it.exerciseId == exerciseId }?.let { w to it.sets } }.reversed()
    }
    val records = remember(sessions) { ExerciseRecords.from(sessions.map { it.second }) }

    Column(Modifier.fillMaxSize()) {
        PageHeader(name, onBack = { navController.popBackStack() })
        exercise?.let {
            Text(
                "${it.muscle.label} · ${it.equipment.label}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Gutter),
            )
        }
        PrimaryTabRow(
            selectedTabIndex = tab,
            containerColor = MaterialTheme.colorScheme.background,
            modifier = Modifier.padding(top = 8.dp),
        ) {
            listOf("Summary", "History", "Records").forEachIndexed { i, t ->
                Tab(selected = tab == i, onClick = { haptics.tick(); tab = i }, text = { Text(t) })
            }
        }
        if (history == null) {
            SkeletonCard()
        } else if (sessions.isEmpty()) {
            Text(
                "No sets logged yet. Do this exercise in a workout to see your progress here.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(Gutter),
            )
        } else when (tab) {
            0 -> ExerciseSummary(sessions, records, units)
            1 -> ExerciseHistory(sessions.reversed(), units) { navController.navigate(Routes.workoutDetail(it)) }
            else -> ExerciseRecordsTab(records, units)
        }
    }
}

@Composable
private fun ExerciseSummary(sessions: List<Pair<WorkoutRecord, List<LoggedSet>>>, records: ExerciseRecords, units: Units) {
    val bodyweight = records.heaviestKg <= 0.0
    var metric by remember { mutableStateOf(if (bodyweight) Metric.REPS else Metric.HEAVIEST) }
    val fmt = remember { SimpleDateFormat("d MMM", Locale.getDefault()) }
    val points = sessions.map { (w, sets) ->
        val counted = sets.filter { it.countsForRecords }
        val v = when (metric) {
            Metric.HEAVIEST -> counted.maxOfOrNull { it.weightKg } ?: 0.0
            Metric.ONE_RM -> counted.maxOfOrNull { it.oneRepMax } ?: 0.0
            Metric.SESSION_VOLUME -> counted.sumOf { it.volume }
            Metric.REPS -> (counted.maxOfOrNull { it.reps } ?: 0).toDouble()
        }
        w.finishedAt to v
    }
    fun show(v: Double) = when (metric) {
        Metric.REPS -> "${v.toInt()} reps"
        Metric.SESSION_VOLUME -> WorkoutMath.formatVolume(v, units)
        else -> kg(v, units)
    }

    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            LazyRow(contentPadding = PaddingValues(horizontal = Gutter, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(Metric.entries.filter { !bodyweight || it == Metric.REPS }) { m ->
                    FilterChip(selected = metric == m, onClick = { metric = m }, label = { Text(m.label) })
                }
            }
        }
        item {
            Box(Modifier.padding(horizontal = Gutter)) {
                if (points.size >= 2) {
                    LineChart(points = points, pointLabel = { (at, v) -> "${fmt.format(Date(at))}: ${show(v)}" })
                } else {
                    Text("Log this exercise in one more workout to draw your progress line.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item { SectionTitle("Personal records") }
        val rows = buildList {
            if (!bodyweight) {
                add("Heaviest weight" to kg(records.heaviestKg, units))
                add("Best 1RM (estimated)" to kg(records.best1RmKg, units))
                add("Best set volume" to WorkoutMath.formatVolume(records.bestSetVolumeKg, units))
                add("Best session volume" to WorkoutMath.formatVolume(records.bestSessionVolumeKg, units))
            }
            add("Most reps in a set" to "${records.mostReps}")
            add("Workouts" to "${sessions.size}")
        }
        items(rows) { (label, value) ->
            Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.EmojiEvents, null, tint = Apricot, modifier = Modifier.size(18.dp))
                Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f).padding(start = 12.dp))
                Text(value, style = MaterialTheme.typography.titleSmall)
            }
            Hairline(Modifier.padding(start = Gutter + 30.dp))
        }
    }
}

@Composable
private fun ExerciseHistory(sessions: List<Pair<WorkoutRecord, List<LoggedSet>>>, units: Units, onOpen: (String) -> Unit) {
    val fmt = remember { SimpleDateFormat("EEE d MMM yyyy", Locale.getDefault()) }
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
        items(sessions, key = { it.first.id }) { (w, sets) ->
            Column(Modifier.fillMaxWidth().pressable { onOpen(w.id) }.padding(horizontal = Gutter, vertical = 12.dp)) {
                Text(w.title, style = MaterialTheme.typography.titleSmall)
                Text(fmt.format(Date(w.finishedAt)), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(6.dp))
                var normal = 0
                sets.forEach { s ->
                    if (s.type == SetType.NORMAL) normal++
                    Row(Modifier.padding(vertical = 2.dp)) {
                        SetBadge(s.type, normal, Modifier.width(32.dp))
                        Text(setLabel(s, units), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            Hairline()
        }
    }
}

@Composable
private fun ExerciseRecordsTab(records: ExerciseRecords, units: Units) {
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            Text(
                "Heaviest weight you've lifted for each number of reps.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Gutter, vertical = 12.dp),
            )
        }
        item {
            Row(Modifier.padding(horizontal = Gutter, vertical = 4.dp)) {
                Text("REPS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
                Text("BEST WEIGHT", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        val rows = records.byReps.entries.sortedBy { it.key }.filter { it.value > 0 }
        if (rows.isEmpty()) {
            item { Text("No weighted sets yet.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(Gutter)) }
        }
        items(rows) { (reps, w) ->
            Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 12.dp)) {
                Text("$reps rep${if (reps == 1) "" else "s"}", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                Text(kg(w, units), style = MaterialTheme.typography.titleSmall)
            }
            Hairline(Modifier.padding(start = Gutter))
        }
    }
}

// ---------------------------------------------------------------- Statistics

private enum class Range(val label: String, val days: Int?) { MONTH("30 days", 30), QUARTER("3 months", 91), YEAR("Year", 365), ALL("All time", null) }

@Composable
fun StatisticsScreen(navController: NavHostController, vm: TrainViewModel = viewModel()) {
    val history by vm.history.collectAsStateWithLifecycle()
    val units = units()
    var range by remember { mutableStateOf(Range.MONTH) }
    val now = System.currentTimeMillis()
    val all = history.orEmpty()
    val week = all.filter { it.finishedAt >= now - 7 * DAY_MS }
    val inRange = range.days?.let { d -> all.filter { it.finishedAt >= now - d * DAY_MS } } ?: all

    val setsPerMuscle = inRange.flatMap { w -> w.exercises.map { ExerciseLibrary.muscleOf(it.exerciseId) to it.sets.count { s -> s.type != SetType.WARMUP } } }
        .groupBy({ it.first }, { it.second }).mapValues { it.value.sum() }
        .filterValues { it > 0 }.entries.sortedByDescending { it.value }
    val mainExercises = inRange.flatMap { w -> w.exercises.map { it.exerciseId to it.name } }
        .groupingBy { it }.eachCount().entries.sortedByDescending { it.value }.take(6)

    Column(Modifier.fillMaxSize()) {
        PageHeader("Statistics", onBack = { navController.popBackStack() })
        if (history == null) SkeletonCard() else LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
            item { SectionTitle("Last 7 days") }
            item {
                StatRow(
                    "Workouts" to "${week.size}",
                    "Time" to WorkoutMath.formatDuration(week.sumOf { it.durationSec }),
                    "Volume" to WorkoutMath.formatVolume(week.sumOf { it.volumeKg }, units),
                    "Sets" to "${week.sumOf { it.setCount }}",
                )
            }
            item {
                Row(
                    Modifier.fillMaxWidth().pressable { navController.navigate(Routes.CALENDAR) }.padding(horizontal = Gutter, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Workout calendar", style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Hairline()
            }
            item {
                LazyRow(contentPadding = PaddingValues(horizontal = Gutter, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(Range.entries) { r -> FilterChip(selected = range == r, onClick = { range = r }, label = { Text(r.label) }) }
                }
            }
            item { SectionTitle("Sets per muscle group") }
            if (setsPerMuscle.isEmpty()) {
                item { Text("No sets in this period.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = Gutter, vertical = 8.dp)) }
            } else {
                val max = setsPerMuscle.first().value
                items(setsPerMuscle) { (muscle, count) -> MuscleBar(muscle, count, max) }
            }
            item { SectionTitle("Main exercises") }
            items(mainExercises) { (ex, count) ->
                Row(
                    Modifier.fillMaxWidth().pressable { navController.navigate(Routes.exerciseDetail(ex.first, ex.second)) }
                        .padding(horizontal = Gutter, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(ex.second, style = MaterialTheme.typography.bodyLarge, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(ExerciseLibrary.muscleOf(ex.first).label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Text("$count workout${if (count == 1) "" else "s"}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Hairline(Modifier.padding(start = Gutter))
            }
        }
    }
}

/** One horizontal bar: label, a thin rounded bar sized against the busiest muscle, and the count. */
@Composable
private fun MuscleBar(muscle: Muscle, count: Int, max: Int) {
    val fill by animateFloatAsState(count.toFloat() / max.coerceAtLeast(1), tween(700), label = muscle.name)
    Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(muscle.label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.width(88.dp))
        Box(Modifier.weight(1f).height(8.dp)) {
            Box(Modifier.fillMaxHeight().fillMaxWidth(fill).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
        }
        Text("$count", style = MaterialTheme.typography.titleSmall, textAlign = TextAlign.End, modifier = Modifier.width(40.dp))
    }
}

// ---------------------------------------------------------------- Calendar

@Composable
fun CalendarScreen(navController: NavHostController, vm: TrainViewModel = viewModel()) {
    val history by vm.history.collectAsStateWithLifecycle()
    var offset by remember { mutableIntStateOf(0) } // months back from now
    val haptics = rememberHaptics()
    val month = Calendar.getInstance().apply { set(Calendar.DAY_OF_MONTH, 1); add(Calendar.MONTH, -offset) }
    val y = month.get(Calendar.YEAR); val m = month.get(Calendar.MONTH)
    val inMonth = history.orEmpty().filter { w ->
        Calendar.getInstance().apply { timeInMillis = w.finishedAt }.let { it.get(Calendar.YEAR) == y && it.get(Calendar.MONTH) == m }
    }
    val days = inMonth.map { Calendar.getInstance().apply { timeInMillis = it.finishedAt }.get(Calendar.DAY_OF_MONTH) }.toSet()
    val today = Calendar.getInstance()
    val isThisMonth = offset == 0
    val leading = (month.get(Calendar.DAY_OF_WEEK) + 5) % 7 // Monday-first
    val count = month.getActualMaximum(Calendar.DAY_OF_MONTH)

    Column(Modifier.fillMaxSize()) {
        PageHeader("Calendar", onBack = { navController.popBackStack() })
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { haptics.tick(); offset++ }) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, "Previous month") }
            Text(
                SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(month.time),
                style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.Center, modifier = Modifier.weight(1f),
            )
            IconButton(onClick = { haptics.tick(); offset-- }, enabled = offset > 0) { Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, "Next month") }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 8.dp)) {
            listOf("M", "T", "W", "T", "F", "S", "S").forEach {
                Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
            }
        }
        val cells = List(leading) { 0 } + (1..count).toList()
        cells.chunked(7).forEach { row ->
            Row(Modifier.fillMaxWidth().padding(horizontal = Gutter)) {
                (row + List(7 - row.size) { 0 }).forEach { d ->
                    Box(Modifier.weight(1f).aspectRatio(1f).padding(4.dp), contentAlignment = Alignment.Center) {
                        if (d > 0) {
                            val trained = d in days
                            val isToday = isThisMonth && d == today.get(Calendar.DAY_OF_MONTH)
                            Box(
                                Modifier.fillMaxSize().clip(CircleShape)
                                    .background(if (trained) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.background),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "$d",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (isToday) FontWeight.Bold else FontWeight.Normal,
                                    color = when {
                                        trained -> MaterialTheme.colorScheme.onPrimary
                                        isToday -> MaterialTheme.colorScheme.primary
                                        else -> MaterialTheme.colorScheme.onSurface
                                    },
                                )
                            }
                        }
                    }
                }
            }
        }
        Text(
            "${inMonth.size} workout${if (inMonth.size == 1) "" else "s"} on ${days.size} day${if (days.size == 1) "" else "s"}",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = Gutter, vertical = 16.dp),
        )
    }
}

// ---------------------------------------------------------------- Exercise library

@Composable
fun ExerciseLibraryScreen(navController: NavHostController, vm: TrainViewModel = viewModel()) {
    val history by vm.history.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }
    var muscle by remember { mutableStateOf<Muscle?>(null) }
    val sessionsById = remember(history) {
        history.orEmpty().flatMap { w -> w.exercises.map { it.exerciseId } }.groupingBy { it }.eachCount()
    }
    val results = ExerciseLibrary.all.filter { e ->
        (muscle == null || e.muscle == muscle) &&
            (query.isBlank() || query.trim().split(" ").all { e.name.contains(it, ignoreCase = true) })
    }

    Column(Modifier.fillMaxSize()) {
        PageHeader("Exercises", onBack = { navController.popBackStack() })
        OutlinedTextField(
            value = query,
            onValueChange = { query = it.take(40) },
            placeholder = { Text("Search exercises") },
            leadingIcon = { Icon(Icons.Filled.Search, null) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 4.dp),
        )
        LazyRow(contentPadding = PaddingValues(horizontal = Gutter, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { FilterChip(selected = muscle == null, onClick = { muscle = null }, label = { Text("All") }) }
            items(Muscle.entries.filter { it != Muscle.OTHER }) { m ->
                FilterChip(selected = muscle == m, onClick = { muscle = if (muscle == m) null else m }, label = { Text(m.label) })
            }
        }
        LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
            items(results, key = { it.id }) { e ->
                Row(
                    Modifier.fillMaxWidth().pressable { navController.navigate(Routes.exerciseDetail(e.id, e.name)) }
                        .padding(horizontal = Gutter, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(e.name, style = MaterialTheme.typography.bodyLarge)
                        Text("${e.muscle.label} · ${e.equipment.label}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    sessionsById[e.id]?.let {
                        Text("$it×", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    }
                }
                Hairline(Modifier.padding(start = Gutter))
            }
        }
    }
}
