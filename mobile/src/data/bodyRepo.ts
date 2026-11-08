/**
 * Body weight log at `users/{uid}/weights/{dayKey}`: one entry per day, the latest wins.
 * Logging a weight also updates the profile, so calorie and protein targets follow.
 */
import { collection, doc, limit, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { background, currentUid, db } from '../lib/firebase';
import { createLive } from '../lib/store';
import { ProfileRepository, profileStore } from './profileRepo';
import { Days } from './social';
import { StatsRepository } from './statsRepo';

/** One weigh-in, in kg. */
export interface WeightEntry { dayKey: string; kg: number; at: number }

/** The last 60 weigh-ins, oldest first; null while loading. */
export const weightsLive = createLive<WeightEntry[] | null>(null, (emit) => {
  const uid = currentUid();
  if (!uid) { emit([]); return () => undefined; }
  const q = query(collection(db, 'users', uid, 'weights'), orderBy('at', 'desc'), limit(60));
  return onSnapshot(q, (snap) => {
    emit(snap.docs.flatMap((d) => {
      const kg = d.get('kg');
      return typeof kg === 'number' ? [{ dayKey: d.id, kg, at: Number(d.get('at')) || 0 }] : [];
    }).sort((a, b) => a.at - b.at));
  }, () => emit([]));
});

export const BodyRepository = {
  async log(kg: number): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    const day = Days.key();
    background(setDoc(doc(db, 'users', uid, 'weights', day), { kg, at: Date.now() }));
    StatsRepository.setWeight(day, kg);
    const p = profileStore.get();
    if (p) await ProfileRepository.save({ ...p, weightKg: kg });
  },
};
