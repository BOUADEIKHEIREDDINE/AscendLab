package com.ascendlab.app.ui.screens.home

import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.size
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.foundation.text.BasicTextField
import com.ascendlab.app.ui.components.pressable
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.rememberHaptics
import com.ascendlab.app.ui.components.PageHeader
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.MealPhotos
import com.ascendlab.app.data.MealType
import com.ascendlab.app.data.SocialRepository
import com.ascendlab.app.ui.components.MealPhoto
import com.ascendlab.app.ui.components.PrimaryButton
import com.ascendlab.app.ui.components.plural
import kotlinx.coroutines.launch

private const val MAX_MEAL_KCAL = 5000
private const val MAX_MEAL_PROTEIN = 400

/** Log a meal: it counts toward today's total and is shared with friends in the feed. */
@Composable
fun CreatePostScreen(navController: NavHostController, initialType: MealType? = null) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val me by SocialRepository.me.collectAsState()
    var type by rememberSaveable { mutableStateOf(initialType ?: MealType.forNow()) }
    var description by rememberSaveable { mutableStateOf("") }
    var caloriesText by rememberSaveable { mutableStateOf("") }
    var proteinText by rememberSaveable { mutableStateOf("") }
    var carbsText by rememberSaveable { mutableStateOf("") }
    var fatText by rememberSaveable { mutableStateOf("") }
    var photo by remember { mutableStateOf<String?>(null) }
    var processingPhoto by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var captureUri by rememberSaveable { mutableStateOf<Uri?>(null) }
    val haptics = rememberHaptics()

    LaunchedEffect(Unit) { runCatching { SocialRepository.ensureMe() } }

    fun usePhoto(uri: Uri?) {
        if (uri == null) return
        processingPhoto = true
        scope.launch {
            photo = MealPhotos.encode(context, uri) ?: photo
            if (photo == null) error = "Couldn't read this photo. Try another one."
            processingPhoto = false
        }
    }

    val pickPhoto = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { usePhoto(it) }
    val takePhoto = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        if (ok) usePhoto(captureUri)
    }

    val calories = caloriesText.toIntOrNull()
    val caloriesError = when {
        caloriesText.isEmpty() -> null
        calories == null || calories <= 0 -> "Enter a number of calories."
        calories > MAX_MEAL_KCAL -> "That's a lot for one meal. Check the number."
        else -> null
    }
    val protein = proteinText.toIntOrNull() ?: 0
    val proteinError = if (protein > MAX_MEAL_PROTEIN) "That's more than any meal holds. Check the number." else null
    val carbs = carbsText.toIntOrNull() ?: 0
    val fat = fatText.toIntOrNull() ?: 0
    val macroError = if (carbs > 600 || fat > 300) "That's more than any meal holds. Check the number." else null
    val canPost = calories != null && caloriesError == null && proteinError == null && macroError == null && !busy && !processingPhoto

    Column(Modifier.fillMaxSize().imePadding()) {
        PageHeader("Log a meal", onBack = { navController.popBackStack() })

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            // Photo first, edge to edge, like a photo app's composer.
            val currentPhoto = photo
            Box(Modifier.fillMaxWidth().aspectRatio(4f / 3f).background(MaterialTheme.colorScheme.surfaceContainer), contentAlignment = Alignment.Center) {
                if (currentPhoto != null) {
                    MealPhoto(currentPhoto, Modifier.fillMaxSize())
                    IconButton(
                        onClick = { haptics.tick(); photo = null },
                        modifier = Modifier.align(Alignment.TopEnd).padding(12.dp)
                            .background(MaterialTheme.colorScheme.background.copy(alpha = 0.7f), CircleShape),
                    ) { Icon(Icons.Filled.Close, contentDescription = "Remove photo") }
                } else if (processingPhoto) {
                    CircularProgressIndicator(strokeWidth = 2.dp)
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(40.dp)) {
                        PhotoSource(Icons.Filled.PhotoCamera, "Take photo") {
                            val uri = MealPhotos.newCaptureUri(context)
                            captureUri = uri
                            takePhoto.launch(uri)
                        }
                        PhotoSource(Icons.Filled.PhotoLibrary, "Choose photo") {
                            pickPhoto.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                        }
                    }
                }
            }

            Row(Modifier.padding(horizontal = Gutter, vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MealType.entries.forEach { t ->
                    FilterChip(selected = type == t, onClick = { haptics.tick(); type = t }, label = { Text(t.label) })
                }
            }
            Hairline()

            FlatTextArea(description, { description = it.take(200) }, "What did you eat?")
            Hairline()
            FlatNumberRow(
                label = "Calories",
                value = caloriesText,
                onValueChange = { v -> caloriesText = v.filter { it.isDigit() }.take(5); error = null },
                suffix = "kcal",
                error = caloriesError,
                imeAction = ImeAction.Next,
            )
            Hairline()
            FlatNumberRow(
                label = "Protein (optional)",
                value = proteinText,
                onValueChange = { v -> proteinText = v.filter { it.isDigit() }.take(3); error = null },
                suffix = "g",
                error = proteinError,
                imeAction = ImeAction.Next,
            )
            Hairline()
            FlatNumberRow(
                label = "Carbs (optional)",
                value = carbsText,
                onValueChange = { v -> carbsText = v.filter { it.isDigit() }.take(3); error = null },
                suffix = "g",
                error = null,
                imeAction = ImeAction.Next,
            )
            Hairline()
            FlatNumberRow(
                label = "Fat (optional)",
                value = fatText,
                onValueChange = { v -> fatText = v.filter { it.isDigit() }.take(3); error = null },
                suffix = "g",
                error = macroError,
                imeAction = ImeAction.Done,
            )
            Hairline()
            Text(
                "Tip: a full plate is often 500 to 800 kcal, and a palm-sized portion of meat or fish is about 25 g of protein.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Gutter, vertical = 12.dp),
            )

            error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = Gutter)) }
        }

        Column(Modifier.padding(horizontal = Gutter, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            val friends = me?.friends?.size ?: 0
            Text(
                if (friends == 0) "Only you will see this until you add friends."
                else "Shared with your $friends ${plural(friends, "friend")}.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            )
            PrimaryButton(
                label = "Post meal",
                enabled = canPost,
                loading = busy,
                onClick = {
                    val kcal = calories ?: return@PrimaryButton
                    busy = true
                    scope.launch {
                        val failure = SocialRepository.logMeal(type, description, kcal, protein, carbs, fat, photo)
                        busy = false
                        if (failure == null) { haptics.confirm(); navController.popBackStack() } else { haptics.reject(); error = failure }
                    }
                },
            )
        }
    }
}


