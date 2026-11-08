/**
 * Weekday scheduling (see docs/Technical/Program generation.md). The user taps the weekdays they
 * can train; those are the training days, unless they ask to train only N of them. Sessions follow
 * the program's order, not the calendar: a missed session moves to the next training day.
 */
import { CATALOG, type Muscle } from './catalog';
import {
  generateProgram,
  programCycle,
  splitOptions,
  type Program,
  type ProgramDay,
  type ProgramInput,
} from './program';

/** 0 = Monday ... 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * - back_to_back: the chosen days put the same muscle on two days in a row (allowed; a tip)
 * - split_reset: the chosen split doesn't fit the new number of days, so the default one is used
 */
export type ScheduleNotice = 'back_to_back' | 'split_reset';

const MIN_DAYS = 2;
const MAX_DAYS = 6;
/** Direct sets for a muscle on both days that count as training it two days in a row. */
const DIRECT_SETS = 2;
/** A long break: 2+ weeks without training (user decision, a tip only). */
const LONG_BREAK_DAYS = 14;

function assertWeekdays(days: number[]): void {
  for (const d of days) {
    if (!Number.isInteger(d) || d < 0 || d > 6) throw new RangeError(`weekday must be 0-6, got ${d}`);
  }
}

/** Circular gaps between sorted weekdays (Sunday to Monday wraps around). */
function gaps(days: Weekday[]): number[] {
  return days.map((d, i) => ((days[(i + 1) % days.length] - d + 7) % 7) || 7);
}

function subsets(days: Weekday[], size: number): Weekday[][] {
  if (size === 0) return [[]];
  if (days.length < size) return [];
  const [first, ...rest] = days;
  return [...subsets(rest, size - 1).map((s) => [first, ...s]), ...subsets(rest, size)];
}

/**
 * The training days from the days the user tapped. Default: all of them (at most 6, so 7 tapped
 * keeps a rest day). With a count ("only train 3 of them"), the best-spaced days: the largest
 * smallest gap, then the fewest back-to-back pairs, then the earliest days.
 */
export function chooseTrainingDays(available: Weekday[], count?: number): Weekday[] {
  assertWeekdays(available);
  const days = [...new Set(available)].sort((a, b) => a - b);
  if (days.length < MIN_DAYS) throw new RangeError(`pick at least ${MIN_DAYS} days, got ${days.length}`);
  const target = count ?? Math.min(days.length, MAX_DAYS);
  if (!Number.isInteger(target) || target < MIN_DAYS || target > MAX_DAYS) {
    throw new RangeError(`train ${MIN_DAYS}-${MAX_DAYS} days, got ${target}`);
  }
  if (target > days.length) throw new RangeError(`cannot train ${target} of ${days.length} days`);
  if (target === days.length) return days;
  const score = (s: Weekday[]) => {
    const g = gaps(s);
    return [Math.min(...g), -g.filter((x) => x === 1).length];
  };
  return subsets(days, target).reduce((best, s) => {
    const [a, b] = [score(s), score(best)];
    return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]) ? s : best;
  });
}

/** Muscles with direct work in a session. Rear-delt work counts apart: a different shoulder head. */
function directSets(day: ProgramDay): Map<string, number> {
  const sets = new Map<string, number>();
  for (const ex of day.exercises) {
    const muscles: string[] = ex.slot === 'rearDelt' ? ['rearDelts'] : CATALOG[ex.exerciseId].primary;
    for (const m of muscles) sets.set(m, (sets.get(m) ?? 0) + ex.sets);
  }
  return sets;
}

/** Muscles trained directly (2+ sets) in both sessions: avoid these on back-to-back days. */
export function backToBackMuscles(a: ProgramDay, b: ProgramDay): (Muscle | 'rearDelts')[] {
  const [sa, sb] = [directSets(a), directSets(b)];
  return [...sa.keys()].filter((m) => (sa.get(m) ?? 0) >= DIRECT_SETS && (sb.get(m) ?? 0) >= DIRECT_SETS) as (
    | Muscle
    | 'rearDelts'
  )[];
}

/** The session for the next training day: the order continues whatever the date. */
export function nextSession(cycle: ProgramDay[], offset: number, sessionsDone: number): ProgramDay {
  return cycle[(offset + sessionsDone) % cycle.length];
}

/** Back-to-back day pairs with a shared muscle, over enough weeks to repeat the pattern. */
function countBackToBack(cycle: ProgramDay[], days: Weekday[], offset: number): number {
  const g = gaps(days);
  const sessions = cycle.length * days.length;
  let count = 0;
  for (let i = 0; i < sessions; i++) {
    if (g[i % days.length] !== 1) continue;
    const a = nextSession(cycle, offset, i);
    const b = nextSession(cycle, offset, i + 1);
    if (backToBackMuscles(a, b).length > 0) count++;
  }
  return count;
}

