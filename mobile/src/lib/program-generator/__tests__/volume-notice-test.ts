import { generateProgram, splitOptions, type Level } from '../program';
import { volumeNotices, type VolumeSession } from '../volume-notice';

const session = (exercises: [string, number][], timesPerWeek = 1): VolumeSession => ({
  exercises: exercises.map(([exerciseId, sets]) => ({ exerciseId, sets })),
  timesPerWeek,
});

describe('volumeNotices', () => {
  const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
  const inputs = LEVELS.flatMap((level) =>
    [2, 3, 4, 5, 6].flatMap((daysPerWeek) => splitOptions(daysPerWeek).map(({ split }) => ({ level, daysPerWeek, split }))),
  );

  it.each(inputs)('gives no notice for an unchanged plan (%o)', (input) => {
    const sessions = generateProgram(input).days.map((d) => ({
      exercises: d.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets })),
      timesPerWeek: 1,
    }));
    expect(volumeNotices(sessions, sessions, input.daysPerWeek)).toEqual([]);
  });

  it('flags a muscle pushed above the weekly top', () => {
    const before = [session([['Butterfly', 12]])];
    const after = [session([['Butterfly', 12], ['Dumbbell_Flyes', 2]])];
    expect(volumeNotices(before, after, 3)).toEqual([{ kind: 'week_above', muscle: 'chest', sets: 14, limit: 12 }]);
  });

  it('stays quiet for a muscle the plan already puts above the top', () => {
    const before = [session([['Butterfly', 14]])];
    const after = [session([['Butterfly', 16]])];
    expect(volumeNotices(before, after, 3)).toEqual([]);
  });

  it('flags a muscle dropping below the weekly minimum', () => {
    const before = [session([['Pullups', 4]])];
    const after = [session([['Pullups', 3]])];
    expect(volumeNotices(before, after, 3)).toEqual([{ kind: 'week_below_minimum', muscle: 'back', sets: 3, limit: 4 }]);
  });

  it('flags more than 8 direct sets for a muscle in one session', () => {
    const before = [session([['Butterfly', 8]])];
    const after = [session([['Butterfly', 10]])];
    expect(volumeNotices(before, after, 6)).toEqual([
      { kind: 'session_above', muscle: 'chest', sets: 10, limit: 8, session: 0 },
    ]);
  });

  it('leaves secondary sets out of the session check', () => {
    const after = [session([['Barbell_Bench_Press_-_Medium_Grip', 18]])];
    const notices = volumeNotices([session([])], after, 6);
    expect(notices.filter((n) => n.kind === 'session_above' && n.muscle === 'triceps')).toEqual([]);
  });

  it('ignores exercises outside the catalog', () => {
    expect(volumeNotices([session([])], [session([['bench_press', 10]])], 3)).toEqual([]);
  });

  it('counts a session as often as it is done in a week', () => {
    const before = [session([['Butterfly', 6]], 2)];
    const after = [session([['Butterfly', 9]], 2)];
    expect(volumeNotices(before, after, 4)).toContainEqual({ kind: 'week_above', muscle: 'chest', sets: 18, limit: 16 });
  });

  it('counts exercises outside the catalog through a muscle lookup', () => {
    const before = [session([['Butterfly', 4]])];
    const after = [session([['Guillotine', 4]])];
    expect(volumeNotices(before, after, 3)).toEqual([{ kind: 'week_below_minimum', muscle: 'chest', sets: 0, limit: 4 }]);
    const lookup = (id: string) => (id === 'Guillotine' ? { primary: ['chest' as const], secondary: [] } : undefined);
    expect(volumeNotices(before, after, 3, lookup)).toEqual([]);
  });
});
