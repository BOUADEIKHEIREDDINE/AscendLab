/**
 * Exercises, routines, live workouts and workout maths.
 * Ported from Exercises.kt and Training.kt; stored shapes are identical so data written
 * by the Android app reads back here and vice versa.
 */
import { CATALOG, type Muscle as CatalogMuscle } from '../lib/program-generator/catalog';
import { isSlot, isSlotOption, SETS, slotOf, type Level as EngineLevel, type ProgramDay, type Slot } from '../lib/program-generator/program';
import { volumeNotices, type VolumeNotice, type VolumeSession } from '../lib/program-generator/volume-notice';
import { Convert, gymPlan, planDays, PlanCalculator, roundInt, Units, UNIT, UserProfile } from './profile';
import type { ExercisePlan } from './progress';

export type Muscle = 'CHEST' | 'BACK' | 'SHOULDERS' | 'ARMS' | 'LEGS' | 'GLUTES' | 'CORE' | 'CARDIO' | 'OTHER';
export const MUSCLES: Muscle[] = ['CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'GLUTES', 'CORE', 'CARDIO', 'OTHER'];
export const MUSCLE_LABEL: Record<Muscle, string> = {
  CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders', ARMS: 'Arms', LEGS: 'Legs',
  GLUTES: 'Glutes', CORE: 'Core', CARDIO: 'Cardio', OTHER: 'Other',
};

export type Equipment = 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'KETTLEBELL' | 'BAND' | 'OTHER';
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  BARBELL: 'Barbell', DUMBBELL: 'Dumbbell', MACHINE: 'Machine', CABLE: 'Cable',
  BODYWEIGHT: 'Bodyweight', KETTLEBELL: 'Kettlebell', BAND: 'Band', OTHER: 'Other',
};

/** One movement. Custom exercises use an id starting with "custom:". */
export interface Exercise { id: string; name: string; muscle: Muscle; equipment: Equipment }

const e = (id: string, name: string, muscle: Muscle, equipment: Equipment): Exercise => ({ id, name, muscle, equipment });

