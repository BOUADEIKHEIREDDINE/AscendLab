import { CATALOG, type Muscle } from './catalog';
import { FIRST_EXERCISE_WARM_UP_SET, warmUpFor, type WarmUp, type WarmUpSet } from './warm-up';

export type { Muscle } from './catalog';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export type Split =
  | 'full_body'
  | 'upper_lower'
  | 'arnold_upper_lower'
  | 'ppl_upper_lower'
  | 'arnold'
  | 'ppl'
  | 'lower_body_focus';

/** What the program emphasises. The app offers lower_body to women at signup. */
export type Focus = 'balanced' | 'lower_body';

/** A movement slot in a session; the user can swap the exercise that fills it. */
export type Slot =
  | 'squat'
  | 'squat2'
  | 'hinge'
  | 'legCurl'
  | 'legExtension'
  | 'calves'
  | 'hipAbduction'
  | 'hipThrust'
  | 'kickback'
  | 'splitSquat'
  | 'abs'
  | 'chestPress'
  | 'inclinePress'
  | 'chestFly'
  | 'row'
  | 'row2'
  | 'tBarRow'
  | 'verticalPull'
  | 'straightArm'
  | 'overheadPress'
  | 'lateralRaise'
  | 'rearDelt'
  | 'curl'
  | 'hammerCurl'
  | 'preacherCurl'
  /** Triceps with the elbows moving (dips, close-grip presses). */
  | 'tricepsPress'
  /** Triceps with the elbows pinned (pushdowns, extensions). */
  | 'triceps';

export type ProgramInput = {
  level: Level;
  daysPerWeek: number;
  /** Defaults to the first option of splitOptions(daysPerWeek). */
  split?: Split;
  /** Defaults to balanced. lower_body replaces the split with the lower-body focus week. */
  focus?: Focus;
  /** Exercise chosen by the user for a slot; kept everywhere that slot appears. */
  swaps?: Partial<Record<Slot, string>>;
  /** Week number since the program started (0-based). 3-day full body alternates A/B/A and B/A/B. */
  week?: number;
};

/** - beginner_many_days: 5+ days for a beginner; 3-4 days is plenty when starting (Barcelos 2018) */
export type ProgramNotice = 'beginner_many_days';

export type PlannedExercise = {
  slot: Slot;
  exerciseId: string;
  /** 2-3 other exercises for the same slot the user can swap to. */
  alternatives: string[];
  sets: number;
  repMin: number;
  repMax: number;
  /** Every working set goes to technical failure (last rep with good form). */
  toFailure: boolean;
  /** Default rest; the user can change it. */
  restSec: number;
  /** One light set before the working sets; only on the session's first exercise. */
  warmUpSet?: WarmUpSet;
};

export type ProgramDay = { name: string; warmUp: WarmUp; exercises: PlannedExercise[] };

export type Program = { split: Split; days: ProgramDay[]; notices: ProgramNotice[] };

export type SplitOption = { split: Split; label: string; description: string };

const SETS = 2;
/** Slots with a different set count (user decision: 3 sets of abs). */
const SLOT_SETS: Partial<Record<Slot, number>> = { abs: 3 };
const REP_MIN = 6;
const REP_MAX = 10;
const REST_SEC = { isolation: 150, upperCompound: 180, lowerCompound: 240 };
/** A set counts fully for its primary muscles and half for its secondary ones (Pelland 2026). */
const SECONDARY_SET_WEIGHT = 0.5;
const MAX_ALTERNATIVES = 3;
const BEGINNER_MANY_DAYS = 5;
/** Session time model: ~45 s per set plus ~2 min to set up each exercise. */
const SET_SEC = 45;
const SETUP_SEC = 120;

/**
 * Exercises per slot, all for a full gym. The first is the default for trained lifters; beginners
 * get the first one without a barbell (failure under a bar is the risky part). The others are the
 * swap alternatives. An exercise belongs to one slot only, so no swap can repeat a move in a session.
 */
