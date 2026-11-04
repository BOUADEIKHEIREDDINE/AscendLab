package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.R
import com.ascendlab.app.ui.components.Appear
import com.ascendlab.app.ui.components.PrimaryButton
import com.ascendlab.app.ui.navigation.Routes
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun WelcomeScreen(navController: NavHostController) {
    Column(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
    ) {
        // Centered on tall screens, scrollable on short ones.
        BoxWithConstraints(Modifier.weight(1f)) {
            val minHeight = maxHeight
            Column(
                modifier = Modifier
                    .verticalScroll(rememberScrollState())
                    .heightIn(min = minHeight)
                    .padding(vertical = 24.dp),
                verticalArrangement = Arrangement.spacedBy(28.dp, Alignment.CenterVertically),
            ) {
            AnimatedLogo()
            Appear(3) {
                Text(
                    "Your personal training and nutrition plan, built around you. " +
                        "No experience needed.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Appear(5) { Promise(Icons.Filled.FitnessCenter, "A training plan", "Made for your level, your days and your space") }
                Appear(6) { Promise(Icons.Filled.Restaurant, "A calorie target", "Know how much to eat to reach your goal") }
                Appear(7) { Promise(Icons.AutoMirrored.Filled.TrendingUp, "Steady progress", "Small steps, every week, at your own pace") }
            }
            }
        }

        Appear(9) {
            Column(Modifier.padding(bottom = 16.dp)) {
                PrimaryButton("Get started", onClick = { navController.navigate(Routes.SIGN_UP) })
                TextButton(
                    onClick = { navController.navigate(Routes.LOG_IN) },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                ) { Text("I already have an account") }
            }
        }
    }
}

/** The logo fades and grows into place, then three mint steps rise under the tagline. */
@Composable
private fun AnimatedLogo() {
    val logo = remember { Animatable(0f) }
    LaunchedEffect(Unit) { logo.animateTo(1f, tween(700, easing = FastOutSlowInEasing)) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Image(
            painter = painterResource(R.drawable.ascendlab_logo),
            contentDescription = stringResource(R.string.app_name),
            // Width cap keeps clear space around the logo, as the brand guide asks.
            modifier = Modifier
                .fillMaxWidth(0.72f)
                .graphicsLayer {
                    alpha = logo.value
                    val s = 0.85f + 0.15f * logo.value
                    scaleX = s
                    scaleY = s
                    transformOrigin = androidx.compose.ui.graphics.TransformOrigin(0f, 0.5f)
                },
        )
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                stringResource(R.string.tagline),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.graphicsLayer { alpha = logo.value },
            )
            RisingSteps()
        }
    }
}

@Composable
private fun RisingSteps() {
    val heights = listOf(8.dp, 14.dp, 20.dp)
    val progress = remember { heights.map { Animatable(0f) } }
    LaunchedEffect(Unit) {
        delay(500)
        progress.forEachIndexed { i, anim ->
            launch {
                delay(160L * i)
                anim.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessLow))
            }
        }
    }
    Row(
        modifier = Modifier.padding(bottom = 6.dp),
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        heights.forEachIndexed { i, h ->
            Box(
                Modifier
                    .width(7.dp)
                    .height(h * progress[i].value.coerceAtLeast(0f))
                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(2.dp)),
            )
        }
    }
}

@Composable
private fun Promise(icon: ImageVector, title: String, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier.size(44.dp).background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp)) }
        Spacer(Modifier.width(14.dp))
        Column {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
