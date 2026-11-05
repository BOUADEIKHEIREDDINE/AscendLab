package com.ascendlab.app.ui.screens.train

import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.material3.FilledTonalButton
import com.ascendlab.app.ui.components.SectionTitle
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.pressable
import com.ascendlab.app.ui.components.rememberHaptics
import com.ascendlab.app.ui.components.SkeletonCard
import com.ascendlab.app.ui.components.TabHeader
import android.text.format.DateUtils
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.Routine
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.data.Units
import com.ascendlab.app.data.WorkoutMath
import com.ascendlab.app.ui.components.FeedCard
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun TrainingPlanScreen(navController: NavHostController, vm: TrainViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val active by vm.active.collectAsState()
    val units = ProfileRepository.profile.collectAsState().value?.units ?: Units.METRIC
    val program = state.activeProgram
    var programMenu by remember { mutableStateOf(false) }
    var pendingStart by remember { mutableStateOf<Routine?>(null) }
    var confirmReplace by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Routine?>(null) }
    val history = vm.history.collectAsStateWithLifecycle().value.orEmpty().take(5)


    val haptics = rememberHaptics()

    fun start(routine: Routine?) {
        haptics.confirm()
        if (active != null) {
            pendingStart = routine; confirmReplace = true
        } else {
            TrainRepository.start(routine, lastSets(vm.history.value))
            navController.navigate(Routes.WORKOUT_SESSION)
        }
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { TabHeader("Train") }

        active?.let { w ->
            item {
                Row(
                    Modifier.fillMaxWidth().pressable { navController.navigate(Routes.WORKOUT_SESSION) }
                        .padding(horizontal = Gutter, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(10.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary))
                    Column(Modifier.weight(1f).padding(start = 12.dp)) {
                        Text(w.title, style = MaterialTheme.typography.titleMedium)
                        Text("In progress · ${w.doneSets} sets done", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Button(onClick = { navController.navigate(Routes.WORKOUT_SESSION) }) { Text("Resume") }
                }
                Hairline()
            }
        }

        item {
            OutlinedButton(
                onClick = { start(null) },
                modifier = Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 8.dp).height(48.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
            ) {
                Icon(Icons.Filled.Add, null); Text("  Start empty workout")
            }
        }

        // Program switcher: the title of the routine list, like a folder name.
        item {
            Row(Modifier.fillMaxWidth().padding(start = Gutter, end = 8.dp, top = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) {
                    Row(
                        Modifier.clip(MaterialTheme.shapes.small).pressable { programMenu = true }.padding(vertical = 6.dp, horizontal = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            program?.name ?: if (state.loading && state.error == null) "Loading…" else "No program yet",
                            style = MaterialTheme.typography.titleLarge,
                            maxLines = 1,
                        )
                        Icon(Icons.Filled.ArrowDropDown, "Change program")
                    }
                    DropdownMenu(expanded = programMenu, onDismissRequest = { programMenu = false }) {
                        state.programs.forEach { p ->
                            DropdownMenuItem(
                                text = { Text(p.name) },
                                leadingIcon = { if (p.id == program?.id) Icon(Icons.Filled.Check, null) else Spacer(Modifier.width(24.dp)) },
                                onClick = { programMenu = false; TrainRepository.selectProgram(p.id) },
                            )
                        }
                        if (state.programs.isNotEmpty()) HorizontalDivider()
                        DropdownMenuItem(text = { Text("Manage programs") }, onClick = { programMenu = false; navController.navigate(Routes.PROGRAMS) })
                    }
                }
                TextButton(
                    onClick = {
                        // A routine lives in a program, so without one we go create a program first.
                        val p = program
                        if (p != null) navController.navigate(Routes.routineEditor(p.id, null))
                        else navController.navigate(Routes.PROGRAMS)
                    },
                ) { Icon(Icons.Filled.Add, null); Text(" Routine") }
            }
        }

        state.error?.let { error ->
            item { Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = Gutter, vertical = 8.dp)) }
        }

        if (state.loading && state.programs.isEmpty() && state.error == null) {
            items(2) { SkeletonCard() }
        } else if (program == null || program.routines.isEmpty()) {
            item {
                Text(
                    if (program == null) "Create a program to group your routines."
                    else "No routines yet. Tap + Routine to build one.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Gutter, vertical = 12.dp),
                )
            }
        }

        program?.let { p ->
            items(p.routines, key = { it.id }) { routine ->
                Column(Modifier.animateItem()) {
                    RoutineCard(
                        routine = routine,
                        onStart = { start(routine) },
                        onEdit = { navController.navigate(Routes.routineEditor(p.id, routine.id)) },
                        onDelete = { deleting = routine },
                    )
                    Hairline(Modifier.padding(start = Gutter))
                }
            }
        }

        if (history.isNotEmpty()) {
            item { SectionTitle("History") }
            items(history, key = { it.id }) { h ->
                Row(
                    Modifier.fillMaxWidth().pressable { navController.navigate(Routes.workoutDetail(h.id)) }
                        .padding(horizontal = Gutter, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(h.title, style = MaterialTheme.typography.bodyLarge)
                        Text(
                            DateUtils.getRelativeTimeSpanString(h.finishedAt).toString(),
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(WorkoutMath.formatDuration(h.durationSec), style = MaterialTheme.typography.bodyMedium)
                        Text(
                            "${h.setCount} sets · ${WorkoutMath.formatVolume(h.volumeKg, units)}" + if (h.records > 0) " · ${h.records} PR" else "",
                            style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }

    if (confirmReplace) {
        AlertDialog(
            onDismissRequest = { confirmReplace = false },
            title = { Text("Workout in progress") },
            text = { Text("You already have a workout going. Discard it and start a new one?") },
            confirmButton = {
                TextButton(onClick = {
                    confirmReplace = false
                    TrainRepository.start(pendingStart, lastSets(vm.history.value))
                    navController.navigate(Routes.WORKOUT_SESSION)
                }) { Text("Discard and start", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { confirmReplace = false; navController.navigate(Routes.WORKOUT_SESSION) }) { Text("Resume current") }
            },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        )
    }

    deleting?.let { r ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete ${r.name}?") },
            text = { Text("The routine is removed from this program. Past workouts stay in your history.") },
            confirmButton = {
                TextButton(onClick = { program?.let { TrainRepository.deleteRoutine(it, r.id) }; deleting = null }) {
                    Text("Delete", color = MaterialTheme.colorScheme.error)
                }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        )
    }
}

@Composable
private fun RoutineCard(routine: Routine, onStart: () -> Unit, onEdit: () -> Unit, onDelete: () -> Unit, modifier: Modifier = Modifier) {
    var menu by remember { mutableStateOf(false) }
    Row(
        modifier.fillMaxWidth().pressable(onClick = onEdit).padding(start = Gutter, end = 8.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(routine.name, style = MaterialTheme.typography.titleMedium)
            Text(
                if (routine.exercises.isEmpty()) "No exercises yet"
                else routine.exercises.joinToString(", ") { it.name },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
        FilledTonalButton(
            onClick = onStart,
            enabled = routine.exercises.isNotEmpty(),
            modifier = Modifier.padding(start = 12.dp),
        ) { Text("Start") }
        Box {
            IconButton(onClick = { menu = true }) { Icon(Icons.Filled.MoreVert, "More", tint = MaterialTheme.colorScheme.onSurfaceVariant) }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(text = { Text("Edit") }, onClick = { menu = false; onEdit() })
                DropdownMenuItem(text = { Text("Delete") }, onClick = { menu = false; onDelete() })
            }
        }
    }
}

/** Most recent sets of each exercise, from history (newest first). */
private fun lastSets(history: List<com.ascendlab.app.data.WorkoutRecord>?): Map<String, List<com.ascendlab.app.data.LoggedSet>> {
    val map = mutableMapOf<String, List<com.ascendlab.app.data.LoggedSet>>()
    history.orEmpty().forEach { w -> w.exercises.forEach { e -> if (e.exerciseId !in map) map[e.exerciseId] = e.sets } }
    return map
}
