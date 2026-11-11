import {
  buildDay, clock, DayInput, makePlan, defaultSettings, defaultTrainingDays, estimateMinutes, mealBudget, nextRoutine, nowIndex, parseSettings, settingsFromProfile,
} from '../dayPlan';
import { defaultPrefs, nextIdeaIn, onTarget } from '../mealPlanner';
import { isVegan, RECIPES } from '../recipes';
import { Program, WorkoutRecord } from '../training';

const routine = (id: string, name: string, sets = 3) => ({ id, name, exercises: [{ exerciseId: 'x', name: 'Squat', sets, reps: 8 }, { exerciseId: 'y', name: 'Row', sets, reps: 8 }] });
const program: Program = { id: 'p', name: 'Upper / Lower', routines: [routine('u', 'Upper body'), routine('l', 'Lower body')], createdAt: 0 };
const workout = (title: string, finishedAt: Date, durationSec = 3300): WorkoutRecord =>
  ({ id: title + finishedAt.getTime(), title, startedAt: finishedAt.getTime() - durationSec * 1000, finishedAt: finishedAt.getTime(), durationSec, volumeKg: 0, records: 0, exercises: [] });

// Tuesday 10 November 2026, 14:10
const tuesday = new Date(2026, 10, 10, 14, 10);
const targets = { calories: 2400, protein: 140, carbs: 290, fat: 67 };
const blocksOf = (input: DayInput) => buildDay(input).blocks;

describe('My day', () => {
  test('clock and default settings', () => {
    expect(clock(8 * 60)).toBe('08:00');
    expect(clock(23 * 60 + 45)).toBe('23:45');
    expect(clock(-30)).toBe('23:30');
    expect(defaultTrainingDays(3)).toEqual([1, 3, 5]);
    expect(defaultTrainingDays(null)).toEqual([1, 3, 5]);
    expect(defaultTrainingDays(4)).toEqual([1, 2, 4, 5]);
  });

  test('saved settings are read safely', () => {
    expect(parseSettings(null)).toBeNull();
    expect(parseSettings('not json')).toBeNull();
    const s = parseSettings(JSON.stringify({ times: { lunch: 780, dinner: 99999 }, trainingDays: [5, 1, 1, 9] }))!;
    expect(s.times.lunch).toBe(780);
    expect(s.times.dinner).toBe(20 * 60); // invalid value: default kept
    expect(s.trainingDays).toEqual([1, 5]);
  });

  test('follows the program in order and estimates the length', () => {
    expect(nextRoutine(program, [])?.name).toBe('Upper body');
    expect(nextRoutine(program, [workout('Upper body', new Date(2026, 10, 8))])?.name).toBe('Lower body');
    expect(nextRoutine(program, [workout('Lower body', new Date(2026, 10, 8))])?.name).toBe('Upper body');
    expect(nextRoutine(null, [])).toBeNull();
    // No history: 6 sets x 3 min = 18 -> 20. With history: the average of past sessions.
    expect(estimateMinutes(program.routines[0], [])).toBe(20);
    expect(estimateMinutes(program.routines[0], [workout('Upper body', new Date(2026, 10, 8), 3300)])).toBe(55);
  });

  test('builds the day in time order, with what is done and what is next', () => {
    const blocks = blocksOf({
      date: tuesday, settings: defaultSettings(4), targets, goal: 'BUILD_MUSCLE',
      meals: [{ mealType: 'BREAKFAST', calories: 520, protein: 30, carbs: 60, fat: 15 }], history: [workout('Upper body', new Date(2026, 10, 9))], program,
      plan: { prefs: defaultPrefs('BUILD_MUSCLE'), choices: {} },
    });
    expect(blocks.map((b) => b.key)).toEqual(['breakfast', 'lunch', 'snack', 'workout', 'dinner', 'sleep']);
    expect(blocks[0]).toMatchObject({ done: true, detail: '520 kcal logged', recipe: null });
    // Breakfast came in under its 600 kcal budget, so the open meals share the rest:
    // (2400 - 520) x 0.35 / 0.75 = 877 -> 880 for lunch, more than the usual 840.
    expect(mealBudget(2400, 'LUNCH')).toBe(840);
    expect(blocks[1]).toMatchObject({ done: false, detail: 'About 880 kcal' });
    expect(blocks[1].recipe).not.toBeNull();
    // Tuesday is a training day with 4 days a week; yesterday was Upper body.
    expect(blocks[3]).toMatchObject({ title: 'Lower body', detail: 'About 20 min, 2 exercises', done: false });
    expect(blocks[5]).toMatchObject({ pillar: 'time', detail: '8.5 h of sleep before breakfast' });
    // 14:10: lunch (12:30) is behind, the snack (16:00) is next.
    expect(nowIndex(blocks, tuesday)).toBe(2);
  });

  test('rest days, finished workouts and short nights', () => {
    const base = { targets: null, goal: null, meals: [], program };
    const rest = blocksOf({ ...base, date: tuesday, settings: defaultSettings(3), history: [] });
    expect(rest.find((b) => b.key === 'workout')).toMatchObject({ restDay: true, title: 'Rest day' });
    expect(rest.find((b) => b.key === 'lunch')?.detail).toBe('Log what you eat');

    const trained = blocksOf({ ...base, date: tuesday, settings: defaultSettings(3), history: [workout('Upper body', new Date(2026, 10, 10, 7, 30), 3000)] });
    expect(trained.find((b) => b.key === 'workout')).toMatchObject({ done: true, title: 'Upper body', detail: 'Done in 50 min' });

    const late = defaultSettings(3);
    late.times.sleep = 2 * 60; // 02:00, breakfast at 08:00
    expect(blocksOf({ ...base, date: tuesday, settings: late, history: [] }).find((b) => b.key === 'sleep')?.detail)
      .toBe('Only 5.5 h of sleep before breakfast. Aim for 7 to 9');
  });
});

