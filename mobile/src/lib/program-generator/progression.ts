import { CATALOG } from './catalog';

/** Top of the 6-10 rep range: when every set reaches it, the load goes up. */
const REP_TARGET = 10;
const INCREMENT_KG = { upper: 2.5, lower: 5 };

export type BodyRegion = 'upper' | 'lower';

export type LastSession = {
  /** The exercise: its equipment and region set the default load step. */
  exerciseId: string;
  loadKg: number;
  /** Reps done on each working set, all taken to failure. */
  reps: number[];
  /** Reps of the session before, at the same load (to spot two low sessions in a row). */
  previousReps?: number[];
  /** The user's own load step for this exercise. Defaults to `defaultIncrementKg`. */
  incrementKg?: number;
};

/** Bottom of the 6-10 rep range. */
const REP_MIN = 6;

/** The first set fell under 6 reps: the load is above the range (later sets drop from fatigue). */
export function belowRange(reps: number[]): boolean {
  return reps.length > 0 && reps[0] < REP_MIN;
}

/**
 * Double progression: add reps inside the range, then add load once every set hits the top.
 * Under 6 reps on the first set: one session keeps the load (a bad day; 4-5 reps to failure still
 * builds muscle, Lopez 2021); two in a row at the same load drop it, 1 step at 4-5 reps, 2 steps
 * at 0-3 (same steps as findWeight; rep-based autoregulation, Mann 2010). Bodyweight exercises
 * have no load step yet, so their load stays.
 */
export function nextLoadKg({ exerciseId, loadKg, reps, incrementKg, previousReps }: LastSession): number {
  const step = incrementKg ?? defaultIncrementKg(exerciseId);
  if (reps.length > 0 && reps.every((r) => r >= REP_TARGET)) return loadKg + step;
  if (belowRange(reps) && previousReps && belowRange(previousReps)) {
    return Math.max(0, loadKg + stepsFor(reps[0]) * step);
  }
  return loadKg;
}

/** Load step per exercise (conventions): dumbbells 2 kg, kettlebells 4 kg, else the region step. */
export function defaultIncrementKg(exerciseId: string): number {
  const exercise = CATALOG[exerciseId];
  if (!exercise) throw new RangeError(`unknown exercise ${exerciseId}`);
  switch (exercise.equipment) {
    case 'dumbbell':
      return 2;
    case 'kettlebell':
      return 4;
    case 'bodyweight':
      return 0;
    default:
      return INCREMENT_KG[exercise.region];
  }
}

const FOUND_MIN = REP_MIN;
/** Extra sets allowed in a find-weight session, beyond the planned ones (user decision). */
const FIND_WEIGHT_EXTRA_SETS = 2;

export type FindWeightSet = {
  loadKg: number;
  /** Reps done at that load, to technical failure. */
  reps: number;
  /** The exercise's load step (defaultIncrementKg, or the user's own). */
  incrementKg: number;
};

export type FindWeightResult = { found: boolean; nextLoadKg: number };

/** Steps to move after a find-weight set: more reps above 10, bigger jump (our convention). */
function stepsFor(reps: number): number {
  if (reps >= 16) return 3;
  if (reps >= 13) return 2;
  if (reps > REP_TARGET) return 1;
  if (reps >= FOUND_MIN) return 0;
  return reps >= 4 ? -1 : -2;
}

/**
 * First sessions of an exercise with no history: start light, then after each set go heavier
 * when the reps pass 10, lighter under 6. 6-10 reps means the weight is found and double
 * progression takes over (Glass 2020 tested "more than 12 reps → heavier next set").
 */
export function findWeight({ loadKg, reps, incrementKg }: FindWeightSet): FindWeightResult {
  if (!(incrementKg > 0)) throw new RangeError(`incrementKg must be positive, got ${incrementKg}`);
  const steps = stepsFor(reps);
  return { found: steps === 0, nextLoadKg: Math.max(0, loadKg + steps * incrementKg) };
}

/** While the weight is not found, up to 2 extra sets may follow the planned ones. */
export function canAddFindWeightSet({
  setsDone,
  plannedSets,
  found,
}: {
  setsDone: number;
  plannedSets: number;
  found: boolean;
}): boolean {
  return !found && setsDone >= plannedSets && setsDone < plannedSets + FIND_WEIGHT_EXTRA_SETS;
}
