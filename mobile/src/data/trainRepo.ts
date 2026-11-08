/**
 * Programs, routines and workout history, private to each person, under `users/{uid}/`:
 *  - `programs/{id}`: name and its routines (embedded, they're small).
 *  - `meta/train`: which program is active, and whether the starter program was made.
 *  - `workouts/{id}`: every finished workout, set by set (used for "Previous" values).
 * The workout in progress lives on the device only, so it survives the app being closed.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection, deleteDoc, doc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc, writeBatch,
} from 'firebase/firestore';
import { background, currentUid, db } from '../lib/firebase';
import { createLive, createStore } from '../lib/store';
import { Convert, hasEverythingForPlan } from './profile';
import { ProfileRepository, profileStore } from './profileRepo';
import { SocialRepository } from './socialRepo';
import {
  ActiveWorkout, activeFromJson, activeToJson, countRecords, LoggedExercise, LoggedSet, newSet,
  Program, recordsByExercise, Routine, routineFromMap, routineToMap, starterRoutines, WorkoutMath, WorkoutRecord, workoutFromDoc,
} from './training';

/** The Train tab's state as screens see it. */
export interface TrainState { programs: Program[]; activeProgramId: string | null; loading: boolean; error: string | null }

export function activeProgramOf(s: TrainState): Program | null {
  return s.programs.find((p) => p.id === s.activeProgramId) ?? s.programs[0] ?? null;
}

const userDoc = (uid: string) => doc(db, 'users', uid);
const activeKey = (uid: string) => `active_${uid}`;

function trainError(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? (e as { code: string }).code : '';
  if (code === 'permission-denied') return 'The server refused to load your programs. It may still be updating; retrying shortly.';
  if (code === 'unavailable') return "No internet connection. Your programs will load once you're back online.";
  return "Couldn't load your programs. Retrying shortly.";
}

const programMap = (name: string, routines: Routine[], createdAt = Date.now()) => ({
  name, routines: routines.map(routineToMap), createdAt,
});

function createStarterProgram(uid: string): void {
  const profile = profileStore.get();
  const meta = doc(userDoc(uid), 'meta', 'train');
  if (!hasEverythingForPlan(profile)) {
    background(setDoc(meta, { seeded: true }, { merge: true }));
    return;
  }
  const routines = starterRoutines(profile);
  const ref = doc(collection(userDoc(uid), 'programs'));
  const batch = writeBatch(db);
  batch.set(ref, programMap('My AscendLab plan', routines));
  batch.set(meta, { seeded: true, activeProgramId: ref.id }, { merge: true });
  background(batch.commit());
}

/** Live programs plus the active one. Creates a starter program from the person's plan the first time. */
export const trainLive = createLive<TrainState>({ programs: [], activeProgramId: null, loading: true, error: null }, (emit) => {
  const uid = currentUid();
  if (!uid) { emit({ programs: [], activeProgramId: null, loading: false, error: null }); return () => undefined; }
  let programs: Program[] | null = null;
  let activeId: string | null = null;
  let seeded: boolean | null = null;
  let seedingStarted = false;
  let stopped = false;
  let offPrograms: (() => void) | null = null;
  let offMeta: (() => void) | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const send = () => { if (programs) emit({ programs, activeProgramId: activeId, loading: seeded == null, error: null }); };

  // A failed listener stops for good: show why, then try again after a pause.
  const fail = (e: unknown) => {
    offPrograms?.(); offMeta?.();
    emit({ programs: programs ?? [], activeProgramId: activeId, loading: false, error: trainError(e) });
    if (retry) clearTimeout(retry);
    retry = setTimeout(listen, 15_000);
  };

  function listen() {
    if (stopped) return;
    offPrograms = onSnapshot(query(collection(userDoc(uid!), 'programs'), orderBy('createdAt')), (snap) => {
      programs = snap.docs.map((d) => ({
        id: d.id,
        name: d.get('name') ?? 'Program',
        routines: (Array.isArray(d.get('routines')) ? d.get('routines') : [])
          .filter((r: unknown) => r && typeof r === 'object').map((r: Record<string, unknown>) => routineFromMap(r)),
        createdAt: Number(d.get('createdAt')) || 0,
      }));
      send();
    }, fail);
    // Metadata changes are included so we hear when the server confirms "no settings yet".
    offMeta = onSnapshot(doc(userDoc(uid!), 'meta', 'train'), { includeMetadataChanges: true }, (snap) => {
      activeId = snap.get('activeProgramId') ?? null;
      const wasSeeded = snap.get('seeded') === true;
      const confirmed = !snap.metadata.fromCache;
      // Only trust "not seeded" from the server, so an empty offline cache never creates duplicates.
      if (!wasSeeded && confirmed && !seedingStarted) {
        seedingStarted = true;
        createStarterProgram(uid!);
      }
      if (wasSeeded || confirmed) seeded = true;
      send();
    }, fail);
  }

  // The starter program is built from the profile, so it must be loaded first.
  (profileStore.get() ? Promise.resolve() : ProfileRepository.load().then(() => undefined)).finally(listen);
  return () => { stopped = true; if (retry) clearTimeout(retry); offPrograms?.(); offMeta?.(); };
});

