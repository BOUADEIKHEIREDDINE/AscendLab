import { generateProgram, programCycle, splitOptions, type ProgramInput } from '../program';
import {
  backToBackMuscles,
  chooseTrainingDays,
  longBreakTip,
  nextSession,
  planSchedule,
  replan,
  weekPreview,
  type Weekday,
} from '../schedule';

const MON = 0, TUE = 1, WED = 2, THU = 3, FRI = 4, SAT = 5, SUN = 6;
const ALL: Weekday[] = [MON, TUE, WED, THU, FRI, SAT, SUN];

describe('chooseTrainingDays', () => {
  it('tapped days are the training days (sorted, no duplicates)', () => {
    expect(chooseTrainingDays([FRI, MON, WED, MON])).toEqual([MON, WED, FRI]);
  });

  it('7 tapped days plan 6 and keep one rest day', () => {
    expect(chooseTrainingDays(ALL)).toEqual([MON, TUE, WED, THU, FRI, SAT]);
  });

  it.each([
    [ALL, 3, [MON, WED, FRI]],
    [ALL, 2, [MON, THU]],
    [[MON, TUE, WED, THU] as Weekday[], 2, [MON, THU]],
    [[MON, TUE, WED, SAT] as Weekday[], 3, [MON, WED, SAT]],
    [[MON, TUE, THU, FRI, SAT] as Weekday[], 4, [MON, TUE, THU, SAT]],
  ])('"only train N of them" picks the best-spaced days (%o, %i)', (available, count, expected) => {
    expect(chooseTrainingDays(available, count)).toEqual(expected);
  });

  it('rejects fewer than 2 days, more days than tapped, or a count outside 2-6', () => {
    expect(() => chooseTrainingDays([MON])).toThrow(RangeError);
    expect(() => chooseTrainingDays([MON, TUE], 3)).toThrow(RangeError);
    expect(() => chooseTrainingDays(ALL, 1)).toThrow(RangeError);
    expect(() => chooseTrainingDays(ALL, 7)).toThrow(RangeError);
    expect(() => chooseTrainingDays([MON, 9 as Weekday])).toThrow(RangeError);
  });
});

describe('programCycle', () => {
  it('3-day full body is A, B, A, B... (A/B/A then B/A/B weeks)', () => {
    expect(programCycle({ level: 'intermediate', daysPerWeek: 3 }).map((d) => d.name)).toEqual(['Full body A', 'Full body B']);
  });

  it('other programs cycle through their week', () => {
    const input: ProgramInput = { level: 'intermediate', daysPerWeek: 4 };
    expect(programCycle(input)).toEqual(generateProgram(input).days);
  });
});

describe('nextSession (a sequence, not a calendar)', () => {
  const cycle = programCycle({ level: 'intermediate', daysPerWeek: 4 });

  it('follows the order and wraps around', () => {
    expect([0, 1, 2, 3, 4].map((done) => nextSession(cycle, 0, done).name)).toEqual([
      'Upper A', 'Lower A', 'Upper B', 'Lower B', 'Upper A',
    ]);
  });

  it('a missed session is not skipped: the next training day gets it', () => {
    // Two sessions done, the third missed: the next training day is still the third session.
    expect(nextSession(cycle, 0, 2).name).toBe('Upper B');
  });
});

describe('backToBackMuscles', () => {
  const days = generateProgram({ level: 'intermediate', daysPerWeek: 6, split: 'ppl' }).days;

  it('push then pull is fine: front/side delts, then rear delts', () => {
    expect(backToBackMuscles(days[0], days[1])).toEqual([]);
  });

  it('flags muscles trained directly on both days', () => {
    const [a, b] = generateProgram({ level: 'intermediate', daysPerWeek: 2 }).days;
    expect(backToBackMuscles(a, b)).toEqual(expect.arrayContaining(['quads', 'hamstrings', 'chest', 'back']));
  });
});

describe('planSchedule', () => {
  const plan = (input: Omit<ProgramInput, 'daysPerWeek'>, available: Weekday[], count?: number) =>
    planSchedule({ ...input, available, count });

  it('derives the number of days from the tapped days', () => {
    expect(plan({ level: 'intermediate' }, [MON, WED, FRI]).program.split).toBe('full_body');
    expect(plan({ level: 'intermediate' }, [MON, TUE, THU, FRI, SAT]).program.split).toBe('arnold_upper_lower');
  });

  it('a beginner who taps 5-6 days gets a 5-6 day split, with the tip', () => {
    const p = plan({ level: 'beginner' }, [MON, TUE, WED, THU, FRI, SAT]);
    expect(p.program.split).toBe('arnold');
    expect(p.program.notices).toContain('beginner_many_days');
  });

  it.each([
    [2, [MON, THU]],
    [3, [MON, WED, FRI]],
    [4, [MON, TUE, THU, FRI]],
    [5, [MON, TUE, WED, FRI, SAT]],
    [6, [MON, TUE, WED, THU, FRI, SAT]],
  ] as [number, Weekday[]][])('well-spaced days never put the same muscle on back-to-back days (%i days)', (days, available) => {
    for (const { split } of splitOptions(days)) {
      const p = plan({ level: 'intermediate', split }, available);
      expect([split, p.backToBack]).toEqual([split, 0]);
      expect(p.notices).toEqual([]);
    }
  });

  it('women\'s 4-day focus: picks the session order that avoids back-to-back leg days', () => {
    const p = plan({ level: 'intermediate', focus: 'lower_body' }, [MON, TUE, THU, SAT]);
    expect(p.backToBack).toBe(0);
  });

  it('days that cannot avoid it get a tip, never a block', () => {
    const p = plan({ level: 'intermediate' }, [MON, TUE, WED]);
    expect(p.backToBack).toBeGreaterThan(0);
    expect(p.notices).toEqual(['back_to_back']);
  });

  it('"only train N of them" uses the best-spaced N', () => {
    const p = plan({ level: 'intermediate' }, ALL, 3);
    expect(p.trainingDays).toEqual([MON, WED, FRI]);
    expect(p.backToBack).toBe(0);
  });
});

