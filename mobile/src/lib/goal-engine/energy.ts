export type Sex = 'male' | 'female';

export type BodyProfile = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
};

/** Basal metabolic rate in kcal/day (Mifflin-St Jeor). */
export function bmr({ sex, weightKg, heightCm, age }: BodyProfile): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';

/** Daily-life activity multipliers. Lifting is added apart (`liftingKcalPerDay`); other sport in V2. */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

/** Total daily energy expenditure in kcal/day. */
export function tdee(bmrKcal: number, activity: ActivityLevel): number {
  return bmrKcal * ACTIVITY_FACTORS[activity];
}

/**
 * Weight training: 3.5 METs on average, rests between sets included (2024 Compendium, code 02054,
 * "multiple exercises, 8-15 reps"). Minus the 1 MET already counted at rest = 2.5 kcal/kg/h.
 * Measured sessions agree: 15 upper-body sets cost ~88 kcal above rest (Mookerjee 2016).
 */
const LIFTING_NET_MET = 2.5;

/** Extra kcal a day from the planned lifting, averaged over the week. */
export function liftingKcalPerDay(weightKg: number, liftingMinutesPerWeek: number): number {
  if (!(weightKg > 0)) throw new RangeError(`weightKg must be positive, got ${weightKg}`);
  if (!(liftingMinutesPerWeek >= 0)) throw new RangeError(`minutes must be 0 or more, got ${liftingMinutesPerWeek}`);
  return Math.round((LIFTING_NET_MET * weightKg * liftingMinutesPerWeek) / 60 / 7);
}

/** Body mass index in kg/m². */
export function bmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}
