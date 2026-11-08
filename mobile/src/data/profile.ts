/**
 * The person's profile, unit conversions, sanity checks and the plan calculator.
 * Ported one-to-one from the Android app (UserProfile.kt, BodyChecks.kt, PlanCalculator.kt)
 * so both apps produce exactly the same plan from the same answers.
 */

export type Sex = 'MAN' | 'WOMAN';
export const SEX_LABEL: Record<Sex, string> = { MAN: 'Man', WOMAN: 'Woman' };

/**
 * How active someone is outside of planned workouts. `multiplier` scales resting
 * calories (BMR) into daily calories, using the standard activity factors.
 */
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'VERY';
export const ACTIVITY_LEVELS: ActivityLevel[] = ['SEDENTARY', 'LIGHT', 'MODERATE', 'VERY'];
export const ACTIVITY: Record<ActivityLevel, { label: string; description: string; example: string; multiplier: number }> = {
  SEDENTARY: { label: 'Mostly sitting', description: 'Little movement during the day', example: 'Office job, car commute', multiplier: 1.2 },
  LIGHT: { label: 'Lightly active', description: 'On your feet now and then', example: 'Short walks, some stairs', multiplier: 1.375 },
  MODERATE: { label: 'Active', description: 'Moving for a good part of the day', example: 'Teacher, waiter, daily long walks', multiplier: 1.55 },
  VERY: { label: 'Very active', description: 'Physical work or lots of movement', example: 'Construction, delivery by bike', multiplier: 1.725 },
};

export type Goal = 'LOSE_FAT' | 'BUILD_MUSCLE' | 'GET_FIT';
export const GOALS: Goal[] = ['LOSE_FAT', 'BUILD_MUSCLE', 'GET_FIT'];
export const GOAL: Record<Goal, { label: string; description: string }> = {
  LOSE_FAT: { label: 'Lose fat', description: 'Slim down steadily while keeping your strength' },
  BUILD_MUSCLE: { label: 'Build muscle', description: 'Get stronger and add lean muscle' },
  GET_FIT: { label: 'Get fit', description: 'Feel better, move better, build a routine' },
};

export type TrainingPlace = 'GYM' | 'HOME';
export const PLACES: TrainingPlace[] = ['GYM', 'HOME'];
export const PLACE: Record<TrainingPlace, { label: string; description: string }> = {
  GYM: { label: 'At the gym', description: 'Machines, barbells and dumbbells' },
  HOME: { label: 'At home', description: 'Your body weight and simple equipment' },
};

export type Units = 'METRIC' | 'IMPERIAL';
export const UNITS: Units[] = ['METRIC', 'IMPERIAL'];
export const UNIT: Record<Units, { label: string; weightUnit: string; heightUnit: string }> = {
  METRIC: { label: 'Metric', weightUnit: 'kg', heightUnit: 'cm' },
  IMPERIAL: { label: 'Imperial', weightUnit: 'lb', heightUnit: 'ft / in' },
};

/**
 * Everything onboarding collects. Body data is always stored in metric
 * (cm, kg); `units` only changes how it is shown and typed.
 */
export interface UserProfile {
  sex: Sex | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activity: ActivityLevel | null;
  goal: Goal | null;
  daysPerWeek: number | null;
  place: TrainingPlace | null;
  units: Units;
  onboardingComplete: boolean;
}

export const MIN_DAYS = 2;
export const MAX_DAYS = 6;

export const emptyProfile = (): UserProfile => ({
  sex: null, age: null, heightCm: null, weightKg: null, activity: null,
  goal: null, daysPerWeek: null, place: null, units: 'METRIC', onboardingComplete: false,
});

export function isEmptyProfile(p: UserProfile): boolean {
  return JSON.stringify(p) === JSON.stringify(emptyProfile());
}

/** True once every answer needed to build a plan is present. */
export function hasEverythingForPlan(p: UserProfile | null | undefined): p is UserProfile & {
  sex: Sex; age: number; heightCm: number; weightKg: number; activity: ActivityLevel; goal: Goal; daysPerWeek: number; place: TrainingPlace;
} {
  return !!p && p.sex != null && p.age != null && p.heightCm != null && p.weightKg != null &&
    p.activity != null && p.goal != null && p.daysPerWeek != null && p.place != null;
}

export function profileToMap(p: UserProfile): Record<string, unknown> {
  return {
    sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: p.weightKg, activity: p.activity,
    goal: p.goal, daysPerWeek: p.daysPerWeek, place: p.place, units: p.units, onboardingComplete: p.onboardingComplete,
  };
}

function enumOrNull<T extends string>(values: readonly T[], v: unknown): T | null {
  return values.includes(v as T) ? (v as T) : null;
}
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

