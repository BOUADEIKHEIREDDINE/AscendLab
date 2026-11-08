import type { Goal } from './targets';

export type ActivityInput = { goal: Goal; age: number };

export type ActivityTargets = {
  /** All-day steps, anywhere (not only at the gym). */
  stepsPerDay: number;
  /** Moderate cardio minutes per week (WHO 2020: 150-300); 0 when gaining (opt-in). */
  cardioMinPerWeek: number;
  cardioMaxPerWeek: number;
};

/**
 * Low-impact cardio, suggested before running: running, not cycling, slowed muscle fibre growth
 * when mixed with lifting (Lundberg 2022). Done after lifting or on rest days (Eddens 2018).
 */
export const PREFERRED_CARDIO = ['cycling', 'incline_walking', 'stair_climbing', 'elliptical', 'brisk_walking'] as const;

/** Extra steps help a deficit; ~3,000 more ≈ 30 min walking a day (user decision, Jayedi 2024). */
const WEIGHT_LOSS_STEPS = 10000;
/** Mortality benefit levels off at 8,000-10,000 under 60 and 6,000-8,000 from 60 (Paluch 2022). */
const STEPS = { under60: 8000, from60: 7000 };
const CARDIO_MIN_PER_WEEK = 150;
/** Gaining needs a calorie surplus: no cardio by default, the user can add it (user decision). */
const GAINING: Goal[] = ['lean_gain', 'gain_weight'];
const CARDIO_MAX_PER_WEEK = 300;

/** Daily steps and weekly cardio for the user's goal. */
export function activityTargets({ goal, age }: ActivityInput): ActivityTargets {
  const stepsPerDay = goal === 'lose_weight' ? WEIGHT_LOSS_STEPS : age < 60 ? STEPS.under60 : STEPS.from60;
  const cardioMinPerWeek = GAINING.includes(goal) ? 0 : CARDIO_MIN_PER_WEEK;
  return { stepsPerDay, cardioMinPerWeek, cardioMaxPerWeek: CARDIO_MAX_PER_WEEK };
}