/** The built-in exercise library. Ids never change, since workouts and routines refer to them. */
export const EXERCISES: Exercise[] = [
  // Chest
  e('bench_press', 'Bench Press', 'CHEST', 'BARBELL'),
  e('incline_bench_press', 'Incline Bench Press', 'CHEST', 'BARBELL'),
  e('db_bench_press', 'Dumbbell Bench Press', 'CHEST', 'DUMBBELL'),
  e('incline_db_press', 'Incline Dumbbell Press', 'CHEST', 'DUMBBELL'),
  e('chest_fly_machine', 'Chest Fly (Machine)', 'CHEST', 'MACHINE'),
  e('cable_crossover', 'Cable Crossover', 'CHEST', 'CABLE'),
  e('chest_press_machine', 'Chest Press (Machine)', 'CHEST', 'MACHINE'),
  e('push_up', 'Push-up', 'CHEST', 'BODYWEIGHT'),
  e('knee_push_up', 'Knee Push-up', 'CHEST', 'BODYWEIGHT'),
  e('dips', 'Dips', 'CHEST', 'BODYWEIGHT'),
  // Back
  e('deadlift', 'Deadlift', 'BACK', 'BARBELL'),
  e('barbell_row', 'Barbell Row', 'BACK', 'BARBELL'),
  e('db_row', 'Dumbbell Row', 'BACK', 'DUMBBELL'),
  e('lat_pulldown', 'Lat Pulldown', 'BACK', 'CABLE'),
  e('seated_cable_row', 'Seated Cable Row', 'BACK', 'CABLE'),
  e('pull_up', 'Pull-up', 'BACK', 'BODYWEIGHT'),
  e('chin_up', 'Chin-up', 'BACK', 'BODYWEIGHT'),
  e('inverted_row', 'Inverted Row', 'BACK', 'BODYWEIGHT'),
  e('band_row', 'Band Row', 'BACK', 'BAND'),
  e('back_extension', 'Back Extension', 'BACK', 'BODYWEIGHT'),
  // Shoulders
  e('overhead_press', 'Overhead Press', 'SHOULDERS', 'BARBELL'),
  e('db_shoulder_press', 'Dumbbell Shoulder Press', 'SHOULDERS', 'DUMBBELL'),
  e('lateral_raise', 'Lateral Raise', 'SHOULDERS', 'DUMBBELL'),
  e('face_pull', 'Face Pull', 'SHOULDERS', 'CABLE'),
  e('rear_delt_fly', 'Rear Delt Fly', 'SHOULDERS', 'DUMBBELL'),
  e('pike_push_up', 'Pike Push-up', 'SHOULDERS', 'BODYWEIGHT'),
  e('shoulder_press_machine', 'Shoulder Press (Machine)', 'SHOULDERS', 'MACHINE'),
  // Arms
  e('barbell_curl', 'Barbell Curl', 'ARMS', 'BARBELL'),
  e('db_curl', 'Dumbbell Curl', 'ARMS', 'DUMBBELL'),
  e('hammer_curl', 'Hammer Curl', 'ARMS', 'DUMBBELL'),
  e('cable_curl', 'Cable Curl', 'ARMS', 'CABLE'),
  e('triceps_pushdown', 'Triceps Pushdown', 'ARMS', 'CABLE'),
  e('skull_crusher', 'Skull Crusher', 'ARMS', 'BARBELL'),
  e('overhead_triceps_ext', 'Overhead Triceps Extension', 'ARMS', 'DUMBBELL'),
  e('bench_dip', 'Bench Dip', 'ARMS', 'BODYWEIGHT'),
  // Legs
  e('squat', 'Squat', 'LEGS', 'BARBELL'),
  e('front_squat', 'Front Squat', 'LEGS', 'BARBELL'),
  e('goblet_squat', 'Goblet Squat', 'LEGS', 'DUMBBELL'),
  e('bodyweight_squat', 'Bodyweight Squat', 'LEGS', 'BODYWEIGHT'),
  e('leg_press', 'Leg Press', 'LEGS', 'MACHINE'),
  e('leg_extension', 'Leg Extension', 'LEGS', 'MACHINE'),
  e('leg_curl', 'Leg Curl', 'LEGS', 'MACHINE'),
  e('lunge', 'Lunge', 'LEGS', 'BODYWEIGHT'),
  e('db_lunge', 'Dumbbell Lunge', 'LEGS', 'DUMBBELL'),
  e('bulgarian_split_squat', 'Bulgarian Split Squat', 'LEGS', 'DUMBBELL'),
  e('romanian_deadlift', 'Romanian Deadlift', 'LEGS', 'BARBELL'),
  e('db_romanian_deadlift', 'Dumbbell Romanian Deadlift', 'LEGS', 'DUMBBELL'),
  e('calf_raise', 'Calf Raise', 'LEGS', 'BODYWEIGHT'),
  e('standing_calf_raise_machine', 'Standing Calf Raise (Machine)', 'LEGS', 'MACHINE'),
  // Glutes
  e('hip_thrust', 'Hip Thrust', 'GLUTES', 'BARBELL'),
  e('glute_bridge', 'Glute Bridge', 'GLUTES', 'BODYWEIGHT'),
  e('kettlebell_swing', 'Kettlebell Swing', 'GLUTES', 'KETTLEBELL'),
  e('cable_kickback', 'Cable Kickback', 'GLUTES', 'CABLE'),
  e('step_up', 'Step-up', 'GLUTES', 'BODYWEIGHT'),
  // Core
  e('plank', 'Plank (seconds)', 'CORE', 'BODYWEIGHT'),
  e('crunch', 'Crunch', 'CORE', 'BODYWEIGHT'),
  e('hanging_leg_raise', 'Hanging Leg Raise', 'CORE', 'BODYWEIGHT'),
  e('russian_twist', 'Russian Twist', 'CORE', 'BODYWEIGHT'),
  e('cable_crunch', 'Cable Crunch', 'CORE', 'CABLE'),
  e('dead_bug', 'Dead Bug', 'CORE', 'BODYWEIGHT'),
  e('mountain_climber', 'Mountain Climber', 'CORE', 'BODYWEIGHT'),
  // Cardio
  e('burpee', 'Burpee', 'CARDIO', 'BODYWEIGHT'),
  e('jumping_jack', 'Jumping Jack', 'CARDIO', 'BODYWEIGHT'),
  e('rowing_machine', 'Rowing Machine (minutes)', 'CARDIO', 'MACHINE'),
  e('jump_rope', 'Jump Rope (minutes)', 'CARDIO', 'OTHER'),
];

