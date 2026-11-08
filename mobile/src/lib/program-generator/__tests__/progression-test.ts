import { belowRange, canAddFindWeightSet, defaultIncrementKg, findWeight, nextLoadKg } from '../progression';

const BENCH = 'Barbell_Bench_Press_-_Medium_Grip';
const LEG_PRESS = 'Leg_Press';
const DB_PRESS = 'Dumbbell_Bench_Press';

describe('nextLoadKg (double progression)', () => {
  it('keeps the load until both sets reach 10 reps', () => {
    expect(nextLoadKg({ loadKg: 60, reps: [10, 8], exerciseId: BENCH })).toBe(60);
  });

  it('adds 2.5 kg on upper-body lifts when both sets reach 10 reps', () => {
    expect(nextLoadKg({ loadKg: 60, reps: [10, 10], exerciseId: BENCH })).toBe(62.5);
  });

  it('adds 5 kg on lower-body lifts when both sets reach 10 reps', () => {
    expect(nextLoadKg({ loadKg: 100, reps: [11, 10], exerciseId: LEG_PRESS })).toBe(105);
  });

  it('uses a custom increment when the equipment needs one', () => {
    expect(nextLoadKg({ loadKg: 12, reps: [10, 10], exerciseId: BENCH, incrementKg: 2 })).toBe(14);
  });

  it('uses the step of the exercise: dumbbells go up 2 kg', () => {
    expect(nextLoadKg({ loadKg: 20, reps: [10, 10], exerciseId: DB_PRESS })).toBe(22);
    expect(nextLoadKg({ loadKg: 20, reps: [5, 4], exerciseId: DB_PRESS, previousReps: [5, 5] })).toBe(18);
  });

  it('bodyweight exercises keep their load (no load rule yet)', () => {
    expect(nextLoadKg({ loadKg: 0, reps: [12, 11], exerciseId: 'Pullups' })).toBe(0);
  });

  it('rejects an unknown exercise', () => {
    expect(() => nextLoadKg({ loadKg: 10, reps: [10, 10], exerciseId: 'Nope' })).toThrow(RangeError);
  });

  it('keeps the load when no sets were logged', () => {
    expect(nextLoadKg({ loadKg: 40, reps: [], exerciseId: BENCH })).toBe(40);
  });
});

describe('reps under 6', () => {
  it('only the first set counts: later sets lose reps from fatigue', () => {
    expect(belowRange([5, 4])).toBe(true);
    expect(belowRange([6, 4])).toBe(false);
    expect(belowRange([])).toBe(false);
  });

  it('one low session keeps the load (a bad day)', () => {
    expect(nextLoadKg({ loadKg: 60, reps: [5, 4], exerciseId: BENCH })).toBe(60);
    expect(nextLoadKg({ loadKg: 60, reps: [5, 4], exerciseId: BENCH, previousReps: [7, 6] })).toBe(60);
  });

  it('two low sessions in a row: 1 step down at 4-5 reps, 2 steps at 0-3', () => {
    expect(nextLoadKg({ loadKg: 60, reps: [5, 4], exerciseId: BENCH, previousReps: [5, 5] })).toBe(57.5);
    expect(nextLoadKg({ loadKg: 100, reps: [3, 2], exerciseId: LEG_PRESS, previousReps: [4, 3] })).toBe(90);
    expect(nextLoadKg({ loadKg: 12, reps: [4, 3], exerciseId: BENCH, incrementKg: 2, previousReps: [5, 4] })).toBe(10);
  });

  it('never below 0 kg', () => {
    expect(nextLoadKg({ loadKg: 2, reps: [1], exerciseId: BENCH, incrementKg: 2, previousReps: [2] })).toBe(0);
  });
});

describe('defaultIncrementKg (load step per exercise)', () => {
  it('dumbbells go up 2 kg at a time', () => {
    expect(defaultIncrementKg('Hammer_Curls')).toBe(2);
    expect(defaultIncrementKg('Dumbbell_Bench_Press')).toBe(2);
  });

  it('kettlebells go up 4 kg', () => {
    expect(defaultIncrementKg('Kettlebell_One-Legged_Deadlift')).toBe(4);
  });

  it('barbells, machines and cables keep the region step: 2.5 kg upper, 5 kg lower', () => {
    expect(defaultIncrementKg('Barbell_Bench_Press_-_Medium_Grip')).toBe(2.5);
    expect(defaultIncrementKg('Triceps_Pushdown')).toBe(2.5);
    expect(defaultIncrementKg('Hack_Squat')).toBe(5);
    expect(defaultIncrementKg('Romanian_Deadlift')).toBe(5);
  });

  it('bodyweight exercises have no load step', () => {
    expect(defaultIncrementKg('Pullups')).toBe(0);
  });

  it('rejects an unknown exercise', () => {
    expect(() => defaultIncrementKg('Nope')).toThrow(RangeError);
  });
});

describe('findWeight (first sessions of an exercise)', () => {
  const step = (reps: number) => findWeight({ loadKg: 20, reps, incrementKg: 2 });

  it.each([6, 8, 10])('%i reps: the weight is found', (reps) => {
    expect(step(reps)).toEqual({ found: true, nextLoadKg: 20 });
  });

  it.each([
    [11, 22],
    [12, 22],
    [13, 24],
    [15, 24],
    [16, 26],
    [25, 26],
  ])('%i reps: go heavier to %i kg (more reps, bigger jump)', (reps, next) => {
    expect(step(reps)).toEqual({ found: false, nextLoadKg: next });
  });

  it.each([
    [5, 18],
    [4, 18],
    [3, 16],
    [0, 16],
  ])('%i reps: go lighter to %i kg', (reps, next) => {
    expect(step(reps)).toEqual({ found: false, nextLoadKg: next });
  });

  it('uses the exercise step: a lower-body machine jumps 5 kg per step', () => {
    expect(findWeight({ loadKg: 60, reps: 14, incrementKg: 5 })).toEqual({ found: false, nextLoadKg: 70 });
  });

  it('never goes below zero', () => {
    expect(findWeight({ loadKg: 2, reps: 1, incrementKg: 2 }).nextLoadKg).toBe(0);
  });

  it('rejects a missing load step', () => {
    expect(() => findWeight({ loadKg: 20, reps: 12, incrementKg: 0 })).toThrow(RangeError);
  });
});

describe('canAddFindWeightSet (extra sets in a find-weight session)', () => {
  it('allows up to 2 extra sets beyond the planned ones while the weight is not found', () => {
    expect(canAddFindWeightSet({ setsDone: 2, plannedSets: 2, found: false })).toBe(true);
    expect(canAddFindWeightSet({ setsDone: 3, plannedSets: 2, found: false })).toBe(true);
    expect(canAddFindWeightSet({ setsDone: 4, plannedSets: 2, found: false })).toBe(false);
  });

  it('no extra set once the weight is found, or before the planned sets are done', () => {
    expect(canAddFindWeightSet({ setsDone: 2, plannedSets: 2, found: true })).toBe(false);
    expect(canAddFindWeightSet({ setsDone: 1, plannedSets: 2, found: false })).toBe(false);
  });
});
