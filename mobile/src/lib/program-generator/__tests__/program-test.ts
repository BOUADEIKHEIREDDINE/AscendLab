import { CATALOG } from '../catalog';
import { LEGACY_SLOT_OPTIONS } from '../legacy';
import { HIDDEN, RANKING, SLOT_MUSCLE } from '../ranking';
import {
  estimatedMinutes,
  generateProgram,
  isSlotOption,
  sessionSets,
  slotAlternatives,
  slotOf,
  splitOptions,
  weeklySets,
  type Level,
  type Muscle,
  type ProgramInput,
  type Slot,
  type Split,
} from '../program';

const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];
const DAYS = [2, 3, 4, 5, 6];
/** Muscles held to the weekly sets rule. Glutes and calves only get what the plan gives them. */
const TARGET_MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings'];

const allInputs: ProgramInput[] = LEVELS.flatMap((level) =>
  DAYS.flatMap((daysPerWeek) =>
    splitOptions(daysPerWeek).map(({ split }) => ({ level, daysPerWeek, split })),
  ),
);

/** Lower-body focus programs (offered to women at signup). */
const focusInputs: ProgramInput[] = LEVELS.flatMap((level) =>
  DAYS.map((daysPerWeek) => ({ level, daysPerWeek, focus: 'lower_body' as const })),
);
const everyInput = [...allInputs, ...focusInputs];
const UPPER_MUSCLES: Muscle[] = ['chest', 'back', 'shoulders'];
const LOWER_MUSCLES: Muscle[] = ['glutes', 'quads', 'hamstrings'];

const ids = (input: ProgramInput) =>
  generateProgram(input).days.flatMap((d) => d.exercises.map((e) => e.exerciseId));

describe('splitOptions', () => {
  it.each([
    [2, ['full_body']],
    [3, ['full_body']],
    [4, ['upper_lower']],
    [5, ['arnold_upper_lower', 'ppl_upper_lower']],
    [6, ['arnold', 'ppl']],
  ] as const)('offers the right splits for %i days, default first', (days, splits) => {
    expect(splitOptions(days).map((o) => o.split)).toEqual(splits);
  });

  it('describes every split in one line', () => {
    for (const d of DAYS) {
      for (const o of splitOptions(d)) expect(o.description.length).toBeGreaterThan(10);
    }
  });

  it('rejects fewer than 2 or more than 6 days', () => {
    expect(() => splitOptions(1)).toThrow();
    expect(() => splitOptions(7)).toThrow();
  });
});

describe('generateProgram — structure', () => {
  it.each([
    [2, 'full_body', ['Full body A', 'Full body B']],
    [3, 'full_body', ['Full body A', 'Full body B', 'Full body A']],
    [4, 'upper_lower', ['Upper A', 'Lower A', 'Upper B', 'Lower B']],
    [5, 'arnold_upper_lower', ['Chest & back', 'Shoulders & arms', 'Legs', 'Upper', 'Lower']],
    [5, 'ppl_upper_lower', ['Push', 'Pull', 'Legs', 'Upper', 'Lower']],
    [6, 'arnold', ['Chest & back', 'Shoulders & arms', 'Legs', 'Chest & back', 'Shoulders & arms', 'Legs']],
    [6, 'ppl', ['Push', 'Pull', 'Legs', 'Push', 'Pull', 'Legs']],
  ] as const)('%i days of %s gives the right sessions', (days, split, names) => {
    const p = generateProgram({ level: 'intermediate', daysPerWeek: days, split });
    expect(p.split).toBe(split);
    expect(p.days.map((d) => d.name)).toEqual(names);
  });

  it('uses the Arnold split by default at 5 and 6 days', () => {
    expect(generateProgram({ level: 'beginner', daysPerWeek: 5 }).split).toBe('arnold_upper_lower');
    expect(generateProgram({ level: 'beginner', daysPerWeek: 6 }).split).toBe('arnold');
  });

  it('rejects a split that does not fit the days', () => {
    expect(() => generateProgram({ level: 'beginner', daysPerWeek: 3, split: 'ppl' })).toThrow();
  });

  it('gives every level every split', () => {
    for (const level of LEVELS) {
      expect(generateProgram({ level, daysPerWeek: 6, split: 'ppl' }).days).toHaveLength(6);
    }
  });

  it('tells beginners on 5+ days that 3-4 days is plenty', () => {
    expect(generateProgram({ level: 'beginner', daysPerWeek: 5 }).notices).toEqual(['beginner_many_days']);
    expect(generateProgram({ level: 'beginner', daysPerWeek: 4 }).notices).toEqual([]);
    expect(generateProgram({ level: 'advanced', daysPerWeek: 6 }).notices).toEqual([]);
  });
});

