const PROTEIN_G_PER_KG = 1.8;
const FAT_SHARE_OF_CALORIES = 0.25;
const FAT_MIN_G_PER_KG = 0.6;
/** Above this BMI, per-kg targets use the weight at this BMI instead of actual weight. */
const REFERENCE_BMI_CAP = 30;

export const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 };

export type Macros = {
  proteinG: number;
  fatG: number;
  carbsG: number;
};

/** Weight used for per-kg macro targets: actual weight, capped at the weight for BMI 30. */
export function referenceWeightKg(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.min(weightKg, REFERENCE_BMI_CAP * heightM * heightM);
}

/** Daily macro targets in grams for a calorie target. */
export function macros(calories: number, weightKg: number, heightCm: number): Macros {
  return macrosWithProtein(calories, PROTEIN_G_PER_KG * referenceWeightKg(weightKg, heightCm), weightKg, heightCm);
}

/** Fat and carbs that fit a calorie target once protein (g) is fixed, e.g. typed by the user. */
export function macrosWithProtein(calories: number, proteinG: number, weightKg: number, heightCm: number): Macros {
  const refKg = referenceWeightKg(weightKg, heightCm);
  const fat = Math.max((FAT_SHARE_OF_CALORIES * calories) / KCAL_PER_G.fat, FAT_MIN_G_PER_KG * refKg);
  const carbs = Math.max(
    0,
    (calories - proteinG * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs,
  );
  return {
    proteinG: Math.round(proteinG),
    fatG: Math.round(fat),
    carbsG: Math.round(carbs),
  };
}
