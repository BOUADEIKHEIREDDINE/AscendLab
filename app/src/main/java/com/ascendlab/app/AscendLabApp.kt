package com.ascendlab.app

import android.app.Application
import com.ascendlab.app.data.ProfileRepository
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore

class AscendLabApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.USE_FIREBASE_EMULATOR) {
            // 10.0.2.2 is the computer running the Android emulator, where the
            // Firebase Emulator Suite listens. Test accounts never reach the real project.
            FirebaseAuth.getInstance().useEmulator("10.0.2.2", 9099)
            FirebaseFirestore.getInstance().useEmulator("10.0.2.2", 8080)
        }
        ProfileRepository.init(this)
    }
}
