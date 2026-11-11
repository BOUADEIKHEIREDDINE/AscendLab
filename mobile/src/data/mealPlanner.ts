/**
 * Plans the day's meals so they add up to the person's targets: calories, protein, carbs
 * and fat.
 *
 * 1. Portions: each dish is scaled to its meal's calorie budget, in quarter servings
 *    ("1.5 servings"), so calories land on target whatever recipe is picked.
 * 2. Macros: calories alone don't make a balanced day. Among the recipes that suit each meal
 *    and the person's goal, the planner picks the combination whose protein, carbs and fat
 *    come closest to the targets, after counting what is already eaten or chosen.
 * 3. Variety: each day draws from a different handful of recipes per meal, so the plan
 *    changes from day to day while staying balanced.
 */
import { Goal } from './profile';
import { goalsFor, isVegan, isVegetarian, perServing, PriceTier, priceTier, Recipe, RECIPES, totalMinutes } from './recipes';
import { MEAL, MealType } from './social';

export type Macros = { calories: number; protein: number; carbs: number; fat: number };
export const ZERO: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export const PORTION_STEP = 0.25;
export const MIN_PORTION = 0.5;
export const MAX_PORTION = 2.5;
/** How many recipes per meal the planner weighs each day. */
const DAILY_CHOICE = 10;

export const add = (a: Macros, b: Macros): Macros =>
  ({ calories: a.calories + b.calories, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat });
const scale = (m: Macros, k: number): Macros => ({ calories: m.calories * k, protein: m.protein * k, carbs: m.carbs * k, fat: m.fat * k });
export const roundMacros = (m: Macros): Macros =>
  ({ calories: Math.round(m.calories), protein: Math.round(m.protein), carbs: Math.round(m.carbs), fat: Math.round(m.fat) });

/** Servings that bring a dish closest to a calorie budget, in quarter steps between ½ and 2½. */
export function portionFor(r: Recipe, budget: number): number {
  if (budget <= 0) return 1;
  const raw = budget / Math.max(perServing(r).calories, 1);
  const stepped = Math.round(raw / PORTION_STEP) * PORTION_STEP;
  return Math.min(MAX_PORTION, Math.max(MIN_PORTION, stepped));
}

export const macrosFor = (r: Recipe, portion: number): Macros => scale(perServing(r), portion);

/** "1 serving", "1.5 servings", "¾ serving". */
export function portionLabel(portion: number): string {
  const frac: Record<number, string> = { 0.5: '½', 0.75: '¾' };
  const n = frac[portion] ?? (Number.isInteger(portion) ? String(portion) : String(portion));
  return `${n} ${portion > 1 ? 'servings' : 'serving'}`;
}

/**
 * How far a day is from its targets: the squared relative gap of calories and each macro.
 * Missing protein counts a bit more, since it's the hardest to make up and matters for every goal.
 */
export function macroGap(total: Macros, target: Macros): number {
  const rel = (got: number, want: number) => (want > 0 ? (got - want) / want : 0);
  const p = rel(total.protein, target.protein);
  return rel(total.calories, target.calories) ** 2 + (p < 0 ? 1.5 : 1) * p ** 2
    + rel(total.carbs, target.carbs) ** 2 + rel(total.fat, target.fat) ** 2;
}

export type Diet = 'ANY' | 'VEGETARIAN' | 'VEGAN';

/**
 * What the person asks of today's plan. The goal sets which dishes suit them; the rest are
 * preferences, relaxed only when too few recipes would be left (never the diet).
 */
export type PlanPrefs = {
  goal: Goal | null;
  /** The meals to plan; the others are left to the person. */
  meals: MealType[];
  /** Longest total cooking time, 0 for any. */
  maxMinutes: number;
  /** Most expensive price tier, null for any. */
  maxPrice: PriceTier | null;
  diet: Diet;
};

