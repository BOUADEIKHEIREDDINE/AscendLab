/**
 * "My day": the three pillars of AscendLab on one timeline. Meals (Food), the workout
 * (Train) and sleep (Time) are placed at the person's own times, marked done as they log
 * them, and each upcoming meal comes with a recipe that fits its calorie budget.
 *
 * Times and training days are personal settings, kept on the device (see dayPlanRepo).
 */
import { Goal } from './profile';
import { DayPlan, Macros, PlanPrefs, planMeals } from './mealPlanner';
import { Recipe } from './recipes';
import { MEAL, MealType } from './social';
import { Program, Routine, WorkoutRecord } from './training';

export type Pillar = 'food' | 'train' | 'time';

/** Minutes after midnight for each part of the day. */
export type DayTimes = { breakfast: number; lunch: number; snack: number; workout: number; dinner: number; sleep: number };
export type TimeSlot = keyof DayTimes;

export type DaySettings = {
  times: DayTimes;
  /** Training days, 0 = Sunday … 6 = Saturday (like Date.getDay()). */
  trainingDays: number[];
};

export const TIME_SLOTS: { key: TimeSlot; label: string; pillar: Pillar }[] = [
  { key: 'breakfast', label: 'Breakfast', pillar: 'food' },
  { key: 'lunch', label: 'Lunch', pillar: 'food' },
  { key: 'snack', label: 'Snack', pillar: 'food' },
  { key: 'workout', label: 'Workout', pillar: 'train' },
  { key: 'dinner', label: 'Dinner', pillar: 'food' },
  { key: 'sleep', label: 'Bedtime', pillar: 'time' },
];

const hm = (h: number, m = 0) => h * 60 + m;
export const DEFAULT_TIMES: DayTimes = { breakfast: hm(8), lunch: hm(12, 30), snack: hm(16), workout: hm(18), dinner: hm(20), sleep: hm(23) };

/** Training days spread across the week, so there is always a rest day between hard sessions where possible. */
export function defaultTrainingDays(daysPerWeek: number | null): number[] {
  const spread: Record<number, number[]> = {
    1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6],
  };
  return spread[Math.min(Math.max(daysPerWeek ?? 3, 1), 7)];
}

export const defaultSettings = (daysPerWeek: number | null): DaySettings => ({ times: { ...DEFAULT_TIMES }, trainingDays: defaultTrainingDays(daysPerWeek) });

/**
 * Default settings from the profile: the training days picked in onboarding (0 = Monday, as
 * the profile stores them) when there are some, else days spread over the week.
 */
export const settingsFromProfile = (mondayFirstDays: number[] | null, daysPerWeek: number | null): DaySettings =>
  (mondayFirstDays && mondayFirstDays.length > 0
    ? { times: { ...DEFAULT_TIMES }, trainingDays: [...new Set(mondayFirstDays.map((d) => (d + 1) % 7))].sort() }
    : defaultSettings(daysPerWeek));

