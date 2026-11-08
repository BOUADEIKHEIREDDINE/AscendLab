import { activityTargets, PREFERRED_CARDIO } from '../activity';

describe('activityTargets', () => {
  it('asks 10,000 steps a day when losing weight', () => {
    expect(activityTargets({ goal: 'lose_weight', age: 30 }).stepsPerDay).toBe(10000);
    expect(activityTargets({ goal: 'lose_weight', age: 65 }).stepsPerDay).toBe(10000);
  });

  it('asks 8,000 steps under 60 and 7,000 from 60 for other goals', () => {
    expect(activityTargets({ goal: 'lean_gain', age: 59 }).stepsPerDay).toBe(8000);
    expect(activityTargets({ goal: 'maintain', age: 60 }).stepsPerDay).toBe(7000);
  });

  it.each(['lose_weight', 'recomposition', 'maintain'] as const)('gives %s 150-300 min of moderate cardio a week', (goal) => {
    expect(activityTargets({ goal, age: 30 })).toMatchObject({ cardioMinPerWeek: 150, cardioMaxPerWeek: 300 });
  });

  it.each(['lean_gain', 'gain_weight'] as const)('gives %s no cardio by default (calorie surplus), up to 300 by choice', (goal) => {
    expect(activityTargets({ goal, age: 30 })).toMatchObject({ cardioMinPerWeek: 0, cardioMaxPerWeek: 300 });
  });

  it('prefers low-impact cardio to running, which can slow muscle growth', () => {
    expect(PREFERRED_CARDIO).not.toContain('running');
    expect(PREFERRED_CARDIO).toContain('cycling');
  });
});
