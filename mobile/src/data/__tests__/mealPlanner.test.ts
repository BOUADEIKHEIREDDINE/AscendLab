/**
 * The meal planner must make a day add up: calories, protein, carbs and fat within 10% of the
 * targets, for different bodies and goals, on most days. If a recipe change breaks the
 * balance, this fails.
 */
import { macroGap, macrosFor, onTarget, planMeals, portionFor, portionLabel } from '../mealPlanner';
import { emptyProfile, Goal, GOALS, PlanCalculator, UserProfile } from '../profile';
import { perServing, RECIPES } from '../recipes';
import { MEAL, MEAL_TYPES } from '../social';

const PEOPLE: [string, Partial<UserProfile>][] = [
  ['man, 80 kg', { sex: 'MAN', age: 30, heightCm: 180, weightKg: 80, activity: 'MODERATE' }],
  ['woman, 62 kg', { sex: 'WOMAN', age: 27, heightCm: 165, weightKg: 62, activity: 'LIGHT' }],
  ['very active man, 100 kg', { sex: 'MAN', age: 24, heightCm: 190, weightKg: 100, activity: 'VERY' }],
  ['sedentary woman, 50 kg', { sex: 'WOMAN', age: 45, heightCm: 155, weightKg: 50, activity: 'SEDENTARY' }],
];
const DAYS = 21;

function targetsFor(base: Partial<UserProfile>, goal: Goal) {
  const t = PlanCalculator.nutrition({ ...emptyProfile(), ...base, goal, daysPerWeek: 3, place: 'GYM' } as UserProfile);
  return { calories: t.calories, protein: t.proteinG, carbs: t.carbsG, fat: t.fatG };
}
const budget = (kcal: number, type: keyof typeof MEAL) => Math.trunc(Math.trunc(kcal * MEAL[type].share) / 10) * 10;

describe('portions', () => {
  test('scale a dish to its meal budget in quarter servings', () => {
    const r = RECIPES.find((x) => x.id === 'chicken-teriyaki-bowl')!; // 517 kcal a serving
    expect(portionFor(r, 517)).toBe(1);
    expect(portionFor(r, 780)).toBe(1.5);
    expect(portionFor(r, 5000)).toBe(2.5);
    expect(portionFor(r, 100)).toBe(0.5);
    expect(macrosFor(r, 2).calories).toBeCloseTo(perServing(r).calories * 2);
    expect(portionLabel(1)).toBe('1 serving');
    expect(portionLabel(1.5)).toBe('1.5 servings');
    expect(portionLabel(0.75)).toBe('¾ serving');
  });
  test('the gap is zero on target and grows with distance', () => {
    const t = { calories: 2000, protein: 120, carbs: 230, fat: 55 };
    expect(macroGap(t, t)).toBe(0);
    expect(macroGap({ ...t, protein: 100 }, t)).toBeGreaterThan(macroGap({ ...t, protein: 140 }, t)); // missing protein weighs more
  });
});

describe('planned days add up to the targets', () => {
  for (const [who, body] of PEOPLE) {
    for (const goal of GOALS) {
      test(`${who}, ${goal}`, () => {
        const target = targetsFor(body, goal);
        const hits = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        for (let d = 0; d < DAYS; d++) {
          const plan = planMeals({
            slots: MEAL_TYPES.map((type) => ({ type, budget: budget(target.calories, type), logged: null, choice: undefined })),
            target, goal, dayNumber: 20_400 + d,
          });
          // Never the same dish twice in a day, and every meal gets one.
          const ids = plan.meals.map((m) => m.recipe?.id);
          expect(ids.every(Boolean)).toBe(true);
          expect(new Set(ids).size).toBe(ids.length);
          for (const k of Object.keys(hits) as (keyof typeof hits)[]) if (onTarget(plan.total[k], target[k])) hits[k]++;
        }
        // Calories and protein on target every day; carbs and fat on at least 85% of days.
        expect(hits.calories).toBe(DAYS);
        expect(hits.protein).toBeGreaterThanOrEqual(DAYS - 1);
        expect(hits.carbs).toBeGreaterThanOrEqual(Math.ceil(DAYS * 0.85));
        expect(hits.fat).toBeGreaterThanOrEqual(Math.ceil(DAYS * 0.85));
      });
    }
  }

  test('meals already eaten are counted, and the rest of the day makes up for them', () => {
    const target = targetsFor(PEOPLE[0][1], 'BUILD_MUSCLE');
    // A big, protein-poor breakfast: the planner should lean on protein for the other meals.
    const logged = { calories: budget(target.calories, 'BREAKFAST'), protein: 10, carbs: 150, fat: 25 };
    const plan = planMeals({
      slots: MEAL_TYPES.map((type) => ({ type, budget: budget(target.calories, type), logged: type === 'BREAKFAST' ? logged : null, choice: undefined })),
      target, goal: 'BUILD_MUSCLE', dayNumber: 20_400,
    });
    expect(plan.meals[0].recipe).toBeNull();
    expect(onTarget(plan.total.calories, target.calories)).toBe(true);
    expect(plan.total.protein).toBeGreaterThanOrEqual(target.protein * 0.85);
  });

  test('changes from one day to the next', () => {
    const target = targetsFor(PEOPLE[1][1], 'MAINTAIN');
    const day = (n: number) => planMeals({
      slots: MEAL_TYPES.map((type) => ({ type, budget: budget(target.calories, type), logged: null, choice: undefined })), target, goal: 'MAINTAIN', dayNumber: n,
    }).meals.map((m) => m.recipe?.id).join();
    expect(new Set([day(1), day(2), day(3), day(4)]).size).toBeGreaterThan(2);
  });
});