const byId = new Map(EXERCISES.map((x) => [x.id, x]));

/** The program generator's exercises (free-exercise-db ids), in this library's shape. */
const MUSCLE_OF: Record<CatalogMuscle, Muscle> = {
  chest: 'CHEST', back: 'BACK', shoulders: 'SHOULDERS', biceps: 'ARMS', triceps: 'ARMS',
  quads: 'LEGS', hamstrings: 'LEGS', calves: 'LEGS', glutes: 'GLUTES', abs: 'CORE',
};
Object.values(CATALOG).forEach((x) => {
  if (!byId.has(x.id)) byId.set(x.id, e(x.id, x.name, MUSCLE_OF[x.primary[0]] ?? 'OTHER', x.equipment.toUpperCase() as Equipment));
});

export const ExerciseLibrary = {
  find: (id: string) => byId.get(id),
  custom(name: string): Exercise {
    const trimmed = name.trim();
    return e('custom:' + trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_'), trimmed, 'OTHER', 'OTHER');
  },
  /** Muscle group for any exercise id, including custom ones. */
  muscleOf: (id: string): Muscle => byId.get(id)?.muscle ?? 'OTHER',
  isBodyweight: (id: string) => byId.get(id)?.equipment === 'BODYWEIGHT',
  /** Search used by the picker and the library page: every typed word must appear in the name. */
  search(query: string, muscle: Muscle | null): Exercise[] {
    const words = query.trim().toLowerCase().split(' ').filter(Boolean);
    return EXERCISES.filter((x) => (muscle == null || x.muscle === muscle) &&
      words.every((w) => x.name.toLowerCase().includes(w)));
  },
  /** Starter routines built from the person's AscendLab plan. */
  starterExercises(title: string, home: boolean): string[] {
    switch (title) {
      case 'Full body': return home ? ['bodyweight_squat', 'push_up', 'inverted_row', 'glute_bridge', 'plank']
        : ['squat', 'bench_press', 'barbell_row', 'romanian_deadlift', 'plank'];
      case 'Upper body': return home ? ['push_up', 'inverted_row', 'pike_push_up', 'bench_dip', 'band_row']
        : ['bench_press', 'lat_pulldown', 'db_shoulder_press', 'seated_cable_row', 'db_curl', 'triceps_pushdown'];
      case 'Lower body': return home ? ['bodyweight_squat', 'lunge', 'glute_bridge', 'calf_raise', 'dead_bug']
        : ['squat', 'romanian_deadlift', 'leg_press', 'leg_curl', 'standing_calf_raise_machine', 'hanging_leg_raise'];
      case 'Push': return home ? ['push_up', 'pike_push_up', 'bench_dip', 'knee_push_up']
        : ['bench_press', 'overhead_press', 'incline_db_press', 'lateral_raise', 'triceps_pushdown'];
      case 'Pull': return home ? ['inverted_row', 'band_row', 'back_extension', 'russian_twist']
        : ['deadlift', 'pull_up', 'barbell_row', 'face_pull', 'barbell_curl', 'hammer_curl'];
      case 'Legs': return home ? ['bodyweight_squat', 'bulgarian_split_squat', 'glute_bridge', 'step_up', 'calf_raise']
        : ['squat', 'leg_press', 'romanian_deadlift', 'leg_extension', 'leg_curl', 'standing_calf_raise_machine'];
      default: return [];
    }
  },
};

// ---------------------------------------------------------------- Programs and routines

export function uuid(): string {
  // RFC 4122 v4 layout, enough for client-side ids.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** An exercise inside a routine, with how many sets and reps to aim for. */
export interface RoutineExercise {
  exerciseId: string; name: string; sets: number; reps: number;
  /** The generator's movement slot this exercise fills; its alternatives come from there. */
  slot?: Slot;
}

/** A saved session you can start again and again. */
export interface Routine { id: string; name: string; exercises: RoutineExercise[] }

/** A group of routines, e.g. "Push / Pull / Legs". One program is active at a time. */
export interface Program { id: string; name: string; routines: Routine[]; createdAt: number }

const asNum = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);
const asStr = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

export function routineExerciseFromMap(m: Record<string, unknown>): RoutineExercise {
  const exerciseId = asStr(m.exerciseId, '');
  // Routines saved before slots existed have no slot field: they get theirs back from the exercise
  // (one slot per exercise). A stored null means "no slot" (e.g. an exercise added next to another).
  // A library pick that replaced a generated exercise keeps that slot, so any slot name is kept.
  const slot = !('slot' in m) ? slotOf(exerciseId) : isSlot(m.slot) ? m.slot : null;
  return {
    exerciseId,
    name: asStr(m.name, 'Exercise'),
    sets: Math.trunc(asNum(m.sets, 3)),
    reps: Math.trunc(asNum(m.reps, 10)),
    ...(slot ? { slot } : {}),
  };
}

export function routineFromMap(m: Record<string, unknown>): Routine {
  const list = Array.isArray(m.exercises) ? m.exercises : [];
  return {
    id: asStr(m.id, uuid()),
    name: asStr(m.name, 'Routine'),
    exercises: list.filter((x) => x && typeof x === 'object').map((x) => routineExerciseFromMap(x as Record<string, unknown>)),
  };
}

export const routineToMap = (r: Routine) => ({
  id: r.id,
  name: r.name,
  // Null, not undefined (Firestore rejects undefined): "no slot", so loading doesn't recover one.
  exercises: r.exercises.map((x) => ({ exerciseId: x.exerciseId, name: x.name, sets: x.sets, reps: x.reps, slot: x.slot ?? null })),
});

/**
 * The starter routines. Gym: one routine per session of the generated program, with its
 * exercises, sets and the top of the rep range as target. Home: the simple starter lists.
 */
export function starterRoutines(profile: UserProfile): Routine[] {
  const plan = profile.place === 'HOME' ? null : gymPlan(profile);
  if (plan) {
    // A 6-day plan repeats each session; like a Hevy folder, each routine is listed once, in order.
    const unique = plan.state.schedule.cycle.filter((d, i, all) => all.findIndex((x) => x.name === d.name) === i);
    return unique.map((day) => ({
      id: uuid(),
      name: day.name,
      exercises: day.exercises.map((x) => ({
        exerciseId: x.exerciseId, name: ExerciseLibrary.find(x.exerciseId)?.name ?? x.exerciseId, sets: x.sets, reps: x.repMax, slot: x.slot,
      })),
    }));
  }
  const week = PlanCalculator.training(profile);
  const reps = profile.goal === 'BUILD_MUSCLE' || profile.goal === 'GAIN_WEIGHT' ? 10 : 12;
  const titles = [...new Set(week.days.map((d) => d.title))];
  return titles.map((title) => ({
    id: uuid(),
    name: title,
    exercises: ExerciseLibrary.starterExercises(title, profile.place === 'HOME')
      .flatMap((id) => { const x = ExerciseLibrary.find(id); return x ? [x] : []; })
      .map((x) => ({ exerciseId: x.id, name: x.name, sets: 3, reps })),
  }));
}

// ---------------------------------------------------------------- Live workout

/** Set types. Warm-ups never count toward records. */
export type SetType = 'NORMAL' | 'WARMUP' | 'FAILURE' | 'DROP';
export const SET_TYPES: SetType[] = ['NORMAL', 'WARMUP', 'FAILURE', 'DROP'];
export const SET_TYPE: Record<SetType, { short: string; label: string }> = {
  NORMAL: { short: '', label: 'Normal set' },
  WARMUP: { short: 'W', label: 'Warm-up set' },
  FAILURE: { short: 'F', label: 'Failure set' },
  DROP: { short: 'D', label: 'Drop set' },
};
const setTypeOf = (v: unknown): SetType => (SET_TYPES.includes(v as SetType) ? (v as SetType) : 'NORMAL');

/** One set while training. Weight and reps are kept as typed, in the person's units. */
export interface SetEntry { weight: string; reps: string; done: boolean; type: SetType }
export const newSet = (partial: Partial<SetEntry> = {}): SetEntry => ({ weight: '', reps: '', done: false, type: 'NORMAL', ...partial });

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  sets: SetEntry[];
  targetReps: number | null;
  /** Today's target, suggested weight and advice (program generator exercises only). */
  plan?: ExercisePlan | null;
}

