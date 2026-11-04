package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import com.ascendlab.app.data.AuthRepository
import com.ascendlab.app.data.AuthResult
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.ui.navigation.Routes
import com.ascendlab.app.ui.navigation.finishOnboarding
import kotlinx.coroutines.launch

/**
 * Sign up / Log in with email and password, or with Google.
 * A new account continues onboarding; an existing account goes straight to Home.
 */
@Composable
fun SignUpScreen(
    navController: NavHostController,
    viewModel: OnboardingViewModel,
    startInLogIn: Boolean = false,
) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()

    var isLogIn by rememberSaveable { mutableStateOf(startInLogIn) }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var showPassword by rememberSaveable { mutableStateOf(false) }
    var loading by rememberSaveable { mutableStateOf(false) }
    var error by rememberSaveable { mutableStateOf<String?>(null) }
    var info by rememberSaveable { mutableStateOf<String?>(null) }

    suspend fun handle(result: AuthResult) {
        when (result) {
            is AuthResult.Success -> {
                // A returning person may have finished setup already (go Home) or stopped
                // halfway (resume onboarding with their earlier answers filled in).
                val saved = if (result.isNewUser) null else ProfileRepository.load()
                if (saved?.onboardingComplete == true) {
                    navController.finishOnboarding()
                } else {
                    viewModel.resumeFrom(saved)
                    navController.navigate(Routes.CHOOSE_VERSION) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                }
            }
            is AuthResult.Error -> error = result.message
            AuthResult.Cancelled -> Unit
        }
        loading = false
    }

    fun submit() {
        focusManager.clearFocus()
        info = null
        error = when {
            !android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches() -> "Enter a valid email address."
            password.length < 6 -> "Password must be at least 6 characters."
            else -> null
        }
        if (error != null) return
        loading = true
        scope.launch {
            handle(if (isLogIn) AuthRepository.logIn(email, password) else AuthRepository.signUp(email, password))
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .imePadding()
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (navController.previousBackStackEntry != null) {
            IconButton(onClick = { navController.popBackStack() }, modifier = Modifier.offset(x = (-12).dp)) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
            }
        }
        // The heading crossfades when switching between sign up and log in.
        AnimatedContent(targetState = isLogIn, label = "auth heading") { logIn ->
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = if (logIn) "Welcome back" else "Create your account",
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    text = if (logIn) "Log in to pick up where you left off." else "Your plan, your pace. It takes a minute.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = email,
            onValueChange = { email = it; error = null },
            label = { Text("Email") },
            singleLine = true,
            enabled = !loading,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = password,
            onValueChange = { password = it; error = null },
            label = { Text("Password") },
            singleLine = true,
            enabled = !loading,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                IconButton(onClick = { showPassword = !showPassword }) {
                    Icon(
                        if (showPassword) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = if (showPassword) "Hide password" else "Show password",
                    )
                }
            },
            supportingText = if (!isLogIn) ({ Text("At least 6 characters") }) else null,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { submit() }),
            modifier = Modifier.fillMaxWidth(),
        )

        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
        info?.let { Text(it, color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.bodyMedium) }

        Button(
            onClick = ::submit,
            enabled = !loading,
            modifier = Modifier.fillMaxWidth().height(56.dp),
        ) {
            if (loading) {
                CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp)
            } else {
                Text(if (isLogIn) "Log in" else "Sign up", style = MaterialTheme.typography.titleMedium)
            }
        }

        if (isLogIn) {
            TextButton(
                onClick = {
                    error = null
                    if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email.trim()).matches()) {
                        error = "Enter your email above, then tap Forgot password."
                        return@TextButton
                    }
                    loading = true
                    scope.launch {
                        val result = AuthRepository.sendPasswordReset(email)
                        loading = false
                        if (result is AuthResult.Error) error = result.message
                        else info = "Reset link sent. Check your inbox."
                    }
                },
                enabled = !loading,
                modifier = Modifier.align(Alignment.CenterHorizontally),
            ) { Text("Forgot password?") }
        }

        OrDivider()

        OutlinedButton(
            onClick = {
                error = null
                loading = true
                scope.launch { handle(AuthRepository.signInWithGoogle(context)) }
            },
            enabled = !loading,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
        ) { Text("Continue with Google") }

        TextButton(
            onClick = { isLogIn = !isLogIn; error = null; info = null },
            enabled = !loading,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        ) {
            Text(if (isLogIn) "New here? Create an account" else "Already have an account? Log in")
        }
    }
}

/** "or" divider between the email form and Google sign-in. */
@Composable
private fun OrDivider() {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        HorizontalDivider(Modifier.weight(1f))
        Text(
            "or",
            modifier = Modifier.padding(horizontal = 12.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.labelLarge,
        )
        HorizontalDivider(Modifier.weight(1f))
    }
}
