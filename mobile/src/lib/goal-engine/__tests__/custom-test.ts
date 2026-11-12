import { applyCustomTargets, customTargetsError, type CustomInput } from '../custom';

const man: Omit<CustomInput, 'custom'> = {
  sex: 'male', age: 30, weightKg: 80, heightCm: 180, maintenanceKcal: 2700, recommendedProteinG: 144,
};

describe('applyCustomTargets, calories only', () => {
  it('keeps the recommended protein and fits fat and carbs to the calories', () => {
    const t = applyCustomTargets({ ...man, custom: { mode: 'calories', calories: 3000, proteinG: null } });
    expect(t.calories).toBe(3000);
    expect(t.proteinG).toBe(144);
    // Fat: 25 % of 3000 kcal = 83 g. Carbs: (3000 - 144*4 - 83.33*9) / 4 = 418.5
    expect(t.fatG).toBe(83);
    expect(t.carbsG).toBe(419);
    expect(t.warnings).toEqual([]);
  });

  it('uses a typed protein instead of the recommended one', () => {
    const t = applyCustomTargets({ ...man, custom: { mode: 'calories', calories: 3000, proteinG: 200 } });
    expect(t.proteinG).toBe(200);
    expect(t.carbsG).toBe(363);
  });

  it('keeps fat at least 0.6 g/kg when calories are low', () => {
    const t = applyCustomTargets({ ...man, custom: { mode: 'calories', calories: 1000, proteinG: null } });
    expect(t.fatG).toBe(48);
  });

  it('never gives negative carbs', () => {
    const t = applyCustomTargets({ ...man, custom: { mode: 'calories', calories: 1000, proteinG: 300 } });
    expect(t.carbsG).toBe(0);
  });
});

describe('applyCustomTargets, macros', () => {
  it('makes the calories the sum of the macros', () => {
    const t = applyCustomTargets({ ...man, custom: { mode: 'macros', proteinG: 180, carbsG: 300, fatG: 70 } });
    expect(t.calories).toBe(180 * 4 + 300 * 4 + 70 * 9);
    expect([t.proteinG, t.carbsG, t.fatG]).toEqual([180, 300, 70]);
  });
});

describe('applyCustomTargets, warnings (never blocks)', () => {
  it('warns under the 1,500 kcal floor for men and keeps the number', () => {
    const t = applyCustomTargets({ ...man, custom: { mode: 'calories', calories: 1400, proteinG: null } });
    expect(t.calories).toBe(1400);
    expect(t.warnings).toContain('below_floor');
  });

  it('uses the 1,200 kcal floor for women', () => {
    const woman = { ...man, sex: 'female' as const };
    expect(applyCustomTargets({ ...woman, custom: { mode: 'calories', calories: 1300, proteinG: null } }).warnings).not.toContain('below_floor');
    expect(applyCustomTargets({ ...woman, custom: { mode: 'calories', calories: 1100, proteinG: null } }).warnings).toContain('below_floor');
  });

  it('warns about a deficit under 18', () => {
    const t = applyCustomTargets({ ...man, age: 16, custom: { mode: 'calories', calories: 2400, proteinG: null } });
    expect(t.warnings).toEqual(['minor_deficit']);
  });

  it('warns about a deficit when underweight', () => {
    const t = applyCustomTargets({ ...man, weightKg: 55, custom: { mode: 'calories', calories: 2400, proteinG: null } });
    expect(t.warnings).toEqual(['underweight_deficit']);
  });

  it('does not warn a minor or underweight person who eats at or above maintenance', () => {
    const t = applyCustomTargets({ ...man, age: 16, weightKg: 55, custom: { mode: 'calories', calories: 2700, proteinG: null } });
    expect(t.warnings).toEqual([]);
  });
});

describe('customTargetsError', () => {
  it('accepts realistic numbers', () => {
    expect(customTargetsError({ mode: 'calories', calories: 2500, proteinG: null })).toBeNull();
    expect(customTargetsError({ mode: 'macros', proteinG: 150, carbsG: 250, fatG: 70 })).toBeNull();
  });

  it('catches typos, not choices', () => {
    expect(customTargetsError({ mode: 'calories', calories: 250, proteinG: null })).not.toBeNull();
    expect(customTargetsError({ mode: 'calories', calories: 25000, proteinG: null })).not.toBeNull();
    expect(customTargetsError({ mode: 'macros', proteinG: 150, carbsG: 2500, fatG: 70 })).not.toBeNull();
  });
});