export type ScheduleInput = Omit<ProgramInput, 'daysPerWeek' | 'week'> & {
  /** Weekdays the user tapped. */
  available: Weekday[];
  /** "Only train N of them". Defaults to all tapped days (at most 6). */
  count?: number;
};

export type Schedule = {
  program: Program;
  /** The repeating order of sessions. */
  cycle: ProgramDay[];
  trainingDays: Weekday[];
  /** Where in the cycle the first training day of the week starts. */
  offset: number;
  /** Back-to-back day pairs sharing a muscle, over one repeat of the pattern. */
  backToBack: number;
  notices: ScheduleNotice[];
};

/** Training days, program and session order that best spaces the same muscles. */
export function planSchedule({ available, count, ...input }: ScheduleInput): Schedule {
  const trainingDays = chooseTrainingDays(available, count);
  const programInput: ProgramInput = { ...input, daysPerWeek: trainingDays.length };
  const cycle = programCycle(programInput);
  let offset = 0;
  let backToBack = countBackToBack(cycle, trainingDays, 0);
  for (let o = 1; o < cycle.length && backToBack > 0; o++) {
    const n = countBackToBack(cycle, trainingDays, o);
    if (n < backToBack) [offset, backToBack] = [o, n];
  }
  return {
    program: generateProgram(programInput),
    cycle,
    trainingDays,
    offset,
    backToBack,
    notices: backToBack > 0 ? ['back_to_back'] : [],
  };
}

export type PlanState = { schedule: Schedule; sessionsDone: number };

export type ReplanInput = ScheduleInput & {
  /** Exercises the user has logged a weight for (working weights are kept per exercise). */
  loggedExerciseIds?: string[];
};

export type Replan = PlanState & {
  /** Exercises without a logged weight: offer find-your-weight. */
  newExercises: string[];
};

const sameCycle = (a: ProgramDay[], b: ProgramDay[]) =>
  a.length === b.length &&
  a.every((d, i) => d.name === b[i].name && JSON.stringify(d.exercises) === JSON.stringify(b[i].exercises));

/**
 * New days, level, split or swaps, from the next week. Swaps stay stored per slot (one the new level
 * can't use is ignored, not deleted); weights stay per exercise. Same sessions: the next session
 * stays the one that was next, unless another start avoids back-to-back muscles. Otherwise the new
 * program starts from its first session.
 */
export function replan(previous: PlanState, { loggedExerciseIds = [], ...input }: ReplanInput): Replan {
  const days = chooseTrainingDays(input.available, input.count).length;
  const splitFits = !input.split || splitOptions(days, input.focus).some((o) => o.split === input.split);
  const fresh = planSchedule(splitFits ? input : { ...input, split: undefined });
  const reset: ScheduleNotice[] = splitFits ? [] : ['split_reset'];

  const old = previous.schedule;
  let schedule: Schedule = { ...fresh, notices: [...reset, ...fresh.notices] };
  if (sameCycle(old.cycle, fresh.cycle)) {
    const next = (old.offset + previous.sessionsDone) % old.cycle.length;
    const backToBack = countBackToBack(fresh.cycle, fresh.trainingDays, next);
    if (backToBack <= fresh.backToBack) {
      const tip: ScheduleNotice[] = backToBack > 0 ? ['back_to_back'] : [];
      schedule = { ...fresh, offset: next, backToBack, notices: [...reset, ...tip] };
    }
  }
  const logged = new Set(loggedExerciseIds);
  const newExercises = [...new Set(schedule.cycle.flatMap((d) => d.exercises.map((e) => e.exerciseId)))].filter(
    (id) => !logged.has(id),
  );
  return { schedule, sessionsDone: 0, newExercises };
}

/** The coming week: each training day with its session, after `sessionsDone` sessions. */
export function weekPreview(
  { cycle, trainingDays, offset }: Pick<Schedule, 'cycle' | 'trainingDays' | 'offset'>,
  sessionsDone = 0,
): { weekday: Weekday; day: ProgramDay }[] {
  return trainingDays.map((weekday, i) => ({ weekday, day: nextSession(cycle, offset, sessionsDone + i) }));
}

/** After 2+ weeks off: tip to start at the same weight and drop it if reps fall below 6. */
export function longBreakTip(daysSinceLastSession: number): boolean {
  return daysSinceLastSession >= LONG_BREAK_DAYS;
}