function workoutsQuery(uid: string, max: number) {
  return query(collection(userDoc(uid), 'workouts'), orderBy('finishedAt', 'desc'), limit(max));
}

/** Live workout history, newest first; null while loading. Powers History, Statistics and records. */
export const historyLive = createLive<WorkoutRecord[] | null>(null, (emit) => {
  const uid = currentUid();
  if (!uid) { emit([]); return () => undefined; }
  return onSnapshot(workoutsQuery(uid, 300), (snap) => emit(snap.docs.map((d) => workoutFromDoc(d.id, d.data()))), () => emit([]));
});

/** The workout being trained right now, or null. */
export const activeStore = createStore<ActiveWorkout | null>(null);

function persist(): void {
  const uid = currentUid();
  if (!uid) return;
  const w = activeStore.get();
  background(w == null ? AsyncStorage.removeItem(activeKey(uid)) : AsyncStorage.setItem(activeKey(uid), activeToJson(w)));
}

function restSecondsForGoal(): number {
  const goal = profileStore.get()?.goal;
  return goal === 'BUILD_MUSCLE' ? 90 : goal === 'LOSE_FAT' ? 45 : 60;
}

export const TrainRepository = {
  createProgram(name: string): string | null {
    const uid = currentUid();
    if (!uid) return null;
    const ref = doc(collection(userDoc(uid), 'programs'));
    background(setDoc(ref, programMap(name.trim() || 'New program', [])));
    TrainRepository.selectProgram(ref.id);
    return ref.id;
  },

  renameProgram(programId: string, name: string): void {
    const uid = currentUid();
    if (uid) background(updateDoc(doc(userDoc(uid), 'programs', programId), { name: name.trim() || 'Program' }));
  },

  deleteProgram(programId: string): void {
    const uid = currentUid();
    if (uid) background(deleteDoc(doc(userDoc(uid), 'programs', programId)));
  },

  selectProgram(programId: string): void {
    const uid = currentUid();
    if (uid) background(setDoc(doc(userDoc(uid), 'meta', 'train'), { activeProgramId: programId }, { merge: true }));
  },

  /** Adds or replaces `routine` inside `program`. */
  saveRoutine(program: Program, routine: Routine): void {
    const uid = currentUid();
    if (!uid) return;
    const routines = program.routines.some((r) => r.id === routine.id)
      ? program.routines.map((r) => (r.id === routine.id ? routine : r))
      : [...program.routines, routine];
    background(updateDoc(doc(userDoc(uid), 'programs', program.id), { routines: routines.map(routineToMap) }));
  },

  deleteRoutine(program: Program, routineId: string): void {
    const uid = currentUid();
    if (!uid) return;
    background(updateDoc(doc(userDoc(uid), 'programs', program.id), {
      routines: program.routines.filter((r) => r.id !== routineId).map(routineToMap),
    }));
  },

  // ---------- Live workout ----------

  /**
   * Starts a workout. When `previous` holds the last session of an exercise, its set layout
   * (warm-ups included) is repeated, so "Previous" lines up set by set.
   */
  start(routine: Routine | null, previous: Map<string, LoggedSet[]> = new Map()): void {
    activeStore.set({
      title: routine?.name ?? 'Workout',
      routineId: routine?.id ?? null,
      startedAt: Date.now(),
      exercises: (routine?.exercises ?? []).map((re) => {
        const last = previous.get(re.exerciseId);
        const sets = last && last.length > 0
          ? last.map((s) => newSet({ type: s.type }))
          : Array.from({ length: Math.max(re.sets, 1) }, () => newSet());
        return { exerciseId: re.exerciseId, name: re.name, sets, targetReps: re.reps };
      }),
      restEndsAt: null,
      restSeconds: restSecondsForGoal(),
    });
    persist();
  },

  update(transform: (w: ActiveWorkout) => ActiveWorkout): void {
    const w = activeStore.get();
    if (!w) return;
    activeStore.set(transform(w));
    persist();
  },

  discard(): void {
    activeStore.set(null);
    persist();
  },

  /** Called at start-up and after signing in, so a workout in progress comes back. */
  async restoreActive(): Promise<void> {
    const uid = currentUid();
    if (!uid) { activeStore.set(null); return; }
    const json = await AsyncStorage.getItem(activeKey(uid)).catch(() => null);
    activeStore.set(json ? activeFromJson(json) : null);
  },

  /**
   * Saves the finished workout to history and, when `share` is on, posts it to the feed.
   * Sets that weren't ticked off are dropped. Returns an error message or null.
   */
  async finish(caption: string, share: boolean): Promise<string | null> {
    const uid = currentUid();
    if (!uid) return "You're not signed in.";
    const w = activeStore.get();
    if (!w) return null;
    const units = profileStore.get()?.units ?? 'METRIC';
    const logged: LoggedExercise[] = w.exercises.map((x) => ({
      exerciseId: x.exerciseId,
      name: x.name,
      sets: x.sets.filter((s) => s.done).map((s) => {
        const typed = parseFloat(s.weight.replace(',', '.')) || 0;
        return { weightKg: units === 'IMPERIAL' ? Convert.lbToKg(typed) : typed, reps: parseInt(s.reps, 10) || 0, type: s.type };
      }),
    })).filter((x) => x.sets.length > 0);
    if (logged.length === 0) return 'Tick off at least one set before finishing.';

    const records = countRecords(logged, recordsByExercise(await TrainRepository.loadHistory()));
    const durationSec = Math.min(Math.max(Math.trunc((Date.now() - w.startedAt) / 1000), 0), 86_400);
    const volume = WorkoutMath.volumeKg(logged);
    background(setDoc(doc(collection(userDoc(uid), 'workouts')), {
      title: w.title,
      routineId: w.routineId,
      startedAt: w.startedAt,
      finishedAt: Date.now(),
      durationSec,
      volumeKg: volume,
      records,
      exercises: logged.map((x) => ({
        exerciseId: x.exerciseId,
        name: x.name,
        sets: x.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps, type: s.type })),
      })),
    }));
    if (share) {
      const error = await SocialRepository.publishWorkout({
        title: w.title,
        durationSec,
        volumeKg: Math.trunc(volume),
        sets: logged.reduce((n, x) => n + x.sets.length, 0),
        exercises: logged.map((x) => ({ name: x.name, sets: x.sets.length, best: WorkoutMath.bestSet(x.sets, units) })),
        records,
      }, caption);
      if (error) return error;
    }
    TrainRepository.discard();
    return null;
  },

  async loadHistory(max = 300): Promise<WorkoutRecord[]> {
    const uid = currentUid();
    if (!uid) return [];
    try {
      const snap = await getDocs(workoutsQuery(uid, max));
      return snap.docs.map((d) => workoutFromDoc(d.id, d.data()));
    } catch {
      return [];
    }
  },

  deleteWorkout(workoutId: string): void {
    const uid = currentUid();
    if (uid) background(deleteDoc(doc(userDoc(uid), 'workouts', workoutId)));
  },

  /** When each recent workout finished (epoch ms), newest first. Powers Profile stats. */
  async workoutTimes(max = 200): Promise<number[]> {
    return (await TrainRepository.loadHistory(max)).map((w) => w.finishedAt);
  },

  /** Deletes programs, history and settings (used when deleting the account). */
  async deleteCurrent(): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    for (const name of ['programs', 'workouts', 'meta', 'weights']) {
      const docs = (await getDocs(collection(userDoc(uid), name))).docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await AsyncStorage.removeItem(activeKey(uid));
    activeStore.set(null);
  },

  clearSession(): void {
    activeStore.set(null);
  },
};
