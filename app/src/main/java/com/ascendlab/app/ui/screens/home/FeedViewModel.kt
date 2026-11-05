package com.ascendlab.app.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ascendlab.app.data.FeedState
import com.ascendlab.app.data.PlanCalculator
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SocialRepository
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Shared by the Home feed and the calorie tracker: the live feed plus who "me" is. */
class FeedViewModel : ViewModel() {
    val feed: StateFlow<FeedState> = SocialRepository.feed()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), FeedState())

    val me = SocialRepository.me

    init {
        viewModelScope.launch {
            if (ProfileRepository.profile.value == null) ProfileRepository.load()
            runCatching { SocialRepository.refreshMe() }
            if (!com.ascendlab.app.data.StatsRepository.syncedThisSession) {
                com.ascendlab.app.data.StatsRepository.syncedThisSession = true
                runCatching { com.ascendlab.app.data.StatsRepository.syncMine() }
            }
        }
    }

    /** Today's calorie goal from the person's plan, or 0 if their profile isn't complete. */
    fun target(): Int = ProfileRepository.profile.value?.takeIf { it.hasEverythingForPlan }
        ?.let { PlanCalculator.nutrition(it).calories } ?: 0

    fun proteinTarget(): Int = ProfileRepository.profile.value?.takeIf { it.hasEverythingForPlan }
        ?.let { PlanCalculator.nutrition(it).proteinG } ?: 0
}
