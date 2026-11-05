package com.ascendlab.app.ui.screens.train

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ascendlab.app.data.TrainRepository
import com.ascendlab.app.data.TrainState
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn

class TrainViewModel : ViewModel() {
    val state: StateFlow<TrainState> = TrainRepository.state()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), TrainState())

    val active = TrainRepository.active

    /** Workout history, newest first; null while loading. */
    val history: StateFlow<List<com.ascendlab.app.data.WorkoutRecord>?> = TrainRepository.history()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    init {
        // After signing in on this phone, bring back a workout that was in progress.
        if (TrainRepository.active.value == null) TrainRepository.restoreActive()
    }
}
