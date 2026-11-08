/**
 * Progression in the live workout: what to lift today, rest, warm-up and find-your-weight.
 * Pure functions on top of the program generator (src/lib/program-generator); the workout
 * screen only shows what they return. All weights in kg.
 */
import { CATALOG } from '../lib/program-generator/catalog';
import type { ProgramDay } from '../lib/program-generator/program';
import { belowRange, canAddFindWeightSet, defaultIncrementKg, findWeight, nextLoadKg } from '../lib/program-generator/progression';
import { CARDIO_TIP, FIRST_EXERCISE_WARM_UP_SET, WARM_UP_DRILLS } from '../lib/program-generator/warm-up';
import type { LoggedSet, WorkoutRecord } from './training';

/** What the generator planned for an exercise (or the defaults for one added by hand). */
export interface PlannedTarget { sets: number; repMin: number; repMax: number; restSec: number }

/** Shown and used while training one exercise. */
export interface ExercisePlan extends PlannedTarget {
  /** Weight to use today, or null when unknown (first time, or not a generator exercise). */
  suggestedKg: number | null;
  /** One line of advice under the exercise name, or null. */
  note: string | null;
  /** First time with this exercise: find the working weight set by set. */
  findWeight: boolean;
  /** Load step for this exercise (2 kg dumbbells, 2.5 / 5 kg otherwise). */
  incrementKg: number;
  /** Weight of the warm-up set on the first exercise, or null. */
  warmUpKg: number | null;
}

/** Defaults for a generator exercise added by hand: same rules as the planned ones. */
export const DEFAULT_TARGET: Omit<PlannedTarget, 'restSec'> = { sets: 2, repMin: 6, repMax: 10 };
const REST_SEC = { isolation: 150, upperCompound: 180, lowerCompound: 240 };

/** Rest for a generator exercise: 4 min lower-body compounds, 3 min upper, 2.5 min isolation. */
export function restSecFor(exerciseId: string): number | null {
  const x = CATALOG[exerciseId];
  if (!x) return null;
  if (x.mechanic === 'isolation') return REST_SEC.isolation;
  return x.region === 'upper' ? REST_SEC.upperCompound : REST_SEC.lowerCompound;
}

const working = (sets: LoggedSet[]) => sets.filter((s) => s.type !== 'WARMUP' && s.reps > 0);
const roundTo = (kg: number, step: number) => (step > 0 ? Math.round(kg / step) * step : Math.round(kg * 2) / 2);
const kg = (v: number) => `${Math.round(v * 10) / 10} kg`;

/** Each exercise's past sessions, newest first (history is newest first). */
export function sessionsByExercise(history: WorkoutRecord[]): Map<string, LoggedSet[][]> {
  const map = new Map<string, LoggedSet[][]>();
  history.forEach((w) => w.exercises.forEach((x) => {
    const list = map.get(x.exerciseId) ?? [];
    list.push(x.sets);
    map.set(x.exerciseId, list);
  }));
  return map;
}

/**
 * Today's plan for one exercise from its history. Double progression: every set at 10 reps →
 * add one step; the first set under 6 reps two sessions in a row at the same weight → drop
 * (1 step at 4-5 reps, 2 at 0-3). No history → find your weight. Exercises that are not in
 * the generator's catalog get no suggestion.
 */
export function exercisePlan(
  exerciseId: string,
  sessions: LoggedSet[][],
  target: PlannedTarget,
  firstExercise = false,
): ExercisePlan | null {
  const x = CATALOG[exerciseId];
  if (!x) return null;
  const incrementKg = defaultIncrementKg(exerciseId);
  const base = { ...target, incrementKg, warmUpKg: null };
  const past = sessions.map(working).filter((s) => s.length > 0);
  const last = past[0];

  if (!last) {
    if (x.equipment === 'bodyweight') return { ...base, suggestedKg: null, note: null, findWeight: false };
    return {
      ...base, suggestedKg: null, findWeight: true,
      note: 'New exercise: find your weight. Start with a weight you could lift about 15 times; after each set we tell you what to change.',
    };
  }

  const loadKg = Math.max(...last.map((s) => s.weightKg));
  const reps = last.map((s) => s.reps);
  const before = past[1];
  const previousReps = before && Math.max(...before.map((s) => s.weightKg)) === loadKg ? before.map((s) => s.reps) : undefined;
  const next = nextLoadKg({ exerciseId, loadKg, reps, previousReps });

  let note: string;
  if (x.equipment === 'bodyweight') note = 'Try to beat last time\'s reps.';
  else if (next > loadKg) note = `Add weight: ${kg(next)}. You reached ${target.repMax} reps on every set last time.`;
  else if (next < loadKg) note = `Lower to ${kg(next)}: two sessions in a row under ${target.repMin} reps.`;
  else if (belowRange(reps)) note = `Same weight: last time was under ${target.repMin} reps. It happens; give it another go.`;
  else note = 'Same weight: try to beat last time\'s reps.';

  const warmUpKg = firstExercise && next > 0 ? roundTo(next * FIRST_EXERCISE_WARM_UP_SET.loadFraction, incrementKg) : null;
  return { ...base, suggestedKg: next, note, findWeight: false, warmUpKg };
}

export interface FindWeightStep {
  found: boolean;
  /** Weight for the next set. */
  nextKg: number;
  note: string;
  /** Add one more set to keep looking (at most 2 beyond the planned sets). */
  addSet: boolean;
}

/** After a set in find-your-weight mode: found (6-10 reps) or the weight for the next set. */
export function afterFindWeightSet(plan: ExercisePlan, weightKg: number, reps: number, workingSetsDone: number): FindWeightStep {
  const step = plan.incrementKg > 0 ? plan.incrementKg : 2.5;
  const r = findWeight({ loadKg: weightKg, reps, incrementKg: step });
  const addSet = canAddFindWeightSet({ setsDone: workingSetsDone, plannedSets: plan.sets, found: r.found });
  const change = r.nextLoadKg - weightKg;
  const note = r.found
    ? `Found it: ${kg(weightKg)}. Use it for your other sets; next time the app takes it from here.`
    : `Next set: ${kg(r.nextLoadKg)} (${change > 0 ? '+' : ''}${kg(change)}). ${reps > 10 ? 'That was too light.' : 'That was too heavy.'}`;
  return { found: r.found, nextKg: r.nextLoadKg, note, addSet };
}

/** The optional warm-up of a session, one line each. */
export function warmUpLines(day: ProgramDay): string[] {
  const lines: string[] = [];
  if (day.warmUp.cardioTip) lines.push(`Up to ${CARDIO_TIP.minutes} min of easy cardio (bike, walk)`);
  day.warmUp.rotatorCuff.forEach((d) => lines.push(`${WARM_UP_DRILLS[d.exerciseId]?.name ?? d.exerciseId}: ${d.sets} × ${d.reps}, light`));
  return lines;
}