describe('meal plan', () => {
  const input: DayInput = { date: tuesday, settings: defaultSettings(3), targets, goal: 'LOSE_FAT', meals: [], history: [], program };
  const prefs = defaultPrefs('LOSE_FAT');
  const made = makePlan(input, prefs);
  const withPlan = (choices = made.choices, p = prefs) => buildDay({ ...input, plan: { prefs: p, choices } });
  const dinnerOf = (v: ReturnType<typeof buildDay>) => v.blocks.find((b) => b.key === 'dinner')!;

  test('no dish is suggested until the person asks for a plan', () => {
    const view = buildDay(input);
    expect(view.plan).toBeNull();
    expect(view.blocks.filter((b) => b.mealType).every((b) => b.recipe == null)).toBe(true);
    // The meals still show their usual budget.
    expect(view.blocks.find((b) => b.key === 'lunch')?.detail).toBe('About 840 kcal');
  });

  test('a new plan gives every meal a dish and meets the targets', () => {
    expect(Object.keys(made.choices).sort()).toEqual(['BREAKFAST', 'DINNER', 'LUNCH', 'SNACK']);
    const { plan } = withPlan();
    for (const k of ['calories', 'protein', 'carbs', 'fat'] as const) expect({ k, ok: onTarget(plan!.total[k], targets[k]) }).toEqual({ k, ok: true });
  });

  test('swapping a dish keeps the day on target: the other portions make up for it', () => {
    const dinner = dinnerOf(withPlan());
    // Every idea for dinner, swapped in, still gives a day within 10% on calories and each macro.
    for (const idea of dinner.ideas!.slice(0, 5)) {
      const { plan, blocks } = withPlan({ ...made.choices, DINNER: idea.id });
      expect(blocks.find((b) => b.key === 'dinner')?.recipe?.id).toBe(idea.id);
      for (const k of ['calories', 'protein', 'carbs', 'fat'] as const) expect({ k, ok: onTarget(plan!.total[k], targets[k]) }).toEqual({ k, ok: true });
    }
  });

  test('the dishes of a plan stay put from one render to the next', () => {
    const a = withPlan().blocks.map((b) => b.recipe?.id).join();
    const b = withPlan().blocks.map((x) => x.recipe?.id).join();
    expect(a).toBe(b);
    expect(dinnerOf(withPlan()).recipe?.id).toBe(made.choices.DINNER);
  });

  test('another idea moves through the ranked ideas and wraps around', () => {
    const ideas = dinnerOf(withPlan()).ideas!;
    expect(ideas.length).toBeGreaterThan(2);
    expect(ideas.every((r) => r.meals.includes('DINNER'))).toBe(true);
    expect(nextIdeaIn(ideas, ideas[0])?.id).toBe(ideas[1].id);
    expect(nextIdeaIn(ideas, ideas[ideas.length - 1])?.id).toBe(ideas[0].id);
  });

  test('a removed dish is left out of the targets, not counted as eaten', () => {
    const full = withPlan().plan!;
    const noDinner = withPlan({ ...made.choices, DINNER: null }).plan!;
    expect(dinnerOf(withPlan({ ...made.choices, DINNER: null })).recipe).toBeNull();
    expect(noDinner.target.calories).toBe(Math.round(targets.calories * 0.7));
    expect(onTarget(noDinner.total.calories, noDinner.target.calories)).toBe(true);
    expect(noDinner.total.calories).toBeLessThan(full.total.calories);
  });

  test('preferences: only the chosen meals are planned, and the diet is always kept', () => {
    const p = { ...prefs, meals: ['LUNCH', 'DINNER'] as const, diet: 'VEGAN' as const };
    const vegan = makePlan(input, { ...p, meals: [...p.meals] });
    expect(Object.keys(vegan.choices).sort()).toEqual(['DINNER', 'LUNCH']);
    const view = buildDay({ ...input, plan: vegan });
    expect(view.blocks.find((b) => b.key === 'breakfast')?.recipe).toBeNull();
    for (const id of Object.values(vegan.choices)) {
      expect(isVegan(RECIPES.find((x) => x.id === id)!)).toBe(true);
    }
    // Lunch and dinner carry their share of the day: 65% of the targets.
    expect(onTarget(view.plan!.total.calories, targets.calories * 0.65)).toBe(true);
  });

  test('a time limit is kept when there are enough quick recipes', () => {
    const quick = makePlan(input, { ...prefs, maxMinutes: 20 });
    for (const id of Object.values(quick.choices)) {
      const r = RECIPES.find((x) => x.id === id)!;
      expect(r.prepMin + r.cookMin).toBeLessThanOrEqual(20);
    }
  });
});

describe('settings from the profile', () => {
  test('uses the training days picked in onboarding (Monday = 0 there)', () => {
    // Monday, Wednesday and Saturday in the profile → 1, 3, 6 in Date.getDay() terms.
    expect(settingsFromProfile([0, 2, 5], 3).trainingDays).toEqual([1, 3, 6]);
    expect(settingsFromProfile([6], 1).trainingDays).toEqual([0]);
    expect(settingsFromProfile(null, 4).trainingDays).toEqual([1, 2, 4, 5]);
  });
});
