package com.ascendlab.app.ui.screens.onboarding

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.UserProfile
import com.google.firebase.auth.FirebaseAuth

/**
 * Holds the answers while someone moves through onboarding, so going back to a
 * previous page never loses what they typed. Saved to the account at the very end
 * (and after each page, so leaving the app halfway resumes where they stopped).
 */
class OnboardingViewModel : ViewModel() {
    var draft by mutableStateOf(UserProfile())
        private set

    // A different account must never see the previous person's answers.
    private var ownerUid: String? = FirebaseAuth.getInstance().currentUser?.uid
    private val authListener = FirebaseAuth.AuthStateListener { auth ->
        val uid = auth.currentUser?.uid
        if (uid != ownerUid) {
            ownerUid = uid
            draft = UserProfile()
        }
    }

    init {
        FirebaseAuth.getInstance().addAuthStateListener(authListener)
    }

    override fun onCleared() {
        FirebaseAuth.getInstance().removeAuthStateListener(authListener)
    }

    fun update(change: (UserProfile) -> UserProfile) {
        draft = change(draft)
    }

    /** Starts from what is already saved, e.g. a person who left onboarding halfway. */
    fun resumeFrom(saved: UserProfile?) {
        if (saved != null && draft == UserProfile()) draft = saved
    }

    suspend fun finish() {
        draft = draft.copy(onboardingComplete = true)
        ProfileRepository.save(draft)
    }

    suspend fun saveProgress() {
        ProfileRepository.save(draft)
    }
}