const SLOT_OPTIONS: Record<Slot, string[]> = {
  squat: ['Hack_Squat', 'Barbell_Squat', 'Smith_Machine_Squat', 'Dumbbell_Squat'],
  squat2: ['Leg_Press', 'Smith_Machine_Leg_Press', 'Narrow_Stance_Leg_Press'],
  splitSquat: ['Ascend_Bulgarian_Split_Squat', 'Smith_Single-Leg_Split_Squat', 'Dumbbell_Rear_Lunge', 'Dumbbell_Lunges'],
  hinge: [
    'Romanian_Deadlift',
    'Stiff-Legged_Dumbbell_Deadlift',
    'Smith_Machine_Stiff-Legged_Deadlift',
    'Kettlebell_One-Legged_Deadlift',
  ],
  legCurl: ['Seated_Leg_Curl', 'Lying_Leg_Curls', 'Standing_Leg_Curl'],
  legExtension: ['Leg_Extensions', 'Single-Leg_Leg_Extension', 'Split_Squat_with_Dumbbells'],
  calves: ['Standing_Calf_Raises', 'Seated_Calf_Raise', 'Calf_Press_On_The_Leg_Press_Machine'],
  hipAbduction: ['Thigh_Abductor', 'Ascend_Cable_Hip_Abduction', 'Ascend_Multi_Hip_Abduction'],
  hipThrust: [
    'Barbell_Hip_Thrust',
    'Ascend_Hip_Thrust_Machine',
    'Ascend_Smith_Machine_Hip_Thrust',
    'Barbell_Glute_Bridge',
    'Single_Leg_Glute_Bridge',
  ],
  kickback: ['One-Legged_Cable_Kickback', 'Ascend_Glute_Kickback_Machine', 'Glute_Kickback'],
  abs: ['Ab_Crunch_Machine', 'Cable_Crunch', 'Cable_Seated_Crunch', 'Decline_Crunch'],
  chestPress: [
    'Barbell_Bench_Press_-_Medium_Grip',
    'Machine_Bench_Press',
    'Dumbbell_Bench_Press',
    'Leverage_Chest_Press',
  ],
  inclinePress: [
    'Barbell_Incline_Bench_Press_-_Medium_Grip',
    'Leverage_Incline_Chest_Press',
    'Incline_Dumbbell_Press',
    'Incline_Cable_Chest_Press',
  ],
  chestFly: ['Butterfly', 'Dumbbell_Flyes', 'Flat_Bench_Cable_Flyes'],
  row: ['Seated_Cable_Rows', 'Leverage_Iso_Row', 'Seated_One-arm_Cable_Pulley_Rows'],
  row2: ['One-Arm_Dumbbell_Row', 'Leverage_High_Row', 'Bent_Over_Two-Dumbbell_Row'],
  tBarRow: [
    'T-Bar_Row_with_Handle',
    'Lying_T-Bar_Row',
    'Bent_Over_Barbell_Row',
    'Smith_Machine_Bent_Over_Row',
    'Dumbbell_Incline_Row',
  ],
  verticalPull: ['Wide-Grip_Lat_Pulldown', 'Close-Grip_Front_Lat_Pulldown', 'Pullups', 'V-Bar_Pulldown'],
  straightArm: ['Straight-Arm_Pulldown', 'Rope_Straight-Arm_Pulldown', 'One_Arm_Lat_Pulldown'],
  overheadPress: [
    'Seated_Barbell_Military_Press',
    'Machine_Shoulder_Military_Press',
    'Dumbbell_Shoulder_Press',
    'Arnold_Dumbbell_Press',
  ],
  lateralRaise: ['Side_Lateral_Raise', 'Cable_Seated_Lateral_Raise', 'Seated_Side_Lateral_Raise', 'One-Arm_Side_Laterals'],
  rearDelt: ['Reverse_Flyes', 'Cable_Rear_Delt_Fly', 'Face_Pull', 'Seated_Bent-Over_Rear_Delt_Raise'],
  curl: ['Dumbbell_Bicep_Curl', 'Barbell_Curl', 'Standing_Biceps_Cable_Curl', 'Incline_Dumbbell_Curl', 'Machine_Bicep_Curl'],
  hammerCurl: [
    'Hammer_Curls',
    'Cable_Hammer_Curls_-_Rope_Attachment',
    'Cross_Body_Hammer_Curl',
    'Preacher_Hammer_Dumbbell_Curl',
  ],
  preacherCurl: ['Machine_Preacher_Curls', 'Preacher_Curl', 'Two-Arm_Dumbbell_Preacher_Curl', 'Cable_Preacher_Curl'],
  tricepsPress: [
    'Dip_Machine',
    'Dips_-_Triceps_Version',
    'Close-Grip_Barbell_Bench_Press',
    'Smith_Machine_Close-Grip_Bench_Press',
  ],
  triceps: [
    'Triceps_Pushdown',
    'Triceps_Pushdown_-_Rope_Attachment',
    'Cable_Rope_Overhead_Triceps_Extension',
    'Machine_Triceps_Extension',
    'Standing_Dumbbell_Triceps_Extension',
  ],
};

