import { DB_EXERCISES, DB_SOURCE_COMMIT } from '../exerciseDb';
import { doneKeys, EXERCISES, ExerciseLibrary, type WorkoutRecord } from '../training';

const BENCH = 'Barbell_Bench_Press_-_Medium_Grip';

describe('one exercise library', () => {
  it('links hand-list entries only to database entries that exist', () => {
    const ids = new Set(DB_EXERCISES.map((x) => x.id));
    const links = EXERCISES.flatMap((x) => (x.media ? [x.media] : []));
    expect(links).toHaveLength(55);
    expect(links.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('finds hand-list, generator and database ids', () => {
    expect(ExerciseLibrary.find('bench_press')?.name).toBe('Bench Press');
    expect(ExerciseLibrary.find(BENCH)).toBeDefined();
    expect(ExerciseLibrary.find('Ascend_Bulgarian_Split_Squat')).toBeDefined();
    expect(ExerciseLibrary.find('3_4_Sit-Up')).toMatchObject({ muscle: 'CORE', equipment: 'BODYWEIGHT' });
  });

  it('keys a linked hand-list id to its database id', () => {
    expect(ExerciseLibrary.key('bench_press')).toBe(BENCH);
    expect(ExerciseLibrary.key(BENCH)).toBe(BENCH);
    expect(ExerciseLibrary.key('knee_push_up')).toBe('knee_push_up');
    expect(ExerciseLibrary.key('custom:my_lift')).toBe('custom:my_lift');
  });
});

describe('search', () => {
  it('lists every exercise once, without the linked hand-list entries', () => {
    const all = ExerciseLibrary.search('', null);
    expect(all).toHaveLength(718 + 6 + 10); // database, our Ascend_ entries, unlinked hand-list entries
    expect(new Set(all.map((x) => x.id)).size).toBe(all.length);
    const ids = all.map((x) => x.id);
    expect(ids).not.toContain('bench_press');
    expect(ids).toContain(BENCH);
    expect(ids).toContain('knee_push_up');
    expect(ids).toContain('Ascend_Bulgarian_Split_Squat');
  });

  it('puts exact and starts-with matches first', () => {
    const names = ExerciseLibrary.search('leg press', null).map((x) => x.name.toLowerCase());
    expect(names[0]).toBe('leg press');
    const firstOther = names.findIndex((n) => !n.startsWith('leg press'));
    expect(names.slice(firstOther).every((n) => !n.startsWith('leg press'))).toBe(true);
  });

  it('puts exercises done before ahead of the rest', () => {
    const results = ExerciseLibrary.search('bench press', null, new Set(['Decline_Dumbbell_Bench_Press']));
    expect(results[0].id).toBe('Decline_Dumbbell_Bench_Press');
  });

  it('keeps the muscle filter', () => {
    const chest = ExerciseLibrary.search('', 'CHEST');
    expect(chest.length).toBeGreaterThan(50);
    expect(chest.every((x) => x.muscle === 'CHEST')).toBe(true);
  });
});

describe('howTo', () => {
  const photo = (id: string, n: number) => `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${DB_SOURCE_COMMIT}/exercises/${id}/${n}.jpg`;

  it('gives photos, steps, muscles, equipment and level', () => {
    const bench = ExerciseLibrary.howTo(BENCH)!;
    expect(bench.images).toEqual([photo(BENCH, 0), photo(BENCH, 1)]);
    expect(bench.instructions.length).toBeGreaterThan(2);
    expect(bench.primary).toEqual(['Chest']);
    expect(bench.secondary).toContain('Shoulders');
    expect(bench.equipment).toBe('Barbell');
    expect(bench.level).toBe('Beginner');
  });

  it('uses the linked entry for a hand-list id', () => {
    expect(ExerciseLibrary.howTo('bench_press')).toEqual(ExerciseLibrary.howTo(BENCH));
  });

  it('capitalises two-word muscles', () => {
    expect(ExerciseLibrary.howTo('Bent_Over_Barbell_Row')!.primary).toContain('Middle back');
  });

  it('is null without a database entry', () => {
    expect(ExerciseLibrary.howTo('custom:my_lift')).toBeNull();
    expect(ExerciseLibrary.howTo('knee_push_up')).toBeNull();
    expect(ExerciseLibrary.howTo('Ascend_Bulgarian_Split_Squat')).toBeNull();
  });
});

describe('doneKeys', () => {
  it('keys every exercise in the history', () => {
    const w = (ids: string[]) => ({ exercises: ids.map((exerciseId) => ({ exerciseId, name: exerciseId, sets: [] })) }) as unknown as WorkoutRecord;
    expect([...doneKeys([w(['bench_press', 'custom:x']), w(['knee_push_up'])])].sort()).toEqual([BENCH, 'custom:x', 'knee_push_up']);
    expect(doneKeys(null).size).toBe(0);
  });
});
