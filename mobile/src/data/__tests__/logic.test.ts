/**
 * The plan, body checks and workout maths. The plan now runs on the goal engine and the
 * program generator (src/lib/, with their own tests); BodyChecks is still a one-to-one port
 * of the Android app's BodyChecksTest.
 */
import { Timestamp } from 'firebase/firestore';
import {
  BodyChecks, chosenDays, Convert, emptyProfile, PlanCalculator, profileFromMap, profileToMap, UserProfile, withDays,
} from '../profile';

import { Days, FeedPost, gapLabel, postFromMap } from '../social';
import {
  activeFromJson, activeToJson, ActiveWorkout, beatenBy, countRecords, ExerciseLibrary, LoggedExercise, recordsByExercise,
  recordsFrom, starterRoutines, WorkoutMath, workoutFromDoc,
} from '../training';

const man: UserProfile = {
  ...emptyProfile(),
  sex: 'MAN', age: 30, heightCm: 180, weightKg: 80, activity: 'MODERATE', goal: 'MAINTAIN', daysPerWeek: 3, place: 'GYM',
};

describe('PlanCalculator: calories from the goal engine', () => {
  test('maintenance = Mifflin-St Jeor x activity + planned lifting', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; x1.55 = 2759; + 3 full-body sessions (83 kcal/day) = 2842
    const t = PlanCalculator.nutrition(man);
    expect(t.bmr).toBe(1780);
    expect(t.liftingKcal).toBe(83);
    expect(t.maintenance).toBe(2840);
    expect(t.calories).toBe(2840);
  });

  test('goals move calories by a weekly rate of body weight', () => {
    // 0.5% of 80 kg a week = 440 kcal a day; 0.25% = 220
    expect(PlanCalculator.nutrition({ ...man, goal: 'LOSE_FAT' }).calories).toBe(2400);
    expect(PlanCalculator.nutrition({ ...man, goal: 'BUILD_MUSCLE' }).calories).toBe(3060);
    expect(PlanCalculator.nutrition({ ...man, goal: 'GAIN_WEIGHT' }).calories).toBe(3280);
    // BMI under 25: recomposition at maintenance
    expect(PlanCalculator.nutrition({ ...man, goal: 'RECOMPOSITION' }).calories).toBe(2840);
  });

  test('woman formula uses the -161 offset', () => {
    expect(PlanCalculator.nutrition({ ...man, sex: 'WOMAN' }).bmr).toBe(1610);
  });

  test('weight loss never drops below the safe minimum', () => {
    const small: UserProfile = { ...man, sex: 'WOMAN', age: 70, heightCm: 150, weightKg: 45, activity: 'SEDENTARY', goal: 'LOSE_FAT', daysPerWeek: 2 };
    const t = PlanCalculator.nutrition(small);
    expect(t.calories).toBe(1200);
    expect(t.atMinimum).toBe(true);
  });

  test('macros add up to the calorie target', () => {
    (['LOSE_FAT', 'BUILD_MUSCLE', 'GAIN_WEIGHT', 'RECOMPOSITION', 'MAINTAIN'] as const).forEach((goal) => {
      const t = PlanCalculator.nutrition({ ...man, goal });
      expect(Math.abs(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9 - t.calories)).toBeLessThanOrEqual(12);
    });
  });
});

