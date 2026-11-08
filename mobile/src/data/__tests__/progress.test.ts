import { generateProgram } from '../../lib/program-generator/program';
import { afterFindWeightSet, exercisePlan, restSecFor, sessionsByExercise, warmUpLines } from '../progress';
import type { LoggedSet, WorkoutRecord } from '../training';

const BENCH = 'Barbell_Bench_Press_-_Medium_Grip';
const DB_PRESS = 'Dumbbell_Bench_Press';
const target = { sets: 2, repMin: 6, repMax: 10, restSec: 180 };
const sets = (kg: number, ...reps: number[]): LoggedSet[] => reps.map((r) => ({ weightKg: kg, reps: r, type: 'NORMAL' }));

describe('exercisePlan: what to lift today', () => {
  test('every set at 10 reps: add one step', () => {
    const p = exercisePlan(BENCH, [sets(60, 10, 10)], target)!;
    expect(p.suggestedKg).toBe(62.5);
    expect(p.note).toContain('Add weight: 62.5 kg');
  });

  test('inside the range: same weight, beat the reps', () => {
    const p = exercisePlan(BENCH, [sets(60, 9, 8)], target)!;
    expect(p.suggestedKg).toBe(60);
    expect(p.note).toContain('Same weight');
  });

  test('one session under 6 reps keeps the weight; two in a row drop it', () => {
    expect(exercisePlan(BENCH, [sets(60, 5, 4), sets(60, 7, 6)], target)!.suggestedKg).toBe(60);
    const two = exercisePlan(BENCH, [sets(60, 5, 4), sets(60, 5, 5)], target)!;
    expect(two.suggestedKg).toBe(57.5);
    expect(two.note).toContain('Lower to 57.5 kg');
  });

  test('uses the exercise\'s own step (dumbbells: 2 kg) and ignores warm-up sets', () => {
    const last: LoggedSet[] = [{ weightKg: 16, reps: 5, type: 'WARMUP' }, ...sets(20, 10, 10)];
    expect(exercisePlan(DB_PRESS, [last], target)!.suggestedKg).toBe(22);
  });

  test('never logged: find your weight', () => {
    const p = exercisePlan(BENCH, [], target)!;
    expect(p.findWeight).toBe(true);
    expect(p.suggestedKg).toBeNull();
  });

  test('first exercise: a warm-up set at 80%, rounded to the load step', () => {
    expect(exercisePlan(BENCH, [sets(60, 10, 10)], target, true)!.warmUpKg).toBe(50);
    expect(exercisePlan(BENCH, [sets(60, 10, 10)], target)!.warmUpKg).toBeNull();
  });

  test('exercises outside the generator get no plan', () => {
    expect(exercisePlan('bench_press', [sets(60, 10, 10)], target)).toBeNull();
  });
});

describe('afterFindWeightSet: one set at a time', () => {
  const plan = exercisePlan(BENCH, [], target)!;

  test('6-10 reps: found', () => {
    const r = afterFindWeightSet(plan, 40, 8, 1);
    expect(r.found).toBe(true);
    expect(r.note).toContain('Found it: 40 kg');
  });

  test('too light or too heavy: the next weight, bigger jumps for more reps', () => {
    expect(afterFindWeightSet(plan, 40, 16, 1).nextKg).toBe(47.5);
    expect(afterFindWeightSet(plan, 40, 12, 1).nextKg).toBe(42.5);
    expect(afterFindWeightSet(plan, 40, 3, 1).nextKg).toBe(35);
  });

  test('up to 2 extra sets after the planned ones while not found', () => {
    expect(afterFindWeightSet(plan, 40, 14, 1).addSet).toBe(false);
    expect(afterFindWeightSet(plan, 40, 14, 2).addSet).toBe(true);
    expect(afterFindWeightSet(plan, 40, 14, 4).addSet).toBe(false);
    expect(afterFindWeightSet(plan, 40, 8, 2).addSet).toBe(false);
  });
});

describe('rest and warm-up', () => {
  test('rest matches what the generator plans for each exercise', () => {
    const days = generateProgram({ level: 'intermediate', daysPerWeek: 4 }).days;
    days.flatMap((d) => d.exercises).forEach((x) => expect(restSecFor(x.exerciseId)).toBe(x.restSec));
    expect(restSecFor('bench_press')).toBeNull();
  });

  test('the session warm-up in words', () => {
    const [lower, upper] = [generateProgram({ level: 'beginner', daysPerWeek: 2 }).days[0], generateProgram({ level: 'beginner', daysPerWeek: 4 }).days[0]];
    expect(warmUpLines(lower)[0]).toContain('easy cardio');
    expect(warmUpLines(upper).some((l) => l.includes('2 × 15'))).toBe(true);
  });

  test('history is grouped per exercise, newest first', () => {
    const w = (id: string, kg: number): WorkoutRecord => ({
      id, title: 'x', startedAt: 0, finishedAt: 0, durationSec: 0, volumeKg: 0, records: 0,
      exercises: [{ exerciseId: BENCH, name: 'Bench', sets: sets(kg, 8) }],
    });
    expect(sessionsByExercise([w('new', 62.5), w('old', 60)]).get(BENCH)!.map((s) => s[0].weightKg)).toEqual([62.5, 60]);
  });
});
