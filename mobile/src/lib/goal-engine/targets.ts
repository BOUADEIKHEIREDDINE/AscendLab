import { bmr, bmi, tdee, type ActivityLevel, type BodyProfile } from './energy';
import { macros, type Macros } from './macros';

export type Goal = 'lose_weight' | 'lean_gain' | 'gain_weight' | 'recomposition' | 'maintain';

/**
 * Why the engine changed what was asked. The UI turns each one into a message.
 * - rate_clamped: requested weekly rate was outside the allowed range for the goal
 * - calorie_floor: target raised to the safety floor (1200/1500 kcal)
 * - fast_gain: requested gain above 0.5 %/week, where extra weight is mostly fat
 * - minor_no_deficit: under 18, no deficit is proposed ("talk to a professional")
 * - underweight_no_loss: BMI under 18.5, weight loss is refused
 */
export type Notice =
  | 'rate_clamped'
  | 'calorie_floor'
  | 'fast_gain'
  | 'minor_no_deficit'
  | 'underweight_no_loss';

export type TargetsInput = BodyProfile & {
  activity: ActivityLevel;
  goal: Goal;
  /** Weekly body weight change in % of body weight (e.g. -0.5). Defaults per goal. */
  weeklyRatePct?: number;
  /** Exercise on top of daily life, kcal/day averaged over the week (e.g. `liftingKcalPerDay`). */
  exerciseKcalPerDay?: number;
};

export type Targets = {
  bmr: number;
  tdee: number;
  weeklyRatePct: number;
  calories: number;
  macros: Macros;
  notices: Notice[];
};

const KCAL_PER_KG = 7700;
const MIN_CALORIES = { male: 1500, female: 1200 };
/** Above this weekly gain, extra weight is mostly fat (Helms 2023, Garthe 2013). */
const FAST_GAIN_RATE = 0.5;
const ADULT_AGE = 18;
const UNDERWEIGHT_BMI = 18.5;
/** Recomposition runs at a small deficit only when there is fat to lose. */
const RECOMP_DEFICIT_BMI = 25;

/** Allowed weekly rate range in % of body weight, per goal. */
const RATE_RANGE: Record<Goal, { min: number; max: number }> = {
  lose_weight: { min: -1, max: -0.25 },
  lean_gain: { min: 0.1, max: 0.5 },
  gain_weight: { min: 0.25, max: 1 },
  recomposition: { min: -0.25, max: 0 },
  maintain: { min: 0, max: 0 },
};

function defaultRate(goal: Goal, bodyMassIndex: number): number {
  switch (goal) {
    case 'lose_weight':
      return -0.5;
    case 'lean_gain':
      return 0.25;
    case 'gain_weight':
      return 0.5;
    case 'recomposition':
      return bodyMassIndex >= RECOMP_DEFICIT_BMI ? -0.25 : 0;
    case 'maintain':
      return 0;
  }
}

/** Daily calorie and macro targets for a profile and goal, with safety floors applied. */
export function computeTargets(input: TargetsInput): Targets {
  const notices: Notice[] = [];
  const bodyMassIndex = bmi(input.weightKg, input.heightCm);
  const bmrKcal = bmr(input);
  const exercise = input.exerciseKcalPerDay ?? 0;
  if (!(exercise >= 0)) throw new RangeError(`exerciseKcalPerDay must be 0 or more, got ${exercise}`);
  const tdeeKcal = tdee(bmrKcal, input.activity) + exercise;

  const range = RATE_RANGE[input.goal];
  let rate = input.weeklyRatePct ?? defaultRate(input.goal, bodyMassIndex);
  if (rate < range.min || rate > range.max) {
    rate = Math.min(range.max, Math.max(range.min, rate));
    notices.push('rate_clamped');
  }
  if (rate > FAST_GAIN_RATE) {
    notices.push('fast_gain');
  }
  if (rate < 0 && input.age < ADULT_AGE) {
    rate = 0;
    notices.push('minor_no_deficit');
  }
  if (rate < 0 && bodyMassIndex < UNDERWEIGHT_BMI) {
    rate = 0;
    notices.push('underweight_no_loss');
  }

  let calories = tdeeKcal + ((rate / 100) * input.weightKg * KCAL_PER_KG) / 7;
  const floor = MIN_CALORIES[input.sex];
  if (calories < floor) {
    calories = floor;
    notices.push('calorie_floor');
  }
  calories = Math.round(calories);

  return {
    bmr: Math.round(bmrKcal),
    tdee: Math.round(tdeeKcal),
    weeklyRatePct: rate,
    calories,
    macros: macros(calories, input.weightKg, input.heightCm),
    notices,
  };
}
