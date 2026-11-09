import {
  DB_EXERCISES, DB_SOURCE_COMMIT, dbFind, equipmentOfDb, generatorMusclesOfDb, groupOfDbMuscle, photoUrls, type DbExercise,
} from '../exerciseDb';

const ex = (primaryMuscles: string[], secondaryMuscles: string[] = []): DbExercise => ({
  id: 't', name: 't', category: 'strength', level: 'beginner', equipment: null, primaryMuscles, secondaryMuscles, instructions: [], images: [],
});

describe('groupOfDbMuscle', () => {
  it.each([
    ['chest', 'CHEST'], ['lats', 'BACK'], ['middle back', 'BACK'], ['lower back', 'BACK'], ['traps', 'BACK'],
    ['shoulders', 'SHOULDERS'], ['biceps', 'ARMS'], ['triceps', 'ARMS'], ['forearms', 'ARMS'],
    ['quadriceps', 'LEGS'], ['hamstrings', 'LEGS'], ['calves', 'LEGS'], ['adductors', 'LEGS'],
    ['glutes', 'GLUTES'], ['abductors', 'GLUTES'], ['abdominals', 'CORE'], ['neck', 'OTHER'], ['something new', 'OTHER'],
  ])('%s → %s', (m, group) => expect(groupOfDbMuscle(m)).toBe(group));
});

describe('equipmentOfDb', () => {
  it.each([
    ['barbell', 'BARBELL'], ['e-z curl bar', 'BARBELL'], ['dumbbell', 'DUMBBELL'], ['machine', 'MACHINE'], ['cable', 'CABLE'],
    ['body only', 'BODYWEIGHT'], ['kettlebells', 'KETTLEBELL'], ['bands', 'BAND'],
    ['medicine ball', 'OTHER'], ['exercise ball', 'OTHER'], ['foam roll', 'OTHER'], ['other', 'OTHER'], [null, 'OTHER'],
  ])('%s → %s', (e, out) => expect(equipmentOfDb(e)).toBe(out));
});

describe('generatorMusclesOfDb', () => {
  it('maps to the generator muscles and drops the ones it does not count', () => {
    expect(generatorMusclesOfDb(ex(['lats', 'middle back'], ['biceps', 'forearms', 'traps']))).toEqual({ primary: ['back'], secondary: ['biceps'] });
    expect(generatorMusclesOfDb(ex(['quadriceps'], ['glutes', 'abductors', 'hamstrings', 'calves', 'lower back', 'adductors']))).toEqual({
      primary: ['quads'], secondary: ['glutes', 'hamstrings', 'calves'],
    });
    expect(generatorMusclesOfDb(ex(['chest'], ['shoulders', 'triceps']))).toEqual({ primary: ['chest'], secondary: ['shoulders', 'triceps'] });
    expect(generatorMusclesOfDb(ex(['abdominals'], ['neck']))).toEqual({ primary: ['abs'], secondary: [] });
  });
});

describe('the database file', () => {
  it('holds the gym categories only', () => {
    expect(DB_EXERCISES).toHaveLength(718);
    const cats = new Set(DB_EXERCISES.map((x) => x.category));
    expect([...cats].sort()).toEqual(['olympic weightlifting', 'plyometrics', 'powerlifting', 'strength']);
  });

  it('builds photo URLs at the pinned commit', () => {
    expect(DB_SOURCE_COMMIT).toBe('f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5');
    const base = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${DB_SOURCE_COMMIT}/exercises/Barbell_Bench_Press_-_Medium_Grip`;
    expect(photoUrls(dbFind('Barbell_Bench_Press_-_Medium_Grip')!)).toEqual([`${base}/0.jpg`, `${base}/1.jpg`]);
    expect(dbFind('nope')).toBeUndefined();
  });
});
