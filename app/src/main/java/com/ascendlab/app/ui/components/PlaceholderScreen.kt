package com.ascendlab.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/** A link from a placeholder page to another page. */
data class PageLink(val label: String, val onClick: () -> Unit)

/**
 * Non-functional stand-in for a page: shows its number, name, purpose and the
 * key elements it will hold, plus buttons to move to the pages it leads to.
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
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "#$number · $section",
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(text = title, style = MaterialTheme.typography.headlineMedium)
        Text(text = purpose, style = MaterialTheme.typography.bodyLarge)

        Spacer(Modifier.height(8.dp))
        keyElements.forEach { element ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = element,
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        primary?.let {
            Button(onClick = it.onClick, modifier = Modifier.fillMaxWidth()) { Text(it.label) }
        }
        secondary.forEach {
            OutlinedButton(onClick = it.onClick, modifier = Modifier.fillMaxWidth()) { Text(it.label) }
        }
    }
}
