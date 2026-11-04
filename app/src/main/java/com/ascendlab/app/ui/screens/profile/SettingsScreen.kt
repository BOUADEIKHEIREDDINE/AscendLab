package com.ascendlab.app.ui.screens.profile

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Straighten
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.AuthRepository
import com.ascendlab.app.data.AuthResult
import com.ascendlab.app.data.Convert
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.UserProfile
import com.ascendlab.app.data.Units
import com.ascendlab.app.ui.components.Appear
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.navigation.signOut
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavHostController) {
    val scope = rememberCoroutineScope()
    val profile by ProfileRepository.profile.collectAsState()
    var showDelete by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { if (profile == null) ProfileRepository.load() }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.padding(start = 4.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { navController.popBackStack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
            Text("Settings", style = MaterialTheme.typography.headlineSmall)
        }

        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            val p = profile
            Appear(0) {
                Section("Your plan") {
                    SettingRow(
                        icon = Icons.Filled.Flag,
                        title = "Edit goals",
                        subtitle = p?.goalSummary() ?: "Goal, training days and place",
                        onClick = { navController.navigate(Routes.EDIT_GOALS) },
                    )
                    if (p?.heightCm != null && p.weightKg != null && p.age != null) {
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                        // The body summary re-renders in the chosen units, with a quick crossfade.
                        AnimatedContent(
                            targetState = p.units,
                            transitionSpec = { fadeIn() togetherWith fadeOut() },
                            label = "body units",
                        ) { units ->
                            SettingRow(
                                icon = Icons.Filled.Person,
                                title = "Your body",
                                subtitle = "${p.age} years · ${Convert.formatHeight(p.heightCm, units)} · " +
                                    Convert.formatWeight(p.weightKg, units),
                            )
                        }
                    }
                }
            }

            Appear(1) {
                Section("Units") {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Straighten, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.width(16.dp))
                            Text("Weight and height", style = MaterialTheme.typography.bodyLarge)
                        }
                        SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                            Units.entries.forEachIndexed { i, u ->
                                SegmentedButton(
                                    selected = (p?.units ?: Units.METRIC) == u,
                                    onClick = { p?.let { scope.launch { ProfileRepository.save(it.copy(units = u)) } } },
                                    enabled = p != null,
                                    shape = SegmentedButtonDefaults.itemShape(i, Units.entries.size),
                                ) { Text("${u.weightUnit} · ${if (u == Units.METRIC) "cm" else "ft / in"}") }
                            }
                        }
                    }
                }
            }

            Appear(2) {
                Section("Coming soon") {
                    SettingRow(icon = Icons.Filled.Notifications, title = "Notifications", subtitle = "Reminders for workouts and meals", enabled = false)
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingRow(icon = Icons.Filled.Language, title = "Language", subtitle = "English", enabled = false)
                }
            }

            Appear(3) {
                Section("Account") {
                    SettingRow(
                        icon = Icons.AutoMirrored.Filled.Logout,
                        title = "Log out",
                        subtitle = AuthRepository.currentEmail ?: "Signed in",
                        onClick = { navController.signOut() },
                    )
                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                    SettingRow(
                        icon = Icons.Filled.DeleteForever,
                        title = "Delete account",
                        subtitle = "Permanently remove your account and data",
                        danger = true,
                        onClick = { showDelete = true },
                    )
                }
            }
        }
    }

    if (showDelete) {
        DeleteAccountDialog(
            onDismiss = { showDelete = false },
            onDeleted = { navController.signOut() },
        )
    }
}

private fun UserProfile.goalSummary(): String? {
    if (goal == null || daysPerWeek == null || place == null) return null
    return "${goal.label} · $daysPerWeek days a week · ${place.label.replaceFirstChar { it.lowercase() }}"
}

/**
 * Confirms before deleting. Firebase requires a fresh sign-in to delete an account,
 * so email accounts re-enter their password and Google accounts pick their account again.
 */
@Composable
private fun DeleteAccountDialog(onDismiss: () -> Unit, onDeleted: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val usesPassword = remember { AuthRepository.usesPassword }
    var password by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        icon = { Icon(Icons.Filled.DeleteForever, null, tint = MaterialTheme.colorScheme.error) },
        title = { Text("Delete your account?") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    "This permanently deletes your account, your profile and your plan. It can't be undone.",
                    style = MaterialTheme.typography.bodyMedium,
                )
                if (usesPassword) {
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; error = null },
                        label = { Text("Your password") },
                        singleLine = true,
                        enabled = !busy,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    )
                } else {
                    Text(
                        "To confirm, you'll pick your Google account again.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy && (!usesPassword || password.isNotEmpty()),
                onClick = {
                    busy = true
                    scope.launch {
                        when (val result = AuthRepository.deleteAccount(context, password.takeIf { usesPassword })) {
                            is AuthResult.Success -> onDeleted()
                            is AuthResult.Error -> error = result.message
                            AuthResult.Cancelled -> Unit
                        }
                        busy = false
                    }
                },
            ) {
                if (busy) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                } else {
                    Text("Delete for good", color = MaterialTheme.colorScheme.error)
                }
            }
        },
        dismissButton = { TextButton(onClick = onDismiss, enabled = !busy) { Text("Cancel") } },
        containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
    )
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            title,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(start = 8.dp),
        )
        Card(
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceContainer,
                contentColor = MaterialTheme.colorScheme.onSurface,
            ),
        ) { Column { content() } }
    }
}

@Composable
private fun SettingRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: (() -> Unit)? = null,
    enabled: Boolean = true,
    danger: Boolean = false,
) {
    val tint = when {
        danger -> MaterialTheme.colorScheme.error
        !enabled -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
        else -> MaterialTheme.colorScheme.onSurface
    }
    ListItem(
        headlineContent = { Text(title, color = tint) },
        supportingContent = {
            Text(
                subtitle,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = if (enabled) 1f else 0.5f),
            )
        },
        leadingContent = { Icon(icon, null, tint = if (danger) tint else MaterialTheme.colorScheme.onSurfaceVariant) },
        trailingContent = when {
            !enabled -> ({ Text("Soon", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) })
            onClick != null -> ({ Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant) })
            else -> null
        },
        colors = ListItemDefaults.colors(containerColor = Color.Transparent),
        modifier = if (onClick != null && enabled) Modifier.clickable(onClick = onClick) else Modifier,
    )
}
