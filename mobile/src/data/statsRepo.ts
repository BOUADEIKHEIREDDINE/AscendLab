/**
 * `stats/{uid}`: calories per day and weigh-ins, readable by the owner and their friends
 * (see firestore.rules). Powers the "compare with friends" charts without anyone
 * reading another person's posts or private profile.
 */
import { collection, deleteDoc, doc, getDoc, getDocs, increment, limit, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { background, currentUid, db } from '../lib/firebase';

/** One person's daily numbers, as their friends can see them. */
export interface PersonStats {
  uid: string;
  name: string;
  /** dayKey -> calories eaten that day. */
  kcal: Record<string, number>;
  /** dayKey -> body weight in kg (empty when they don't share it). */
  weights: Record<string, number>;
  sharesWeight: boolean;
}

const ref = (uid: string) => doc(db, 'stats', uid);

function numbers(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') {
    Object.entries(v as Record<string, unknown>).forEach(([k, n]) => { if (typeof n === 'number') out[k] = n; });
  }
  return out;
}

async function myWeights(uid: string): Promise<Record<string, number>> {
  const snap = await getDocs(collection(db, 'users', uid, 'weights'));
  const out: Record<string, number> = {};
  snap.docs.forEach((d) => { const kg = d.get('kg'); if (typeof kg === 'number') out[d.id] = kg; });
  return out;
}

export const StatsRepository = {
  /** Set once the shared numbers were rebuilt for the signed-in person (reset on sign-out). */
  syncedThisSession: false,
  /** Whether the signed-in person shares their weight; refreshed by syncMine. */
  sharesWeight: true,

  addCalories(dayKey: string, delta: number): void {
    const uid = currentUid();
    if (!uid) return;
    background(setDoc(ref(uid), { kcal: { [dayKey]: increment(delta) } }, { merge: true }));
  },

  setWeight(dayKey: string, kg: number): void {
    const uid = currentUid();
    if (!uid || !StatsRepository.sharesWeight) return;
    // Merge writes deep-merge maps, so this only touches that one day.
    background(setDoc(ref(uid), { weights: { [dayKey]: kg } }, { merge: true }));
  },

  /** Turns weight sharing on (copies the weigh-ins in) or off (removes them from the shared doc). */
  async setShareWeight(share: boolean): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    const weights = share ? await myWeights(uid) : {};
    StatsRepository.sharesWeight = share;
    await setDoc(ref(uid), { shareWeight: share }, { merge: true });
    // A plain update on "weights" (not a deep merge) so turning sharing off really clears them.
    await updateDoc(ref(uid), { weights });
  },

  /**
   * Rebuilds the signed-in person's shared numbers from their own data, so the charts are
   * right even for meals logged before this existed. Cheap enough to run once per app start.
   */
  async syncMine(): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    const me = await getDoc(ref(uid)).catch(() => null);
    const share = me?.get('shareWeight') ?? true;
    StatsRepository.sharesWeight = share;
    const meals = await getDocs(query(collection(db, 'posts'), where('uid', '==', uid), limit(500))).catch(() => null);
    if (!meals) return;
    const kcal: Record<string, number> = {};
    meals.docs.forEach((d) => {
      if (d.get('kind') != null) return;
      const day = d.get('dayKey');
      if (typeof day !== 'string' || !day) return;
      kcal[day] = (kcal[day] ?? 0) + (Number(d.get('calories')) || 0);
    });
    const fields: Record<string, unknown> = { kcal, shareWeight: share };
    if (share) fields.weights = await myWeights(uid).catch(() => ({}));
    // Deep merge: days found in posts and weigh-ins are rewritten, other days are kept.
    await setDoc(ref(uid), fields, { merge: true });
  },

  async deleteCurrent(): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    await deleteDoc(ref(uid)).catch(() => undefined);
  },

  /** Stats for the signed-in person and the given friends (those that can be read). */
  async load(people: [string, string][]): Promise<PersonStats[]> {
    const loaded = await Promise.all(people.map(async ([uid, name]) => {
      const d = await getDoc(ref(uid)).catch(() => null);
      if (!d) return null;
      return { uid, name, kcal: numbers(d.get('kcal')), weights: numbers(d.get('weights')), sharesWeight: d.get('shareWeight') ?? true };
    }));
    return loaded.filter((x): x is PersonStats => x != null);
  },
};
