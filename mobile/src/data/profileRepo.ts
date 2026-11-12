/**
 * Stores each person's profile in Firestore at `users/{uid}` (only they can read or
 * write it; see firestore.rules). A copy is kept on the device so the app opens
 * instantly and keeps working offline.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { currentUid, db, withTimeout } from '../lib/firebase';
import { createStore } from '../lib/store';
import { pinLegacyDefaults, profileFromMap, profileToMap, UserProfile } from './profile';

const NETWORK_TIMEOUT_MS = 6_000;
const key = (uid: string) => `profile:${uid}`;
const ref = (uid: string) => doc(db, 'users', uid);

/** The signed-in person's saved profile, or null before it is loaded or when signed out. */
export const profileStore = createStore<UserProfile | null>(null);

async function remember(uid: string, p: UserProfile) {
  profileStore.set(p);
  try { await AsyncStorage.setItem(key(uid), JSON.stringify(profileToMap(p))); } catch { /* device storage full: keep going */ }
}

export const ProfileRepository = {
  /** Profile saved on this device for the signed-in person, read without any network call. */
  async cached(): Promise<UserProfile | null> {
    const uid = currentUid();
    if (!uid) return null;
    try {
      const json = await AsyncStorage.getItem(key(uid));
      if (!json) return null;
      const p = profileFromMap(JSON.parse(json));
      profileStore.set(p);
      return p;
    } catch {
      return null;
    }
  },

  /**
   * Loads the profile: the device copy if there is one, otherwise Firestore.
   * Returns null for someone who has never saved a profile (or when offline on a new phone).
   */
  async load(): Promise<UserProfile | null> {
    const loaded = await ProfileRepository.read();
    if (!loaded || loaded.rankingVersion != null) return loaded;
    // Saved before the exercise ranking: keep the exercises the person has been seeing, once.
    const pinned = pinLegacyDefaults(loaded);
    try { await ProfileRepository.save(pinned); } catch { /* offline: the device copy is already updated */ }
    return pinned;
  },

  async read(): Promise<UserProfile | null> {
    const cached = await ProfileRepository.cached();
    if (cached) return cached;
    const uid = currentUid();
    if (!uid) return null;
    const snap = await withTimeout(getDoc(ref(uid)), NETWORK_TIMEOUT_MS);
    const data = snap?.data();
    if (!data) return null;
    const p = profileFromMap(data);
    await remember(uid, p);
    return p;
  },

  /**
   * Saves the profile. The device copy is updated at once; the Firestore write is
   * waited on for a few seconds at most, so a slow network never blocks the person.
   */
  async save(p: UserProfile): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    await remember(uid, p);
    await withTimeout(setDoc(ref(uid), profileToMap(p), { merge: true }), NETWORK_TIMEOUT_MS);
  },

  /** Deletes the signed-in person's stored profile, on the server and on the device. */
  async deleteCurrent(): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    await deleteDoc(ref(uid));
    await AsyncStorage.removeItem(key(uid));
    profileStore.set(null);
  },

  /** Clears what is held in memory (called on log out; the device copy stays for next login). */
  clearSession(): void {
    profileStore.set(null);
  },
};
