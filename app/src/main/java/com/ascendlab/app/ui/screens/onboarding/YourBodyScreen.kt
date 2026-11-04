package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.DirectionsBike
import androidx.compose.material.icons.automirrored.filled.DirectionsWalk
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Chair
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.ActivityLevel
import com.ascendlab.app.data.BodyChecks
import com.ascendlab.app.data.Convert
import com.ascendlab.app.data.Units
import com.ascendlab.app.ui.components.Appear
import com.ascendlab.app.ui.components.ChoiceCard
import com.ascendlab.app.ui.components.HelpNote
import com.ascendlab.app.ui.components.OnboardingScaffold
import com.ascendlab.app.ui.components.SectionLabel
import com.ascendlab.app.ui.navigation.Routes
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

private val ActivityLevel.icon
    get() = when (this) {
        ActivityLevel.SEDENTARY -> Icons.Filled.Chair
        ActivityLevel.LIGHT -> Icons.AutoMirrored.Filled.DirectionsWalk
        ActivityLevel.MODERATE -> Icons.AutoMirrored.Filled.DirectionsBike
        ActivityLevel.VERY -> Icons.Filled.Bolt
    }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun YourBodyScreen(navController: NavHostController, viewModel: OnboardingViewModel) {
    val scope = rememberCoroutineScope()
    val draft = viewModel.draft
    val units = draft.units

    // What the person typed, kept as text so a half-typed number doesn't jump around.
    var ageText by rememberSaveable { mutableStateOf(draft.age?.toString().orEmpty()) }
    var cmText by rememberSaveable { mutableStateOf(draft.heightCm?.roundToInt()?.toString().orEmpty()) }
    var ftText by rememberSaveable { mutableStateOf(draft.heightCm?.let { Convert.cmToFeetInches(it).first.toString() }.orEmpty()) }
    var inText by rememberSaveable { mutableStateOf(draft.heightCm?.let { Convert.cmToFeetInches(it).second.toString() }.orEmpty()) }
    var weightText by rememberSaveable {
        mutableStateOf(draft.weightKg?.let { formatNumber(if (units == Units.METRIC) it else Convert.kgToLb(it)) }.orEmpty())
    }
    // Errors stay hidden until the person tries to continue, so nobody is scolded mid-typing.
    var showErrors by rememberSaveable { mutableStateOf(false) }

    val age = ageText.toIntOrNull()
    val heightCm = when (units) {
        Units.METRIC -> cmText.toDoubleOrNull()
        Units.IMPERIAL -> ftText.toIntOrNull()?.let { ft -> Convert.feetInchesToCm(ft, inText.toIntOrNull() ?: 0) }
    }
    val weightKg = weightText.replace(',', '.').toDoubleOrNull()?.let {
        if (units == Units.METRIC) it else Convert.lbToKg(it)
    }

    val ageError = BodyChecks.age(age)
    val heightError = BodyChecks.height(heightCm, units)
    val weightError = BodyChecks.weight(weightKg, units)
    val comboError = if (heightError == null && weightError == null) BodyChecks.combination(heightCm, weightKg) else null
    val activityError = if (draft.activity == null) "Pick the option closest to your normal day." else null

    fun switchUnits(to: Units) {
        if (to == units) return
        // Convert what's already typed so switching never wipes an answer.
        heightCm?.let { cm ->
            cmText = cm.roundToInt().toString()
            Convert.cmToFeetInches(cm).let { (ft, inch) -> ftText = ft.toString(); inText = inch.toString() }
        }
        weightKg?.let { kg -> weightText = formatNumber(if (to == Units.METRIC) kg else Convert.kgToLb(kg)) }
        viewModel.update { it.copy(units = to) }
    }

    OnboardingScaffold(
        step = 2,
        title = "About you",
        subtitle = "We use this to work out how much energy your body needs each day.",
        primaryLabel = "Continue",
        onBack = { navController.popBackStack() },
        onPrimary = {
            showErrors = true
            val valid = listOf(ageError, heightError, weightError, comboError, activityError).all { it == null }
            if (valid) {
                viewModel.update { it.copy(age = age, heightCm = heightCm, weightKg = weightKg) }
                scope.launch { viewModel.saveProgress() }
                navController.navigate(Routes.YOUR_GOALS)
            }
        },
    ) {
        Appear(1) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Units", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    Units.entries.forEachIndexed { i, u ->
                        SegmentedButton(
                            selected = units == u,
                            onClick = { switchUnits(u) },
                            shape = SegmentedButtonDefaults.itemShape(i, Units.entries.size),
                        ) { Text("${u.weightUnit} · ${if (u == Units.METRIC) "cm" else "ft"}") }
                    }
                }
            }
        }

        Appear(2) {
            NumberField(
                value = ageText,
                onValueChange = { ageText = it.filter(Char::isDigit).take(3) },
                label = "Age",
                suffix = "years",
                error = ageError.takeIf { showErrors },
            )
        }

        Appear(3) {
            if (units == Units.METRIC) {
                NumberField(
                    value = cmText,
                    onValueChange = { cmText = it.filter(Char::isDigit).take(3) },
                    label = "Height",
                    suffix = "cm",
                    error = heightError.takeIf { showErrors },
                )
            } else {
                Column {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        NumberField(
                            value = ftText,
                            onValueChange = { ftText = it.filter(Char::isDigit).take(1) },
                            label = "Height",
                            suffix = "ft",
                            error = null,
                            isError = showErrors && heightError != null,
                            modifier = Modifier.weight(1f),
                        )
                        NumberField(
                            value = inText,
                            onValueChange = { v -> inText = v.filter(Char::isDigit).take(2).let { if ((it.toIntOrNull() ?: 0) > 11) "11" else it } },
                            label = "",
                            suffix = "in",
                            error = null,
                            isError = showErrors && heightError != null,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    FieldError(heightError.takeIf { showErrors })
                }
            }
        }

        Appear(4) {
            NumberField(
                value = weightText,
                onValueChange = { v -> weightText = v.filter { it.isDigit() || it == '.' || it == ',' }.take(5) },
                label = "Weight",
                suffix = units.weightUnit,
                error = weightError.takeIf { showErrors },
                decimal = true,
                imeAction = ImeAction.Done,
            )
        }

        // Shown as soon as both values are typed: an obvious mix-up is worth flagging early.
        FieldError(comboError)

        Appear(5) {
            HelpNote("Your details stay private to your account. You can change them later in Settings.")
        }

        Appear(6) { SectionLabel("How active is your normal day?") }
        Appear(7) {
            Text(
                "Don't count workouts here, just your usual day.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        ActivityLevel.entries.forEachIndexed { i, level ->
            Appear(8 + i) {
                ChoiceCard(
                    selected = draft.activity == level,
                    onClick = { viewModel.update { it.copy(activity = level) } },
                    title = level.label,
                    description = level.description,
                    detail = "e.g. ${level.example}",
                    icon = level.icon,
                )
            }
        }
        FieldError(activityError.takeIf { showErrors })
    }
}

