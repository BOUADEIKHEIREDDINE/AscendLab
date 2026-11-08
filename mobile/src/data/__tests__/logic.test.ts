/**
 * The plan, body checks and workout maths. The first two groups are a one-to-one port of
 * the Android app's PlanCalculatorTest and BodyChecksTest, so both apps give the same plan.
 */
import { Timestamp } from 'firebase/firestore';
import {
  BodyChecks, Convert, emptyProfile, PlanCalculator, profileFromMap, profileToMap, UserProfile,
} from '../profile';
import { Days, FeedPost, gapLabel, postFromMap } from '../social';
import {
  activeFromJson, activeToJson, ActiveWorkout, beatenBy, countRecords, ExerciseLibrary, LoggedExercise, recordsByExercise,
  recordsFrom, WorkoutMath, workoutFromDoc,
} from '../training';

const man: UserProfile = {
  ...emptyProfile(),
  sex: 'MAN', age: 30, heightCm: 180, weightKg: 80, activity: 'MODERATE', goal: 'GET_FIT', daysPerWeek: 3, place: 'GYM',
};

describe('PlanCalculator (same results as the Android app)', () => {
  test('maintenance follows Mifflin-St Jeor', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 1780; x1.55 = 2759 -> 2760
    const t = PlanCalculator.nutrition(man);
    expect(t.bmr).toBe(1780);
    expect(t.maintenance).toBe(2760);
    expect(t.calories).toBe(2760);
  });

  test('goals shift calories by a moderate amount', () => {
    expect(PlanCalculator.nutrition({ ...man, goal: 'LOSE_FAT' }).calories).toBe(2210);
    expect(PlanCalculator.nutrition({ ...man, goal: 'BUILD_MUSCLE' }).calories).toBe(3030);
  });

  test('woman formula uses the -161 offset', () => {
    expect(PlanCalculator.nutrition({ ...man, sex: 'WOMAN' }).bmr).toBe(1610);
  });

  test('fat loss never drops below the safe minimum', () => {
    const small: UserProfile = { ...man, sex: 'WOMAN', age: 70, heightCm: 150, weightKg: 45, activity: 'SEDENTARY', goal: 'LOSE_FAT' };
    expect(PlanCalculator.nutrition(small).calories).toBe(1200);
  });

  test('macros add up to the calorie target', () => {
    (['LOSE_FAT', 'BUILD_MUSCLE', 'GET_FIT'] as const).forEach((goal) => {
      const t = PlanCalculator.nutrition({ ...man, goal });
      expect(Math.abs(t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9 - t.calories)).toBeLessThanOrEqual(12);
    });
  });

  test('protein is capped for larger bodies', () => {
    expect(PlanCalculator.nutrition({ ...man, weightKg: 160 }).proteinG).toBe(140);
  });

  test('split and schedule match the days chosen', () => {
    for (let days = 2; days <= 6; days++) {
      const week = PlanCalculator.training({ ...man, daysPerWeek: days });
      expect(week.days).toHaveLength(days);
      expect(new Set(week.days.map((d) => d.dayIndex)).size).toBe(days);
      week.days.forEach((d) => { expect(d.dayIndex).toBeGreaterThanOrEqual(0); expect(d.dayIndex).toBeLessThanOrEqual(6); });
    }
    expect(PlanCalculator.training({ ...man, daysPerWeek: 3 }).splitName).toBe('Full body');
    expect(PlanCalculator.training({ ...man, daysPerWeek: 4 }).splitName).toBe('Upper / Lower');
    expect(PlanCalculator.training({ ...man, daysPerWeek: 6 }).splitName).toBe('Push / Pull / Legs');
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
    const p: UserProfile = { sex: 'WOMAN', age: 28, heightCm: 165, weightKg: 60, activity: 'LIGHT', goal: 'LOSE_FAT', daysPerWeek: 3, place: 'HOME', units: 'IMPERIAL', onboardingComplete: true };
    expect(profileFromMap(profileToMap(p))).toEqual(p);
    expect(profileFromMap({ sex: 'ALIEN' })).toEqual(emptyProfile());
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
