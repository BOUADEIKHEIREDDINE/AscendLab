/**
 * The plan, body checks and workout maths. The plan now runs on the goal engine and the
 * program generator (src/lib/, with their own tests); BodyChecks is still a one-to-one port
 * of the Android app's BodyChecksTest.
 */
import { Timestamp } from 'firebase/firestore';
import {
  BodyChecks, chosenDays, Convert, emptyProfile, gymPlan, pinLegacyDefaults, RANKING_VERSION, PlanCalculator, splitChoice, profileFromMap, profileToMap, UserProfile, withDays,
} from '../profile';

import { LEGACY_SLOT_OPTIONS, legacyDefault } from '../../lib/program-generator/legacy';
import { Days, FeedPost, gapLabel, postFromMap } from '../social';
import {
  activeFromJson, activeToJson, ActiveWorkout, beatenBy, countRecords, ExerciseLibrary, LoggedExercise, recordsByExercise,
  nextRoutine, recordsFrom, routineExerciseFromMap, routineToMap, starterRoutines, WorkoutMath, workoutFromDoc,
  newSet, noticeText, programNotices, replaceEverywhere, swapsAfterReplace, volumeSessions, workoutReplace, applyWorkoutChanges,
  keptReplaces, replacementSetCount, previousForSets, excludedKeys,
} from '../training';
import { RANKING } from '../../lib/program-generator/ranking';

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

  test('a 6-day plan lists each routine once, in order', () => {
    const six = starterRoutines(withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 2, 3, 4, 5], null));
    expect(six.map((r) => r.name)).toEqual(['Chest & back', 'Shoulders & arms', 'Legs']);
  });

  test('up next: the routine after the last one done, wrapping around', () => {
    const routines = starterRoutines(withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 2, 3, 4, 5], null));
    const program = { id: 'p', name: 'Plan', routines, createdAt: 0 };
    const done = (routineId: string | null, title = 'x') =>
      ({ id: 'w', title, routineId, startedAt: 0, finishedAt: 0, durationSec: 0, volumeKg: 0, records: 0, exercises: [] });
    expect(nextRoutine(program, [])?.name).toBe('Chest & back');
    expect(nextRoutine(program, [done(routines[0].id)])?.name).toBe('Shoulders & arms');
    expect(nextRoutine(program, [done(routines[2].id), done(routines[1].id)])?.name).toBe('Chest & back');
    expect(nextRoutine(program, [done(null, 'Legs')])?.name).toBe('Chest & back');
    expect(nextRoutine(program, [done('other-program')])?.name).toBe('Chest & back');
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
      trainingDays: [0, 2, 4], trainCount: null, daysPerWeek: 3, place: 'HOME', units: 'IMPERIAL', onboardingComplete: true, split: null, swaps: {}, rankingVersion: 1,
    };
    expect(profileFromMap(profileToMap(p))).toEqual(p);
    expect(profileFromMap({ sex: 'ALIEN' })).toEqual({ ...emptyProfile(), rankingVersion: null });
  });

  describe('pinning the pre-ranking exercises', () => {
    const old: UserProfile = { ...man, level: 'INTERMEDIATE', rankingVersion: null };
    const days = (p: UserProfile) => gymPlan(p)!.state.schedule.cycle.flatMap((d) => d.exercises);

    test('old gym profiles keep the current exercises', () => {
      const pinned = pinLegacyDefaults(old);
      expect(pinned.rankingVersion).toBe(RANKING_VERSION);
      for (const e of days(pinned)) expect(e.exerciseId).toBe(legacyDefault(e.slot, 'intermediate'));
      expect(LEGACY_SLOT_OPTIONS.squat).toContain(days(pinned).find((e) => e.slot === 'squat')?.exerciseId ?? 'Hack_Squat');
    });

    test('saved swaps win over pinning', () => {
      const swapped = { ...old, swaps: { squat: 'Barbell_Squat' } as UserProfile['swaps'] };
      expect(pinLegacyDefaults(swapped).swaps.squat).toBe('Barbell_Squat');
    });

    test('pinning is idempotent', () => {
      const once = pinLegacyDefaults(old);
      expect(pinLegacyDefaults(once)).toBe(once);
      expect(pinLegacyDefaults({ ...once, rankingVersion: null })).toEqual(once);
    });

    test('pins every focus and split the profile uses', () => {
      const p = { ...old, daysPerWeek: 5, trainingDays: [0, 1, 2, 4, 5], split: 'ppl_upper_lower' as const };
      for (const e of days(pinLegacyDefaults(p))) expect(e.exerciseId).toBe(legacyDefault(e.slot, 'intermediate'));
    });

    test('home and incomplete profiles only get the version', () => {
      expect(pinLegacyDefaults({ ...old, place: 'HOME' })).toEqual({ ...old, place: 'HOME', rankingVersion: 1 });
      expect(pinLegacyDefaults({ ...emptyProfile(), rankingVersion: null }).swaps).toEqual({});
    });
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
    expect(beatenBy(before.get(ExerciseLibrary.key('bench_press'))!, { weightKg: 85, reps: 5, type: 'NORMAL' })).toContain('Heaviest weight');
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
    const dbPress = ExerciseLibrary.search('dumbbell press', null).map((x) => x.id);
    expect(dbPress).toEqual(expect.arrayContaining(['Dumbbell_Bench_Press', 'Incline_Dumbbell_Press', 'Dumbbell_Shoulder_Press']));
    expect(dbPress).not.toContain('db_bench_press'); // linked to Dumbbell_Bench_Press, listed once
    expect(ExerciseLibrary.search('', 'CARDIO')).toHaveLength(4);
  });

  test('ranked exercises come first under a muscle filter', () => {
    const unranked = ExerciseLibrary.search('', 'LEGS').find((x) => ExerciseLibrary.rankOf(x.id) == null)!;
    const ids = ExerciseLibrary.search('', 'LEGS', new Set([ExerciseLibrary.key(unranked.id)])).map((x) => x.id);
    expect(ids.slice(0, 4)).toEqual([RANKING.quads[0].exerciseId, RANKING.hamstrings[0].exerciseId, RANKING.calves[0].exerciseId, RANKING.quads[1].exerciseId]);
    expect(ExerciseLibrary.alsoFor('LEGS').length).toBeGreaterThan(0);
    expect(ExerciseLibrary.alsoFor('CARDIO')).toEqual([]);
  });

  test('typed searches ignore the ranking', () => {
    const done = new Set(['Preacher_Curl']);
    const typed = ExerciseLibrary.search('curl', 'ARMS', done).map((x) => x.id);
    expect(typed[0]).toBe('Preacher_Curl');
    const alpha = ExerciseLibrary.search('curl', 'ARMS').map((x) => x.id);
    expect(alpha.filter((id) => id !== 'Preacher_Curl')).toEqual(typed.slice(1));
  });

  test('rankOf is shared by linked ids', () => {
    expect(ExerciseLibrary.rankOf('Machine_Bench_Press')).toBe(1);
    expect(ExerciseLibrary.rankOf('db_bench_press')).toBe(ExerciseLibrary.rankOf('Dumbbell_Bench_Press'));
    expect(ExerciseLibrary.rankOf('db_bench_press')).toBe(2);
    expect(ExerciseLibrary.rankOf('custom:nope')).toBeNull();
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

describe('split, swaps and routine slots', () => {
  const four = withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 3, 4], null);
  const six = withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 2, 3, 4, 5], null);

  test('a profile keeps its split and swaps when stored', () => {
    const p: UserProfile = { ...man, split: 'ppl', swaps: { chestPress: 'Dumbbell_Bench_Press' } };
    const back = profileFromMap(profileToMap(p));
    expect(back.split).toBe('ppl');
    expect(back.swaps).toEqual({ chestPress: 'Dumbbell_Bench_Press' });
  });

  test('swaps are stored as a list, so a merged save removes a cleared swap', () => {
    const stored = profileToMap({ ...man, swaps: { chestPress: 'Dumbbell_Bench_Press' } });
    expect(stored.swaps).toEqual([{ slot: 'chestPress', exerciseId: 'Dumbbell_Bench_Press' }]);
    expect(profileToMap({ ...man, swaps: {} }).swaps).toEqual([]);
  });

  test('a stored profile drops an unknown split and bad swaps', () => {
    const back = profileFromMap({ ...profileToMap(man), split: 'nope', swaps: { chestPress: 'Dumbbell_Bench_Press', nope: 'x', row: 3 } });
    expect(back.split).toBeNull();
    expect(back.swaps).toEqual({ chestPress: 'Dumbbell_Bench_Press' });
  });

  test('an empty profile has no split and no swaps', () => {
    expect(emptyProfile()).toMatchObject({ split: null, swaps: {} });
  });

  test('the plan uses a saved swap everywhere the slot appears', () => {
    const cycle = gymPlan({ ...four, swaps: { chestPress: 'Dumbbell_Bench_Press' } })!.state.schedule.cycle;
    const chest = cycle.flatMap((d) => d.exercises).filter((x) => x.slot === 'chestPress');
    expect(chest.length).toBeGreaterThan(1);
    for (const x of chest) expect(x.exerciseId).toBe('Dumbbell_Bench_Press');
  });

  test('the plan uses a saved split', () => {
    const names = gymPlan({ ...six, split: 'ppl' })!.state.schedule.cycle.map((d) => d.name);
    expect(names).toContain('Push');
  });

  test('the plan ignores a saved split that no longer fits the days', () => {
    const names = gymPlan({ ...four, split: 'ppl' })!.state.schedule.cycle.map((d) => d.name);
    expect(names).toContain('Upper A');
  });

  test('starter routines know the slot of every exercise', () => {
    for (const r of starterRoutines(four)) for (const x of r.exercises) expect(x.slot).toBeDefined();
  });

  test('a routine saved before slots existed gets its slot back from the exercise', () => {
    expect(routineExerciseFromMap({ exerciseId: 'Dumbbell_Bench_Press', name: 'x', sets: 2, reps: 10 }).slot).toBe('chestPress');
    expect(routineExerciseFromMap({ exerciseId: 'bench_press', name: 'x', sets: 2, reps: 10 }).slot).toBeUndefined();
  });

  test('a stored routine keeps its slot', () => {
    const routine = { id: 'r', name: 'R', exercises: [{ exerciseId: 'Pullups', name: 'Pullups', sets: 2, reps: 10, slot: 'verticalPull' as const }] };
    expect(routineToMap(routine).exercises[0]).toMatchObject({ slot: 'verticalPull' });
  });

  test('a library pick in a slot keeps the slot after saving and loading', () => {
    const picked = { id: 'r', name: 'R', exercises: [{ exerciseId: 'bench_press', name: 'Bench Press', sets: 2, reps: 10, slot: 'chestPress' as const }] };
    const stored = routineToMap(picked).exercises[0] as Record<string, unknown>;
    expect(routineExerciseFromMap(stored).slot).toBe('chestPress');
    expect(routineExerciseFromMap({ ...stored, slot: 'nope' }).slot).toBeUndefined();
  });

  test('an added exercise stays without a slot after saving and loading', () => {
    const added = { id: 'r', name: 'R', exercises: [{ exerciseId: 'Dumbbell_Bench_Press', name: 'Dumbbell Bench Press', sets: 2, reps: 10 }] };
    const stored = routineToMap(added).exercises[0] as Record<string, unknown>;
    expect(routineExerciseFromMap(stored).slot).toBeUndefined();
  });
});

