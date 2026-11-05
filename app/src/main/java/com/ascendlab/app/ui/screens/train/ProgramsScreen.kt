package com.ascendlab.app.ui.screens.train

import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.PageHeader
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import com.ascendlab.app.data.Program
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.ui.components.FeedCard

/** Create, rename, delete and pick the active program. */
@Composable
fun ProgramsScreen(navController: NavHostController, vm: TrainViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    val activeId = state.activeProgram?.id
    var naming by remember { mutableStateOf<Program?>(null) }
    var creating by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<Program?>(null) }

    Column(Modifier.fillMaxSize()) {
        PageHeader("Programs", onBack = { navController.popBackStack() })
        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                "A program groups the routines you rotate through. The selected one shows on the Train tab.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Gutter),
            )
            if (state.programs.isNotEmpty()) {
                FeedCard {
                    Column {
                        state.programs.forEachIndexed { i, p ->
                            if (i > 0) Hairline(Modifier.padding(start = 64.dp))
                            var menu by remember { mutableStateOf(false) }
                            Row(
                                Modifier.fillMaxWidth().clickable { TrainRepository.selectProgram(p.id) }.padding(start = 8.dp, end = 4.dp, top = 6.dp, bottom = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                RadioButton(selected = p.id == activeId, onClick = { TrainRepository.selectProgram(p.id) })
                                Column(Modifier.weight(1f)) {
                                    Text(p.name, style = MaterialTheme.typography.bodyLarge)
                                    Text(
                                        if (p.routines.isEmpty()) "No routines" else p.routines.joinToString(" · ") { it.name },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        maxLines = 1,
                                    )
                                }
                                Box {
                                    IconButton(onClick = { menu = true }) { Icon(Icons.Filled.MoreVert, "More") }
                                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                                        DropdownMenuItem(text = { Text("Rename") }, onClick = { menu = false; naming = p })
                                        DropdownMenuItem(text = { Text("Delete") }, onClick = { menu = false; deleting = p })
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Button(onClick = { creating = true }, modifier = Modifier.fillMaxWidth().padding(horizontal = Gutter).height(52.dp)) {
                Icon(Icons.Filled.Add, null); Text("  New program")
            }
        }
    }

    if (creating || naming != null) {
        NameDialog(
            title = if (creating) "New program" else "Rename program",
            initial = naming?.name.orEmpty(),
            confirm = if (creating) "Create" else "Save",
            onDismiss = { creating = false; naming = null },
            onConfirm = { name ->
                val renaming = naming
                if (renaming != null) TrainRepository.renameProgram(renaming.id, name) else TrainRepository.createProgram(name)
                creating = false; naming = null
            },
        )
    }

    deleting?.let { p ->
        AlertDialog(
            onDismissRequest = { deleting = null },
            title = { Text("Delete ${p.name}?") },
            text = { Text("Its ${p.routines.size} routines are deleted too. Your workout history stays.") },
            confirmButton = {
                TextButton(onClick = { TrainRepository.deleteProgram(p.id); deleting = null }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { deleting = null }) { Text("Cancel") } },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        )
    }
}

@Composable
fun NameDialog(title: String, initial: String, confirm: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var name by remember { mutableStateOf(initial) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            OutlinedTextField(
                value = name,
                onValueChange = { name = it.take(40) },
                singleLine = true,
                placeholder = { Text("Push / Pull / Legs") },
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
            )
        },
        confirmButton = { TextButton(onClick = { onConfirm(name) }, enabled = name.isNotBlank()) { Text(confirm) } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
        containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
    )
}