@Composable
private fun NumberField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    suffix: String,
    error: String?,
    modifier: Modifier = Modifier.fillMaxWidth(),
    isError: Boolean = error != null,
    decimal: Boolean = false,
    imeAction: ImeAction = ImeAction.Next,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = if (label.isNotEmpty()) ({ Text(label) }) else null,
        suffix = { Text(suffix) },
        singleLine = true,
        isError = isError,
        supportingText = error?.let { { Text(it) } },
        textStyle = MaterialTheme.typography.titleLarge,
        keyboardOptions = KeyboardOptions(
            keyboardType = if (decimal) KeyboardType.Decimal else KeyboardType.Number,
            imeAction = imeAction,
        ),
        modifier = modifier,
    )
}

@Composable
private fun FieldError(message: String?) {
    // Keep showing the last message while it animates away.
    var shown by remember { mutableStateOf(message) }
    if (message != null) shown = message
    AnimatedVisibility(visible = message != null, enter = fadeIn() + expandVertically(), exit = fadeOut() + shrinkVertically()) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Filled.ErrorOutline, null, tint = MaterialTheme.colorScheme.error)
            Text(shown.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

/** 72.0 -> "72", 72.5 -> "72.5". */
private fun formatNumber(value: Double): String {
    val rounded = (value * 10).roundToInt() / 10.0
    return if (rounded % 1.0 == 0.0) rounded.toInt().toString() else rounded.toString()
}