/** Reads a stored profile; unknown or missing values come back as null instead of crashing. */
export function profileFromMap(m: Record<string, unknown>): UserProfile {
  const age = num(m.age);
  const days = num(m.daysPerWeek);
  return {
    sex: enumOrNull(['MAN', 'WOMAN'] as const, m.sex),
    age: age == null ? null : Math.trunc(age),
    heightCm: num(m.heightCm),
    weightKg: num(m.weightKg),
    activity: enumOrNull(ACTIVITY_LEVELS, m.activity),
    goal: enumOrNull(GOALS, m.goal),
    daysPerWeek: days == null ? null : Math.trunc(days),
    place: enumOrNull(PLACES, m.place),
    units: enumOrNull(UNITS, m.units) ?? 'METRIC',
    onboardingComplete: m.onboardingComplete === true,
  };
}

// ---------------------------------------------------------------- Conversions

const LB_PER_KG = 2.2046226218;
const CM_PER_INCH = 2.54;

/** Kotlin's roundToInt: halves round up (towards positive infinity). */
export const roundInt = (x: number) => Math.round(x);

export const Convert = {
  kgToLb: (kg: number) => kg * LB_PER_KG,
  lbToKg: (lb: number) => lb / LB_PER_KG,
  /** Splits a height in cm into whole feet and inches, e.g. 178 cm -> [5, 10]. */
  cmToFeetInches(cm: number): [number, number] {
    const totalInches = roundInt(cm / CM_PER_INCH);
    return [Math.floor(totalInches / 12), totalInches % 12];
  },
  feetInchesToCm: (feet: number, inches: number) => (feet * 12 + inches) * CM_PER_INCH,
  formatWeight(kg: number, units: Units): string {
    return units === 'METRIC' ? `${roundInt(kg)} kg` : `${roundInt(Convert.kgToLb(kg))} lb`;
  },
  formatHeight(cm: number, units: Units): string {
    if (units === 'METRIC') return `${roundInt(cm)} cm`;
    const [ft, inch] = Convert.cmToFeetInches(cm);
    return `${ft} ft ${inch} in`;
  },
};

/**
 * Checks that body data is realistic before it is used to build a plan.
 * Each check returns null when the value is fine, or a short message saying what to fix.
 */
export const BodyChecks = {
  MIN_AGE: 16, MAX_AGE: 100,
  MIN_HEIGHT_CM: 120, MAX_HEIGHT_CM: 230,
  MIN_WEIGHT_KG: 35, MAX_WEIGHT_KG: 250,

  age(age: number | null): string | null {
    if (age == null) return 'Enter your age.';
    if (age < 16) return 'AscendLab is for people aged 16 and over.';
    if (age > 100) return 'Please check your age: 100 is the maximum.';
    return null;
  },
  height(cm: number | null, units: Units): string | null {
    if (cm == null) return 'Enter your height.';
    if (cm < 120 || cm > 230) {
      return `Enter a height between ${Convert.formatHeight(120, units)} and ${Convert.formatHeight(230, units)}.`;
    }
    return null;
  },
  weight(kg: number | null, units: Units): string | null {
    if (kg == null) return 'Enter your weight.';
    if (kg < 35 || kg > 250) {
      return `Enter a weight between ${Convert.formatWeight(35, units)} and ${Convert.formatWeight(250, units)}.`;
    }
    return null;
  },
  /** Height and weight can each be in range yet impossible together (e.g. 230 cm and 35 kg). */
  combination(heightCm: number | null, weightKg: number | null): string | null {
    if (heightCm == null || weightKg == null) return null;
    const m = heightCm / 100;
    const bmi = weightKg / (m * m);
    return bmi < 13 || bmi > 70 ? "This height and weight don't seem to go together. Please double-check both." : null;
  },
};

// ---------------------------------------------------------------- Plan calculator

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Calories the body burns at rest. */
  bmr: number;
  /** Calories burned on a normal day, activity included (the "maintenance" level). */
  maintenance: number;
}

/** One training day in the week. `dayIndex` runs 0 (Monday) to 6 (Sunday). */
export interface PlannedDay { dayIndex: number; title: string; focus: string }

export interface TrainingWeek {
  splitName: string;
  splitExplanation: string;
  days: PlannedDay[];
  setsAndReps: string;
  minutesPerSession: number;
}

const roundTo = (x: number, step: number) => roundInt(x / step) * step;

/**
 * Turns a profile into a calorie target and a weekly training plan.
 * Pure functions: the same answers always give the same plan.
 */