describe('weekPreview', () => {
  it('3-day full body: A/B/A one week, B/A/B the next', () => {
    const p = planSchedule({ level: 'intermediate', available: [MON, WED, FRI] });
    const names = (done: number) => weekPreview(p, done).map(({ weekday, day }) => [weekday, day.name]);
    expect(names(0)).toEqual([[MON, 'Full body A'], [WED, 'Full body B'], [FRI, 'Full body A']]);
    expect(names(3)).toEqual([[MON, 'Full body B'], [WED, 'Full body A'], [FRI, 'Full body B']]);
  });
});

describe('replan (days, level, split or swaps change)', () => {
  const start = (input: Parameters<typeof planSchedule>[0], sessionsDone: number) => ({
    schedule: planSchedule(input),
    sessionsDone,
  });
  const nextName = (r: ReturnType<typeof replan>) => weekPreview(r.schedule, r.sessionsDone)[0].day.name;
  const ids = (r: ReturnType<typeof replan>) => r.schedule.cycle.flatMap((d) => d.exercises.map((e) => e.exerciseId));

  it('new weekdays, same sessions: the next session stays the one that was next', () => {
    const before = start({ level: 'intermediate', available: [MON, WED, FRI] }, 1); // A done, B next
    const r = replan(before, { level: 'intermediate', available: [TUE, THU, SAT] });
    expect(nextName(r)).toBe('Full body B');
    expect(r.schedule.trainingDays).toEqual([TUE, THU, SAT]);
  });

  it('keeps the order unless another start avoids back-to-back muscles', () => {
    const input = { level: 'intermediate' as const, focus: 'lower_body' as const };
    for (const done of [0, 1, 2, 3]) {
      const r = replan(start({ ...input, available: [MON, WED, FRI, SAT] }, done), { ...input, available: [MON, TUE, THU, SAT] });
      expect(r.schedule.backToBack).toBe(0);
    }
  });

  it('a different program starts from its first session', () => {
    const before = start({ level: 'intermediate', available: [MON, WED, FRI] }, 5);
    const available: Weekday[] = [MON, TUE, THU, FRI];
    const r = replan(before, { level: 'intermediate', available });
    expect(r.schedule.program.split).not.toBe('full_body');
    expect(r.schedule.offset).toBe(planSchedule({ level: 'intermediate', available }).offset);
    expect(r.sessionsDone).toBe(0);
  });

  it('a split that no longer fits the days falls back to the default, with a notice', () => {
    const before = start({ level: 'intermediate', available: [MON, TUE, WED, THU, FRI, SAT], split: 'ppl' }, 2);
    const r = replan(before, { level: 'intermediate', available: [MON, WED, FRI], split: 'ppl' });
    expect(r.schedule.program.split).toBe('full_body');
    expect(r.schedule.notices).toContain('split_reset');
  });

  it('swaps are kept; one the new level cannot use is ignored, then comes back', () => {
    const swaps = { chestPress: 'Barbell_Bench_Press_-_Medium_Grip' };
    const before = start({ level: 'intermediate', available: [MON, THU], swaps }, 0);
    expect(ids(replan(before, { level: 'intermediate', available: [MON, THU], swaps }))).toContain(swaps.chestPress);
    const asBeginner = replan(before, { level: 'beginner', available: [MON, THU], swaps });
    expect(ids(asBeginner)).not.toContain(swaps.chestPress);
    const back = replan(asBeginner, { level: 'intermediate', available: [MON, THU], swaps });
    expect(ids(back)).toContain(swaps.chestPress);
  });

  it('lists exercises with no logged weight, for find-your-weight', () => {
    const before = start({ level: 'intermediate', available: [MON, THU] }, 0);
    const logged = before.schedule.cycle[0].exercises.map((e) => e.exerciseId);
    const r = replan(before, { level: 'intermediate', available: [MON, WED, FRI], loggedExerciseIds: logged });
    expect(r.newExercises.length).toBeGreaterThan(0);
    expect(r.newExercises.some((id) => logged.includes(id))).toBe(false);
    expect(ids(r)).toEqual(expect.arrayContaining(r.newExercises));
  });
});

describe('longBreakTip', () => {
  it('shows after 2+ weeks without training', () => {
    expect(longBreakTip(13)).toBe(false);
    expect(longBreakTip(14)).toBe(true);
  });
});
