/**
 * Session warm-up (see docs/Research/Evidence/Training - Warm-up.md). Everything here is optional:
 * the user can skip it. Warm-up sets and drills are not working sets: they never count as volume.
 */
import { CATALOG, type Muscle } from './catalog';
import type { PlannedExercise, ProgramDay } from './program';

/** Warm-up drills from free-exercise-db (Unlicense). Kept out of CATALOG so they never count as volume. */
export type WarmUpDrillInfo = { id: string; name: string; equipment: 'band' | 'cable' | 'dumbbell' };

// prettier-ignore
export const WARM_UP_DRILLS: Record<string, WarmUpDrillInfo> = Object.fromEntries(
  ([
    ['External_Rotation_with_Band', 'External Rotation with Band', 'band'],
    ['External_Rotation_with_Cable', 'External Rotation with Cable', 'cable'],
    ['External_Rotation', 'External Rotation', 'dumbbell'],
    ['Band_Pull_Apart', 'Band Pull Apart', 'band'],
    ['Back_Flyes_-_With_Bands', 'Back Flyes - With Bands', 'band'],
  ] as const).map(([id, name, equipment]) => [id, { id, name, equipment }]),
);

/** One light set before the first exercise, at a fraction of its working load. */
export type WarmUpSet = { reps: number; loadFraction: number };

export type WarmUpDrill = {
  exerciseId: string;
  alternatives: string[];
  sets: number;
  reps: number;
  /** Light, well short of failure. */
  toFailure: false;
};

export type WarmUp = {
  /** The user may skip any part of it. */
  optional: true;
  /** Show the optional easy-cardio tip (days with a lower-body compound lift). */
  cardioTip: boolean;
  /** Rotator cuff drills before the first exercise, on days that train the upper body. */
  rotatorCuff: WarmUpDrill[];
};

/** 5 reps at 80% of the working load (Viveiros 2024). First exercise only (user decision). */
export const FIRST_EXERCISE_WARM_UP_SET: WarmUpSet = { reps: 5, loadFraction: 0.8 };

/** Optional easy cardio before lower-body days: 15 min at a pace you can talk at (Barroso 2013). */
export const CARDIO_TIP = { minutes: 15, intensity: 'easy' } as const;

const ROTATOR_CUFF: { exerciseId: string; alternatives: string[] }[] = [
  { exerciseId: 'External_Rotation_with_Band', alternatives: ['External_Rotation_with_Cable', 'External_Rotation'] },
  { exerciseId: 'Band_Pull_Apart', alternatives: ['Back_Flyes_-_With_Bands'] },
];
const DRILL_SETS = 2;
const DRILL_REPS = 15;
const UPPER_MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps'];

/** Time model, same per-set estimate as the session (45 s), plus a minute before the first working set. */
const SET_SEC = 45;
const AFTER_WARM_UP_SET_SEC = 60;

function trainsUpperBody(exercises: PlannedExercise[]): boolean {
  return exercises.some(({ exerciseId }) => CATALOG[exerciseId].primary.some((m) => UPPER_MUSCLES.includes(m)));
}

function hasLowerCompound(exercises: PlannedExercise[]): boolean {
  return exercises.some(({ exerciseId }) => {
    const { region, mechanic } = CATALOG[exerciseId];
    return region === 'lower' && mechanic === 'compound';
  });
}

/** The warm-up for a session, from its exercises. */
export function warmUpFor(exercises: PlannedExercise[]): WarmUp {
  return {
    optional: true,
    cardioTip: hasLowerCompound(exercises),
    rotatorCuff: trainsUpperBody(exercises)
      ? ROTATOR_CUFF.map((drill) => ({ ...drill, sets: DRILL_SETS, reps: DRILL_REPS, toFailure: false }))
      : [],
  };
}

/** Rough warm-up length in minutes (warm-up set + drills; the optional cardio is not included). */
export function warmUpMinutes(day: ProgramDay): number {
  const warmUpSets = day.exercises.filter((ex) => ex.warmUpSet).length;
  const drillSets = day.warmUp.rotatorCuff.reduce((total, drill) => total + drill.sets, 0);
  const seconds = warmUpSets * (SET_SEC + AFTER_WARM_UP_SET_SEC) + drillSets * SET_SEC;
  return Math.round(seconds / 60);
}
