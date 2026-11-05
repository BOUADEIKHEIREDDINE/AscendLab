package com.ascendlab.app.ui.screens.home

import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.rememberHaptics
import com.ascendlab.app.ui.components.PageHeader
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.PublicProfile
import com.ascendlab.app.data.SocialRepository
import com.ascendlab.app.ui.components.Avatar
import com.ascendlab.app.ui.components.FeedCard
import kotlinx.coroutines.launch

@Composable
fun FriendsScreen(navController: NavHostController) {
    val context = LocalContext.current
    val focus = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val me by SocialRepository.me.collectAsState()
    var friends by remember { mutableStateOf<List<PublicProfile>?>(null) }
    var loadError by remember { mutableStateOf<String?>(null) }
    var name by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var adding by remember { mutableStateOf(false) }
    var addMessage by remember { mutableStateOf<Pair<Boolean, String>?>(null) }
    var removing by remember { mutableStateOf<PublicProfile?>(null) }
    val haptics = rememberHaptics()

    suspend fun reload() {
        runCatching { SocialRepository.friendProfiles() }
            .onSuccess { friends = it; loadError = null }
            .onFailure { loadError = "Couldn't load your friends. Check your connection." ; friends = friends ?: emptyList() }
    }

    LaunchedEffect(Unit) {
        runCatching { SocialRepository.ensureMe() }.onSuccess { name = it?.name.orEmpty() }
        reload()
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        PageHeader("Friends", onBack = { navController.popBackStack() })

        Column(
            Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = Gutter, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            val profile = me
            FeedCard {
                Column(Modifier.padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Your friend code", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    if (profile == null) {
                        CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
                    } else {
                        Text(
                            profile.code.chunked(3).joinToString(" "),
                            fontFamily = FontFamily.Monospace,
                            fontSize = 36.sp,
                            letterSpacing = 4.sp,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Text(
                            "Friends type this code to add you. You'll then see each other's meals.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            val colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface)
                            OutlinedButton(onClick = { copy(context, profile.code) }, modifier = Modifier.weight(1f), colors = colors) {
                                Icon(Icons.Filled.ContentCopy, null); Text("  Copy")
                            }
                            Button(onClick = { share(context, profile.code) }, modifier = Modifier.weight(1f)) {
                                Icon(Icons.Filled.Share, null); Text("  Share")
                            }
                        }
                    }
                }
            }

            Hairline()
            FeedCard {
                Column(Modifier.padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Add a friend", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    OutlinedTextField(
                        value = code,
                        onValueChange = { v -> code = v.uppercase().filter { it.isLetterOrDigit() }.take(6); addMessage = null },
                        label = { Text("Their code") },
                        placeholder = { Text("ABC123") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focus.clearFocus() }),
                    )
                    addMessage?.let { (ok, text) ->
                        Text(text, color = if (ok) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                    }
                    Button(
                        onClick = {
                            adding = true
                            focus.clearFocus()
                            scope.launch {
                                val failure = SocialRepository.addFriend(code)
                                addMessage = if (failure == null) true to "Friend added." else false to failure
                                if (failure == null) haptics.confirm() else haptics.reject()
                                if (failure == null) { code = ""; reload() }
                                adding = false
                            }
                        },
                        enabled = code.length == 6 && !adding,
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) {
                        if (adding) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp) else Text("Add friend")
                    }
                }
            }

            Hairline()
            FeedCard {
                Column(Modifier.padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Your name in the feed", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it.take(30) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focus.clearFocus() }),
                    )
                    val changed = profile != null && name.trim().isNotEmpty() && name.trim() != profile.name
                    if (changed) {
                        TextButton(
                            onClick = {
                                focus.clearFocus()
                                scope.launch {
                                    runCatching { SocialRepository.rename(name) }
                                        .onSuccess { Toast.makeText(context, "Name saved. New posts use it.", Toast.LENGTH_SHORT).show() }
                                        .onFailure { Toast.makeText(context, "Couldn't save. Check your connection.", Toast.LENGTH_SHORT).show() }
                                }
                            },
                            modifier = Modifier.align(Alignment.End),
                        ) { Text("Save name") }
                    }
                }
            }

            Hairline()
            Text(
                "Your friends" + (friends?.let { " (${it.size})" } ?: ""),
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                
            )
            loadError?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
            when {
                friends == null -> CircularProgressIndicator(Modifier.align(Alignment.CenterHorizontally))
                friends!!.isEmpty() -> Text(
                    "No friends yet. Share your code or add theirs above.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> FeedCard {
                    Column(Modifier.padding(vertical = 6.dp)) {
                        friends!!.forEach { f ->
                            Row(Modifier.fillMaxWidth().padding(top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                Avatar(f.name, f.uid)
                                Spacer(Modifier.width(12.dp))
                                Text(f.name, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
                                IconButton(onClick = { removing = f }) {
                                    Icon(Icons.Filled.PersonRemove, contentDescription = "Remove ${f.name}", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
    }

    removing?.let { f ->
        AlertDialog(
            onDismissRequest = { removing = null },
            title = { Text("Remove ${f.name}?") },
            text = { Text("You'll stop seeing each other's new meals.") },
            confirmButton = {
                TextButton(onClick = {
                    removing = null
                    scope.launch {
                        runCatching { SocialRepository.removeFriend(f.uid) }
                            .onFailure { Toast.makeText(context, "Couldn't remove. Check your connection.", Toast.LENGTH_SHORT).show() }
                        reload()
                    }
                }) { Text("Remove", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { removing = null }) { Text("Cancel") } },
            containerColor = MaterialTheme.colorScheme.surfaceContainerHigh,
        )
    }
}

private fun copy(context: Context, code: String) {
    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    clipboard.setPrimaryClip(ClipData.newPlainText("AscendLab friend code", code))
    Toast.makeText(context, "Code copied", Toast.LENGTH_SHORT).show()
}

private fun share(context: Context, code: String) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, "Race me on AscendLab: add me with my friend code $code")
    }
    context.startActivity(Intent.createChooser(send, "Share your code"))
}