type DayTemplate = { name: string; slots: Slot[] };

/** The user's legs day, also used for every lower day. */
const LEG_SLOTS: Slot[] = ['squat', 'legExtension', 'hinge', 'legCurl', 'hipAbduction', 'calves', 'abs'];

// Chest, back, shoulders, biceps, triceps, quads and hamstrings get 6-8 weekly sets on 2 days, 8-12 on
// 3 days (the same A/B sessions, alternating A/B/A and B/A/B) and 10-16 on 4-6 days (indirect sets count half; shoulders run higher, see the tests), each muscle in
// 2+ sessions, sessions under an hour (quads and hamstrings get 8 on 4-6 days: the user's legs day).
// User-designed: shoulders & arms, legs/lower, chest & back, pull. Upper and push days were drafted
// to meet the rules and approved as is (docs/Technical/Program generation.md).
// prettier-ignore
const DAY = {
  // Same A/B for 2 and 3 days (user decision); a lateral raise every session (side delts).
  fullA: { name: 'Full body A', slots: ['squat', 'legCurl', 'hinge', 'chestPress', 'lateralRaise', 'row', 'verticalPull', 'curl', 'triceps'] },
  fullB: { name: 'Full body B', slots: ['squat2', 'legExtension', 'legCurl', 'inclinePress', 'chestFly', 'tBarRow', 'verticalPull', 'lateralRaise', 'triceps'] },
  upperA: { name: 'Upper A', slots: ['chestPress', 'row', 'inclinePress', 'verticalPull', 'overheadPress', 'straightArm', 'curl', 'tricepsPress'] },
  upperB: { name: 'Upper B', slots: ['inclinePress', 'row2', 'chestPress', 'verticalPull', 'overheadPress', 'hammerCurl', 'preacherCurl', 'tricepsPress'] },
  lowerA: { name: 'Lower A', slots: LEG_SLOTS },
  lowerB: { name: 'Lower B', slots: LEG_SLOTS },
  chestBack: { name: 'Chest & back', slots: ['chestPress', 'inclinePress', 'chestFly', 'verticalPull', 'row', 'tBarRow'] },
  shouldersArms: { name: 'Shoulders & arms', slots: ['overheadPress', 'lateralRaise', 'rearDelt', 'tricepsPress', 'triceps', 'hammerCurl', 'preacherCurl'] },
  legs: { name: 'Legs', slots: LEG_SLOTS },
  push: { name: 'Push', slots: ['chestPress', 'inclinePress', 'chestFly', 'overheadPress', 'lateralRaise', 'tricepsPress', 'triceps'] },
  pull: { name: 'Pull', slots: ['verticalPull', 'row', 'tBarRow', 'rearDelt', 'hammerCurl', 'preacherCurl'] },
  upper: { name: 'Upper', slots: ['chestPress', 'row', 'inclinePress', 'verticalPull', 'overheadPress', 'straightArm', 'curl', 'tricepsPress'] },
  lower: { name: 'Lower', slots: LEG_SLOTS },
} satisfies Record<string, DayTemplate>;