describe('program edits', () => {
  const four = withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 3, 4], null);
  const six = withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 2, 3, 4, 5], null);

  test('a replace changes every routine with the same slot and keeps their sets', () => {
    const routines = starterRoutines(four);
    const { routines: next, changedNames } = replaceEverywhere(routines, 'chestPress', 'Dumbbell_Bench_Press', 'Dumbbell Bench Press');
    expect(changedNames).toEqual(['Upper A', 'Upper B']);
    const chest = next.flatMap((r) => r.exercises).filter((x) => x.slot === 'chestPress');
    for (const x of chest) expect(x).toMatchObject({ exerciseId: 'Dumbbell_Bench_Press', name: 'Dumbbell Bench Press', sets: 2 });
  });

  test('a replace with one of the slot options is saved as a swap', () => {
    expect(swapsAfterReplace({}, 'chestPress', 'Dumbbell_Bench_Press', 'intermediate')).toEqual({ chestPress: 'Dumbbell_Bench_Press' });
  });

  test('a replace with a library exercise clears the saved swap', () => {
    expect(swapsAfterReplace({ chestPress: 'Machine_Bench_Press', row: 'Leverage_Iso_Row' }, 'chestPress', 'bench_press', 'intermediate'))
      .toEqual({ row: 'Leverage_Iso_Row' });
  });

  test('a 6-day plan does each routine twice a week', () => {
    const sessions = volumeSessions(starterRoutines(six), gymPlan(six)!.state.schedule.cycle, 6);
    expect(sessions!.map((s) => s.timesPerWeek)).toEqual([2, 2, 2]);
  });

  test('3-day full body does A and B 1.5 times a week each', () => {
    const sessions = volumeSessions(starterRoutines(man), gymPlan(man)!.state.schedule.cycle, 3);
    expect(sessions!.map((s) => s.timesPerWeek)).toEqual([1.5, 1.5]);
  });

  test('a renamed routine turns the weekly count off', () => {
    const routines = starterRoutines(four);
    routines[0] = { ...routines[0], name: 'My push day' };
    expect(volumeSessions(routines, gymPlan(four)!.state.schedule.cycle, 4)).toBeNull();
  });

  test('an unchanged program gives no notices', () => {
    const routines = starterRoutines(four);
    expect(programNotices(routines, routines, four)).toEqual([]);
  });

  test('notices read in plain words', () => {
    expect(noticeText({ kind: 'week_above', muscle: 'chest', sets: 14, limit: 12 }))
      .toBe('Chest now gets 14 sets a week, above the 12 your plan aims for. Fine to keep.');
    expect(noticeText({ kind: 'week_below_minimum', muscle: 'back', sets: 3, limit: 4 }))
      .toBe('Back drops to 3 sets a week, below the 4 needed to keep growing.');
    expect(noticeText({ kind: 'session_above', muscle: 'chest', sets: 10, limit: 8, session: 0 }))
      .toBe('Chest gets 10 sets in one workout. Past about 8, extra sets add little.');
    expect(noticeText({ kind: 'week_above', muscle: 'triceps', sets: 12.25, limit: 12 })).toContain('12.5 sets');
  });

  test('a workout replace keeps ticked sets with the old exercise', () => {
    const old = { exerciseId: 'A', name: 'A', targetReps: 10, sets: [newSet({ done: true, reps: '8' }), newSet()] };
    const next = { exerciseId: 'B', name: 'B', targetReps: 10, sets: [newSet(), newSet()] };
    const result = workoutReplace([old], 0, next);
    expect(result.map((x) => x.exerciseId)).toEqual(['A', 'B']);
    expect(result[0].sets).toEqual([newSet({ done: true, reps: '8' })]);
  });

  test('a workout replace with nothing ticked swaps in place', () => {
    const old = { exerciseId: 'A', name: 'A', targetReps: 10, sets: [newSet()] };
    const next = { exerciseId: 'B', name: 'B', targetReps: 10, sets: [newSet()] };
    expect(workoutReplace([old], 0, next).map((x) => x.exerciseId)).toEqual(['B']);
  });
});

