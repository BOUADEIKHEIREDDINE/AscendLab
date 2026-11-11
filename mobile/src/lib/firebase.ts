/**
 * Firebase, shared by every repository. Uses the same project as the Android app, so
 * accounts, profiles, posts and workouts are the same on Android, iOS and web.
 *
 * Config comes from EXPO_PUBLIC_FIREBASE_* variables (see .env.example).
 */
import { Platform } from 'react-native';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { Auth, browserLocalPersistence, connectAuthEmulator, getAuth, initializeAuth } from 'firebase/auth';
import { connectFirestoreEmulator, Firestore, initializeFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  // Fail loudly at start-up rather than with confusing errors on the first network call.
  throw new Error('Firebase config is missing. Copy mobile/.env.example to mobile/.env and fill it in.');
}

function createAuth(app: FirebaseApp): Auth {
  if (Platform.OS === 'web') {
    return initializeAuth(app, { persistence: browserLocalPersistence });
  }
  // The React Native build of firebase/auth exports getReactNativePersistence; the web
  // typings don't declare it, hence the cast. Keeps people signed in across restarts.
  const { getReactNativePersistence } = FirebaseAuth as unknown as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => FirebaseAuth.Persistence;
  };
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
}

const existing = getApps()[0];
export const app: FirebaseApp = existing ?? initializeApp(config);
export const auth: Auth = existing ? getAuth(app) : createAuth(app);
export const db: Firestore = initializeFirestore(app, {
  // Some mobile networks and proxies break Firestore's streaming connection; this falls back
  // to long polling only when needed.
  experimentalAutoDetectLongPolling: true,
});

// Debug builds can talk to the local Firebase Emulator Suite instead of the real project:
// set EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true. Test accounts never reach the real project.
if (process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true' && !existing) {
  // 10.0.2.2 is the computer running the Android emulator; the iOS simulator and web use localhost.
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, Number(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT) || 8080);
}

/** Resolves to `null` instead of waiting forever when the network is slow. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      () => { clearTimeout(timer); resolve(null); },
    );
  });
}

/** Fire-and-forget write: offline it's queued and confirmed later, so errors are only logged. */
export function background(promise: Promise<unknown>): void {
  promise.catch((e) => console.warn('[AscendLab] background write failed', e));
}

export const currentUid = (): string | null => auth.currentUser?.uid ?? null;
