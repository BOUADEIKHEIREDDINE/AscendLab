import { buildPlan, buildWeek } from '../plan';
import { replan, type Weekday } from '../schedule';

const MON = 0, TUE = 1, WED = 2, THU = 3, FRI = 4, SAT = 5, SUN = 6;
const MWF: Weekday[] = [MON, WED, FRI];

describe('buildPlan', () => {
  const { state, week } = buildPlan({ level: 'beginner', available: MWF, goal: 'lose_weight', age: 30 });

  it('returns Monday to Sunday: sessions on the training days, rest days without one', () => {
    expect(week.days.map((d) => d.weekday)).toEqual([MON, TUE, WED, THU, FRI, SAT, SUN]);
    expect(week.days.map((d) => d.session?.name ?? null)).toEqual([
      'Full body A', null, 'Full body B', null, 'Full body A', null, null,
    ]);
  });

  it('adds the cardio of each day: after lifting when losing weight', () => {
    expect(week.days.map((d) => d.minutes.cardio)).toEqual([30, 15, 30, 15, 30, 15, 15]);
    expect(week.days[MON].cardio[0].when).toBe('after_lifting');
    expect(week.cardioMinPerWeek).toBe(150);
  });

  it('gives the warm-up and lifting time apart (the warm-up is optional)', () => {
    const mon = week.days[MON];
    expect(mon.minutes.lifting).toBeGreaterThan(40);
    expect(mon.minutes.warmUp).toBeGreaterThan(0);
    expect(week.days[TUE].minutes).toEqual({ warmUp: 0, lifting: 0, cardio: 15 });
  });

  it('sums the lifting minutes of the week, for the calories', () => {
    expect(week.liftingMinutesPerWeek).toBe(week.days.reduce((s, d) => s + d.minutes.lifting, 0));
    expect(week.liftingMinutesPerWeek).toBeGreaterThan(150);
  });

  it('includes the daily steps and the state to store', () => {
    expect(week.stepsPerDay).toBe(10000);
    expect(state.sessionsDone).toBe(0);
    expect(state.schedule.trainingDays).toEqual(MWF);
  });

  it('collects every notice: program, schedule and cardio', () => {
    const p = buildPlan({
      level: 'beginner',
      available: [MON, TUE, WED, THU, FRI, SAT],
      goal: 'maintain',
      age: 30,
      cardioMinPerWeek: 200,
    });
    expect(p.week.notices).toEqual(expect.arrayContaining(['beginner_many_days', 'more_cardio']));
    expect(p.week.stepsPerDay).toBe(8000);
  });
});

describe('buildPlan: gaining weight', () => {
  it('no cardio by default (calorie surplus); steps stay', () => {
    const { week } = buildPlan({ level: 'intermediate', available: [MON, TUE, WED, THU, FRI, SAT, SUN], goal: 'gain_weight', age: 21 });
    expect(week.cardioMinPerWeek).toBe(0);
    expect(week.days.every((d) => d.cardio.length === 0)).toBe(true);
    expect(week.stepsPerDay).toBe(8000);
  });

  it('cardio can still be added by choice', () => {
    const { week } = buildPlan({ level: 'intermediate', available: MWF, goal: 'lean_gain', age: 21, cardioMinPerWeek: 150 });
    expect(week.days.reduce((s, d) => s + d.minutes.cardio, 0)).toBe(150);
  });
});

describe('buildWeek', () => {
  it('the next week continues the order (B/A/B after A/B/A)', () => {
    const { state } = buildPlan({ level: 'intermediate', available: MWF, goal: 'maintain', age: 65 });
    const next = buildWeek({ ...state, sessionsDone: 3 }, { goal: 'maintain', age: 65 });
    expect(next.days.filter((d) => d.session).map((d) => d.session!.name)).toEqual([
      'Full body B', 'Full body A', 'Full body B',
    ]);
    expect(next.stepsPerDay).toBe(7000);
  });

  it('works on a re-planned state', () => {
    const { state } = buildPlan({ level: 'intermediate', available: MWF, goal: 'lose_weight', age: 30 });
    const r = replan({ ...state, sessionsDone: 1 }, { level: 'intermediate', available: [TUE, THU, SAT] });
    const week = buildWeek(r, { goal: 'lose_weight', age: 30 });
    expect(week.days[TUE].session?.name).toBe('Full body B');
    expect(week.days[MON].session).toBeNull();
  });
});
