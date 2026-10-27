package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.R
import com.ascendlab.app.ui.components.PageLink
import com.ascendlab.app.ui.components.PlaceholderScreen
import com.ascendlab.app.ui.navigation.Routes

@Composable
fun WelcomeScreen(navController: NavHostController) = PlaceholderScreen(
    number = "1",
    title = "Welcome",
    section = "Onboarding",
    purpose = "First impression and promise",
    keyElements = listOf(
        "Logo",
        "One-line promise",
    ),
    primary = PageLink("Get started") { navController.navigate(Routes.SIGN_UP) },
    secondary = listOf(
        PageLink("Log in") { navController.navigate(Routes.SIGN_UP) },
    ),
    header = { BrandHeader() },
)

@Composable
private fun BrandHeader() {
    Column(modifier = Modifier.padding(top = 24.dp)) {
        Image(
            painter = painterResource(R.drawable.ascendlab_logo),
            contentDescription = stringResource(R.string.app_name),
            // Width cap keeps clear space around the logo, as the brand guide asks.
            modifier = Modifier.fillMaxWidth(0.75f),
        )
        Spacer(Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.tagline),
            style = MaterialTheme.typography.titleLarge,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}
