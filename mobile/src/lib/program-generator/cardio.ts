/**
 * Weekly cardio plan (see docs/Technical/Program generation.md, "Cardio and steps"). Spreads the
 * weekly moderate minutes (WHO 2020: 150-300) over the week the schedule shows:
 * - losing weight: after lifting first (incline walk or stairs, lift first: Eddens 2018), the rest
 *   on rest days (user decision);
 * - other goals: rest days first, to keep cardio away from lifting (Robineau 2016), then after
 *   upper-body sessions.
 * Gaining goals get no cardio by default (0 min), and can opt in. The easy warm-up cardio does not count. Any bout length counts (Jakicic 2019), so a day's minutes
 * can be split. Steps are a daily target, the same every day (`activityTargets`).
 */
import type { Goal } from '../goal-engine/targets';
import type { ProgramDay } from './program';
import type { Weekday } from './schedule';

export type CardioWhen = 'after_lifting' | 'rest_day';
export type CardioType = 'incline_walking' | 'stair_climbing' | 'cycling' | 'elliptical' | 'brisk_walking';

export type CardioDay = { weekday: Weekday; when: CardioWhen; minutes: number; types: readonly CardioType[] };

/** - more_cardio: above 150 min/week, muscle gains may slow a little (Wilson 2012) */
export type CardioNotice = 'more_cardio';

export type CardioPlan = { minutesPerWeek: number; days: CardioDay[]; notices: CardioNotice[] };

export type CardioInput = {
  goal: Goal;
  /** The coming week from `weekPreview`: each training day and its session. */
  week: { weekday: Weekday; day: ProgramDay }[];
  /** Defaults to 150; 0 = no cardio (gaining goals' default); otherwise 150-300. */
  minutesPerWeek?: number;
};

const MIN_PER_WEEK = 150;
const MAX_PER_WEEK = 300;
/** Cardio after lifting: at most 30 min (user decision, the length of the 12-3-30 walk). */
const AFTER_LIFTING_MAX = 30;
/** Cardio on a rest day before the rest goes after lifting (other goals; convention). */
const REST_DAY_MAX = 60;
const STEP = 5;

/** Low-impact types: in lifters, running (not cycling) slowed muscle growth (Lundberg 2022). */
const AFTER_LIFTING_TYPES = ['incline_walking', 'stair_climbing', 'cycling', 'elliptical'] as const;
const REST_DAY_TYPES = ['brisk_walking', 'incline_walking', 'cycling', 'elliptical', 'stair_climbing'] as const;

/** `total` split over `n` slots in 5-min steps, as evenly as possible, larger first. */
function spread(total: number, n: number): number[] {
  if (n === 0) return [];
  const steps = Math.floor(total / STEP);
  const base = Math.floor(steps / n);
  const out = Array.from({ length: n }, (_, i) => (base + (i < steps % n ? 1 : 0)) * STEP);
  out[0] += total - steps * STEP;
  return out;
}

/** Upper-body sessions first: cardio after a leg day adds to tired legs. */
function upperFirst(week: CardioInput['week']): Weekday[] {
  const upper = week.filter(({ day }) => !day.warmUp.cardioTip).map(({ weekday }) => weekday);
  const lower = week.filter(({ day }) => day.warmUp.cardioTip).map(({ weekday }) => weekday);
  return [...upper, ...lower];
}

export function planCardio({ goal, week, minutesPerWeek = MIN_PER_WEEK }: CardioInput): CardioPlan {
  if (minutesPerWeek === 0) return { minutesPerWeek, days: [], notices: [] };
  if (!Number.isInteger(minutesPerWeek) || minutesPerWeek < MIN_PER_WEEK || minutesPerWeek > MAX_PER_WEEK) {
    throw new RangeError(`cardio must be 0 or ${MIN_PER_WEEK}-${MAX_PER_WEEK} min/week, got ${minutesPerWeek}`);
  }
  const training = week.map(({ weekday }) => weekday);
  const restDays = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((d) => !training.includes(d));
  const after = new Map<Weekday, number>();
  let restTotal: number;

  if (goal === 'lose_weight') {
    const afterTotal = Math.min(minutesPerWeek, AFTER_LIFTING_MAX * training.length);
    spread(afterTotal, training.length).forEach((m, i) => after.set(training[i], m));
    restTotal = minutesPerWeek - afterTotal;
  } else {
    restTotal = Math.min(minutesPerWeek, REST_DAY_MAX * restDays.length);
    let left = minutesPerWeek - restTotal;
    for (const d of upperFirst(week)) {
      const m = Math.min(left, AFTER_LIFTING_MAX);
      if (m > 0) after.set(d, m);
      left -= m;
    }
    restTotal += left;
  }
  // Leftover after the caps goes to rest days: they have the time.
  if (restDays.length === 0 && restTotal > 0) throw new RangeError('no rest day for the remaining cardio');
  const rest = new Map(spread(restTotal, restDays.length).map((m, i) => [restDays[i], m]));

  const days: CardioDay[] = [];
  for (const weekday of [0, 1, 2, 3, 4, 5, 6] as Weekday[]) {
    const a = after.get(weekday) ?? 0;
    const r = rest.get(weekday) ?? 0;
    if (a > 0) days.push({ weekday, when: 'after_lifting', minutes: a, types: AFTER_LIFTING_TYPES });
    if (r > 0) days.push({ weekday, when: 'rest_day', minutes: r, types: REST_DAY_TYPES });
  }
  return { minutesPerWeek, days, notices: minutesPerWeek > MIN_PER_WEEK ? ['more_cardio'] : [] };
}
