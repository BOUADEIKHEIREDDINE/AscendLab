package com.ascendlab.app.ui.screens.train

import com.ascendlab.app.ui.navigation.Routes
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material.icons.filled.EmojiEvents
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.ui.draw.scale
import com.ascendlab.app.ui.components.rememberHaptics
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.ActiveExercise
import com.ascendlab.app.data.ActiveWorkout
import com.ascendlab.app.data.ExerciseLibrary
import com.ascendlab.app.data.LoggedSet
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SetEntry
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.data.Units
import com.ascendlab.app.data.WorkoutMath
import com.ascendlab.app.data.Convert
import com.ascendlab.app.ui.components.FeedCard
import com.ascendlab.app.ui.theme.Apricot
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun WorkoutSessionScreen(navController: NavHostController) {
    val workout by TrainRepository.active.collectAsState()
    val units = ProfileRepository.profile.collectAsState().value?.units ?: Units.METRIC
    val history by produceState(emptyList<com.ascendlab.app.data.WorkoutRecord>()) { value = TrainRepository.loadHistory() }
    val previous = remember(history) {
        val map = mutableMapOf<String, List<LoggedSet>>()
        history.forEach { w -> w.exercises.forEach { e -> if (e.exerciseId !in map) map[e.exerciseId] = e.sets } }
        map
    }
    val records = remember(history) { TrainRepository.recordsByExercise(history) }
    var prBanner by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(prBanner) { if (prBanner != null) { delay(3500); prBanner = null } }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var picking by remember { mutableStateOf(false) }
    var finishing by remember { mutableStateOf(false) }
    var confirmDiscard by remember { mutableStateOf(false) }
    val haptics = rememberHaptics()

    LaunchedEffect(Unit) { while (true) { now = System.currentTimeMillis(); delay(1000) } }

    val w = workout
    if (w == null) {
        // Finished or discarded: leave the page.
        LaunchedEffect(Unit) { navController.popBackStack() }
        return
    }

    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize().imePadding()) {
        Row(Modifier.padding(start = 4.dp, end = 16.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) { Icon(Icons.Filled.KeyboardArrowDown, "Minimize") }
            Text(w.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f), maxLines = 1)
            Button(onClick = { finishing = true }) { Text("Finish") }
        }

        Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp)) {
            Stat("Duration", clock(((now - w.startedAt) / 1000).toInt()), Modifier.weight(1f))
            Stat("Volume", WorkoutMath.formatVolume(volumeKg(w, units), units), Modifier.weight(1f))
            Stat("Sets", "${w.doneSets}", Modifier.weight(1f))
        }

        w.restEndsAt?.let { end ->
            val left = ((end - now) / 1000).toInt()
            if (left <= 0) {
                LaunchedEffect(end) { haptics.heavy(); TrainRepository.update { it.copy(restEndsAt = null) } }
            }
        }

        Hairline(Modifier.padding(top = 8.dp))
        LazyColumn(
            Modifier.weight(1f),
            contentPadding = PaddingValues(bottom = 24.dp),
        ) {
            if (w.exercises.isEmpty()) {
                item {
                    Text(
                        "Add your first exercise to get going.",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(8.dp),
                    )
                }
            }
            itemsIndexed(w.exercises) { index, ex ->
                ExerciseCard(
                    ex, index, previous[ex.exerciseId], units,
                    records = records[ex.exerciseId],
                    onOpen = { navController.navigate(Routes.exerciseDetail(ex.exerciseId, ex.name)) },
                    onRecord = { label -> haptics.heavy(); prBanner = "New record: $label · ${ex.name}" },
                )
                Hairline()
            }
            item {
                Column(Modifier.padding(horizontal = Gutter, vertical = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { picking = true }, modifier = Modifier.fillMaxWidth().height(52.dp)) {
                        Icon(Icons.Filled.Add, null); Text("  Add exercise")
                    }
                    TextButton(onClick = { confirmDiscard = true }, modifier = Modifier.fillMaxWidth()) {
                        Text("Discard workout", color = MaterialTheme.colorScheme.error)
                    }
                }
            }
        }
        // Docked at the bottom so it never pushes the sets around while you tap.
        AnimatedVisibility(
            visible = w.restEndsAt != null && w.restEndsAt > now,
            enter = expandVertically() + fadeIn(),
            exit = shrinkVertically() + fadeOut(),
        ) {
            w.restEndsAt?.let { end -> RestBar(((end - now) / 1000).toInt().coerceAtLeast(0), w.restSeconds) }
        }
    }
        // Live personal-record alert: floats over the header like a toast, so the sets never move.
    AnimatedVisibility(
        visible = prBanner != null,
        enter = androidx.compose.animation.slideInVertically { -it } + fadeIn(),
        exit = androidx.compose.animation.slideOutVertically { -it } + fadeOut(),
        modifier = Modifier.align(Alignment.TopCenter),
    ) {
        Row(
            Modifier.fillMaxWidth().background(Apricot).padding(horizontal = Gutter, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.Filled.EmojiEvents, null, tint = MaterialTheme.colorScheme.onTertiary)
            Text(
                prBanner.orEmpty(),
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onTertiary,
                modifier = Modifier.padding(start = 12.dp),
            )
        }
    }

    }

    if (picking) {
        ExercisePickerDialog(
            onDismiss = { picking = false },
            onPick = { picked ->
                TrainRepository.update { cur ->
                    cur.copy(exercises = cur.exercises + picked.map { ActiveExercise(it.id, it.name, List(3) { SetEntry() }) })
                }
                picking = false
            },
        )
    }

    if (confirmDiscard) {
        AlertDialog(
            onDismissRequest = { confirmDiscard = false },
            title = { Text("Discard this workout?") },
            text = { Text("Nothing from this session will be saved.") },
            confirmButton = {
                TextButton(onClick = { confirmDiscard = false; TrainRepository.discard() }) { Text("Discard", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { confirmDiscard = false }) { Text("Keep training") } },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        )
    }

    if (finishing) FinishDialog(w, units, now, onDismiss = { finishing = false })
}