// Lower-body focus (research of 2026-10-26, docs/Research/Evidence/Training - Women.md): glutes
// 10-16 weekly sets from a squat, a hip thrust, a kickback and abduction (Krause Neto 2025,
// Plotkin 2023, Attarieh 2026); quads and hamstrings 6-12; one posture-focused upper day keeps
// chest, back and shoulders at 4+ sets (Spiering 2021, Pelland 2026). Arms only get indirect work.
// prettier-ignore
const FOCUS_DAY = {
  lowerA: { name: 'Lower A', slots: ['squat', 'legExtension', 'hipThrust', 'legCurl', 'hipAbduction', 'abs'] },
  lowerB: { name: 'Lower B', slots: ['hinge', 'splitSquat', 'kickback', 'legCurl', 'hipAbduction', 'calves', 'abs'] },
  upper: { name: 'Upper', slots: ['chestPress', 'row', 'verticalPull', 'overheadPress', 'rearDelt', 'inclinePress'] },
  fullA: { name: 'Full body A', slots: ['squat', 'hipThrust', 'hipAbduction', 'legCurl', 'chestPress', 'row', 'abs'] },
  fullB: { name: 'Full body B', slots: ['hinge', 'splitSquat', 'kickback', 'hipAbduction', 'legExtension', 'verticalPull', 'inclinePress'] },
  full: { name: 'Full body', slots: ['squat2', 'hipThrust', 'legCurl', 'chestPress', 'verticalPull', 'rearDelt'] },
} satisfies Record<string, DayTemplate>;

const FOCUS_WEEK: Record<number, DayTemplate[]> = {
  2: [FOCUS_DAY.fullA, FOCUS_DAY.fullB],
  3: [FOCUS_DAY.lowerA, FOCUS_DAY.upper, FOCUS_DAY.lowerB],
  4: [FOCUS_DAY.lowerA, FOCUS_DAY.upper, FOCUS_DAY.lowerB, FOCUS_DAY.full],
  5: [FOCUS_DAY.lowerA, FOCUS_DAY.upper, FOCUS_DAY.lowerB, FOCUS_DAY.lowerA, FOCUS_DAY.upper],
  // A third lower day would push glutes past 16 sets; the extra day goes to the upper body.
  6: [FOCUS_DAY.lowerA, FOCUS_DAY.upper, FOCUS_DAY.lowerB, FOCUS_DAY.upper, FOCUS_DAY.lowerA, FOCUS_DAY.upper],
};

const SPLITS: Record<Exclude<Split, 'lower_body_focus'>, { label: string; description: string; week: DayTemplate[] }> = {
  full_body: {
    label: 'Full body',
    description: 'Every session trains the whole body.',
    week: [DAY.fullA, DAY.fullB],
  },
  upper_lower: {
    label: 'Upper / Lower',
    description: 'Upper-body and lower-body days, each twice a week.',
    week: [DAY.upperA, DAY.lowerA, DAY.upperB, DAY.lowerB],
  },
  arnold_upper_lower: {
    label: 'Arnold + Upper / Lower',
    description: 'Chest & back, shoulders & arms, legs, then an upper and a lower day.',
    week: [DAY.chestBack, DAY.shouldersArms, DAY.legs, DAY.upper, DAY.lower],
  },
  ppl_upper_lower: {
    label: 'Push / Pull / Legs + Upper / Lower',
    description: 'Push, pull and legs days, then an upper and a lower day.',
    week: [DAY.push, DAY.pull, DAY.legs, DAY.upper, DAY.lower],
  },
  arnold: {
    label: 'Arnold split',
    description: 'Chest & back, shoulders & arms, legs, all twice a week.',
    week: [DAY.chestBack, DAY.shouldersArms, DAY.legs, DAY.chestBack, DAY.shouldersArms, DAY.legs],
  },
  ppl: {
    label: 'Push / Pull / Legs',
    description: 'Push, pull and legs days, all twice a week.',
    week: [DAY.push, DAY.pull, DAY.legs, DAY.push, DAY.pull, DAY.legs],
  },
};