export const PlanCalculator = {
  nutrition(p: UserProfile): NutritionTargets {
    const weight = p.weightKg!, height = p.heightCm!, age = p.age!;
    // Mifflin-St Jeor equation, the most accurate common formula for resting calories.
    const sexOffset = p.sex === 'WOMAN' ? -161 : 5;
    const bmr = 10 * weight + 6.25 * height - 5 * age + sexOffset;
    const maintenance = bmr * ACTIVITY[p.activity!].multiplier;

    // A moderate 20% deficit or 10% surplus: steady progress without extreme dieting.
    const minimum = p.sex === 'WOMAN' ? 1200 : 1500;
    const raw = p.goal === 'LOSE_FAT' ? Math.max(maintenance * 0.8, minimum)
      : p.goal === 'BUILD_MUSCLE' ? maintenance * 1.1 : maintenance;
    const calories = roundTo(raw, 10);

    // Protein per kg of body weight; above a BMI of 27 the weight at BMI 27 is used instead.
    const meters = height / 100;
    const referenceWeight = Math.min(weight, 27 * meters * meters);
    const perKg = p.goal === 'LOSE_FAT' ? 2.0 : p.goal === 'BUILD_MUSCLE' ? 1.8 : 1.6;
    const protein = roundInt(referenceWeight * perKg);
    const fat = roundInt((calories * 0.25) / 9);
    const carbs = Math.max(roundInt((calories - protein * 4 - fat * 9) / 4), 50);

    return { calories, proteinG: protein, carbsG: carbs, fatG: fat, bmr: roundTo(bmr, 10), maintenance: roundTo(maintenance, 10) };
  },

  training(p: UserProfile): TrainingWeek {
    const days = Math.min(Math.max(p.daysPerWeek!, MIN_DAYS), MAX_DAYS);
    const home = p.place === 'HOME';
    // Rest days are spread out so each muscle gets time to recover.
    const schedule = ({ 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5] } as Record<number, number[]>)[days] ?? [0, 1, 2, 3, 4, 5];

    const fullBody: [string, string] = ['Full body', home ? 'Squats, push-ups, rows and core' : 'Squat, bench press, row and core'];
    const upper: [string, string] = ['Upper body', 'Chest, back, shoulders and arms'];
    const lower: [string, string] = ['Lower body', 'Legs, glutes and core'];
    const push: [string, string] = ['Push', 'Chest, shoulders and triceps'];
    const pull: [string, string] = ['Pull', 'Back and biceps'];
    const legs: [string, string] = ['Legs', 'Thighs, glutes and calves'];

    let splitName: string, explanation: string, sessions: [string, string][];
    if (days <= 3) {
      splitName = 'Full body';
      explanation = "Each session trains your whole body. It's the best start for beginners: every muscle gets worked several times a week.";
      sessions = Array(days).fill(fullBody);
    } else if (days === 4) {
      splitName = 'Upper / Lower';
      explanation = 'You alternate upper-body and lower-body days, so one half rests while the other trains.';
      sessions = [upper, lower, upper, lower];
    } else if (days === 5) {
      splitName = 'Upper / Lower + Push / Pull / Legs';
      explanation = 'Two half-body days, then three focused days. Every muscle is trained twice a week.';
      sessions = [upper, lower, push, pull, legs];
    } else {
      splitName = 'Push / Pull / Legs';
      explanation = 'Pushing muscles, pulling muscles, then legs, twice a week. Great once you have a routine.';
      sessions = [push, pull, legs, push, pull, legs];
    }

    const setsAndReps = p.goal === 'BUILD_MUSCLE' ? '3 to 4 sets of 8 to 12 reps, resting about 90 seconds'
      : p.goal === 'LOSE_FAT' ? '3 sets of 12 to 15 reps, with short rests of about 45 seconds'
        : '2 to 3 sets of 10 to 15 reps, resting about 60 seconds';

    return {
      splitName,
      splitExplanation: explanation,
      days: schedule.map((dayIndex, i) => ({ dayIndex, title: sessions[i][0], focus: sessions[i][1] })),
      setsAndReps,
      minutesPerSession: days <= 3 ? 50 : 45,
    };
  },

  /** A one-line tip shown under each days-per-week option. */
  daysAdvice(days: number): string {
    switch (days) {
      case 2: return 'A gentle start. Easy to fit into a busy week.';
      case 3: return 'The sweet spot for beginners: real progress with plenty of rest.';
      case 4: return 'A solid routine if you already move regularly.';
      case 5: return "Ambitious. Best if you've trained before.";
      default: return 'For experienced lifters. Rest and sleep matter a lot here.';
    }
  },
};

/** Thousands separators, like Kotlin's NumberFormat.getIntegerInstance(). */
export function formatKcal(value: number): string {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function calorieReason(t: NutritionTargets, goal: Goal): string {
  const normal = `Your body uses about ${formatKcal(t.maintenance)} kcal on a normal day.`;
  switch (goal) {
    case 'LOSE_FAT':
      // When 20% under maintenance would drop below a safe minimum, the minimum is used instead.
      return t.calories <= t.maintenance * 0.81
        ? `${normal} Eating a little less than that means steady fat loss without going hungry.`
        : `${normal} We keep your target at a safe minimum, so you lose fat gently and stay energised.`;
    case 'BUILD_MUSCLE':
      return `${normal} Eating a bit more than that gives your muscles the extra energy they need to grow.`;
    case 'GET_FIT':
      return `${normal} Eating about that much keeps your weight steady while you get fitter.`;
  }
}

/** 72.0 -> "72", 72.5 -> "72.5". */
export function formatNumber(value: number): string {
  const rounded = roundInt(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
