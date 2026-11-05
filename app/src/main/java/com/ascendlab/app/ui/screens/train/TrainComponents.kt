package com.ascendlab.app.ui.screens.train

import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.WindowInsets
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.systemBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.ascendlab.app.data.Exercise
import com.ascendlab.app.data.ExerciseLibrary
import com.ascendlab.app.data.Muscle
import com.ascendlab.app.ui.components.PrimaryButton

/**
 * Full-screen exercise search, Hevy style: filter by muscle, tap several exercises,
 * then add them all at once. Typing a name that isn't listed offers a custom exercise.
 */
@Composable
fun ExercisePickerDialog(onDismiss: () -> Unit, onPick: (List<Exercise>) -> Unit) {
    var query by remember { mutableStateOf("") }
    var muscle by remember { mutableStateOf<Muscle?>(null) }
    val picked = remember { mutableStateListOf<Exercise>() }
    val results = ExerciseLibrary.all.filter { e ->
        (muscle == null || e.muscle == muscle) &&
            (query.isBlank() || query.trim().split(" ").all { e.name.contains(it, ignoreCase = true) })
    }
    val canCreate = query.isNotBlank() && ExerciseLibrary.all.none { it.name.equals(query.trim(), ignoreCase = true) }

    // Measured from the activity window: a dialog's own window doesn't report the system bars.
    val navBar = WindowInsets.navigationBars.asPaddingValues().calculateBottomPadding()
    val bottomInset = if (navBar > 0.dp) navBar else 48.dp
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            Column(Modifier.fillMaxSize().imePadding()) {
                Row(Modifier.padding(start = 4.dp, top = 8.dp, end = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDismiss) { Icon(Icons.Filled.Close, "Close") }
                    Text("Add exercises", style = MaterialTheme.typography.headlineSmall)
                }
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it.take(40) },
                    placeholder = { Text("Search exercises") },
                    leadingIcon = { Icon(Icons.Filled.Search, null) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                )
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item { FilterChip(selected = muscle == null, onClick = { muscle = null }, label = { Text("All") }) }
                    items(Muscle.entries) { m ->
                        FilterChip(selected = muscle == m, onClick = { muscle = if (muscle == m) null else m }, label = { Text(m.label) })
                    }
                }
                LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(vertical = 8.dp)) {
                    if (canCreate) {
                        item {
                            ExerciseRow(
                                title = "Create \"${query.trim()}\"",
                                subtitle = "Custom exercise",
                                selected = false,
                                onClick = { picked.add(ExerciseLibrary.custom(query)); query = "" },
                                leading = { Icon(Icons.Filled.Add, null, tint = MaterialTheme.colorScheme.primary) },
                            )
                        }
                    }
                    picked.filter { it.id.startsWith("custom:") }.forEach { c ->
                        item(key = c.id) {
                            ExerciseRow(c.name, "Custom exercise", selected = true, onClick = { picked.remove(c) })
                        }
                    }
                    items(results, key = { it.id }) { e ->
                        ExerciseRow(
                            title = e.name,
                            subtitle = "${e.muscle.label} · ${e.equipment.label}",
                            selected = e in picked,
                            onClick = { if (e in picked) picked.remove(e) else picked.add(e) },
                        )
                    }
                }
                Box(Modifier.padding(start = 20.dp, end = 20.dp, top = 12.dp, bottom = bottomInset)) {
                    PrimaryButton(
                        label = if (picked.isEmpty()) "Pick exercises" else "Add ${picked.size} exercise${if (picked.size == 1) "" else "s"}",
                        enabled = picked.isNotEmpty(),
                        onClick = { onPick(picked.toList()) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ExerciseRow(
    title: String,
    subtitle: String,
    selected: Boolean,
    onClick: () -> Unit,
    leading: (@Composable () -> Unit)? = null,
) {
    Column {
        Row(
            Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .background(if (selected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.background)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (leading != null) { leading(); Spacer(Modifier.width(14.dp)) }
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.bodyLarge)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            if (selected) Icon(Icons.Filled.CheckCircle, "Selected", tint = MaterialTheme.colorScheme.primary)
        }
        com.ascendlab.app.ui.components.Hairline(Modifier.padding(start = 20.dp))
    }
}

/** "−  3  +" for a small whole number. */
@Composable
fun Stepper(label: String, value: Int, onChange: (Int) -> Unit, min: Int, max: Int) {
    val haptics = com.ascendlab.app.ui.components.rememberHaptics()
    Row(verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        IconButton(onClick = { haptics.tick(); onChange((value - 1).coerceAtLeast(min)) }, enabled = value > min) {
            Icon(Icons.Filled.Remove, "Fewer $label")
        }
        Text("$value", style = MaterialTheme.typography.titleMedium, modifier = Modifier.width(28.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        IconButton(onClick = { haptics.tick(); onChange((value + 1).coerceAtMost(max)) }, enabled = value < max) {
            Icon(Icons.Filled.Add, "More $label")
        }
    }
}