/** "08:00" */
export const clock = (minutes: number) => {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Reads saved settings, falling back to the default for anything missing or invalid. */
export function parseSettings(json: string | null): DaySettings | null {
  if (!json) return null;
  try {
    const d = JSON.parse(json) as Partial<DaySettings>;
    const times = { ...DEFAULT_TIMES };
    for (const { key } of TIME_SLOTS) {
      const v = d.times?.[key];
      if (typeof v === 'number' && v >= 0 && v < 1440) times[key] = v;
    }
    const days = Array.isArray(d.trainingDays) ? d.trainingDays.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6) : [];
    return { times, trainingDays: [...new Set(days)].sort() };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Building the day

/** The calorie budget for one meal, the same split as the calorie tracker. */
export const mealBudget = (target: number, type: MealType) => Math.trunc(Math.trunc(target * MEAL[type].share) / 10) * 10;

/** The routine after the last one done, so a program is followed in order. */
export function nextRoutine(program: Program | null, history: WorkoutRecord[]): Routine | null {
  const routines = program?.routines.filter((r) => r.exercises.length > 0) ?? [];
  if (routines.length === 0) return null;
  const last = history.find((w) => routines.some((r) => r.name === w.title));
  if (!last) return routines[0];
  const i = routines.findIndex((r) => r.name === last.title);
  return routines[(i + 1) % routines.length];
}

/** Typical length of a routine: its own past sessions if any, else about 3 minutes a set. */
export function estimateMinutes(routine: Routine, history: WorkoutRecord[]): number {
  const past = history.filter((w) => w.title === routine.name && w.durationSec > 0).slice(0, 5);
  const minutes = past.length > 0
    ? past.reduce((a, w) => a + w.durationSec, 0) / past.length / 60
    : routine.exercises.reduce((a, x) => a + x.sets, 0) * 3;
  return Math.max(10, Math.round(minutes / 5) * 5);
}

/**
 * The dish of each meal in a day's plan: a recipe id, or null when the meal has no dish.
 * Meals not in the map get a fresh suggestion.
 */
export type MealChoices = Partial<Record<MealType, string | null>>;

/** A plan the person asked for: what they want from it, and its dishes. */
export type DayPlanEntry = { prefs: PlanPrefs; choices: MealChoices };

export type DayBlock = {
  key: TimeSlot;
  pillar: Pillar;
  minute: number;
  title: string;
  detail: string;
  done: boolean;
  mealType?: MealType;
  recipe?: Recipe | null;
  /** True when the person picked the recipe, false for an automatic suggestion. */
  chosen?: boolean;
  /** Servings of the recipe, set so the day adds up to the targets. */
  portion?: number;
  /** The dish's calories and macros at that portion. */
  dish?: Macros;
  /** Other recipes for this meal, best fit first (for "Another idea"). */
  ideas?: Recipe[];
  /** The meal's calorie budget, 0 when unknown. */
  budget?: number;
  /** The routine to start, on a training day that hasn't been trained yet. */
  routine?: Routine | null;
  restDay?: boolean;
};

export type DayInput = {
  date: Date;
  settings: DaySettings;
  /** The day's targets, or null when the profile isn't complete. */
  targets: Macros | null;
  goal: Goal | null;
  /** Today's logged meals. */
  meals: ({ mealType: MealType } & Macros)[];
  /** Newest first. */
  history: WorkoutRecord[];
  program: Program | null;
  /** Today's meal plan, or null when the person hasn't asked for one: no dishes are suggested then. */
  plan?: DayPlanEntry | null;
};

const SLOT_MEAL: Partial<Record<TimeSlot, MealType>> = { breakfast: 'BREAKFAST', lunch: 'LUNCH', snack: 'SNACK', dinner: 'DINNER' };
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export type DayView = { blocks: DayBlock[]; plan: DayPlan | null };

export function buildDay({ date, settings, targets, goal, meals, history, program, plan: entry = null }: DayInput): DayView {
  const { times } = settings;
  const dayNumber = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 86_400_000);
  const blocks: DayBlock[] = [];

  // Meals: what's logged, what the person picked, and dishes planned to complete the day's targets.
  const slots = (['breakfast', 'lunch', 'snack', 'dinner'] as const).map((slot) => {
    const type = SLOT_MEAL[slot]!;
    const logged = meals.filter((m) => m.mealType === type);
    const sum = logged.reduce<Macros>((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein, carbs: a.carbs + m.carbs, fat: a.fat + m.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 });
    // Meals left out of the plan have no dish: the person eats their own thing there.
    const choice = entry && entry.prefs.meals.includes(type) ? entry.choices[type] : null;
    return { slot, type, budget: targets ? mealBudget(targets.calories, type) : 0, logged: logged.length > 0 ? sum : null, choice };
  });
  const plan = entry && targets
    ? planMeals({ slots, target: targets, goal: entry.prefs.goal ?? goal, dayNumber, prefs: entry.prefs })
    : null;
  slots.forEach((s, i) => {
    const m = plan?.meals[i];
    const budget = m?.budget ?? s.budget;
    const done = s.logged != null;
    blocks.push({
      key: s.slot, pillar: 'food', minute: times[s.slot], mealType: s.type, done, budget,
      title: MEAL[s.type].label,
      detail: done ? `${s.logged!.calories} kcal logged` : budget > 0 ? `About ${budget} kcal` : 'Log what you eat',
      recipe: m?.recipe ?? null, chosen: m?.chosen ?? false, portion: m?.portion ?? 1, dish: m?.macros, ideas: m?.ideas ?? [],
    });
  });

  const doneToday = history.find((w) => sameDay(new Date(w.finishedAt), date));
  if (doneToday) {
    blocks.push({ key: 'workout', pillar: 'train', minute: times.workout, done: true, title: doneToday.title, detail: `Done in ${Math.max(1, Math.round(doneToday.durationSec / 60))} min` });
  } else if (settings.trainingDays.includes(date.getDay())) {
    const routine = nextRoutine(program, history);
    blocks.push({
      key: 'workout', pillar: 'train', minute: times.workout, done: false, routine,
      title: routine?.name ?? 'Workout',
      detail: routine ? `About ${estimateMinutes(routine, history)} min, ${routine.exercises.length} exercises` : 'Pick a routine in Train',
    });
  } else {
    blocks.push({ key: 'workout', pillar: 'train', minute: times.workout, done: false, restDay: true, title: 'Rest day', detail: 'A 20-minute walk or a stretch helps you recover' });
  }

  // Sleep until 30 minutes before breakfast.
  const sleepMin = (times.breakfast - 30 - times.sleep + 1440 * 2) % 1440;
  const hours = Math.round((sleepMin / 60) * 2) / 2;
  blocks.push({
    key: 'sleep', pillar: 'time', minute: times.sleep, done: false, title: 'Bedtime',
    detail: hours >= 7 ? `${hours} h of sleep before breakfast` : `Only ${hours} h of sleep before breakfast. Aim for 7 to 9`,
  });

  return { blocks: blocks.sort((a, b) => a.minute - b.minute), plan };
}

/** Index of the first block still ahead, where the "now" marker goes (blocks.length when the day is over). */
export function nowIndex(blocks: DayBlock[], date: Date): number {
  const minute = date.getHours() * 60 + date.getMinutes();
  const i = blocks.findIndex((b) => b.minute > minute);
  return i === -1 ? blocks.length : i;
}

/**
 * Makes a new plan for the day from the person's preferences: the planner picks the dishes
 * that bring the day closest to its targets, and they are kept as the plan's dishes.
 */
export function makePlan(input: Omit<DayInput, 'plan'>, prefs: PlanPrefs): DayPlanEntry {
  const { plan } = buildDay({ ...input, plan: { prefs, choices: {} } });
  const choices: MealChoices = {};
  for (const m of plan?.meals ?? []) {
    if (prefs.meals.includes(m.type) && m.recipe) choices[m.type] = m.recipe.id;
  }
  return { prefs, choices };
}