describe('workout changes', () => {
  const four = withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 3, 4], null);

  test('a running workout keeps its changes, tags and slots when stored', () => {
    const w: ActiveWorkout = {
      title: 'Upper A', routineId: 'r', startedAt: 1, restEndsAt: null, restSeconds: 90,
      exercises: [{ exerciseId: 'Machine_Bench_Press', name: 'Machine Bench Press', targetReps: 10, sets: [newSet()], slot: 'chestPress', tag: 'swapped' }],
      changes: [
        { kind: 'replace', slot: 'chestPress', fromId: 'Barbell_Bench_Press_-_Medium_Grip', toId: 'Machine_Bench_Press', toName: 'Machine Bench Press' },
        { kind: 'add', afterId: 'Machine_Bench_Press', toId: 'Dumbbell_Flyes', toName: 'Dumbbell Flyes' },
      ],
    };
    const back = activeFromJson(activeToJson(w))!;
    expect(back.changes).toEqual(w.changes);
    expect(back.exercises[0]).toMatchObject({ slot: 'chestPress', tag: 'swapped' });
  });

  test('saving a slotted workout replace changes every routine, an add only this one', () => {
    const routines = starterRoutines(four);
    const upperA = routines.find((r) => r.name === 'Upper A')!;
    const { routines: next, changedNames } = applyWorkoutChanges(upperA, routines, [
      { kind: 'replace', slot: 'chestPress', fromId: 'Barbell_Bench_Press_-_Medium_Grip', toId: 'Machine_Bench_Press', toName: 'Machine Bench Press' },
      { kind: 'add', afterId: 'Leverage_Iso_Row', toId: 'Dumbbell_Flyes', toName: 'Dumbbell Flyes' },
    ]);
    expect(changedNames.sort()).toEqual(['Upper A', 'Upper B']);
    for (const r of next.filter((x) => x.name.startsWith('Upper'))) {
      expect(r.exercises.find((x) => x.slot === 'chestPress')!.exerciseId).toBe('Machine_Bench_Press');
    }
    // ranking: iso row machine is the Upper A row now (user decision)
    const a = next.find((r) => r.name === 'Upper A')!.exercises.map((x) => x.exerciseId);
    expect(a[a.indexOf('Leverage_Iso_Row') + 1]).toBe('Dumbbell_Flyes');
    expect(next.find((r) => r.name === 'Upper B')!.exercises.map((x) => x.exerciseId)).not.toContain('Dumbbell_Flyes');
    expect(next.find((r) => r.name === 'Upper A')!.exercises.find((x) => x.exerciseId === 'Dumbbell_Flyes')).toMatchObject({ sets: 2 });
  });

  test('a workout replace without a slot only changes this routine', () => {
    const mine = { id: 'm', name: 'Mine', exercises: [{ exerciseId: 'bench_press', name: 'Bench Press', sets: 3, reps: 10 }] };
    const other = { id: 'o', name: 'Other', exercises: [{ exerciseId: 'bench_press', name: 'Bench Press', sets: 3, reps: 10 }] };
    const { routines, changedNames } = applyWorkoutChanges(mine, [mine, other], [
      { kind: 'replace', fromId: 'bench_press', toId: 'push_up', toName: 'Push Up' },
    ]);
    expect(changedNames).toEqual(['Mine']);
    expect(routines[0].exercises[0]).toMatchObject({ exerciseId: 'push_up', sets: 3 });
    expect(routines[1].exercises[0].exerciseId).toBe('bench_press');
  });
});

