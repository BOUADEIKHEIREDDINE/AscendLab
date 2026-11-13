/**
 * The person's profile, unit conversions, sanity checks and the plan calculator.
 * Profile, conversions and body checks are ported from the Android app (UserProfile.kt,
 * BodyChecks.kt). The plan calculator now runs on the evidence-based engines in `src/lib/`:
 * calories from the goal engine, gym training from the program generator. Home training
 * keeps the Android app's simple version until the generator supports it.
 */
import { liftingKcalPerDay } from '../lib/goal-engine/energy';
import { computeTargets } from '../lib/goal-engine/targets';
import { applyCustomTargets, type CustomTargets, type CustomWarning } from '../lib/goal-engine/custom';
import type { Goal as EngineGoal } from '../lib/goal-engine/targets';
import type { ActivityLevel as EngineActivity } from '../lib/goal-engine/energy';
import { buildPlan, type WeekPlan } from '../lib/program-generator/plan';
import { slotOf, splitOptions, type Level as EngineLevel, type Slot, type Split, type SplitOption } from '../lib/program-generator/program';
import { chooseTrainingDays, type Weekday } from '../lib/program-generator/schedule';
import { CATALOG } from '../lib/program-generator/catalog';
import { legacyDefault } from '../lib/program-generator/legacy';

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

/** GET_FIT, from older versions, now reads as MAINTAIN. */
export type Goal = 'LOSE_FAT' | 'BUILD_MUSCLE' | 'GAIN_WEIGHT' | 'RECOMPOSITION' | 'MAINTAIN';
export const GOALS: Goal[] = ['LOSE_FAT', 'BUILD_MUSCLE', 'GAIN_WEIGHT', 'RECOMPOSITION', 'MAINTAIN'];
export const GOAL: Record<Goal, { label: string; description: string }> = {
  LOSE_FAT: { label: 'Lose weight', description: 'Lose fat steadily while keeping your muscle' },
  BUILD_MUSCLE: { label: 'Build muscle', description: 'Add muscle with a small surplus, little fat' },
  GAIN_WEIGHT: { label: 'Gain weight', description: 'Put on weight faster, muscle and some fat' },
  RECOMPOSITION: { label: 'Recomposition', description: 'Lose fat and build muscle at the same time' },
  MAINTAIN: { label: 'Maintain', description: 'Keep your weight, get fitter and stronger' },
};
const ENGINE_GOAL: Record<Goal, EngineGoal> = {
  LOSE_FAT: 'lose_weight', BUILD_MUSCLE: 'lean_gain', GAIN_WEIGHT: 'gain_weight', RECOMPOSITION: 'recomposition', MAINTAIN: 'maintain',
};

export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export const LEVELS: Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
export const LEVEL: Record<Level, { label: string; description: string }> = {
  BEGINNER: { label: 'Beginner', description: 'New to lifting, or less than a year of regular training' },
  INTERMEDIATE: { label: 'Intermediate', description: '1 to 3 years of regular training' },
  ADVANCED: { label: 'Advanced', description: 'More than 3 years, you know your lifts well' },
};
const ENGINE_LEVEL: Record<Level, EngineLevel> = { BEGINNER: 'beginner', INTERMEDIATE: 'intermediate', ADVANCED: 'advanced' };

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
  /** Lifting experience. Missing on older profiles: treated as beginner (machines only). */
  level: Level | null;
  /** Weekdays the person can train, 0 = Monday ... 6 = Sunday. */
  trainingDays: number[] | null;
  /** "Only train N of them"; null = all tapped days (at most 6). */
  trainCount: number | null;
  /** How many days are actually trained; kept in sync with trainingDays and trainCount. */
  daysPerWeek: number | null;
  place: TrainingPlace | null;
  units: Units;
  onboardingComplete: boolean;
  /** Split picked with "Change split" (5–6 days); null = the generator's default. */
  split: Split | null;
  /** Exercise saved for a movement slot; the generator puts it everywhere the slot appears. */
  swaps: Partial<Record<Slot, string>>;
  /** Daily targets the person typed; null = the recommended ones. */
  customTargets: CustomTargets | null;
  /** Exercise ranking the plan was saved under; null = saved before the ranking existed. */
  rankingVersion: number | null;
}

/**
 * Bump when the generator's default exercises change again. Bumping to 2 needs a snapshot of the
 * version-1 defaults first (as legacy.ts keeps the pre-ranking ones), because pinLegacyDefaults
 * only handles rankingVersion == null.
 */
export const RANKING_VERSION = 1;

