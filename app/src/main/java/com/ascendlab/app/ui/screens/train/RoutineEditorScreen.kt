package com.ascendlab.app.ui.screens.train

import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.PageHeader
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.data.Routine
import com.ascendlab.app.data.RoutineExercise
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.ui.components.FeedCard
import com.ascendlab.app.ui.components.PrimaryButton

/** Create a routine ([routineId] null) or edit one, inside [programId]. */
@Composable
fun RoutineEditorScreen(
    navController: NavHostController,
    programId: String,
    routineId: String?,
    vm: TrainViewModel = viewModel(),
) {
    val state by vm.state.collectAsStateWithLifecycle()
    val program = state.programs.firstOrNull { it.id == programId }
    var loaded by remember { mutableStateOf(false) }
    var id by remember { mutableStateOf<String?>(null) }
    var name by remember { mutableStateOf("") }
    val exercises = remember { mutableStateListOf<RoutineExercise>() }
    var picking by remember { mutableStateOf(false) }

    // Fill the form once, when the program has loaded.
    LaunchedEffect(program != null) {
        if (program == null || loaded) return@LaunchedEffect
        program.routines.firstOrNull { it.id == routineId }?.let { r ->
            id = r.id; name = r.name; exercises.addAll(r.exercises)
        }
        loaded = true
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        PageHeader(if (routineId == null) "New routine" else "Edit routine", onBack = { navController.popBackStack() })

        if (!loaded) {
            if (state.error != null || (!state.loading && program == null)) {
                Text(
                    state.error ?: "This program no longer exists.",
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(24.dp),
                )
            } else {
                CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally).padding(32.dp))
            }
        } else {
        // No early return here: it breaks Compose's bookkeeping with this compiler version.
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = Gutter, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it.take(40) },
                label = { Text("Routine name") },
                placeholder = { Text("Push day") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
            )
            Text("In ${program?.name ?: "this program"}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

            exercises.forEachIndexed { i, ex ->
                Hairline()
                FeedCard {
                    Column(Modifier.padding(top = 4.dp, bottom = 4.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(ex.name, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(1f))
                            IconButton(onClick = { exercises.add(i - 1, exercises.removeAt(i)) }, enabled = i > 0) {
                                Icon(Icons.Filled.KeyboardArrowUp, "Move up")
                            }
                            IconButton(onClick = { exercises.add(i + 1, exercises.removeAt(i)) }, enabled = i < exercises.lastIndex) {
                                Icon(Icons.Filled.KeyboardArrowDown, "Move down")
                            }
                            IconButton(onClick = { exercises.removeAt(i) }) { Icon(Icons.Filled.Close, "Remove ${ex.name}") }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Stepper("Sets", ex.sets, { exercises[i] = ex.copy(sets = it) }, min = 1, max = 10)
                            Stepper("Reps", ex.reps, { exercises[i] = ex.copy(reps = it) }, min = 1, max = 50)
                        }
                    }
                }
            }

            OutlinedButton(
                onClick = { picking = true },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
            ) { Icon(Icons.Filled.Add, null); Text("  Add exercises") }
        }

        val p = program
        PrimaryButton(
            label = "Save routine",
            enabled = p != null && name.isNotBlank() && exercises.isNotEmpty(),
            onClick = {
                if (p == null) return@PrimaryButton
                val routine = id?.let { Routine(it, name.trim(), exercises.toList()) } ?: Routine(name = name.trim(), exercises = exercises.toList())
                TrainRepository.saveRoutine(p, routine)
                navController.popBackStack()
            },
            modifier = Modifier.padding(horizontal = Gutter, vertical = 12.dp),
        )
        }
    }

    if (picking) {
        ExercisePickerDialog(
            onDismiss = { picking = false },
            onPick = { picked ->
                exercises.addAll(picked.map { RoutineExercise(it.id, it.name) })
                picking = false
            },
        )
    }
}