@Composable
private fun PhotoSource(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Column(
        Modifier.clip(MaterialTheme.shapes.medium).pressable(onClick = onClick).padding(12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(56.dp).background(MaterialTheme.colorScheme.background, CircleShape), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary)
        }
        Text(label, style = MaterialTheme.typography.labelLarge, modifier = Modifier.padding(top = 8.dp))
    }
}

/** A borderless multi-line field: just text on the page, with a grey prompt. */
@Composable
private fun FlatTextArea(value: String, onValueChange: (String) -> Unit, placeholder: String) {
    val style = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface)
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        textStyle = style,
        cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences, imeAction = ImeAction.Next),
        minLines = 2,
        modifier = Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 16.dp),
        decorationBox = { inner ->
            Box {
                if (value.isEmpty()) Text(placeholder, style = style.copy(color = MaterialTheme.colorScheme.onSurfaceVariant))
                inner()
            }
        },
    )
}

/** "Calories ........ 650 kcal": label on the left, a right-aligned number on the right. */
@Composable
private fun FlatNumberRow(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    suffix: String,
    error: String?,
    imeAction: ImeAction,
    placeholder: String = "0",
) {
    val style = MaterialTheme.typography.titleMedium.copy(color = MaterialTheme.colorScheme.onSurface, textAlign = TextAlign.End)
    Column(Modifier.padding(horizontal = Gutter, vertical = 14.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f))
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                singleLine = true,
                textStyle = style,
                cursorBrush = SolidColor(MaterialTheme.colorScheme.primary),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = imeAction),
                modifier = Modifier.width(120.dp),
                decorationBox = { inner ->
                    Box(contentAlignment = Alignment.CenterEnd) {
                        if (value.isEmpty()) Text(placeholder, style = style.copy(color = MaterialTheme.colorScheme.onSurfaceVariant))
                        inner()
                    }
                },
            )
            Text(" $suffix", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp)) }
    }
}