export const MIN_DAYS = 2;
export const MAX_DAYS = 6;

export const emptyProfile = (): UserProfile => ({
  sex: null, age: null, heightCm: null, weightKg: null, activity: null, goal: null,
  level: null, trainingDays: null, trainCount: null, daysPerWeek: null, place: null, units: 'METRIC', onboardingComplete: false,
  split: null, swaps: {}, customTargets: null, rankingVersion: RANKING_VERSION,
});

/** Spread-out days for a number of days, used for profiles saved before the weekday picker. */
const DEFAULT_DAYS: Record<number, number[]> = { 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };

/** The days that will be trained, from the tapped days and "only N". Null when fewer than 2 are tapped. */
export function chosenDays(p: Pick<UserProfile, 'trainingDays' | 'trainCount' | 'daysPerWeek'>): number[] | null {
  const tapped = p.trainingDays ?? (p.daysPerWeek != null ? DEFAULT_DAYS[Math.min(Math.max(p.daysPerWeek, MIN_DAYS), MAX_DAYS)] : null);
  if (!tapped || new Set(tapped).size < MIN_DAYS) return null;
  const count = p.trainCount != null && p.trainCount < new Set(tapped).size ? p.trainCount : undefined;
  return chooseTrainingDays(tapped as Weekday[], count);
}

/** Sets the tapped days and "only N", and keeps daysPerWeek in sync. */
export function withDays(p: UserProfile, trainingDays: number[], trainCount: number | null): UserProfile {
  const days = [...new Set(trainingDays)].sort((a, b) => a - b);
  const count = trainCount != null && trainCount >= MIN_DAYS && trainCount < Math.min(days.length, 7) ? trainCount : null;
  const next = { ...p, trainingDays: days, trainCount: count };
  return { ...next, daysPerWeek: chosenDays(next)?.length ?? null };
}

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
    sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: p.weightKg, activity: p.activity, goal: p.goal,
    level: p.level, trainingDays: p.trainingDays, trainCount: p.trainCount,
    daysPerWeek: p.daysPerWeek, place: p.place, units: p.units, onboardingComplete: p.onboardingComplete,
    // A list, not a map: saves merge nested maps key by key, which would keep a cleared swap.
    split: p.split, swaps: Object.entries(p.swaps).map(([slot, exerciseId]) => ({ slot, exerciseId })),
    // Every key is written, so a merge never keeps a value from the other mode.
    customTargets: p.customTargets == null ? null : {
      mode: p.customTargets.mode,
      calories: p.customTargets.mode === 'calories' ? p.customTargets.calories : null,
      proteinG: p.customTargets.proteinG,
      carbsG: p.customTargets.mode === 'macros' ? p.customTargets.carbsG : null,
      fatG: p.customTargets.mode === 'macros' ? p.customTargets.fatG : null,
    },
    rankingVersion: p.rankingVersion,
  };
}

const weekdays = (v: unknown): number[] | null => {
  if (!Array.isArray(v)) return null;
  const days = v.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) as number[];
  return days.length > 0 ? [...new Set(days)].sort((a, b) => a - b) : null;
};

function enumOrNull<T extends string>(values: readonly T[], v: unknown): T | null {
  return values.includes(v as T) ? (v as T) : null;
}
const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);

/** Reads a stored profile; unknown or missing values come back as null instead of crashing. */
export function profileFromMap(m: Record<string, unknown>): UserProfile {
  const age = num(m.age);
  const days = num(m.daysPerWeek);
  const count = num(m.trainCount);
  return {
    sex: enumOrNull(['MAN', 'WOMAN'] as const, m.sex),
    age: age == null ? null : Math.trunc(age),
    heightCm: num(m.heightCm),
    weightKg: num(m.weightKg),
    activity: enumOrNull(ACTIVITY_LEVELS, m.activity),
    goal: m.goal === 'GET_FIT' ? 'MAINTAIN' : enumOrNull(GOALS, m.goal),
    level: enumOrNull(LEVELS, m.level),
    trainingDays: weekdays(m.trainingDays),
    trainCount: count == null ? null : Math.trunc(count),
    daysPerWeek: days == null ? null : Math.trunc(days),
    place: enumOrNull(PLACES, m.place),
    units: enumOrNull(UNITS, m.units) ?? 'METRIC',
    onboardingComplete: m.onboardingComplete === true,
    split: enumOrNull(SPLITS, m.split),
    swaps: swapsFrom(m.swaps),
    customTargets: customTargetsFrom(m.customTargets),
    rankingVersion: num(m.rankingVersion),
  };
}

