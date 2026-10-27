package com.ascendlab.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner

/** A link from a placeholder page to another page. */
data class PageLink(val label: String, val onClick: () -> Unit)

/**
 * Non-functional stand-in for a page: shows its number, name, purpose and the
 * key elements it will hold, plus buttons to move to the pages it leads to.
 * [header] lets a page show real brand content (e.g. the logo) above the rest.
 */
@Composable
fun PlaceholderScreen(
    number: String,
    title: String,
    section: String,
    purpose: String,
    keyElements: List<String>,
    primary: PageLink? = null,
    secondary: List<PageLink> = emptyList(),
    header: (@Composable () -> Unit)? = null,
) {
    // A page is only RESUMED while it is the settled, visible destination. Ignoring
    // clicks otherwise drops the second tap of a double tap, which would navigate
    // twice (e.g. popping the last page and leaving a blank screen).
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    fun PageLink.guardedClick() {
        if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) onClick()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        header?.let {
            it()
            Spacer(Modifier.height(8.dp))
        }

        SectionChip("#$number · $section")
        Text(text = title, style = MaterialTheme.typography.headlineMedium)
        Text(
            text = purpose,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(Modifier.height(8.dp))
        Text(
            text = "On this page",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            keyElements.forEachIndexed { index, element ->
                KeyElementCard(step = index + 1, text = element)
            }
        }

        Spacer(Modifier.height(16.dp))
        primary?.let {
            Button(
                onClick = { it.guardedClick() },
                modifier = Modifier.fillMaxWidth().height(56.dp),
            ) {
                Text(it.label, style = MaterialTheme.typography.titleMedium)
            }
        }
        secondary.forEach {
            OutlinedButton(
                onClick = { it.guardedClick() },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.onSurface,
                ),
            ) {
                Text(it.label)
            }
        }
    }
}

@Composable
private fun SectionChip(text: String) {
    Text(
        text = text.uppercase(),
        style = MaterialTheme.typography.labelMedium,
        color = MaterialTheme.colorScheme.onPrimaryContainer,
        modifier = Modifier
            .background(MaterialTheme.colorScheme.primaryContainer, CircleShape)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

@Composable
private fun KeyElementCard(step: Int, text: String) {
    // Material's default card content color is secondary text; card content here is primary.
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceContainer,
            contentColor = MaterialTheme.colorScheme.onSurface,
        ),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "$step",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
            }
            Spacer(Modifier.size(14.dp))
            Text(text = text, style = MaterialTheme.typography.bodyLarge)
        }
    }
}