describe('generateProgram — full body', () => {
  const names = (input: ProgramInput) => generateProgram(input).days.map((d) => d.name);
  const slotsOf = (input: ProgramInput) => generateProgram(input).days.map((d) => d.exercises.map((e) => e.slot));

  it('3 days alternates A/B/A and B/A/B week to week', () => {
    expect(names({ level: 'intermediate', daysPerWeek: 3, week: 0 })).toEqual(['Full body A', 'Full body B', 'Full body A']);
    expect(names({ level: 'intermediate', daysPerWeek: 3, week: 1 })).toEqual(['Full body B', 'Full body A', 'Full body B']);
    expect(names({ level: 'intermediate', daysPerWeek: 3, week: 2 })).toEqual(['Full body A', 'Full body B', 'Full body A']);
  });

  it('2 and 3 days use the same A and B sessions', () => {
    const [a2, b2] = slotsOf({ level: 'intermediate', daysPerWeek: 2 });
    const [a3, b3] = slotsOf({ level: 'intermediate', daysPerWeek: 3 });
    expect(a3).toEqual(a2);
    expect(b3).toEqual(b2);
  });

  it.each(LEVELS)('every full-body session has a lateral raise (%s)', (level) => {
    for (const daysPerWeek of [2, 3]) {
      for (const slots of slotsOf({ level, daysPerWeek })) expect(slots).toContain('lateralRaise');
    }
  });

  it('day A rows on the iso row machine, day B on the lying T-bar row (upper back)', () => {
    const [a, b] = generateProgram({ level: 'intermediate', daysPerWeek: 2 }).days;
    expect(a.exercises.map((e) => e.exerciseId)).toContain('Leverage_Iso_Row'); // ranking: iso row machine first (user decision)
    expect(b.exercises.map((e) => e.exerciseId)).toContain('Lying_T-Bar_Row'); // ranking: lying T-bar row first
  });
});