describe('review fixes', () => {
  test('a replace whose row was removed or replaced again is not kept', () => {
    const replaces = [
      { slot: 'chestPress' as const, exerciseId: 'Dumbbell_Bench_Press', name: 'Dumbbell Bench Press' },
      { slot: 'row' as const, exerciseId: 'Leverage_Iso_Row', name: 'Leverage Iso Row' },
    ];
    const exercises = [{ exerciseId: 'Seated_One-arm_Cable_Pulley_Rows', name: 'x', sets: 2, reps: 10, slot: 'row' as const }];
    expect(keptReplaces(replaces, exercises)).toEqual([]);
    expect(keptReplaces(replaces, [{ exerciseId: 'Leverage_Iso_Row', name: 'x', sets: 2, reps: 10, slot: 'row' as const }]))
      .toEqual([replaces[1]]);
  });

  test('a workout replace keeps the number of working sets', () => {
    const abs = { exerciseId: 'Cable_Crunch', name: 'Cable Crunch', targetReps: 10, sets: [newSet({ type: 'WARMUP' }), newSet(), newSet(), newSet()] };
    expect(replacementSetCount(abs)).toBe(3);
    expect(replacementSetCount({ ...abs, sets: [] })).toBe(1);
    // After a ticked set, the new exercise only gets the sets that were left (2 + 1 done = 3 in total).
    expect(replacementSetCount({ ...abs, sets: [newSet({ done: true }), newSet(), newSet()] })).toBe(2);
  });

  test('change split is only offered when a rebuild can run, on 5-6 days', () => {
    const six = withDays({ ...man, level: 'INTERMEDIATE' }, [0, 1, 2, 3, 4, 5], null);
    expect(splitChoice(six)!.options.length).toBe(2);
    expect(splitChoice({ ...six, heightCm: null })).toBeNull();
    expect(splitChoice({ ...six, place: 'HOME' })).toBeNull();
    expect(splitChoice(withDays(man, [0, 1, 3, 4], null))!.options.length).toBe(1);
  });
});

describe('routine view', () => {
  test('pairs each planned set with the last working sets, skipping warm-ups', () => {
    const last = [
      { weightKg: 20, reps: 12, type: 'WARMUP' as const },
      { weightKg: 60, reps: 9, type: 'NORMAL' as const },
      { weightKg: 60, reps: 8, type: 'FAILURE' as const },
    ];
    expect(previousForSets(last, 3)).toEqual([last[1], last[2], null]);
    expect(previousForSets(undefined, 2)).toEqual([null, null]);
  });
});

describe('excludedKeys: no exercise twice', () => {
  it('linked ids count as the same exercise', () => {
    expect(excludedKeys(['bench_press']).has(ExerciseLibrary.key('Barbell_Bench_Press_-_Medium_Grip'))).toBe(true);
  });
  it('custom ids exclude themselves', () => {
    expect(excludedKeys(['custom:my_move']).has('custom:my_move')).toBe(true);
  });
});