/** Reads stored custom targets; anything incomplete means "use the recommended ones". */
function customTargetsFrom(v: unknown): CustomTargets | null {
  if (!v || typeof v !== 'object') return null;
  const m = v as Record<string, unknown>;
  const protein = num(m.proteinG);
  if (m.mode === 'calories') {
    const calories = num(m.calories);
    return calories == null ? null : { mode: 'calories', calories, proteinG: protein };
  }
  if (m.mode === 'macros') {
    const carbs = num(m.carbsG);
    const fat = num(m.fatG);
    return protein == null || carbs == null || fat == null ? null : { mode: 'macros', proteinG: protein, carbsG: carbs, fatG: fat };
  }
  return null;
}

const SPLITS: readonly Split[] = ['full_body', 'upper_lower', 'arnold_upper_lower', 'ppl_upper_lower', 'arnold', 'ppl', 'lower_body_focus'];

/** Keeps only swaps with a known slot and an exercise id (stored as a list; a map is read too). */
function swapsFrom(v: unknown): Partial<Record<Slot, string>> {
  if (!v || typeof v !== 'object') return {};
  const entries: [unknown, unknown][] = Array.isArray(v)
    ? v.filter((x) => x && typeof x === 'object').map((x) => [(x as Record<string, unknown>).slot, (x as Record<string, unknown>).exerciseId])
    : Object.entries(v as Record<string, unknown>);
  const swaps: Partial<Record<Slot, string>> = {};
  for (const [slot, id] of entries) {
    if (typeof id !== 'string') continue;
    const known = slotOf(id);
    if (known != null && known === slot) swaps[known] = id;
  }
  return swaps;
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
  /** Calories burned on a normal day, daily life and planned lifting included (the "maintenance" level). */
  maintenance: number;
  /** Of which planned lifting, averaged over the week. */
  liftingKcal: number;
  /** The target was raised to the safety minimum (1,200 / 1,500 kcal). */
  atMinimum: boolean;
  /** The person typed these targets themselves. */
  custom: boolean;
  /** Safety rules the typed targets break, shown as warnings (empty when not custom). */
  warnings: CustomWarning[];
  /** What the engine recommends, to show next to typed targets and to reset to. */
  recommended: { calories: number; proteinG: number; carbsG: number; fatG: number };
}

/** One training day in the week. `dayIndex` runs 0 (Monday) to 6 (Sunday). */
export interface PlannedDay { dayIndex: number; title: string; focus: string }

export interface TrainingWeek {
  splitName: string;
  splitExplanation: string;
  days: PlannedDay[];
  setsAndReps: string;
  minutesPerSession: number;
  /** Daily steps and the cardio plan, one line each (gym plans). */
  extras: string[];
  /** The full generated week (gym plans): sessions, warm-ups, cardio. Null for home plans. */
  generated: WeekPlan | null;
}

const roundTo = (x: number, step: number) => roundInt(x / step) * step;

/** One line per broken safety rule, for typed targets. */
export const CUSTOM_WARNING: Record<CustomWarning, string> = {
  below_floor: 'This is under the safe minimum we use (1,200 kcal for women, 1,500 kcal for men). Eating this little for long can cost muscle, energy and health.',
  minor_deficit: "You're under 18, and this is less than your body uses. Eating in a deficit while you're still growing is best done with a doctor or dietitian.",
  underweight_deficit: 'Your weight is already low for your height, and this target makes you lose more. Please talk to a doctor before you do this.',
};

const ENGINE_ACTIVITY: Record<ActivityLevel, EngineActivity> = { SEDENTARY: 'sedentary', LIGHT: 'light', MODERATE: 'moderate', VERY: 'high' };

/** The profile's level in the program generator's terms (missing = beginner). */
export function engineLevel(p: UserProfile): EngineLevel {
  return ENGINE_LEVEL[p.level ?? 'BEGINNER'];
}

/** How many days a week the profile trains, or null when fewer than 2 are picked. */
export function planDays(p: UserProfile): number | null {
  return chosenDays(p)?.length ?? null;
}

/**
 * The plan's split and the splits its days allow, or null when there's nothing to change: a home
 * plan, or a profile a rebuild can't use yet (so a split change never saves without rebuilding).
 */
export function splitChoice(p: UserProfile | null): { current: Split; options: SplitOption[] } | null {
  if (!hasEverythingForPlan(p) || p.place === 'HOME') return null;
  const plan = gymPlan(p);
  const days = planDays(p);
  if (!plan || days == null) return null;
  return { current: plan.state.schedule.program.split, options: splitOptions(days) };
}

