import { bmi, type BodyProfile } from './energy';
import { KCAL_PER_G, macrosWithProtein } from './macros';
import { ADULT_AGE, MIN_CALORIES, UNDERWEIGHT_BMI } from './targets';

/**
 * Targets the user typed instead of the recommended ones (decision 2026-11-12).
 * - calories: the calorie target; protein is the typed one or the recommended one, fat and carbs fit the rest.
 * - macros: protein, carbs and fat in grams; the calories are their sum.
 */
export type CustomTargets =
  | { mode: 'calories'; calories: number; proteinG: number | null }
  | { mode: 'macros'; proteinG: number; carbsG: number; fatG: number };

/**
 * The safety rules a typed target breaks. They are shown as warnings and never change the
 * number: the user's choice wins (decision 2026-11-12). The engine's own targets still obey them.
 * - below_floor: under 1,200 kcal (women) / 1,500 kcal (men)
 * - minor_deficit: under 18 and eating below maintenance
 * - underweight_deficit: BMI under 18.5 and eating below maintenance
 */
export type CustomWarning = 'below_floor' | 'minor_deficit' | 'underweight_deficit';

export type CustomInput = BodyProfile & {
  custom: CustomTargets;
  /** Calories burned on a normal day (TDEE, training included). */
  maintenanceKcal: number;
  /** Protein the engine recommends, used when only calories are typed. */
  recommendedProteinG: number;
};

export type AppliedTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  warnings: CustomWarning[];
};

export function applyCustomTargets(input: CustomInput): AppliedTargets {
  const { custom } = input;
  let calories: number;
  let grams: { proteinG: number; carbsG: number; fatG: number };
  if (custom.mode === 'macros') {
    grams = { proteinG: custom.proteinG, carbsG: custom.carbsG, fatG: custom.fatG };
    calories = custom.proteinG * KCAL_PER_G.protein + custom.carbsG * KCAL_PER_G.carbs + custom.fatG * KCAL_PER_G.fat;
  } else {
    calories = custom.calories;
    grams = macrosWithProtein(calories, custom.proteinG ?? input.recommendedProteinG, input.weightKg, input.heightCm);
  }

  const warnings: CustomWarning[] = [];
  const deficit = calories < input.maintenanceKcal;
  if (calories < MIN_CALORIES[input.sex]) warnings.push('below_floor');
  if (deficit && input.age < ADULT_AGE) warnings.push('minor_deficit');
  if (deficit && bmi(input.weightKg, input.heightCm) < UNDERWEIGHT_BMI) warnings.push('underweight_deficit');

  return { calories: Math.round(calories), ...grams, warnings };
}

/**
 * Typo protection only, not a safety rule: numbers no diet uses (e.g. 250 or 25,000 kcal).
 * Returns null when the numbers are fine, or a short message saying what to fix.
 */
export function customTargetsError(custom: CustomTargets): string | null {
  const grams = (g: number | null, name: string) =>
    g != null && !(g >= 0 && g <= 1000) ? `Enter ${name} between 0 and 1,000 g.` : null;
  if (custom.mode === 'calories') {
    if (!(custom.calories >= 500 && custom.calories <= 10000)) return 'Enter calories between 500 and 10,000 kcal.';
    return grams(custom.proteinG, 'protein');
  }
  return grams(custom.proteinG, 'protein') ?? grams(custom.carbsG, 'carbs') ?? grams(custom.fatG, 'fat');
}