@Composable
private fun Stat(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun RestBar(secondsLeft: Int, total: Int) {
    Column(
        Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.primaryContainer).padding(horizontal = Gutter, vertical = 8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Timer, null, tint = MaterialTheme.colorScheme.primary)
            Text("  Rest  ${clock(secondsLeft)}", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
            TextButton(onClick = { TrainRepository.update { it.copy(restEndsAt = it.restEndsAt?.minus(15_000)) } }) { Text("−15") }
            TextButton(onClick = { TrainRepository.update { it.copy(restEndsAt = it.restEndsAt?.plus(15_000)) } }) { Text("+15") }
            TextButton(onClick = { TrainRepository.update { it.copy(restEndsAt = null) } }) { Text("Skip") }
        }
        LinearProgressIndicator(
            progress = { (secondsLeft.toFloat() / total).coerceIn(0f, 1f) },
            modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
            drawStopIndicator = {},
        )
    }
}

@Composable
private fun ExerciseCard(
    ex: ActiveExercise,
    index: Int,
    previous: List<LoggedSet>?,
    units: Units,
    records: com.ascendlab.app.data.ExerciseRecords?,
    onOpen: () -> Unit,
    onRecord: (String) -> Unit,
) {
    var menu by remember { mutableStateOf(false) }
    val bodyweight = ExerciseLibrary.find(ex.exerciseId)?.isBodyweight == true

    fun updateExercise(transform: (ActiveExercise) -> ActiveExercise) = TrainRepository.update { w ->
        w.copy(exercises = w.exercises.mapIndexed { i, e -> if (i == index) transform(e) else e })
    }

    FeedCard {
        Column(Modifier.padding(vertical = 12.dp)) {
            Row(Modifier.padding(start = Gutter, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    Text(
                        ex.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.clip(RoundedCornerShape(6.dp)).clickable(onClick = onOpen).padding(vertical = 4.dp),
                    )
                }
                Box {
                    IconButton(onClick = { menu = true }) { Icon(Icons.Filled.MoreVert, "More") }
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                        DropdownMenuItem(text = { Text("Remove exercise") }, onClick = {
                            menu = false
                            TrainRepository.update { w -> w.copy(exercises = w.exercises.filterIndexed { i, _ -> i != index }) }
                        })
                    }
                }
            }
            Row(Modifier.padding(horizontal = Gutter - 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Header("SET", Modifier.width(36.dp))
                Header("PREVIOUS", Modifier.weight(1.4f))
                Header(if (bodyweight) "+${units.weightUnit.uppercase()}" else units.weightUnit.uppercase(), Modifier.weight(1f))
                Header("REPS", Modifier.weight(1f))
                Spacer(Modifier.width(44.dp))
            }
            var normalCount = 0
            ex.sets.forEachIndexed { setIndex, set ->
                if (set.type == com.ascendlab.app.data.SetType.NORMAL) normalCount++
                val prev = previous?.getOrNull(setIndex)
                val prevWeight = prev?.weightKg?.takeIf { it > 0 }?.let { formatNumber(if (units == Units.IMPERIAL) Convert.kgToLb(it) else it) }
                val prevText = prev?.let { (prevWeight?.let { w -> "$w × " } ?: "") + "${it.reps}" } ?: "–"
                val repsHint = prev?.reps?.toString() ?: ex.targetReps?.toString() ?: ""
                SetRow(
                    number = normalCount,
                    set = set,
                    previous = prevText,
                    // Grey hint: last session's weight, else the set above (sets usually repeat the weight).
                    weightHint = prevWeight ?: ex.sets.getOrNull(setIndex - 1)?.weight?.takeIf { it.isNotEmpty() } ?: (if (bodyweight) "0" else ""),
                    repsHint = repsHint,
                    onChange = { s -> updateExercise { e -> e.copy(sets = e.sets.mapIndexed { i, old -> if (i == setIndex) s else old }) } },
                    onToggle = {
                        val nowDone = !set.done
                        // An empty box means "same as the grey hint", like Hevy.
                        val filled = set.copy(
                            weight = set.weight.ifEmpty { prevWeight ?: ex.sets.getOrNull(setIndex - 1)?.weight.orEmpty() },
                            reps = set.reps.ifEmpty { repsHint },
                            done = nowDone,
                        )
                        if (nowDone && filled.reps.isEmpty()) return@SetRow
                        if (nowDone && records != null) {
                            // Compare with history plus the sets already done today, so only real bests fire.
                            val toKg = { t: String -> (t.toDoubleOrNull() ?: 0.0).let { if (units == Units.IMPERIAL) Convert.lbToKg(it) else it } }
                            val today = ex.sets.filterIndexed { j, s -> j != setIndex && s.done }
                                .map { LoggedSet(toKg(it.weight), it.reps.toIntOrNull() ?: 0, it.type) }
                            val best = com.ascendlab.app.data.ExerciseRecords.from(listOf(today)).let { t ->
                                com.ascendlab.app.data.ExerciseRecords(
                                    heaviestKg = maxOf(records.heaviestKg, t.heaviestKg),
                                    best1RmKg = maxOf(records.best1RmKg, t.best1RmKg),
                                    bestSetVolumeKg = maxOf(records.bestSetVolumeKg, t.bestSetVolumeKg),
                                    mostReps = maxOf(records.mostReps, t.mostReps),
                                )
                            }
                            best.beatenBy(LoggedSet(toKg(filled.weight), filled.reps.toIntOrNull() ?: 0, filled.type))
                                .firstOrNull()?.let(onRecord)
                        }
                        TrainRepository.update { w ->
                            w.copy(
                                exercises = w.exercises.mapIndexed { i, e ->
                                    if (i != index) e else e.copy(sets = e.sets.mapIndexed { j, old -> if (j == setIndex) filled else old })
                                },
                                restEndsAt = if (nowDone) System.currentTimeMillis() + w.restSeconds * 1000L else w.restEndsAt,
                            )
                        }
                    },
                    onRemove = { updateExercise { e -> e.copy(sets = e.sets.filterIndexed { i, _ -> i != setIndex }) } },
                    onType = { t -> updateExercise { e -> e.copy(sets = e.sets.mapIndexed { i, old -> if (i == setIndex) old.copy(type = t) else old }) } },
                )
            }
            TextButton(
                onClick = {
                    updateExercise { e ->
                        val last = e.sets.lastOrNull()
                        e.copy(sets = e.sets + SetEntry(weight = last?.weight.orEmpty(), reps = ""))
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp),
            ) { Icon(Icons.Filled.Add, null); Text(" Add set") }
        }
    }
}

@Composable
private fun Header(text: String, modifier: Modifier) {
    Text(text, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = modifier, textAlign = TextAlign.Center)
}

@Composable
private fun SetRow(
    number: Int,
    set: SetEntry,
    previous: String,
    weightHint: String,
    repsHint: String,
    onChange: (SetEntry) -> Unit,
    onToggle: () -> Unit,
    onRemove: () -> Unit,
    onType: (com.ascendlab.app.data.SetType) -> Unit,
) {
    var menu by remember { mutableStateOf(false) }
    val haptics = rememberHaptics()
    val rowColor by animateColorAsState(
        if (set.done) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.background,
        tween(250), label = "set row",
    )
    val checkScale by animateFloatAsState(
        if (set.done) 1f else 0.9f, spring(Spring.DampingRatioMediumBouncy, Spring.StiffnessMedium), label = "check",
    )
    val checkColor by animateColorAsState(
        if (set.done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceContainerHigh, tween(200), label = "check color",
    )
    Row(
        Modifier.fillMaxWidth().background(rowColor).padding(horizontal = Gutter - 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(36.dp)) {
            // Tap the set number to change its type (W / F / D), as in Hevy.
            Box(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).clickable { haptics.tick(); menu = true }.padding(vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) { SetBadge(set.type, number) }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                com.ascendlab.app.data.SetType.entries.forEach { t ->
                    DropdownMenuItem(
                        text = { Text(t.label) },
                        leadingIcon = { SetBadge(t, 1) },
                        onClick = { menu = false; onType(t) },
                    )
                }
                HorizontalDivider()
                DropdownMenuItem(text = { Text("Remove set", color = MaterialTheme.colorScheme.error) }, onClick = { menu = false; onRemove() })
            }
        }
        Text(previous, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.weight(1.4f))
        NumberBox(set.weight, weightHint, decimal = true, onChange = { onChange(set.copy(weight = it)) }, modifier = Modifier.weight(1f))
        NumberBox(set.reps, repsHint, decimal = false, onChange = { onChange(set.copy(reps = it)) }, modifier = Modifier.weight(1f))
        IconButton(onClick = { if (set.done) haptics.tick() else haptics.confirm(); onToggle() }, modifier = Modifier.size(44.dp)) {
            Box(
                Modifier.size(30.dp).scale(checkScale).clip(RoundedCornerShape(8.dp))
                    .background(checkColor),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.Check,
                    contentDescription = if (set.done) "Mark set $number not done" else "Mark set $number done",
                    tint = if (set.done) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

@Composable
private fun NumberBox(value: String, hint: String, decimal: Boolean, onChange: (String) -> Unit, modifier: Modifier) {
    val textStyle = MaterialTheme.typography.titleSmall.copy(color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.Center)
    BasicTextField(
        value = value,
        onValueChange = { v ->
            val clean = v.replace(',', '.').filter { it.isDigit() || (decimal && it == '.') }
            if (clean.count { it == '.' } <= 1) onChange(clean.take(if (decimal) 6 else 3))
        },
        singleLine = true,
        textStyle = textStyle,
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        keyboardOptions = KeyboardOptions(keyboardType = if (decimal) KeyboardType.Decimal else KeyboardType.Number),
        modifier = modifier.padding(horizontal = 4.dp),
        decorationBox = { inner ->
            Box(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp))
                    .background(MaterialTheme.colorScheme.surfaceContainer).padding(vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (value.isEmpty()) Text(hint, style = textStyle.copy(color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)))
                inner()
            }
        },
    )
}

@Composable
private fun FinishDialog(w: ActiveWorkout, units: Units, now: Long, onDismiss: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var caption by remember { mutableStateOf("") }
    var share by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val pending = w.exercises.sumOf { e -> e.sets.count { !it.done } }
    val haptics = rememberHaptics()

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("Finish workout") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                FeedCard {
                    Row(Modifier.padding(16.dp)) {
                        Stat("Duration", WorkoutMath.formatDuration(((now - w.startedAt) / 1000).toInt()), Modifier.weight(1f))
                        Stat("Volume", WorkoutMath.formatVolume(volumeKg(w, units), units), Modifier.weight(1f))
                        Stat("Sets", "${w.doneSets}", Modifier.weight(0.6f))
                    }
                }
                if (pending > 0) {
                    Text(
                        "$pending set${if (pending == 1) "" else "s"} not ticked off won't be saved.",
                        style = MaterialTheme.typography.bodySmall, color = Apricot,
                    )
                }
                OutlinedTextField(
                    value = caption,
                    onValueChange = { caption = it.take(300) },
                    label = { Text("How did it go?") },
                    placeholder = { Text("New best on bench!") },
                    minLines = 2,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Post to feed", style = MaterialTheme.typography.bodyLarge)
                        Text("Your friends see this workout", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = share, onCheckedChange = { share = it })
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy && w.doneSets > 0,
                onClick = {
                    busy = true
                    scope.launch {
                        error = TrainRepository.finish(caption, share)
                        busy = false
                        if (error != null) haptics.reject()
                        if (error == null) {
                            haptics.confirm()
                            android.widget.Toast.makeText(context, if (share) "Workout saved and posted" else "Workout saved", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    }
                },
            ) { Text(if (w.doneSets == 0) "Tick a set first" else "Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("Keep training") } },
        containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
    )
}

private fun volumeKg(w: ActiveWorkout, units: Units): Double = w.exercises.sumOf { e ->
    e.sets.filter { it.done }.sumOf { s ->
        val typed = s.weight.toDoubleOrNull() ?: 0.0
        val kg = if (units == Units.IMPERIAL) Convert.lbToKg(typed) else typed
        kg * (s.reps.toIntOrNull() ?: 0)
    }
}

private fun formatNumber(v: Double): String =
    if ((v * 10).roundToInt() % 10 == 0) v.roundToInt().toString() else ((v * 10).roundToInt() / 10.0).toString()

private fun clock(sec: Int): String {
    val s = sec.coerceAtLeast(0)
    val h = s / 3600; val m = (s % 3600) / 60; val r = s % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, r) else "%d:%02d".format(m, r)
}