/** The generated gym plan for a profile, from the program generator. */
export function gymPlan(p: UserProfile): ReturnType<typeof buildPlan> | null {
  const days = chosenDays(p);
  if (!days || p.age == null || p.goal == null) return null;
  const splitFits = p.split != null && splitOptions(days.length).some((o) => o.split === p.split);
  return buildPlan({
    level: ENGINE_LEVEL[p.level ?? 'BEGINNER'],
    available: days as Weekday[],
    swaps: p.swaps,
    ...(splitFits ? { split: p.split! } : {}),
    goal: ENGINE_GOAL[p.goal],
    age: p.age,
  });
}

/**
 * Plans saved before the exercise ranking keep their exercises: each slot of the generated gym plan
 * whose ranked default differs from the old default is saved as the person's own swap, once.
 */
export function pinLegacyDefaults(p: UserProfile): UserProfile {
  if (p.rankingVersion != null) return p;
  const next = { ...p, rankingVersion: RANKING_VERSION };
  if (!hasEverythingForPlan(p) || p.place !== 'GYM') return next;
  const plan = gymPlan(p);
  if (!plan) return next;
  const level = engineLevel(p);
  const swaps = { ...p.swaps };
  for (const day of plan.state.schedule.cycle) {
    for (const { slot, exerciseId } of day.exercises) {
      if (swaps[slot] != null) continue;
      const old = legacyDefault(slot, level);
      if (old !== exerciseId) swaps[slot] = old;
    }
  }
  return { ...next, swaps };
}

/** A profile as read from storage, with plans saved before the ranking pinned. `pinned` = it changed and should be saved once. */
export function settleStoredProfile(p: UserProfile): { profile: UserProfile; pinned: boolean } {
  if (p.rankingVersion != null) return { profile: p, pinned: false };
  return { profile: pinLegacyDefaults(p), pinned: true };
}

/** Planned lifting minutes a week: the generated sessions at the gym, the simple estimate at home. */
function liftingMinutes(p: UserProfile): number {
  if (p.place === 'HOME') return (chosenDays(p)?.length ?? 0) * homeTraining(p).minutesPerSession;
  return gymPlan(p)?.week.liftingMinutesPerWeek ?? 0;
}

const exerciseName = (id: string) => CATALOG[id]?.name ?? id;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "10,000 steps a day" and the cardio, in words. */
function extrasOf(week: WeekPlan): string[] {
  const lines = [`${formatKcal(week.stepsPerDay)} steps a day, every day`];
  const after = week.days.flatMap((d) => d.cardio.filter((x) => x.when === 'after_lifting'));
  const rest = week.days.flatMap((d) => d.cardio.filter((x) => x.when === 'rest_day'));
  if (after.length === 0 && rest.length === 0) return lines;
  const parts: string[] = [];
  if (after.length > 0) parts.push(`${after[0].minutes} min after lifting (incline walk or stairs)`);
  if (rest.length > 0) parts.push(`${rest.map((x) => x.minutes).join(' / ')} min on ${rest.length === 1 ? DAY_NAMES[rest[0].weekday] : 'rest days'}`);
  lines.push(`Cardio, ${week.cardioMinPerWeek} min a week: ${parts.join(', ')}`);
  return lines;
}

/**
 * Turns a profile into a calorie target and a weekly training plan.
 * Pure functions: the same answers always give the same plan.
 */