describe('generateProgram — training rules', () => {
  it.each(everyInput)('every exercise is 2 sets of 6-10 reps to failure, abs 3 sets (%o)', (input) => {
    for (const day of generateProgram(input).days) {
      for (const ex of day.exercises) {
        expect(ex).toMatchObject({ sets: ex.slot === 'abs' ? 3 : 2, repMin: 6, repMax: 10, toFailure: true });
      }
    }
  });

  it.each(everyInput)('rests 2:30 on isolation, 3 min upper compounds, 4 min lower compounds (%o)', (input) => {
    for (const day of generateProgram(input).days) {
      for (const ex of day.exercises) {
        const { mechanic, region } = CATALOG[ex.exerciseId];
        const expected = mechanic === 'isolation' ? 150 : region === 'upper' ? 180 : 240;
        expect(ex.restSec).toBe(expected);
      }
    }
  });

  it.each(allInputs.filter((i) => i.daysPerWeek === 2))('gives each target muscle 6-8 sets a week on 2 days (%o)', (input) => {
    const week = weeklySets(generateProgram(input));
    for (const muscle of TARGET_MUSCLES) {
      // A lateral raise every session (side delts), on top of indirect sets from presses and rows.
      const max = muscle === 'shoulders' ? 10 : 8;
      expect([muscle, week[muscle]]).toEqual([muscle, expect.any(Number)]);
      expect(week[muscle]).toBeGreaterThanOrEqual(6);
      expect(week[muscle]).toBeLessThanOrEqual(max);
    }
  });

  it.each(allInputs.filter((i) => i.daysPerWeek === 3).flatMap((i) => [{ ...i, week: 0 }, { ...i, week: 1 }]))(
    'gives each target muscle 8-12 sets a week on 3 days, in A/B/A and B/A/B weeks (%o)',
    (input) => {
      const week = weeklySets(generateProgram(input));
      for (const muscle of TARGET_MUSCLES) {
        const max = muscle === 'shoulders' ? 16 : 12;
        expect([muscle, week[muscle]]).toEqual([muscle, expect.any(Number)]);
        expect(week[muscle]).toBeGreaterThanOrEqual(8);
        expect(week[muscle]).toBeLessThanOrEqual(max);
      }
    },
  );

  it.each(allInputs.filter((i) => i.daysPerWeek >= 4))('gives each target muscle 10-16 sets a week on 4-6 days (%o)', (input) => {
    const week = weeklySets(generateProgram(input));
    for (const muscle of TARGET_MUSCLES) {
      // Shoulders are three heads (front, side, rear): presses and rows add indirect sets on top.
      const max = muscle === 'shoulders' ? 24 : 16;
      // The user's legs day has one quad and two hamstring moves twice a week: 8 sets.
      const min = muscle === 'quads' || muscle === 'hamstrings' ? 8 : 10;
      expect([muscle, week[muscle]]).toEqual([muscle, expect.any(Number)]);
      expect(week[muscle]).toBeGreaterThanOrEqual(min);
      expect(week[muscle]).toBeLessThanOrEqual(max);
    }
  });

  it.each(allInputs)('trains each target muscle in at least 2 sessions a week (%o)', (input) => {
    const p = generateProgram(input);
    for (const muscle of TARGET_MUSCLES) {
      expect(p.days.filter((d) => sessionSets(d)[muscle] > 0).length).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(everyInput)('keeps every session to about an hour (%o)', (input) => {
    for (const day of generateProgram(input).days) expect(estimatedMinutes(day)).toBeLessThanOrEqual(60);
  });
});

describe('generateProgram — exercises and swaps', () => {
  it('trains shoulders and arms with a press, side and rear delts, two triceps and two curl moves', () => {
    const day = generateProgram({ level: 'intermediate', daysPerWeek: 6 }).days[1];
    expect(day.exercises.map((e) => e.slot)).toEqual([
      'overheadPress',
      'lateralRaise',
      'rearDelt',
      'tricepsPress',
      'triceps',
      'hammerCurl',
      'preacherCurl',
    ]);
  });

  it('pairs a triceps move with the elbows moving and one with the elbows pinned', () => {
    const day = generateProgram({ level: 'intermediate', daysPerWeek: 6 }).days[1];
    for (const ex of day.exercises.filter((e) => e.slot === 'tricepsPress')) {
      for (const id of [ex.exerciseId, ...ex.alternatives]) expect(CATALOG[id].mechanic).toBe('compound');
    }
    for (const ex of day.exercises.filter((e) => e.slot === 'triceps')) {
      for (const id of [ex.exerciseId, ...ex.alternatives]) expect(CATALOG[id].mechanic).toBe('isolation');
    }
  });

  it('never offers the same exercise in two slots, so a swap cannot repeat a move', () => {
    const seen = new Map<string, string>();
    for (const input of everyInput) {
      for (const day of generateProgram(input).days) {
        for (const ex of day.exercises) {
          for (const id of [ex.exerciseId, ...ex.alternatives]) {
            expect([id, seen.get(id) ?? ex.slot]).toEqual([id, ex.slot]);
            seen.set(id, ex.slot);
          }
        }
      }
    }
  });

  it.each(everyInput.filter((i) => i.level === 'beginner'))('never gives beginners a barbell (%o)', (input) => {
    for (const id of ids(input)) expect(CATALOG[id].equipment).not.toBe('barbell');
  });

  it('gives everyone the machine bench press and the hack squat', () => {
    // ranking: machine press first (user decision), so trained lifters no longer default to the barbell
    expect(ids({ level: 'intermediate', daysPerWeek: 6 })).toContain('Machine_Bench_Press');
    for (const level of LEVELS) expect(ids({ level, daysPerWeek: 6 })).toContain('Hack_Squat');
  });

  it.each([
    [6, 'arnold', 2],
    [5, 'arnold_upper_lower', 2],
    [5, 'arnold_upper_lower', 4],
    [4, 'upper_lower', 1],
  ] as const)('the %i-day %s leg session is the user design (day %i)', (days, split, index) => {
    const day = generateProgram({ level: 'intermediate', daysPerWeek: days, split }).days[index];
    expect(day.exercises.map((e) => e.slot)).toEqual([
      'squat',
      'legExtension',
      'hinge',
      'legCurl',
      'hipAbduction',
      'calves',
      'abs',
    ]);
  });

  it('chest & back is a flat press, an incline press, a fly, a pulldown, a machine row and a T-bar row', () => {
    const day = generateProgram({ level: 'intermediate', daysPerWeek: 6 }).days[0];
    expect(day.exercises.map((e) => e.slot)).toEqual([
      'chestPress',
      'inclinePress',
      'chestFly',
      'verticalPull',
      'row',
      'tBarRow',
    ]);
  });

  it('pull days use the same three back moves, then rear delts and two curls', () => {
    const day = generateProgram({ level: 'intermediate', daysPerWeek: 6, split: 'ppl' }).days[1];
    expect(day.exercises.map((e) => e.slot)).toEqual([
      'verticalPull',
      'row',
      'tBarRow',
      'rearDelt',
      'hammerCurl',
      'preacherCurl',
    ]);
  });

  it('defaults to the seated leg curl and standing calf raise', () => {
    const list = ids({ level: 'beginner', daysPerWeek: 6 });
    expect(list).toContain('Seated_Leg_Curl');
    expect(list).toContain('Standing_Calf_Raises');
  });

  it('gives squats and leg presses no hamstring credit', () => {
    for (const id of ['Barbell_Squat', 'Hack_Squat', 'Leg_Press', 'Smith_Machine_Squat', 'Dumbbell_Squat']) {
      expect(CATALOG[id].secondary).not.toContain('hamstrings');
    }
  });

  it.each(everyInput)('offers 2-3 alternatives that train the same main muscle (%o)', (input) => {
    for (const day of generateProgram(input).days) {
      for (const ex of day.exercises) {
        // squat2 and legExtension lose their third option to a hidden exercise (spec 3): one alternative left.
        const hasHidden = LEGACY_SLOT_OPTIONS[ex.slot].some((id) => HIDDEN.includes(id));
        expect(ex.alternatives.length).toBeGreaterThanOrEqual(hasHidden ? 1 : 2);
        expect(ex.alternatives.length).toBeLessThanOrEqual(3);
        for (const alt of ex.alternatives) {
          expect(alt).not.toBe(ex.exerciseId);
          expect(CATALOG[alt].primary).toEqual(expect.arrayContaining(CATALOG[ex.exerciseId].primary.slice(0, 1)));
          if (input.level === 'beginner') expect(CATALOG[alt].equipment).not.toBe('barbell');
        }
      }
    }
  });

  it('keeps a swap everywhere that exercise appears', () => {
    const base = generateProgram({ level: 'intermediate', daysPerWeek: 4 });
    // ranking: machine press first (user decision)
    const bench = base.days[0].exercises.find((e) => e.exerciseId === 'Machine_Bench_Press');
    expect(bench).toBeDefined();
    const swapped = generateProgram({
      level: 'intermediate',
      daysPerWeek: 4,
      swaps: { [bench!.slot]: 'Dumbbell_Bench_Press' },
    });
    const list = swapped.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
    expect(list).toContain('Dumbbell_Bench_Press');
    expect(list).not.toContain('Machine_Bench_Press');
  });

  it('ignores a swap that is not an alternative for that slot', () => {
    const base = ids({ level: 'beginner', daysPerWeek: 2 });
    const p = generateProgram({ level: 'beginner', daysPerWeek: 2, swaps: { chestPress: 'Barbell_Squat' } });
    expect(p.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))).toEqual(base);
  });

  it('never repeats an exercise in a session, whatever the swaps', () => {
    for (const input of everyInput) {
      for (const day of generateProgram(input).days) {
        for (const ex of day.exercises) {
          for (const alt of ex.alternatives) {
            const p = generateProgram({ ...input, swaps: { [ex.slot]: alt } });
            for (const d of p.days) {
              const list = d.exercises.map((e) => e.exerciseId);
              expect(new Set(list).size).toBe(list.length);
            }
          }
        }
      }
    }
  });
});

describe('generateProgram — lower-body focus', () => {
  it('offers one lower-body focus split for every number of days', () => {
    for (const d of DAYS) expect(splitOptions(d, 'lower_body').map((o) => o.split)).toEqual(['lower_body_focus']);
  });

  it.each([
    [2, ['Full body A', 'Full body B']],
    [3, ['Lower A', 'Upper', 'Lower B']],
    [4, ['Lower A', 'Upper', 'Lower B', 'Full body']],
    [5, ['Lower A', 'Upper', 'Lower B', 'Lower A', 'Upper']],
    [6, ['Lower A', 'Upper', 'Lower B', 'Upper', 'Lower A', 'Upper']],
  ] as const)('%i days gives the right sessions', (days, names) => {
    const p = generateProgram({ level: 'intermediate', daysPerWeek: days, focus: 'lower_body' });
    expect(p.split).toBe('lower_body_focus');
    expect(p.days.map((d) => d.name)).toEqual(names);
  });

  it('ignores a balanced split when the focus is lower body', () => {
    expect(generateProgram({ level: 'beginner', daysPerWeek: 6, split: 'ppl', focus: 'lower_body' }).split).toBe(
      'lower_body_focus',
    );
  });

  it('trains the upper body for posture: press, row, pulldown, shoulder press, rear delts, incline', () => {
    const upper = generateProgram({ level: 'intermediate', daysPerWeek: 3, focus: 'lower_body' }).days[1];
    expect(upper.exercises.map((e) => e.slot)).toEqual([
      'chestPress',
      'row',
      'verticalPull',
      'overheadPress',
      'rearDelt',
      'inclinePress',
    ]);
  });

  it.each(focusInputs)('gives glutes 10-16 sets, quads and hamstrings 6-12 (%o)', (input) => {
    const week = weeklySets(generateProgram(input));
    expect(week.glutes).toBeGreaterThanOrEqual(10);
    expect(week.glutes).toBeLessThanOrEqual(16);
    for (const m of ['quads', 'hamstrings'] as const) {
      expect([m, week[m] >= 6 && week[m] <= 12]).toEqual([m, true]);
    }
  });

  it.each(focusInputs)('still gives chest, back and shoulders 4+ sets a week (%o)', (input) => {
    const week = weeklySets(generateProgram(input));
    for (const m of UPPER_MUSCLES) expect([m, week[m] >= 4]).toEqual([m, true]);
  });

  it.each(focusInputs)('trains the lower body 2+ times and the upper body 1+ time a week (%o)', (input) => {
    const p = generateProgram(input);
    const sessions = (m: Muscle) => p.days.filter((d) => sessionSets(d)[m] > 0).length;
    for (const m of LOWER_MUSCLES) expect([m, sessions(m) >= 2]).toEqual([m, true]);
    for (const m of UPPER_MUSCLES) expect([m, sessions(m) >= 1]).toEqual([m, true]);
  });

  it.each(focusInputs)('gives the arms no direct work (%o)', (input) => {
    const slots = generateProgram(input).days.flatMap((d) => d.exercises.map((e) => e.slot));
    for (const slot of ['curl', 'hammerCurl', 'preacherCurl', 'triceps', 'tricepsPress'] as const) {
      expect(slots).not.toContain(slot);
    }
  });

  it('keeps the balanced program when no focus is given', () => {
    expect(generateProgram({ level: 'beginner', daysPerWeek: 3 }).split).toBe('full_body');
  });
});

describe('volume helpers', () => {
  it('counts primary sets fully and secondary sets as half', () => {
    const day = generateProgram({ level: 'intermediate', daysPerWeek: 6, split: 'arnold' as Split }).days[0];
    // ranking: machine press first (user decision); same chest and secondary muscles as the barbell press
    const bench = day.exercises.find((e) => e.exerciseId === 'Machine_Bench_Press');
    expect(bench).toBeDefined();
    expect(sessionSets({ ...day, exercises: [bench!] })).toMatchObject({ chest: 2, shoulders: 1, triceps: 1 });
  });
});

describe('alternatives', () => {
  it('finds the slot of a generator exercise', () => {
    expect(slotOf('Dumbbell_Bench_Press')).toBe('chestPress');
  });

  it('gives no slot to an exercise outside the generator', () => {
    expect(slotOf('bench_press')).toBeNull();
  });

  it.each(everyInput)('maps every planned exercise and alternative back to its slot (%o)', (input) => {
    for (const ex of generateProgram(input).days.flatMap((d) => d.exercises)) {
      for (const id of [ex.exerciseId, ...ex.alternatives]) expect(slotOf(id)).toBe(ex.slot);
    }
  });

  it('lists the other options for the slot, in order', () => {
    expect(slotAlternatives('chestPress', 'advanced', 'Barbell_Bench_Press_-_Medium_Grip')).toEqual([
      'Machine_Bench_Press',
      'Dumbbell_Bench_Press',
      'Leverage_Chest_Press',
    ]);
  });

  it('gives beginners no barbell alternatives', () => {
    const ids = slotAlternatives('chestPress', 'beginner', 'Machine_Bench_Press');
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(CATALOG[id].equipment).not.toBe('barbell');
  });

  it('knows which exercises a level can use in a slot', () => {
    expect(isSlotOption('chestPress', 'beginner', 'Barbell_Bench_Press_-_Medium_Grip')).toBe(false);
    expect(isSlotOption('chestPress', 'advanced', 'Barbell_Bench_Press_-_Medium_Grip')).toBe(true);
    expect(isSlotOption('chestPress', 'advanced', 'Pullups')).toBe(false);
  });
});

describe('slots read the exercise ranking', () => {
  const SLOTS = Object.keys(LEGACY_SLOT_OPTIONS) as Slot[];
  // The default of a slot is its first option for the level, which slotAlternatives hides from its own list.
  const firstOption = (slot: Slot, level: Level): string => {
    const probe = slotAlternatives(slot, level, '');
    return probe[0];
  };

  it('every legacy option keeps its slot', () => {
    for (const slot of SLOTS) for (const id of LEGACY_SLOT_OPTIONS[slot]) expect(slotOf(id)).toBe(slot);
  });

  it('defaults follow the ranking', () => {
    for (const slot of SLOTS) {
      const ranked = RANKING[SLOT_MUSCLE[slot]].find((e) => e.slot === slot && !HIDDEN.includes(e.exerciseId));
      if (ranked) expect(firstOption(slot, 'intermediate')).toBe(ranked.exerciseId);
    }
  });

  it('every slot has at least 3 options for every level', () => {
    for (const slot of SLOTS) {
      for (const level of LEVELS) {
        // Slots whose third legacy option is hidden (squat2, legExtension) keep two visible options.
        const hasHidden = LEGACY_SLOT_OPTIONS[slot].some((id) => HIDDEN.includes(id));
        expect(slotAlternatives(slot, level, firstOption(slot, level)).length).toBeGreaterThanOrEqual(hasHidden ? 1 : 2);
      }
    }
  });

  it('beginners never get barbell defaults or alternatives', () => {
    for (const slot of SLOTS) {
      for (const id of slotAlternatives(slot, 'beginner', '')) expect(CATALOG[id].equipment).not.toBe('barbell');
    }
  });

  it('hidden ids are never defaults or alternatives', () => {
    for (const slot of SLOTS) {
      for (const level of LEVELS) {
        for (const id of slotAlternatives(slot, level, '')) expect(HIDDEN).not.toContain(id);
      }
    }
  });

  it('hidden swaps still apply', () => {
    expect(HIDDEN.length).toBeGreaterThan(0);
    for (const id of HIDDEN) {
      const slot = slotOf(id);
      expect(slot).not.toBeNull();
      expect(isSlotOption(slot as Slot, 'advanced', id)).toBe(true);
      const program = generateProgram({
        level: 'advanced',
        daysPerWeek: 2,
        split: 'full_body',
        swaps: { [slot as Slot]: id },
      });
      const ids = program.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
      expect(ids).toContain(id);
    }
  });

  it('no generated day repeats an exercise', () => {
    for (const level of LEVELS) {
      for (const daysPerWeek of DAYS) {
        for (const focus of ['balanced', 'lower_body'] as const) {
          for (const { split } of splitOptions(daysPerWeek, focus)) {
            for (const day of generateProgram({ level, daysPerWeek, split, focus }).days) {
              const ids = day.exercises.map((e) => e.exerciseId);
              expect(new Set(ids).size).toBe(ids.length);
            }
          }
        }
      }
    }
  });
});