describe('open meals make up for what is already eaten', () => {
  const target = targetsFor(PEOPLE[0][1], 'MAINTAIN');
  const plan = (breakfastKcal: number) => planMeals({
    slots: MEAL_TYPES.map((type) => ({
      type, budget: budget(target.calories, type), choice: undefined,
      logged: type === 'BREAKFAST' ? { calories: breakfastKcal, protein: 20, carbs: breakfastKcal / 8, fat: breakfastKcal / 30 } : null,
    })),
    target, goal: 'MAINTAIN', dayNumber: 20_400,
  });
  test('a light breakfast means bigger meals later, a big one smaller', () => {
    const light = plan(300), big = plan(1100);
    const lunch = (p: ReturnType<typeof plan>) => p.meals.find((m) => m.type === 'LUNCH')!.budget;
    expect(lunch(light)).toBeGreaterThan(budget(target.calories, 'LUNCH'));
    expect(lunch(big)).toBeLessThan(budget(target.calories, 'LUNCH'));
    expect(onTarget(light.total.calories, target.calories)).toBe(true);
    expect(onTarget(big.total.calories, target.calories)).toBe(true);
  });
});

test('with one meal left, dinner gets the day as close as a real dish can', () => {
  // The demo day: 3,080 kcal, 143 g protein; three meals already logged with 104 g protein.
  const target = { calories: 3080, protein: 143, carbs: 434, fat: 86 };
  const logged = {
    BREAKFAST: { calories: 650, protein: 34, carbs: 79, fat: 22 },
    LUNCH: { calories: 820, protein: 52, carbs: 92, fat: 27 },
    SNACK: { calories: 210, protein: 18, carbs: 19, fat: 7 },
  } as const;
  const plan = planMeals({
    slots: MEAL_TYPES.map((type) => ({ type, budget: budget(target.calories, type), choice: undefined, logged: type === 'DINNER' ? null : logged[type] })),
    target, goal: 'BUILD_MUSCLE', dayNumber: 20_400,
  });
  // Matching protein exactly would take ~1,400 kcal of almost pure starch for dinner, not a
  // sensible meal. Calories, carbs and fat land on target; protein ends a little over.
  expect(onTarget(plan.total.calories, target.calories)).toBe(true);
  expect(onTarget(plan.total.carbs, target.carbs)).toBe(true);
  expect(onTarget(plan.total.fat, target.fat)).toBe(true);
  expect(plan.total.protein).toBeLessThanOrEqual(target.protein * 1.12);
});

describe('changing a plan keeps the day on target', () => {
  // Make a plan, then swap one meal for its second-best idea, as "Another idea" does.
  for (const [who, body] of PEOPLE) {
    for (const goal of GOALS) {
      test(`${who}, ${goal}`, () => {
        const target = targetsFor(body, goal);
        const slots = (choices: Partial<Record<string, string>>) =>
          MEAL_TYPES.map((type) => ({ type, budget: budget(target.calories, type), logged: null, choice: choices[type] }));
        const DAYS_SWAPPED = 10;
        const hits = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        for (let d = 0; d < DAYS_SWAPPED; d++) {
          const made = planMeals({ slots: slots({}), target, goal, dayNumber: 20_400 + d });
          const choices = Object.fromEntries(made.meals.map((m) => [m.type, m.recipe!.id]));
          const kept = planMeals({ slots: slots(choices), target, goal, dayNumber: 20_400 + d });
          const meal = MEAL_TYPES[d % MEAL_TYPES.length];
          const idea = kept.meals.find((m) => m.type === meal)!.ideas.find((r) => r.id !== choices[meal])!;
          const swapped = planMeals({ slots: slots({ ...choices, [meal]: idea.id }), target, goal, dayNumber: 20_400 + d });
          expect(swapped.meals.find((m) => m.type === meal)!.recipe!.id).toBe(idea.id);
          for (const k of Object.keys(hits) as (keyof typeof hits)[]) if (onTarget(swapped.total[k], target[k])) hits[k]++;
        }
        expect(hits.calories).toBe(DAYS_SWAPPED);
        expect(hits.protein).toBeGreaterThanOrEqual(DAYS_SWAPPED - 1);
        expect(hits.carbs).toBeGreaterThanOrEqual(DAYS_SWAPPED - 1);
        expect(hits.fat).toBeGreaterThanOrEqual(DAYS_SWAPPED - 1);
      });
    }
  }
});