export const PlanCalculator = {
  /** Goal engine: Mifflin-St Jeor, weekly rate per goal, lifting calories, safety floors. */
  nutrition(p: UserProfile): NutritionTargets {
    const exerciseKcalPerDay = liftingKcalPerDay(p.weightKg!, liftingMinutes(p));
    const t = computeTargets({
      sex: p.sex === 'WOMAN' ? 'female' : 'male',
      age: p.age!,
      weightKg: p.weightKg!,
      heightCm: p.heightCm!,
      activity: ENGINE_ACTIVITY[p.activity!],
      goal: ENGINE_GOAL[p.goal!],
      exerciseKcalPerDay,
    });
    const recommended = { calories: roundTo(t.calories, 10), proteinG: t.macros.proteinG, carbsG: t.macros.carbsG, fatG: t.macros.fatG };
    const common = { bmr: roundTo(t.bmr, 10), maintenance: roundTo(t.tdee, 10), liftingKcal: exerciseKcalPerDay, recommended };
    if (p.customTargets) {
      const c = applyCustomTargets({
        sex: p.sex === 'WOMAN' ? 'female' : 'male', age: p.age!, weightKg: p.weightKg!, heightCm: p.heightCm!,
        custom: p.customTargets, maintenanceKcal: t.tdee, recommendedProteinG: t.macros.proteinG,
      });
      return { ...common, calories: c.calories, proteinG: c.proteinG, carbsG: c.carbsG, fatG: c.fatG, atMinimum: false, custom: true, warnings: c.warnings };
    }
    return { ...common, ...recommended, atMinimum: t.notices.includes('calorie_floor'), custom: false, warnings: [] };
  },

  /** Gym: the program generator. Home: the Android app's simple plan (the generator is gym-only for now). */
  training(p: UserProfile): TrainingWeek {
    if (p.place === 'HOME') return homeTraining(p);
    const plan = gymPlan(p);
    if (!plan) return homeTraining(p);
    const { week } = plan;
    const sessions = week.days.filter((d) => d.session);
    const options = splitOptions(sessions.length);
    const split = options.find((o) => o.split === plan.state.schedule.program.split) ?? options[0];
    return {
      splitName: split.label,
      splitExplanation: split.description,
      days: sessions.map((d) => {
        const ex = d.session!.exercises.map((x) => exerciseName(x.exerciseId));
        return { dayIndex: d.weekday, title: d.session!.name, focus: `${ex.slice(0, 4).join(', ')}${ex.length > 4 ? ` + ${ex.length - 4} more` : ''}` };
      }),
      setsAndReps: '2 sets of 6 to 10 reps, each to failure (the last rep you can do with good form). When both sets reach 10, add weight',
      minutesPerSession: roundInt(week.liftingMinutesPerWeek / Math.max(sessions.length, 1)),
      extras: extrasOf(week),
      generated: week,
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

/** The Android app's simple plan, kept for home training. */
function homeTraining(p: UserProfile): TrainingWeek {
  const schedule = chosenDays(p) ?? DEFAULT_DAYS[3];
  const days = schedule.length;

  const fullBody: [string, string] = ['Full body', 'Squats, push-ups, rows and core'];
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

  const muscle = p.goal === 'BUILD_MUSCLE' || p.goal === 'GAIN_WEIGHT';
  const setsAndReps = muscle ? '3 to 4 sets of 8 to 12 reps, resting about 90 seconds'
    : p.goal === 'LOSE_FAT' ? '3 sets of 12 to 15 reps, with short rests of about 45 seconds'
      : '2 to 3 sets of 10 to 15 reps, resting about 60 seconds';

  return {
    splitName,
    splitExplanation: explanation,
    days: schedule.map((dayIndex, i) => ({ dayIndex, title: sessions[i][0], focus: sessions[i][1] })),
    setsAndReps,
    minutesPerSession: days <= 3 ? 50 : 45,
    extras: [],
    generated: null,
  };
}

/** Thousands separators, like Kotlin's NumberFormat.getIntegerInstance(). */
export function formatKcal(value: number): string {
  return Math.trunc(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function calorieReason(t: NutritionTargets, goal: Goal): string {
  const lifting = t.liftingKcal > 0 ? `, your training included` : '';
  const normal = `Your body uses about ${formatKcal(t.maintenance)} kcal on a normal day${lifting}.`;
  if (t.custom) return `${normal} You set this target yourself. We recommend ${formatKcal(t.recommended.calories)} kcal for your goal.`;
  if (t.atMinimum) return `${normal} We keep your target at a safe minimum, so you progress gently and stay energised.`;
  switch (goal) {
    case 'LOSE_FAT':
      return `${normal} Eating a little less than that means losing about 0.5% of your weight a week, without going hungry.`;
    case 'BUILD_MUSCLE':
      return `${normal} A small surplus gives your muscles what they need to grow, with little fat gain.`;
    case 'GAIN_WEIGHT':
      return `${normal} Eating more than that adds about 0.5% of your weight a week, mostly muscle if you train hard.`;
    case 'RECOMPOSITION':
      return t.calories < t.maintenance
        ? `${normal} A small deficit lets you lose fat while your training builds muscle.`
        : `${normal} Eating about that much lets your training build muscle while fat slowly goes down.`;
    case 'MAINTAIN':
      return `${normal} Eating about that much keeps your weight steady while you get fitter.`;
  }
}

/** 72.0 -> "72", 72.5 -> "72.5". */
export function formatNumber(value: number): string {
  const rounded = roundInt(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
