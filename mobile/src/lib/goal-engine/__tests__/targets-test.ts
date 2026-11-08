import { computeTargets, type TargetsInput } from '../targets';

// BMR 1780, sedentary TDEE 2136, BMI 24.7
const man: TargetsInput = {
  sex: 'male',
  weightKg: 80,
  heightCm: 180,
  age: 30,
  activity: 'sedentary',
  goal: 'maintain',
};

describe('computeTargets', () => {
  it('targets TDEE for maintenance', () => {
    const t = computeTargets(man);
    expect(t.bmr).toBe(1780);
    expect(t.tdee).toBe(2136);
    expect(t.weeklyRatePct).toBe(0);
    expect(t.calories).toBe(2136);
    expect(t.notices).toEqual([]);
  });

  it('uses a -0.5 %/week deficit by default to lose weight', () => {
    // moderate TDEE 2759, 0.005 * 80 * 7700 / 7 = 440
    const t = computeTargets({ ...man, activity: 'moderate', goal: 'lose_weight' });
    expect(t.weeklyRatePct).toBe(-0.5);
    expect(t.calories).toBe(2319);
  });

  it('uses a +0.25 %/week surplus by default for lean gain', () => {
    const t = computeTargets({ ...man, goal: 'lean_gain' });
    expect(t.weeklyRatePct).toBe(0.25);
    expect(t.calories).toBe(2356);
  });

  it('uses a +0.5 %/week surplus by default to gain weight', () => {
    const t = computeTargets({ ...man, goal: 'gain_weight' });
    expect(t.weeklyRatePct).toBe(0.5);
    expect(t.calories).toBe(2576);
  });

  it('keeps recomposition at maintenance when BMI is under 25', () => {
    expect(computeTargets({ ...man, goal: 'recomposition' }).weeklyRatePct).toBe(0);
  });

  it('uses a -0.25 %/week deficit for recomposition when BMI is 25 or more', () => {
    const t = computeTargets({ ...man, weightKg: 90, goal: 'recomposition' });
    expect(t.weeklyRatePct).toBe(-0.25);
  });

  it('uses a requested rate inside the allowed range', () => {
    const t = computeTargets({ ...man, activity: 'moderate', goal: 'lose_weight', weeklyRatePct: -0.75 });
    expect(t.weeklyRatePct).toBe(-0.75);
    expect(t.notices).toEqual([]);
  });

  it('clamps a requested rate to the allowed range', () => {
    const t = computeTargets({ ...man, goal: 'lose_weight', weeklyRatePct: -2 });
    expect(t.weeklyRatePct).toBe(-1);
    expect(t.notices).toContain('rate_clamped');
  });

  it('never goes under 1200 kcal for a woman', () => {
    // BMR 1007.75, TDEE 1209, -1 %/week = -550 kcal
    const t = computeTargets({
      sex: 'female',
      weightKg: 50,
      heightCm: 155,
      age: 60,
      activity: 'sedentary',
      goal: 'lose_weight',
      weeklyRatePct: -1,
    });
    expect(t.calories).toBe(1200);
    expect(t.notices).toContain('calorie_floor');
  });

  it('never goes under 1500 kcal for a man', () => {
    // BMR 1427.5, TDEE 1713, -1 %/week = -616 kcal
    const t = computeTargets({
      ...man,
      weightKg: 56,
      heightCm: 170,
      age: 40,
      goal: 'lose_weight',
      weeklyRatePct: -1,
    });
    expect(t.calories).toBe(1500);
    expect(t.notices).toContain('calorie_floor');
  });

  it('allows a target under BMR when above the sex floor', () => {
    // sedentary TDEE 2136 - 440 = 1696, under BMR 1780 but above 1500
    const t = computeTargets({ ...man, goal: 'lose_weight' });
    expect(t.calories).toBe(1696);
    expect(t.notices).toEqual([]);
  });

  it('warns when gaining faster than 0.5 %/week', () => {
    const t = computeTargets({ ...man, goal: 'gain_weight', weeklyRatePct: 0.75 });
    expect(t.weeklyRatePct).toBe(0.75);
    expect(t.notices).toEqual(['fast_gain']);
  });

  it('proposes no deficit to minors', () => {
    const t = computeTargets({ ...man, age: 16, goal: 'lose_weight' });
    expect(t.weeklyRatePct).toBe(0);
    expect(t.calories).toBe(t.tdee);
    expect(t.notices).toContain('minor_no_deficit');
  });

  it('still lets minors gain weight', () => {
    const t = computeTargets({ ...man, age: 16, goal: 'gain_weight' });
    expect(t.weeklyRatePct).toBe(0.5);
    expect(t.notices).toEqual([]);
  });

  it('refuses weight loss when BMI is under 18.5', () => {
    // BMI 17.3
    const t = computeTargets({ ...man, weightKg: 56, goal: 'lose_weight' });
    expect(t.weeklyRatePct).toBe(0);
    expect(t.calories).toBe(t.tdee);
    expect(t.notices).toContain('underweight_no_loss');
  });

  it('returns macros for the calorie target', () => {
    const t = computeTargets(man);
    expect(t.macros).toEqual({ proteinG: 144, fatG: 59, carbsG: 257 });
  });
});

describe('computeTargets: exercise calories', () => {
  const base = { sex: 'male', age: 21, weightKg: 73, heightCm: 186, activity: 'light', goal: 'gain_weight' } as const;

  it('adds the exercise calories to the daily burn and the target', () => {
    const without = computeTargets(base);
    const withLifting = computeTargets({ ...base, exerciseKcalPerDay: 113 });
    expect(withLifting.tdee - without.tdee).toBe(113);
    expect(withLifting.calories - without.calories).toBe(113);
  });

  it('rejects negative exercise calories', () => {
    expect(() => computeTargets({ ...base, exerciseKcalPerDay: -10 })).toThrow(RangeError);
  });
});
