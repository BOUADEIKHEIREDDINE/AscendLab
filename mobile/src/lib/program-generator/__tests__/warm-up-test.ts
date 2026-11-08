import { CATALOG } from '../catalog';
import { generateProgram, splitOptions, type Level, type ProgramDay, type ProgramInput } from '../program';
import { WARM_UP_DRILLS, warmUpMinutes } from '../warm-up';

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
const DAYS = [2, 3, 4, 5, 6];
const everyInput: ProgramInput[] = LEVELS.flatMap((level) =>
  DAYS.flatMap((daysPerWeek) => [
    ...splitOptions(daysPerWeek).map(({ split }) => ({ level, daysPerWeek, split })),
    { level, daysPerWeek, focus: 'lower_body' as const },
  ]),
);
const everyDay: ProgramDay[] = everyInput.flatMap((input) => generateProgram(input).days);

const trainsUpperBody = (day: ProgramDay) =>
  day.exercises.some(({ exerciseId }) =>
    CATALOG[exerciseId].primary.some((m) => ['chest', 'back', 'shoulders', 'biceps', 'triceps'].includes(m)),
  );
const hasLowerCompound = (day: ProgramDay) =>
  day.exercises.some(({ exerciseId }) => {
    const { region, mechanic } = CATALOG[exerciseId];
    return region === 'lower' && mechanic === 'compound';
  });

const dayNamed = (input: ProgramInput, name: string) => {
  const day = generateProgram(input).days.find((d) => d.name === name);
  if (!day) throw new Error(`no day named ${name}`);
  return day;
};

describe('warm-up', () => {
  it('every session starts with an optional warm-up', () => {
    for (const day of everyDay) expect(day.warmUp.optional).toBe(true);
  });

  it('only the first exercise gets one warm-up set: 5 reps at 80% of the working load', () => {
    for (const day of everyDay) {
      const [first, ...rest] = day.exercises;
      expect(first.warmUpSet).toEqual({ reps: 5, loadFraction: 0.8 });
      for (const ex of rest) expect(ex.warmUpSet).toBeUndefined();
    }
  });

  it('rotator cuff drills come on every day that trains the upper body, and only then', () => {
    for (const day of everyDay) {
      expect(day.warmUp.rotatorCuff.length > 0).toBe(trainsUpperBody(day));
    }
  });

  it('rotator cuff drills are band external rotation and band pull-apart, 2 x 15, light', () => {
    const day = dayNamed({ level: 'intermediate', daysPerWeek: 6 }, 'Shoulders & arms');
    expect(day.warmUp.rotatorCuff.map((d) => d.exerciseId)).toEqual(['External_Rotation_with_Band', 'Band_Pull_Apart']);
    for (const drill of day.warmUp.rotatorCuff) {
      expect(drill).toMatchObject({ sets: 2, reps: 15, toFailure: false });
      expect(drill.alternatives.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('a legs day has no rotator cuff drills', () => {
    const day = dayNamed({ level: 'intermediate', daysPerWeek: 6 }, 'Legs');
    expect(day.warmUp.rotatorCuff).toEqual([]);
  });

  it('the easy-cardio tip shows only on days with a lower-body compound lift', () => {
    for (const day of everyDay) expect(day.warmUp.cardioTip).toBe(hasLowerCompound(day));
    expect(dayNamed({ level: 'intermediate', daysPerWeek: 6 }, 'Legs').warmUp.cardioTip).toBe(true);
    expect(dayNamed({ level: 'intermediate', daysPerWeek: 6 }, 'Shoulders & arms').warmUp.cardioTip).toBe(false);
  });

  it('every drill and alternative is a known warm-up exercise', () => {
    for (const day of everyDay) {
      for (const drill of day.warmUp.rotatorCuff) {
        for (const id of [drill.exerciseId, ...drill.alternatives]) expect(WARM_UP_DRILLS[id]).toBeDefined();
      }
    }
  });

  it('warm-up sets and drills do not count as weekly volume', () => {
    // Drills are not in the volume catalog, so sessionSets/weeklySets cannot see them.
    for (const id of Object.keys(WARM_UP_DRILLS)) expect(CATALOG[id]).toBeUndefined();
  });

  it('takes a few minutes: about 1-2 without drills, under 6 with them', () => {
    const legs = dayNamed({ level: 'intermediate', daysPerWeek: 6 }, 'Legs');
    const arms = dayNamed({ level: 'intermediate', daysPerWeek: 6 }, 'Shoulders & arms');
    expect(warmUpMinutes(legs)).toBeLessThanOrEqual(2);
    expect(warmUpMinutes(arms)).toBeGreaterThan(warmUpMinutes(legs));
    for (const day of everyDay) expect(warmUpMinutes(day)).toBeLessThan(6);
  });
});
