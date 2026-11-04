package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Man
import androidx.compose.material.icons.filled.Woman
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.AuthRepository
import com.ascendlab.app.data.Sex
import com.ascendlab.app.ui.components.Appear
import com.ascendlab.app.ui.components.OnboardingScaffold
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.navigation.signOut
import kotlinx.coroutines.launch

/**
 * Deliberately minimal: two large round figures in the middle of the screen and
 * nothing else competing for attention. The chosen one fills with mint.
 */
@Composable
fun ChooseVersionScreen(navController: NavHostController, viewModel: OnboardingViewModel) {
    val scope = rememberCoroutineScope()
    val selected = viewModel.draft.sex

    OnboardingScaffold(
        step = 1,
        title = "Choose your version",
        subtitle = "Your plan adapts to your body.",
        primaryLabel = "Continue",
        primaryEnabled = selected != null,
        centered = true,
        onPrimary = {
            scope.launch { viewModel.saveProgress() }
            navController.navigate(Routes.YOUR_BODY)
        },
    ) {
        Appear(1) {
            Row(
                Modifier.fillMaxWidth().padding(vertical = 32.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                Figure(Sex.MAN, Icons.Filled.Man, selected) { viewModel.update { it.copy(sex = Sex.MAN) } }
                Figure(Sex.WOMAN, Icons.Filled.Woman, selected) { viewModel.update { it.copy(sex = Sex.WOMAN) } }
            }
        }
        Appear(2) {
            Text(
                "This makes your calorie target more accurate.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        // First page after signing in, so offer a quiet way out for the wrong account.
        AuthRepository.currentEmail?.let { email ->
            Appear(3) {
                TextButton(onClick = { navController.signOut() }, modifier = Modifier.fillMaxWidth()) {
                    Text("Not $email? Log out", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun Figure(sex: Sex, icon: ImageVector, selected: Sex?, onClick: () -> Unit) {
    val isSelected = selected == sex
    // Once one is picked, the other steps back so the choice reads at a glance.
    val dimmed = selected != null && !isSelected
    val fill by animateColorAsState(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent, label = "fill")
    val tint by animateColorAsState(
        if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface,
        label = "tint",
    )
    val scale by animateFloatAsState(
        if (isSelected) 1.08f else 1f,
        spring(dampingRatio = Spring.DampingRatioMediumBouncy),
        label = "scale",
    )
    val alpha by animateFloatAsState(if (dimmed) 0.45f else 1f, label = "alpha")

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp),
        modifier = Modifier.alpha(alpha),
    ) {
        Surface(
            onClick = onClick,
            shape = CircleShape,
            color = fill,
            border = if (isSelected) null else BorderStroke(2.dp, MaterialTheme.colorScheme.outline),
            modifier = Modifier
                .size(136.dp)
                .scale(scale)
                .semantics {
                    this.selected = isSelected
                    role = Role.RadioButton
                    contentDescription = sex.label
                },
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(80.dp))
            }
        }
        Text(sex.label, style = MaterialTheme.typography.titleLarge)
    }
}