export interface ActiveWorkout {
  title: string;
  routineId: string | null;
  startedAt: number;
  exercises: ActiveExercise[];
  /** When the current rest countdown ends (epoch ms), or null when not resting. */
  restEndsAt: number | null;
  restSeconds: number;
  /** The session's optional warm-up, one line each (generated sessions only). */
  warmUp?: string[];
  /** Length of the current rest, for the countdown bar (exercises have their own rest). */
  restTotal?: number;
}

export const doneSets = (w: ActiveWorkout) => w.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0);

/** Same JSON layout as the Android app, so the format is shared. */
export function activeToJson(w: ActiveWorkout): string {
  return JSON.stringify({
    title: w.title, routineId: w.routineId, startedAt: w.startedAt, restEndsAt: w.restEndsAt, restSeconds: w.restSeconds,
    warmUp: w.warmUp,
    exercises: w.exercises.map((x) => ({
      exerciseId: x.exerciseId, name: x.name, targetReps: x.targetReps, plan: x.plan ?? undefined,
      sets: x.sets.map((s) => ({ w: s.weight, r: s.reps, d: s.done, t: s.type })),
    })),
  });
}

export function activeFromJson(json: string): ActiveWorkout | null {
  try {
    const o = JSON.parse(json);
    return {
      title: String(o.title),
      routineId: o.routineId ?? null,
      startedAt: Number(o.startedAt),
      restEndsAt: o.restEndsAt ?? null,
      restSeconds: typeof o.restSeconds === 'number' ? o.restSeconds : 90,
      ...(Array.isArray(o.warmUp) ? { warmUp: o.warmUp.map(String) } : {}),
      exercises: (o.exercises as any[]).map((x) => ({
        exerciseId: String(x.exerciseId),
        name: String(x.name),
        targetReps: x.targetReps ?? null,
        ...(x.plan && typeof x.plan === 'object' ? { plan: x.plan as ExercisePlan } : {}),
        sets: (x.sets as any[]).map((s) => ({ weight: String(s.w ?? ''), reps: String(s.r ?? ''), done: !!s.d, type: setTypeOf(s.t) })),
      })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Finished workouts

/** A completed set, always stored in kg. */
export interface LoggedSet { weightKg: number; reps: number; type: SetType }
export const setVolume = (s: LoggedSet) => s.weightKg * s.reps;
/** Estimated one-rep max (Epley). A single rep is its own max. */
export const oneRepMax = (s: LoggedSet) => (s.reps <= 1 ? s.weightKg : s.weightKg * (1 + s.reps / 30));
export const countsForRecords = (s: LoggedSet) => s.type !== 'WARMUP' && s.reps > 0;

export interface LoggedExercise { exerciseId: string; name: string; sets: LoggedSet[] }

/** A finished workout as stored in history. */
export interface WorkoutRecord {
  id: string;
  title: string;
  /** The routine it was started from, if any. */
  routineId?: string | null;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  volumeKg: number;
  records: number;
  exercises: LoggedExercise[];
}
export const setCount = (w: WorkoutRecord) => w.exercises.reduce((n, x) => n + x.sets.length, 0);

export function workoutFromDoc(id: string, d: Record<string, unknown>): WorkoutRecord {
  const exercises = (Array.isArray(d.exercises) ? d.exercises : []).flatMap((raw) => {
    const m = raw as Record<string, unknown>;
    if (!m || typeof m.exerciseId !== 'string') return [];
    const sets = (Array.isArray(m.sets) ? m.sets : []).filter((s) => s && typeof s === 'object').map((s) => {
      const x = s as Record<string, unknown>;
      return { weightKg: asNum(x.weightKg, 0), reps: Math.trunc(asNum(x.reps, 0)), type: setTypeOf(x.type) };
    });
    return [{ exerciseId: m.exerciseId, name: asStr(m.name, 'Exercise'), sets }];
  });
  return {
    id,
    title: asStr(d.title, 'Workout'),
    routineId: typeof d.routineId === 'string' ? d.routineId : null,
    startedAt: asNum(d.startedAt, 0),
    finishedAt: asNum(d.finishedAt, 0),
    durationSec: Math.trunc(asNum(d.durationSec, 0)),
    volumeKg: asNum(d.volumeKg, 0),
    records: Math.trunc(asNum(d.records, 0)),
    exercises,
  };
}

/** Personal bests for one exercise, computed from history. */
export interface ExerciseRecords {
  heaviestKg: number;
  best1RmKg: number;
  bestSetVolumeKg: number;
  bestSessionVolumeKg: number;
  mostReps: number;
  /** Heaviest weight lifted for each rep count (1..15). */
  byReps: Record<number, number>;
}

export const emptyRecords = (): ExerciseRecords => ({ heaviestKg: 0, best1RmKg: 0, bestSetVolumeKg: 0, bestSessionVolumeKg: 0, mostReps: 0, byReps: {} });

export function recordsFrom(sessions: LoggedSet[][]): ExerciseRecords {
  const sets = sessions.flat().filter(countsForRecords);
  if (sets.length === 0) return emptyRecords();
  const byReps: Record<number, number> = {};
  sets.filter((s) => s.reps >= 1 && s.reps <= 15).forEach((s) => { byReps[s.reps] = Math.max(byReps[s.reps] ?? 0, s.weightKg); });
  return {
    heaviestKg: Math.max(...sets.map((s) => s.weightKg)),
    best1RmKg: Math.max(...sets.map(oneRepMax)),
    bestSetVolumeKg: Math.max(...sets.map(setVolume)),
    bestSessionVolumeKg: Math.max(...sessions.map((s) => s.filter(countsForRecords).reduce((a, x) => a + setVolume(x), 0))),
    mostReps: Math.max(...sets.map((s) => s.reps)),
    byReps,
  };
}

/** Which records `set` would beat, as short labels (empty when none). */
export function beatenBy(r: ExerciseRecords, set: LoggedSet): string[] {
  if (!countsForRecords(set)) return [];
  const out: string[] = [];
  if (set.weightKg > 0 && set.weightKg > r.heaviestKg) out.push('Heaviest weight');
  if (set.weightKg > 0 && oneRepMax(set) > r.best1RmKg + 0.01) out.push('Best 1RM');
  if (set.weightKg > 0 && setVolume(set) > r.bestSetVolumeKg + 0.01) out.push('Best set volume');
  if (set.weightKg <= 0 && set.reps > r.mostReps) out.push('Most reps');
  return out;
}

/** Counts sets that beat a personal record, updating records as it goes (so two PRs in a row count twice). */
export function countRecords(logged: LoggedExercise[], before: Map<string, ExerciseRecords>): number {
  let count = 0;
  logged.forEach((x) => {
    let rec = before.get(x.exerciseId) ?? emptyRecords();
    x.sets.forEach((set) => {
      if (beatenBy(rec, set).length > 0) {
        // The first time an exercise is logged sets the baseline, not a record.
        if (before.has(x.exerciseId)) count++;
        rec = {
          heaviestKg: Math.max(rec.heaviestKg, set.weightKg),
          best1RmKg: Math.max(rec.best1RmKg, oneRepMax(set)),
          bestSetVolumeKg: Math.max(rec.bestSetVolumeKg, setVolume(set)),
          bestSessionVolumeKg: rec.bestSessionVolumeKg,
          mostReps: Math.max(rec.mostReps, set.reps),
          byReps: rec.byReps,
        };
      }
    });
  });
  return count;
}

export function recordsByExercise(history: WorkoutRecord[]): Map<string, ExerciseRecords> {
  const sessions = new Map<string, LoggedSet[][]>();
  history.forEach((w) => w.exercises.forEach((x) => {
    const list = sessions.get(x.exerciseId) ?? [];
    list.push(x.sets);
    sessions.set(x.exerciseId, list);
  }));
  const out = new Map<string, ExerciseRecords>();
  sessions.forEach((v, k) => out.set(k, recordsFrom(v)));
  return out;
}

/**
 * The routine to do next: the one after the last workout done from this program (by routine,
 * else by name), wrapping around; the first one before any workout. Sessions follow the
 * program's order, not the calendar, so a missed day just moves to the next training day.
 */
export function nextRoutine(program: Program | null, history: WorkoutRecord[] | null | undefined): Routine | null {
  if (!program || program.routines.length === 0) return null;
  const last = (history ?? []).find((w) => program.routines.some((r) => r.id === w.routineId || (!w.routineId && r.name === w.title)));
  if (!last) return program.routines[0];
  const i = program.routines.findIndex((r) => r.id === last.routineId || (!last.routineId && r.name === last.title));
  return program.routines[(i + 1) % program.routines.length];
}

/** Most recent sets of each exercise, from history (newest first). Powers the "Previous" column. */
export function lastSets(history: WorkoutRecord[] | null | undefined): Map<string, LoggedSet[]> {
  const map = new Map<string, LoggedSet[]>();
  (history ?? []).forEach((w) => w.exercises.forEach((x) => { if (!map.has(x.exerciseId)) map.set(x.exerciseId, x.sets); }));
  return map;
}

/** What the feed shows about a finished workout. */
export interface WorkoutLine { name: string; sets: number; best: string }
export interface WorkoutInfo {
  title: string;
  durationSec: number;
  volumeKg: number;
  sets: number;
  exercises: WorkoutLine[];
  records: number;
}

const integerFormat = (n: number) => Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const WorkoutMath = {
  volumeKg: (exercises: LoggedExercise[]) => exercises.reduce((a, x) => a + x.sets.reduce((b, s) => b + s.weightKg * s.reps, 0), 0),

  formatWeight(kg: number, units: Units): string {
    const v = units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg;
    const text = v % 1 === 0 ? String(Math.trunc(v)) : String(roundInt(v * 10) / 10);
    return `${text} ${UNIT[units].weightUnit}`;
  },

  /** Heaviest set (ties broken by reps), e.g. "80 kg × 8" or "12 reps" for bodyweight. */
  bestSet(sets: LoggedSet[], units: Units): string {
    if (sets.length === 0) return '';
    const best = sets.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
    return best.weightKg <= 0 ? `${best.reps} reps` : `${WorkoutMath.formatWeight(best.weightKg, units)} × ${best.reps}`;
  },

  formatDuration(sec: number): string {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min`;
    return `${sec}s`;
  },

  formatVolume(kg: number, units: Units): string {
    const v = units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg;
    return `${integerFormat(roundInt(v))} ${UNIT[units].weightUnit}`;
  },
};

/** "1:05" or "1:02:05" for a running clock. */
export function clock(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

// ---------------------------------------------------------------- Program edits

/** Sets for an exercise added next to another one: the plan's usual count. */
export const ADDED_SETS = SETS;

/** Puts `exerciseId` in every row filling `slot`, keeping each row's sets and reps. */
export function replaceEverywhere(routines: Routine[], slot: Slot, exerciseId: string, name: string): { routines: Routine[]; changedNames: string[] } {
  const changedNames: string[] = [];
  const next = routines.map((r) => {
    if (!r.exercises.some((x) => x.slot === slot)) return r;
    changedNames.push(r.name);
    return { ...r, exercises: r.exercises.map((x) => (x.slot === slot ? { ...x, exerciseId, name } : x)) };
  });
  return { routines: next, changedNames };
}

/** Saved swaps after a replace: a slot option is remembered, a library pick clears the slot. */
export function swapsAfterReplace(swaps: UserProfile['swaps'], slot: Slot, exerciseId: string, level: EngineLevel): UserProfile['swaps'] {
  const { [slot]: _old, ...rest } = swaps;
  return isSlotOption(slot, level, exerciseId) ? { ...rest, [slot]: exerciseId } : rest;
}

export function addAfter(exercises: RoutineExercise[], index: number, ex: RoutineExercise): RoutineExercise[] {
  return [...exercises.slice(0, index + 1), ex, ...exercises.slice(index + 1)];
}

/**
 * Routines as sessions for the sets count, each weighted by how often the generated cycle does it
 * in a week. Null when a routine isn't in the cycle (user-made or renamed): no weekly notices then.
 */
export function volumeSessions(routines: Routine[], cycle: ProgramDay[], daysPerWeek: number): VolumeSession[] | null {
  if (cycle.length === 0) return null;
  const sessions: VolumeSession[] = [];
  for (const r of routines) {
    const count = cycle.filter((d) => d.name === r.name).length;
    if (count === 0) return null;
    sessions.push({
      exercises: r.exercises.map((x) => ({ exerciseId: x.exerciseId, sets: x.sets })),
      timesPerWeek: (count * daysPerWeek) / cycle.length,
    });
  }
  return sessions;
}

/** Notices for changing a generated gym program from `before` to `after` (same routine order). */
export function programNotices(before: Routine[], after: Routine[], profile: UserProfile): VolumeNotice[] {
  if (profile.place === 'HOME') return [];
  const plan = gymPlan(profile);
  const days = planDays(profile);
  if (!plan || days == null) return [];
  const cycle = plan.state.schedule.cycle;
  const was = volumeSessions(before, cycle, days);
  const now = volumeSessions(after, cycle, days);
  return was && now ? volumeNotices(was, now, days) : [];
}

const halves = (x: number) => String(Math.round(x * 2) / 2);
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function noticeText(n: VolumeNotice): string {
  const muscle = capital(n.muscle);
  switch (n.kind) {
    case 'week_above': return `${muscle} now gets ${halves(n.sets)} sets a week, above the ${n.limit} your plan aims for. Fine to keep.`;
    case 'week_below_minimum': return `${muscle} drops to ${halves(n.sets)} sets a week, below the ${n.limit} needed to keep growing.`;
    case 'session_above': return `${muscle} gets ${halves(n.sets)} sets in one workout. Past about ${n.limit}, extra sets add little.`;
  }
}

/** Replaces an exercise mid-workout: ticked sets stay with the old one, so they still get saved. */
export function workoutReplace(exercises: ActiveExercise[], index: number, next: ActiveExercise): ActiveExercise[] {
  const old = exercises[index];
  if (!old) return exercises;
  const done = old.sets.filter((s) => s.done);
  if (done.length === 0) return exercises.map((x, i) => (i === index ? next : x));
  return [...exercises.slice(0, index), { ...old, sets: done }, next, ...exercises.slice(index + 1)];
}