const LOWER_BODY_FOCUS: SplitOption = {
  split: 'lower_body_focus',
  label: 'Lower body focus',
  description: 'Most sets for glutes and legs, with an upper-body day for posture.',
};

/** Splits that fit each number of days, default first. */
const SPLITS_BY_DAYS: Record<number, Exclude<Split, 'lower_body_focus'>[]> = {
  2: ['full_body'],
  3: ['full_body'],
  4: ['upper_lower'],
  5: ['arnold_upper_lower', 'ppl_upper_lower'],
  6: ['arnold', 'ppl'],
};

function assertDays(daysPerWeek: number): void {
  if (!(daysPerWeek in SPLITS_BY_DAYS)) {
    throw new RangeError(`daysPerWeek must be 2-6, got ${daysPerWeek}`);
  }
}

/** The splits a user can pick for their number of days; the first one is the default. */
export function splitOptions(daysPerWeek: number, focus: Focus = 'balanced'): SplitOption[] {
  assertDays(daysPerWeek);
  if (focus === 'lower_body') return [LOWER_BODY_FOCUS];
  return SPLITS_BY_DAYS[daysPerWeek].map((split) => ({
    split,
    label: SPLITS[split].label,
    description: SPLITS[split].description,
  }));
}

function weekFor(split: Split, daysPerWeek: number, week: number): DayTemplate[] {
  if (split === 'lower_body_focus') return FOCUS_WEEK[daysPerWeek];
  if (split === 'full_body' && daysPerWeek === 3) {
    // Alternate weeks so A and B each come up 1.5 times a week on average.
    return week % 2 === 0 ? [DAY.fullA, DAY.fullB, DAY.fullA] : [DAY.fullB, DAY.fullA, DAY.fullB];
  }
  return SPLITS[split].week;
}

function optionsFor(slot: Slot, level: Level): string[] {
  const options = SLOT_OPTIONS[slot];
  return level === 'beginner' ? options.filter((id) => CATALOG[id].equipment !== 'barbell') : options;
}

/** The slot an exercise fills, or null for exercises outside the generator's lists. */
export function slotOf(exerciseId: string): Slot | null {
  for (const slot of Object.keys(SLOT_OPTIONS) as Slot[]) {
    if (SLOT_OPTIONS[slot].includes(exerciseId)) return slot;
  }
  return null;
}

/** The other exercises a level can swap to in a slot, in the generator's order. */
export function slotAlternatives(slot: Slot, level: Level, currentId: string): string[] {
  return optionsFor(slot, level).filter((id) => id !== currentId).slice(0, MAX_ALTERNATIVES);
}

/** Whether the exercise is one of the slot's own options for this level. */
export function isSlotOption(slot: Slot, level: Level, exerciseId: string): boolean {
  return optionsFor(slot, level).includes(exerciseId);
}

function restSec(exerciseId: string): number {
  const { mechanic, region } = CATALOG[exerciseId];
  if (mechanic === 'isolation') return REST_SEC.isolation;
  return region === 'upper' ? REST_SEC.upperCompound : REST_SEC.lowerCompound;
}