describe('PlanCalculator: training from the program generator', () => {
  test('gym: real sessions on well-spaced days', () => {
    for (let days = 2; days <= 6; days++) {
      const week = PlanCalculator.training({ ...man, daysPerWeek: days });
      expect(week.days).toHaveLength(days);
      expect(new Set(week.days.map((d) => d.dayIndex)).size).toBe(days);
      expect(week.generated).not.toBeNull();
    }
    expect(PlanCalculator.training(man).splitName).toBe('Full body');
    expect(PlanCalculator.training(man).days.map((d) => d.title)).toEqual(['Full body A', 'Full body B', 'Full body A']);
    expect(PlanCalculator.training({ ...man, daysPerWeek: 4 }).splitName).toBe('Upper / Lower');
  });

  test('the tapped weekdays are the training days; "only N" picks the best-spaced', () => {
    const p = withDays(man, [1, 3, 5], null);
    expect(PlanCalculator.training(p).days.map((d) => d.dayIndex)).toEqual([1, 3, 5]);
    expect(chosenDays(withDays(man, [0, 1, 2, 3, 4, 5, 6], 3))).toEqual([0, 2, 4]);
    expect(withDays(man, [0, 1, 2, 3, 4, 5, 6], null).daysPerWeek).toBe(6);
    expect(withDays(man, [2], null).daysPerWeek).toBeNull();
  });

  test('steps and cardio come with the plan; none when gaining', () => {
    expect(PlanCalculator.training({ ...man, goal: 'LOSE_FAT' }).extras[0]).toBe('10,000 steps a day, every day');
    expect(PlanCalculator.training({ ...man, goal: 'GAIN_WEIGHT' }).extras).toEqual(['8,000 steps a day, every day']);
  });

  test('home keeps the simple plan', () => {
    const week = PlanCalculator.training({ ...man, place: 'HOME' });
    expect(week.generated).toBeNull();
    expect(week.splitName).toBe('Full body');
  });

  test('the starter program is one routine per generated session', () => {
    const routines = starterRoutines(man);
    expect(routines.map((r) => r.name)).toEqual(['Full body A', 'Full body B']);
    expect(routines[0].exercises[0]).toMatchObject({ name: 'Hack Squat', sets: 2, reps: 10 });
  });

  test('editing goals regenerates a different plan', () => {
    expect(PlanCalculator.training({ ...man, daysPerWeek: 4, goal: 'BUILD_MUSCLE' })).not.toEqual(PlanCalculator.training(man));
  });
});

describe('BodyChecks (same results as the Android app)', () => {
  test('realistic values pass', () => {
    expect(BodyChecks.age(30)).toBeNull();
    expect(BodyChecks.height(175, 'METRIC')).toBeNull();
    expect(BodyChecks.weight(70, 'METRIC')).toBeNull();
    expect(BodyChecks.combination(175, 70)).toBeNull();
  });

  test('unrealistic values are caught', () => {
    expect(BodyChecks.age(null)).not.toBeNull();
    expect(BodyChecks.age(12)).not.toBeNull();
    expect(BodyChecks.age(140)).not.toBeNull();
    expect(BodyChecks.height(17.5, 'METRIC')).not.toBeNull();
    expect(BodyChecks.height(300, 'METRIC')).not.toBeNull();
    expect(BodyChecks.weight(20, 'METRIC')).not.toBeNull();
    expect(BodyChecks.weight(400, 'IMPERIAL')).not.toBeNull();
    expect(BodyChecks.combination(225, 40)).not.toBeNull();
  });

  test('messages use the chosen units', () => {
    expect(BodyChecks.weight(10, 'IMPERIAL')).toContain('lb');
    expect(BodyChecks.height(10, 'IMPERIAL')).toContain('ft');
  });

  test('unit conversions round-trip', () => {
    expect(Convert.cmToFeetInches(178)).toEqual([5, 10]);
    expect(Convert.feetInchesToCm(5, 10)).toBeCloseTo(177.8, 2);
    expect(Convert.lbToKg(Convert.kgToLb(80))).toBeCloseTo(80, 9);
    expect(Convert.formatWeight(80, 'IMPERIAL')).toBe('176 lb');
  });

  test('profile survives a save and load', () => {
    const p: UserProfile = {
      sex: 'WOMAN', age: 28, heightCm: 165, weightKg: 60, activity: 'LIGHT', goal: 'LOSE_FAT', level: 'BEGINNER',
      trainingDays: [0, 2, 4], trainCount: null, daysPerWeek: 3, place: 'HOME', units: 'IMPERIAL', onboardingComplete: true,
    };
    expect(profileFromMap(profileToMap(p))).toEqual(p);
    expect(profileFromMap({ sex: 'ALIEN' })).toEqual(emptyProfile());
  });

  test('profiles saved by older versions still load', () => {
    const old = profileFromMap({ goal: 'GET_FIT', daysPerWeek: 4 });
    expect(old.goal).toBe('MAINTAIN');
    expect(old.level).toBeNull();
    expect(chosenDays(old)).toEqual([0, 1, 3, 4]);
  });
});

