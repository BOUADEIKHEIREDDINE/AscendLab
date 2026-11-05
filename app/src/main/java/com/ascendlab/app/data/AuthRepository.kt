package com.ascendlab.app.data

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.NoCredentialException
import com.ascendlab.app.R
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.auth.AuthCredential
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.FirebaseAuthInvalidUserException
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseAuthWeakPasswordException
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.tasks.await

/** Outcome of an account action. [isNewUser] tells onboarding whether to collect a profile. */
sealed interface AuthResult {
    data class Success(val isNewUser: Boolean = false) : AuthResult
    data class Error(val message: String) : AuthResult
    /** The person closed the Google account picker; not an error worth showing. */
    data object Cancelled : AuthResult
}

/** Thin wrapper around Firebase Authentication (email/password and Google). */
object AuthRepository {
    private val auth: FirebaseAuth get() = FirebaseAuth.getInstance()

    /** Firebase keeps the session on disk, so this survives app restarts. */
    val isSignedIn: Boolean get() = auth.currentUser != null

    val currentEmail: String? get() = auth.currentUser?.email

    /** True when the account has a password (as opposed to Google-only). */
    val usesPassword: Boolean
        get() = auth.currentUser?.providerData?.any { it.providerId == EmailAuthProvider.PROVIDER_ID } == true

    suspend fun signUp(email: String, password: String): AuthResult = runAuth {
        auth.createUserWithEmailAndPassword(email.trim(), password).await()
        AuthResult.Success(isNewUser = true)
    }

    suspend fun logIn(email: String, password: String): AuthResult = runAuth {
        auth.signInWithEmailAndPassword(email.trim(), password).await()
        AuthResult.Success(isNewUser = false)
    }

    suspend fun sendPasswordReset(email: String): AuthResult = runAuth {
        auth.sendPasswordResetEmail(email.trim()).await()
        AuthResult.Success()
    }

    /** Shows the system Google account picker, then signs in to Firebase with the chosen account. */
    suspend fun signInWithGoogle(context: Context): AuthResult = runAuth {
        val result = auth.signInWithCredential(googleCredential(context)).await()
        AuthResult.Success(isNewUser = result.additionalUserInfo?.isNewUser == true)
    }

    fun signOut() {
        auth.signOut()
        ProfileRepository.clearSession()
        SocialRepository.clearSession()
        TrainRepository.clearSession()
        StatsRepository.syncedThisSession = false
    }

    /**
     * Permanently deletes the account and its profile. Firebase only allows this right
     * after signing in, so the person confirms with their [password] (email accounts)
     * or by picking their Google account again (Google accounts, [password] null).
     */
    suspend fun deleteAccount(context: Context, password: String?): AuthResult = runAuth {
        val user = auth.currentUser ?: return@runAuth AuthResult.Error("You're not signed in.")
        val credential = if (password != null) {
            EmailAuthProvider.getCredential(requireNotNull(user.email), password)
        } else {
            googleCredential(context)
        }
        user.reauthenticate(credential).await()
        // The data goes first: once the account is gone, the rules no longer let us delete it.
        SocialRepository.deleteCurrent()
        StatsRepository.deleteCurrent()
        TrainRepository.deleteCurrent()
        ProfileRepository.deleteCurrent()
        user.delete().await()
        AuthResult.Success()
    }

    private suspend fun googleCredential(context: Context): AuthCredential {
        val option = GetSignInWithGoogleOption.Builder(
            context.getString(R.string.default_web_client_id),
        ).build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        val credential = CredentialManager.create(context).getCredential(context, request).credential
        check(
            credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL,
        ) { "Google sign-in returned an unexpected credential." }
        val idToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
        return GoogleAuthProvider.getCredential(idToken, null)
    }

    private inline fun runAuth(block: () -> AuthResult): AuthResult = try {
        block()
    } catch (e: GetCredentialCancellationException) {
        AuthResult.Cancelled
    } catch (e: NoCredentialException) {
        AuthResult.Error("No Google account found on this phone. Add one in Settings, then try again.")
    } catch (e: Exception) {
        AuthResult.Error(friendlyMessage(e))
    }

    private fun friendlyMessage(e: Exception): String = when (e) {
        is FirebaseAuthWeakPasswordException -> "Password must be at least 6 characters."
        is FirebaseAuthUserCollisionException -> "An account already exists with this email. Log in instead."
        is FirebaseAuthInvalidUserException -> "No account found with this email."
        is FirebaseAuthInvalidCredentialsException -> "Email or password is incorrect."
        is FirebaseNetworkException -> "No internet connection. Check your network and try again."
        else -> e.localizedMessage ?: "Something went wrong. Please try again."
    }
}