function planExercise(slot: Slot, level: Level, swaps: ProgramInput['swaps']): PlannedExercise {
  const options = optionsFor(slot, level);
  const swap = swaps?.[slot];
  const exerciseId = swap && options.includes(swap) ? swap : options[0];
  return {
    slot,
    exerciseId,
    alternatives: slotAlternatives(slot, level, exerciseId),
    sets: SLOT_SETS[slot] ?? SETS,
    repMin: REP_MIN,
    repMax: REP_MAX,
    toFailure: true,
    restSec: restSec(exerciseId),
  };
}

function buildDays(templates: DayTemplate[], level: Level, swaps: ProgramInput['swaps']): ProgramDay[] {
  return templates.map((day) => {
    const exercises = day.slots.map((slot, i) => ({
      ...planExercise(slot, level, swaps),
      ...(i === 0 && { warmUpSet: FIRST_EXERCISE_WARM_UP_SET }),
    }));
    return { name: day.name, warmUp: warmUpFor(exercises), exercises };
  });
}

function chosenSplit({ daysPerWeek, split, focus }: ProgramInput): Split {
  assertDays(daysPerWeek);
  return focus === 'lower_body' ? 'lower_body_focus' : balancedSplit(daysPerWeek, split);
}

/** A week of gym sessions for the user's level and schedule. */
export function generateProgram(input: ProgramInput): Program {
  const { level, daysPerWeek, swaps, week = 0 } = input;
  const chosen = chosenSplit(input);
  return {
    split: chosen,
    days: buildDays(weekFor(chosen, daysPerWeek, week), level, swaps),
    notices: level === 'beginner' && daysPerWeek >= BEGINNER_MANY_DAYS ? ['beginner_many_days'] : [],
  };
}

/**
 * The repeating order of sessions. Training follows it session by session, not by calendar date,
 * so a missed session moves to the next training day. Full body is A, B, A, B... on 2 or 3 days.
 */
export function programCycle(input: ProgramInput): ProgramDay[] {
  const chosen = chosenSplit(input);
  const templates = chosen === 'full_body' ? SPLITS.full_body.week : weekFor(chosen, input.daysPerWeek, 0);
  return buildDays(templates, input.level, input.swaps);
}

function balancedSplit(daysPerWeek: number, split: Split | undefined): Split {
  const allowed: Split[] = SPLITS_BY_DAYS[daysPerWeek];
  const chosen = split ?? allowed[0];
  if (!allowed.includes(chosen)) {
    throw new RangeError(`${chosen} does not fit ${daysPerWeek} days a week`);
  }
  return chosen;
}

function emptyVolume(): Record<Muscle, number> {
  return {
    chest: 0,
    back: 0,
    shoulders: 0,
    biceps: 0,
    triceps: 0,
    quads: 0,
    hamstrings: 0,
    glutes: 0,
    calves: 0,
    abs: 0,
  };
}

/** Fractional sets per muscle in one session. */
export function sessionSets(day: ProgramDay): Record<Muscle, number> {
  const volume = emptyVolume();
  for (const ex of day.exercises) {
    const { primary, secondary } = CATALOG[ex.exerciseId];
    for (const m of primary) volume[m] += ex.sets;
    for (const m of secondary) volume[m] += ex.sets * SECONDARY_SET_WEIGHT;
  }
  return volume;
}

/** Fractional sets per muscle over the week. */
export function weeklySets(program: Program): Record<Muscle, number> {
  const volume = emptyVolume();
  for (const day of program.days) {
    const session = sessionSets(day);
    for (const m of Object.keys(volume) as Muscle[]) volume[m] += session[m];
  }
  return volume;
}

/** Rough session length in minutes: sets, one rest per exercise between its sets, setup. */
export function estimatedMinutes(day: ProgramDay): number {
  const seconds = day.exercises.reduce(
    (total, ex) => total + ex.sets * SET_SEC + (ex.sets - 1) * ex.restSec + SETUP_SEC,
    0,
  );
  return Math.round(seconds / 60);
}
