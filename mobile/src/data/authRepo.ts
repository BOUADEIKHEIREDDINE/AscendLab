/** Thin wrapper around Firebase Authentication (email/password and Google). */
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import {
  AuthCredential, createUserWithEmailAndPassword, deleteUser, EmailAuthProvider, getAdditionalUserInfo,
  GoogleAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signInWithCredential,
  signInWithEmailAndPassword, signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { authMessage } from '../lib/errors';
import { resetAllLive } from '../lib/store';
import { ProfileRepository } from './profileRepo';
import { SocialRepository } from './socialRepo';
import { StatsRepository } from './statsRepo';
import { TrainRepository } from './trainRepo';

/** Outcome of an account action. `isNewUser` tells onboarding whether to collect a profile. */
export type AuthResult =
  | { kind: 'success'; isNewUser: boolean }
  | { kind: 'error'; message: string }
  /** The person closed the Google account picker; not an error worth showing. */
  | { kind: 'cancelled' };

const success = (isNewUser = false): AuthResult => ({ kind: 'success', isNewUser });

// ---------------------------------------------------------------- Google (native module)

type GoogleModule = typeof import('@react-native-google-signin/google-signin');
let google: GoogleModule | null | undefined;

/**
 * The Google Sign-In native module exists only in development and store builds, not in
 * Expo Go or on the web, so it is loaded lazily and the button is hidden without it.
 */
function googleModule(): GoogleModule | null {
  if (google !== undefined) return google;
  google = null;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (Platform.OS === 'web' || !webClientId) return null;
  // Expo Go doesn't contain this native module. Check first: requiring the package without
  // it makes React Native log a red error even though the failure is caught.
  if (!TurboModuleRegistry.get('RNGoogleSignin') && !NativeModules.RNGoogleSignin) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod: GoogleModule = require('@react-native-google-signin/google-signin');
    mod.GoogleSignin.configure({
      webClientId,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
    });
    google = mod;
  } catch {
    google = null;
  }
  return google;
}

class GoogleCancelled extends Error {}

/** Shows the Google account picker, then turns the chosen account into a Firebase credential. */
async function googleCredential(): Promise<AuthCredential> {
  const mod = googleModule();
  if (!mod) throw new Error("Google sign-in isn't available in this version of the app. Use your email instead.");
  const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } = mod;
  try {
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Signing out of Google first makes the account picker appear every time.
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new GoogleCancelled();
    const idToken = response.data.idToken;
    if (!idToken) throw new Error('Google sign-in returned an unexpected credential.');
    return GoogleAuthProvider.credential(idToken);
  } catch (e) {
    if (e instanceof GoogleCancelled) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) throw new GoogleCancelled();
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Google Play services are missing or out of date on this phone.');
    }
    throw e;
  }
}

async function run(block: () => Promise<AuthResult>): Promise<AuthResult> {
  try {
    return await block();
  } catch (e) {
    if (e instanceof GoogleCancelled) return { kind: 'cancelled' };
    return { kind: 'error', message: authMessage(e) };
  }
}

// ---------------------------------------------------------------- Repository

export const AuthRepository = {
  /** Firebase keeps the session on the device, so this survives app restarts. */
  get isSignedIn() { return auth.currentUser != null; },
  get currentEmail() { return auth.currentUser?.email ?? null; },
  /** True when the account has a password (as opposed to Google-only). */
  get usesPassword() {
    return auth.currentUser?.providerData.some((p) => p.providerId === EmailAuthProvider.PROVIDER_ID) === true;
  },
  get googleAvailable() { return googleModule() != null; },

  signUp: (email: string, password: string) => run(async () => {
    await createUserWithEmailAndPassword(auth, email.trim(), password);
    return success(true);
  }),

  logIn: (email: string, password: string) => run(async () => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    return success(false);
  }),

  sendPasswordReset: (email: string) => run(async () => {
    await sendPasswordResetEmail(auth, email.trim());
    return success();
  }),

  /** Shows the Google account picker, then signs in to Firebase with the chosen account. */
  signInWithGoogle: () => run(async () => {
    const result = await signInWithCredential(auth, await googleCredential());
    return success(getAdditionalUserInfo(result)?.isNewUser === true);
  }),

  async signOut(): Promise<void> {
    ProfileRepository.clearSession();
    SocialRepository.clearSession();
    TrainRepository.clearSession();
    StatsRepository.syncedThisSession = false;
    resetAllLive();
    await firebaseSignOut(auth);
    resetAllLive();
  },

  /**
   * Permanently deletes the account and its data. Firebase only allows this right
   * after signing in, so the person confirms with their password (email accounts)
   * or by picking their Google account again (Google accounts, password null).
   */
  deleteAccount: (password: string | null) => run(async () => {
    const user = auth.currentUser;
    if (!user) return { kind: 'error', message: "You're not signed in." };
    const credential = password != null
      ? EmailAuthProvider.credential(user.email ?? '', password)
      : await googleCredential();
    await reauthenticateWithCredential(user, credential);
    // The data goes first: once the account is gone, the rules no longer let us delete it.
    await SocialRepository.deleteCurrent();
    await StatsRepository.deleteCurrent();
    await TrainRepository.deleteCurrent();
    await ProfileRepository.deleteCurrent();
    await deleteUser(user);
    return success();
  }),
};