describe('Workout records', () => {
  const bench = (sets: [number, number][]): LoggedExercise => ({ exerciseId: 'bench_press', name: 'Bench Press', sets: sets.map(([weightKg, reps]) => ({ weightKg, reps, type: 'NORMAL' })) });

  test('records come from history and warm-ups never count', () => {
    const r = recordsFrom([[{ weightKg: 100, reps: 1, type: 'WARMUP' }, { weightKg: 80, reps: 8, type: 'NORMAL' }]]);
    expect(r.heaviestKg).toBe(80);
    expect(r.best1RmKg).toBeCloseTo(80 * (1 + 8 / 30));
    expect(r.byReps[8]).toBe(80);
  });

  test('a heavier set beats the record; the first session only sets a baseline', () => {
    const before = recordsByExercise([{ id: 'w', title: 'Push', startedAt: 0, finishedAt: 0, durationSec: 0, volumeKg: 0, records: 0, exercises: [bench([[80, 8]])] }]);
    expect(beatenBy(before.get('bench_press')!, { weightKg: 85, reps: 5, type: 'NORMAL' })).toContain('Heaviest weight');
    expect(countRecords([bench([[85, 5], [90, 3]])], before)).toBe(2);
    expect(countRecords([bench([[85, 5]])], new Map())).toBe(0);
  });

  test('formatting matches the Android app', () => {
    expect(WorkoutMath.bestSet([{ weightKg: 80, reps: 8, type: 'NORMAL' }, { weightKg: 80, reps: 10, type: 'NORMAL' }], 'METRIC')).toBe('80 kg × 10');
    expect(WorkoutMath.bestSet([{ weightKg: 0, reps: 12, type: 'NORMAL' }], 'METRIC')).toBe('12 reps');
    expect(WorkoutMath.formatDuration(3725)).toBe('1h 2min');
    expect(WorkoutMath.formatVolume(12345, 'METRIC')).toBe('12,345 kg');
  });

  test('a workout in progress survives being saved on the device', () => {
    const w: ActiveWorkout = {
      title: 'Push', routineId: null, startedAt: 1, restEndsAt: null, restSeconds: 90,
      exercises: [{ exerciseId: 'bench_press', name: 'Bench Press', targetReps: 10, sets: [{ weight: '80', reps: '8', done: true, type: 'WARMUP' }] }],
    };
    expect(activeFromJson(activeToJson(w))).toEqual(w);
  });

  test('stored workouts with missing fields still load', () => {
    const w = workoutFromDoc('id', { exercises: [{ exerciseId: 'squat', sets: [{ weightKg: 100, reps: 5 }] }, { name: 'no id' }] });
    expect(w.title).toBe('Workout');
    expect(w.exercises).toHaveLength(1);
    expect(w.exercises[0].sets[0].type).toBe('NORMAL');
  });

  test('custom exercises and search', () => {
    expect(ExerciseLibrary.custom('  Sled Push ').id).toBe('custom:sled_push');
    expect(ExerciseLibrary.search('dumbbell press', null).map((x) => x.id)).toEqual(['db_bench_press', 'incline_db_press', 'db_shoulder_press']);
    expect(ExerciseLibrary.search('', 'CARDIO')).toHaveLength(4);
  });
});

describe('Feed', () => {
  const meal = (uid: string, calories: number, target: number, at: number): FeedPost => postFromMap(`${uid}-${at}`, {
    uid, authorName: uid, dayKey: '2026-11-08', mealType: 'LUNCH', description: '', calories, target, likes: [], createdAt: Timestamp.fromMillis(at),
  })!;

  test('the closest to their own goal wins the day', () => {
    const standings = Days.standings([meal('a', 1500, 2000, 1), meal('b', 1950, 2000, 2), meal('a', 400, 2000, 3)], '2026-11-08');
    expect(standings.map((s) => s.uid)).toEqual(['b', 'a']);
    expect(gapLabel(standings[0].eaten - standings[0].target)).toBe('on target');
    expect(gapLabel(-120)).toBe('120 under');
  });

  test('posts written by the Android app are read the same way', () => {
    const workout = postFromMap('w', {
      kind: 'workout', uid: 'u', authorName: 'Sam', dayKey: '2026-11-08', title: 'Legs', durationSec: 3600, volumeKg: 5000,
      sets: 12, records: 1, exercises: [{ name: 'Squat', sets: 4, best: '100 kg × 5' }], likes: ['x'], createdAt: Timestamp.now(),
    })!;
    expect(workout.workout?.title).toBe('Legs');
    expect(workout.likes).toEqual(['x']);
    expect(postFromMap('bad', { uid: 'u' })).toBeNull();
  });

  test('day keys are local calendar days', () => {
    expect(Days.key(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(Days.parse('2026-01-05')).toBe(new Date(2026, 0, 5).getTime());
    expect(Days.parse('nope')).toBeNull();
  });
});
