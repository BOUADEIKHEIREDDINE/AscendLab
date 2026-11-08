import { planCardio, type CardioPlan } from '../cardio';
import { planSchedule, weekPreview, type Weekday } from '../schedule';
import type { Goal } from '../../goal-engine/targets';

const MON = 0, TUE = 1, WED = 2, THU = 3, FRI = 4, SAT = 5, SUN = 6;

const plan = (goal: Goal, available: Weekday[], minutesPerWeek?: number, input = {}) =>
  planCardio({
    goal,
    week: weekPreview(planSchedule({ level: 'intermediate', available, ...input })),
    minutesPerWeek,
  });
const total = (p: CardioPlan) => p.days.reduce((s, d) => s + d.minutes, 0);
const minutes = (p: CardioPlan, when: 'after_lifting' | 'rest_day') =>
  p.days.filter((d) => d.when === when).map((d) => [d.weekday, d.minutes]);

describe('planCardio: losing weight, after lifting first', () => {
  it('3 days: 30 min after each session, 60 min over the rest days', () => {
    const p = plan('lose_weight', [MON, WED, FRI]);
    expect(minutes(p, 'after_lifting')).toEqual([[MON, 30], [WED, 30], [FRI, 30]]);
    expect(minutes(p, 'rest_day')).toEqual([[TUE, 15], [THU, 15], [SAT, 15], [SUN, 15]]);
  });

  it('2 days: 2 x 30 after lifting, 90 min over 5 rest days', () => {
    const p = plan('lose_weight', [MON, THU]);
    expect(minutes(p, 'after_lifting')).toEqual([[MON, 30], [THU, 30]]);
    expect(minutes(p, 'rest_day').map(([, m]) => m)).toEqual([20, 20, 20, 15, 15]);
  });

  it('5-6 days: all of it after lifting, never more than 30 min', () => {
    expect(minutes(plan('lose_weight', [MON, TUE, WED, FRI, SAT]), 'rest_day')).toEqual([]);
    const six = plan('lose_weight', [MON, TUE, WED, THU, FRI, SAT]);
    expect(minutes(six, 'after_lifting').map(([, m]) => m)).toEqual([25, 25, 25, 25, 25, 25]);
  });

  it('suggests incline walking or stairs after lifting, never running', () => {
    const [first] = plan('lose_weight', [MON, WED, FRI]).days;
    expect(first.types.slice(0, 2)).toEqual(['incline_walking', 'stair_climbing']);
    expect(first.types).not.toContain('running');
  });
});

describe('planCardio: other goals, rest days first', () => {
  it('3 days: everything on the 4 rest days, nothing after lifting', () => {
    const p = plan('lean_gain', [MON, WED, FRI]);
    expect(minutes(p, 'after_lifting')).toEqual([]);
    expect(minutes(p, 'rest_day')).toEqual([[TUE, 40], [THU, 40], [SAT, 35], [SUN, 35]]);
  });

  it('6 days: 60 on the rest day, the rest after upper-body sessions first', () => {
    const available: Weekday[] = [MON, TUE, WED, THU, FRI, SAT];
    const week = weekPreview(planSchedule({ level: 'intermediate', available, split: 'ppl' }));
    const p = planCardio({ goal: 'maintain', week });
    expect(minutes(p, 'rest_day')).toEqual([[SUN, 60]]);
    const after = p.days.filter((d) => d.when === 'after_lifting');
    expect(after.map((d) => d.minutes)).toEqual([30, 30, 30]);
    const upperDays = week.filter(({ day }) => !day.warmUp.cardioTip).map(({ weekday }) => weekday);
    expect(after.every((d) => upperDays.includes(d.weekday))).toBe(true);
  });
});

describe('planCardio: totals and limits', () => {
  it.each(['lose_weight', 'maintain'] as Goal[])('always places the whole weekly target (%s)', (goal) => {
    for (const days of [[MON, THU], [MON, WED, FRI], [MON, TUE, THU, FRI], [MON, TUE, WED, THU, FRI, SAT]] as Weekday[][]) {
      for (const m of [150, 225, 300]) expect(total(plan(goal, days, m))).toBe(m);
    }
  });

  it('above 150 min a week: a note that muscle gains may slow a little', () => {
    expect(plan('lose_weight', [MON, WED, FRI]).notices).toEqual([]);
    expect(plan('lose_weight', [MON, WED, FRI], 200).notices).toEqual(['more_cardio']);
  });

  it('0 min a week = no cardio at all', () => {
    expect(plan('gain_weight', [MON, WED, FRI], 0)).toEqual({ minutesPerWeek: 0, days: [], notices: [] });
  });

  it('rejects targets outside 150-300 min a week', () => {
    expect(() => plan('lose_weight', [MON, WED, FRI], 100)).toThrow(RangeError);
    expect(() => plan('lose_weight', [MON, WED, FRI], 301)).toThrow(RangeError);
  });
});