export const defaultPrefs = (goal: Goal | null): PlanPrefs =>
  ({ goal, meals: ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'], maxMinutes: 0, maxPrice: null, diet: 'ANY' });

const MIN_CHOICE = 3;

/**
 * Recipes for this meal that respect the preferences and suit the goal. The diet is always
 * kept; the budget, then the time limit, are loosened if fewer than 3 dishes would be left.
 */
export function mealPool(type: MealType, goal: Goal | null, prefs?: Partial<PlanPrefs>): Recipe[] {
  const forDiet = RECIPES.filter((r) => r.meals.includes(type)
    && (prefs?.diet === 'VEGAN' ? isVegan(r) : prefs?.diet === 'VEGETARIAN' ? isVegetarian(r) : true));
  const quick = (r: Recipe) => !prefs?.maxMinutes || totalMinutes(r) <= prefs.maxMinutes;
  const cheap = (r: Recipe) => !prefs?.maxPrice || priceTier(r) <= prefs.maxPrice;
  const tiers = [forDiet.filter((r) => quick(r) && cheap(r)), forDiet.filter(quick), forDiet];
  const forMeal = tiers.find((t) => t.length >= MIN_CHOICE) ?? forDiet;
  // Balanced "Maintain" dishes suit every goal once their portion is set; the planner balances the day.
  const withGoal = goal ? forMeal.filter((r) => goalsFor(r).includes(goal) || goalsFor(r).includes('MAINTAIN')) : forMeal;
  return withGoal.length >= MIN_CHOICE ? withGoal : forMeal;
}

export type SlotInput = {
  type: MealType;
  budget: number;
  /** What was logged for this meal today, or null. */
  logged: Macros | null;
  /** A recipe id in the plan, null when the meal has no dish, undefined to let the planner choose. */
  choice: string | null | undefined;
};

export type PlannedMeal = {
  type: MealType;
  recipe: Recipe | null;
  portion: number;
  /** The dish's macros at that portion (zero when no dish). */
  macros: Macros;
  /** True for a dish already in the plan, false for a fresh suggestion. */
  chosen: boolean;
  /** Recipes that suit this meal, best fit for the rest of the day first (for "Another idea"). */
  ideas: Recipe[];
  /** The meal's calorie budget, adjusted for what the rest of the day already holds. */
  budget: number;
};

export type DayPlan = {
  meals: PlannedMeal[];
  /** Logged meals plus planned dishes. */
  total: Macros;
  /** The targets for those meals: the day's targets minus a fair share for any meal left without a dish. */
  target: Macros;
};

const allPortions = (() => {
  const out: number[] = [];
  for (let p = MIN_PORTION; p <= MAX_PORTION + 1e-9; p += PORTION_STEP) out.push(Math.round(p * 100) / 100);
  return out;
})();

/**
 * Plans the open meals of a day. Dishes already in the plan keep their recipe, but every
 * portion is set again so the whole day stays on its targets: swap one dish and the others
 * grow or shrink to make up for it.
 */
export function planMeals({ slots, target, goal, dayNumber, prefs }: {
  slots: SlotInput[]; target: Macros; goal: Goal | null; dayNumber: number; prefs?: Partial<PlanPrefs>;
}): DayPlan {
  const byId = (id: string) => RECIPES.find((r) => r.id === id) ?? null;
  const dish = (r: Recipe | null, portion: number) => ({ recipe: r, portion, macros: r ? macrosFor(r, portion) : ZERO });

  // What's settled: logged meals, and a stand-in for meals without a dish
  // (the person eats something of their own there, assumed to be a fair share of each target).
  let fixed = ZERO;
  let assumed = ZERO;
  const auto: number[] = [];
  const kept: number[] = [];
  slots.forEach((s, i) => {
    if (s.logged) fixed = add(fixed, s.logged);
    else if (s.choice === null || (typeof s.choice === 'string' && !byId(s.choice))) assumed = add(assumed, scale(target, MEAL[s.type].share));
    else if (typeof s.choice === 'string') kept.push(i);
    else auto.push(i);
  });
  const open = [...kept, ...auto];
  const goalFor = add(target, scale(assumed, -1));

  // Open meals share what's left of the day's calories, in proportion to their usual share:
  // a light lunch means a bigger dinner, a big one a lighter dinner.
  const openShare = open.reduce((a, i) => a + MEAL[slots[i].type].share, 0);
  const left = goalFor.calories - fixed.calories;
  const budgets = slots.map((s, i) => (open.includes(i) && target.calories > 0 && openShare > 0
    ? Math.max(0, Math.round((left * MEAL[s.type].share) / openShare / 10) * 10)
    : s.budget));

  const picks = slots.map((s, i) => {
    if (!kept.includes(i)) return dish(null, 1);
    const r = byId(s.choice as string)!;
    return dish(r, portionFor(r, budgets[i]));
  });

  // Each new meal weighs a daily handful of recipes that can reach its budget within the portion limits.
  const reachable = (r: Recipe, budget: number) => {
    if (budget <= 0) return true;
    const kcal = perServing(r).calories;
    return budget / kcal >= MIN_PORTION - PORTION_STEP / 2 && budget / kcal <= MAX_PORTION + PORTION_STEP / 2;
  };
  const candidates = new Map<number, Recipe[]>();
  for (const i of auto) {
    const pool = mealPool(slots[i].type, goal, prefs).filter((r) => reachable(r, budgets[i]));
    const start = pool.length > 0 ? (dayNumber * 7 + i * 3) % pool.length : 0;
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    // Late in the day, with one or two meals left to balance everything, search the whole pool.
    candidates.set(i, auto.length <= 2 ? rotated : rotated.slice(0, Math.min(DAILY_CHOICE, rotated.length)));
    // Start from the first recipe no other meal has yet: never the same dish twice in a day.
    const taken = new Set(picks.map((p) => p.recipe?.id).filter(Boolean));
    const first = rotated.find((r) => !taken.has(r.id)) ?? null;
    picks[i] = dish(first, first ? portionFor(first, budgets[i]) : 1);
  }

  const total = () => picks.reduce((a, p) => add(a, p.macros), fixed);
  const usedElsewhere = (i: number) => new Set(picks.filter((_, j) => j !== i && picks[j].recipe).map((p) => p.recipe!.id));
  /** Portions worth trying: a quarter either way of the budget, or any portion for a dish kept in the plan. */
  const portionsFor = (r: Recipe, i: number) => {
    if (kept.includes(i)) return allPortions;
    const base = portionFor(r, budgets[i]);
    return [base - PORTION_STEP, base, base + PORTION_STEP].filter((p) => p >= MIN_PORTION && p <= MAX_PORTION);
  };

  // Coordinate descent: improve one meal at a time, keeping the others, until nothing changes.
  if (target.calories > 0) {
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      for (const i of open) {
        const others = add(total(), scale(picks[i].macros, -1));
        const taken = usedElsewhere(i);
        let best = picks[i];
        let bestGap = macroGap(add(others, best.macros), goalFor);
        const options = kept.includes(i) ? [picks[i].recipe!] : candidates.get(i) ?? [];
        for (const r of options) {
          if (taken.has(r.id)) continue;
          for (const portion of portionsFor(r, i)) {
            if (r.id === best.recipe?.id && portion === best.portion) continue;
            const d = dish(r, portion);
            const gap = macroGap(add(others, d.macros), goalFor);
            if (gap < bestGap - 1e-9) { best = d; bestGap = gap; changed = true; }
          }
        }
        picks[i] = best;
      }
      if (!changed) break;
    }
  }

  // Ideas for each open meal, ranked by how well they'd fit with the rest of the day at their best portion.
  // "Another idea" only offers dishes that keep the whole day on target; if fewer than 3 do
  // (late in the day, say), it offers the closest few.
  const meals: PlannedMeal[] = slots.map((s, i) => {
    const isOpen = open.includes(i);
    const others = add(total(), scale(picks[i].macros, -1));
    const taken = usedElsewhere(i);
    const ranked = !isOpen ? [] : mealPool(s.type, goal, prefs)
      .filter((r) => !taken.has(r.id) && reachable(r, budgets[i]))
      .map((r) => {
        const base = portionFor(r, budgets[i]);
        const days = [base - PORTION_STEP, base, base + PORTION_STEP].filter((p) => p >= MIN_PORTION && p <= MAX_PORTION)
          .map((p) => add(others, macrosFor(r, p)));
        const best = days.reduce((a, d) => (macroGap(d, goalFor) < macroGap(a, goalFor) ? d : a));
        const fits = (['calories', 'protein', 'carbs', 'fat'] as const).every((k) => onTarget(best[k], goalFor[k]));
        return { r, gap: macroGap(best, goalFor), fits };
      })
      .sort((a, b) => a.gap - b.gap);
    const fitting = ranked.filter((x) => x.fits);
    const ideas = (fitting.length >= 3 ? fitting : ranked.slice(0, 5)).map((x) => x.r);
    return { type: s.type, ...picks[i], budget: budgets[i], chosen: kept.includes(i), ideas };
  });

  return { meals, total: roundMacros(total()), target: roundMacros(goalFor) };
}

/** The idea after `current` in a meal's ranked list, wrapping around. */
export function nextIdeaIn(ideas: Recipe[], current: Recipe | null): Recipe | null {
  if (ideas.length === 0) return null;
  const i = current ? ideas.findIndex((r) => r.id === current.id) : -1;
  return ideas[(i + 1) % ideas.length];
}

/** Within ±10% counts as on target: a day of real eating is never exact. */
export const onTarget = (got: number, want: number) => want <= 0 || Math.abs(got - want) <= want * 0.1;
