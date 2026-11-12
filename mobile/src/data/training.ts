/**
 * Exercises, routines, live workouts and workout maths.
 * Ported from Exercises.kt and Training.kt; stored shapes are identical so data written
 * by the Android app reads back here and vice versa.
 */
import { CATALOG, type Muscle as CatalogMuscle } from '../lib/program-generator/catalog';
import { DB_EXERCISES, dbFind, equipmentOfDb, generatorMusclesOfDb, groupOfDbMuscle, photoUrls } from './exerciseDb';
import { isSlot, isSlotOption, SETS, slotOf, type Level as EngineLevel, type ProgramDay, type Slot } from '../lib/program-generator/program';
import { ALSO, RANKING, rankOf as rankingOf, type RankedMuscle } from '../lib/program-generator/ranking';
import { volumeNotices, type VolumeNotice, type VolumeSession } from '../lib/program-generator/volume-notice';
import { Convert, gymPlan, planDays, PlanCalculator, roundInt, Units, UNIT, UserProfile } from './profile';
import type { ExercisePlan } from './progress';

export type Muscle = 'CHEST' | 'BACK' | 'SHOULDERS' | 'ARMS' | 'LEGS' | 'GLUTES' | 'CORE' | 'CARDIO' | 'OTHER';
export const MUSCLES: Muscle[] = ['CHEST', 'BACK', 'SHOULDERS', 'ARMS', 'LEGS', 'GLUTES', 'CORE', 'CARDIO', 'OTHER'];
export const MUSCLE_LABEL: Record<Muscle, string> = {
  CHEST: 'Chest', BACK: 'Back', SHOULDERS: 'Shoulders', ARMS: 'Arms', LEGS: 'Legs',
  GLUTES: 'Glutes', CORE: 'Core', CARDIO: 'Cardio', OTHER: 'Other',
};

export type Equipment = 'BARBELL' | 'DUMBBELL' | 'MACHINE' | 'CABLE' | 'BODYWEIGHT' | 'KETTLEBELL' | 'BAND' | 'OTHER';
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  BARBELL: 'Barbell', DUMBBELL: 'Dumbbell', MACHINE: 'Machine', CABLE: 'Cable',
  BODYWEIGHT: 'Bodyweight', KETTLEBELL: 'Kettlebell', BAND: 'Band', OTHER: 'Other',
};

/**
 * One movement. Custom exercises use an id starting with "custom:". `media` links an entry of the
 * older hand list to the same exercise in free-exercise-db: its photos and instructions, and the
 * id it shares history with.
 */
export interface Exercise { id: string; name: string; muscle: Muscle; equipment: Equipment; media?: string }

const e = (id: string, name: string, muscle: Muscle, equipment: Equipment, media?: string): Exercise =>
  (media ? { id, name, muscle, equipment, media } : { id, name, muscle, equipment });

/** The built-in exercise library. Ids never change, since workouts and routines refer to them. */
export const EXERCISES: Exercise[] = [
  // Chest
  e('bench_press', 'Bench Press', 'CHEST', 'BARBELL', 'Barbell_Bench_Press_-_Medium_Grip'),
  e('incline_bench_press', 'Incline Bench Press', 'CHEST', 'BARBELL', 'Barbell_Incline_Bench_Press_-_Medium_Grip'),
  e('db_bench_press', 'Dumbbell Bench Press', 'CHEST', 'DUMBBELL', 'Dumbbell_Bench_Press'),
  e('incline_db_press', 'Incline Dumbbell Press', 'CHEST', 'DUMBBELL', 'Incline_Dumbbell_Press'),
  e('chest_fly_machine', 'Chest Fly (Machine)', 'CHEST', 'MACHINE', 'Butterfly'),
  e('cable_crossover', 'Cable Crossover', 'CHEST', 'CABLE', 'Cable_Crossover'),
  e('chest_press_machine', 'Chest Press (Machine)', 'CHEST', 'MACHINE', 'Leverage_Chest_Press'),
  e('push_up', 'Push-up', 'CHEST', 'BODYWEIGHT', 'Pushups'),
  e('knee_push_up', 'Knee Push-up', 'CHEST', 'BODYWEIGHT'),
  e('dips', 'Dips', 'CHEST', 'BODYWEIGHT', 'Dips_-_Chest_Version'),
  // Back
  e('deadlift', 'Deadlift', 'BACK', 'BARBELL', 'Barbell_Deadlift'),
  e('barbell_row', 'Barbell Row', 'BACK', 'BARBELL', 'Bent_Over_Barbell_Row'),
  e('db_row', 'Dumbbell Row', 'BACK', 'DUMBBELL', 'One-Arm_Dumbbell_Row'),
  e('lat_pulldown', 'Lat Pulldown', 'BACK', 'CABLE', 'Wide-Grip_Lat_Pulldown'),
  e('seated_cable_row', 'Seated Cable Row', 'BACK', 'CABLE', 'Seated_Cable_Rows'),
  e('pull_up', 'Pull-up', 'BACK', 'BODYWEIGHT', 'Pullups'),
  e('chin_up', 'Chin-up', 'BACK', 'BODYWEIGHT', 'Chin-Up'),
  e('inverted_row', 'Inverted Row', 'BACK', 'BODYWEIGHT', 'Inverted_Row'),
  e('band_row', 'Band Row', 'BACK', 'BAND'),
  e('back_extension', 'Back Extension', 'BACK', 'BODYWEIGHT', 'Hyperextensions_Back_Extensions'),
  // Shoulders
  e('overhead_press', 'Overhead Press', 'SHOULDERS', 'BARBELL', 'Standing_Military_Press'),
  e('db_shoulder_press', 'Dumbbell Shoulder Press', 'SHOULDERS', 'DUMBBELL', 'Dumbbell_Shoulder_Press'),
  e('lateral_raise', 'Lateral Raise', 'SHOULDERS', 'DUMBBELL', 'Side_Lateral_Raise'),
  e('face_pull', 'Face Pull', 'SHOULDERS', 'CABLE', 'Face_Pull'),
  e('rear_delt_fly', 'Rear Delt Fly', 'SHOULDERS', 'DUMBBELL', 'Reverse_Flyes'),
  e('pike_push_up', 'Pike Push-up', 'SHOULDERS', 'BODYWEIGHT'),
  e('shoulder_press_machine', 'Shoulder Press (Machine)', 'SHOULDERS', 'MACHINE', 'Machine_Shoulder_Military_Press'),
  // Arms
  e('barbell_curl', 'Barbell Curl', 'ARMS', 'BARBELL', 'Barbell_Curl'),
  e('db_curl', 'Dumbbell Curl', 'ARMS', 'DUMBBELL', 'Dumbbell_Bicep_Curl'),
  e('hammer_curl', 'Hammer Curl', 'ARMS', 'DUMBBELL', 'Hammer_Curls'),
  e('cable_curl', 'Cable Curl', 'ARMS', 'CABLE', 'Standing_Biceps_Cable_Curl'),
  e('triceps_pushdown', 'Triceps Pushdown', 'ARMS', 'CABLE', 'Triceps_Pushdown'),
  e('skull_crusher', 'Skull Crusher', 'ARMS', 'BARBELL', 'EZ-Bar_Skullcrusher'),
  e('overhead_triceps_ext', 'Overhead Triceps Extension', 'ARMS', 'DUMBBELL', 'Standing_Dumbbell_Triceps_Extension'),
  e('bench_dip', 'Bench Dip', 'ARMS', 'BODYWEIGHT', 'Bench_Dips'),
  // Legs
  e('squat', 'Squat', 'LEGS', 'BARBELL', 'Barbell_Squat'),
  e('front_squat', 'Front Squat', 'LEGS', 'BARBELL', 'Front_Barbell_Squat'),
  e('goblet_squat', 'Goblet Squat', 'LEGS', 'DUMBBELL', 'Goblet_Squat'),
  e('bodyweight_squat', 'Bodyweight Squat', 'LEGS', 'BODYWEIGHT', 'Bodyweight_Squat'),
  e('leg_press', 'Leg Press', 'LEGS', 'MACHINE', 'Leg_Press'),
  e('leg_extension', 'Leg Extension', 'LEGS', 'MACHINE', 'Leg_Extensions'),
  e('leg_curl', 'Leg Curl', 'LEGS', 'MACHINE', 'Lying_Leg_Curls'),
  e('lunge', 'Lunge', 'LEGS', 'BODYWEIGHT', 'Bodyweight_Walking_Lunge'),
  e('db_lunge', 'Dumbbell Lunge', 'LEGS', 'DUMBBELL', 'Dumbbell_Lunges'),
  e('bulgarian_split_squat', 'Bulgarian Split Squat', 'LEGS', 'DUMBBELL', 'Split_Squat_with_Dumbbells'),
  e('romanian_deadlift', 'Romanian Deadlift', 'LEGS', 'BARBELL', 'Romanian_Deadlift'),
  e('db_romanian_deadlift', 'Dumbbell Romanian Deadlift', 'LEGS', 'DUMBBELL', 'Stiff-Legged_Dumbbell_Deadlift'),
  e('calf_raise', 'Calf Raise', 'LEGS', 'BODYWEIGHT'),
  e('standing_calf_raise_machine', 'Standing Calf Raise (Machine)', 'LEGS', 'MACHINE', 'Standing_Calf_Raises'),
  // Glutes
  e('hip_thrust', 'Hip Thrust', 'GLUTES', 'BARBELL', 'Barbell_Hip_Thrust'),
  e('glute_bridge', 'Glute Bridge', 'GLUTES', 'BODYWEIGHT', 'Butt_Lift_Bridge'),
  e('kettlebell_swing', 'Kettlebell Swing', 'GLUTES', 'KETTLEBELL'),
  e('cable_kickback', 'Cable Kickback', 'GLUTES', 'CABLE', 'One-Legged_Cable_Kickback'),
  e('step_up', 'Step-up', 'GLUTES', 'BODYWEIGHT'),
  // Core
  e('plank', 'Plank (seconds)', 'CORE', 'BODYWEIGHT', 'Plank'),
  e('crunch', 'Crunch', 'CORE', 'BODYWEIGHT', 'Crunches'),
  e('hanging_leg_raise', 'Hanging Leg Raise', 'CORE', 'BODYWEIGHT', 'Hanging_Leg_Raise'),
  e('russian_twist', 'Russian Twist', 'CORE', 'BODYWEIGHT', 'Russian_Twist'),
  e('cable_crunch', 'Cable Crunch', 'CORE', 'CABLE', 'Cable_Crunch'),
  e('dead_bug', 'Dead Bug', 'CORE', 'BODYWEIGHT', 'Dead_Bug'),
  e('mountain_climber', 'Mountain Climber', 'CORE', 'BODYWEIGHT', 'Mountain_Climbers'),
  // Cardio
  e('burpee', 'Burpee', 'CARDIO', 'BODYWEIGHT'),
  e('jumping_jack', 'Jumping Jack', 'CARDIO', 'BODYWEIGHT'),
  e('rowing_machine', 'Rowing Machine (minutes)', 'CARDIO', 'MACHINE'),
  e('jump_rope', 'Jump Rope (minutes)', 'CARDIO', 'OTHER'),
];

const byId = new Map(EXERCISES.map((x) => [x.id, x]));

/** The program generator's exercises (free-exercise-db ids), in this library's shape. */
const MUSCLE_OF: Record<CatalogMuscle, Muscle> = {
  chest: 'CHEST', back: 'BACK', shoulders: 'SHOULDERS', biceps: 'ARMS', triceps: 'ARMS',
  quads: 'LEGS', hamstrings: 'LEGS', calves: 'LEGS', glutes: 'GLUTES', abs: 'CORE',
};
Object.values(CATALOG).forEach((x) => {
  if (!byId.has(x.id)) byId.set(x.id, e(x.id, x.name, MUSCLE_OF[x.primary[0]] ?? 'OTHER', x.equipment.toUpperCase() as Equipment));
});
// The rest of free-exercise-db's gym exercises.
DB_EXERCISES.forEach((x) => {
  if (!byId.has(x.id)) byId.set(x.id, e(x.id, x.name, groupOfDbMuscle(x.primaryMuscles[0] ?? ''), equipmentOfDb(x.equipment)));
});
/** What search and the picker list: one entry per real exercise, so linked hand-list entries are left out. */
/** Lower case, letters and digits only: "Pull-up" and "Pullups" compare, "(Machine)" loses its brackets. */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
/** Hidden hand-list names stay findable as aliases of the database twin, e.g. "Bench Press". */
const aliases = new Map<string, string[]>();
EXERCISES.forEach((x) => { if (x.media) aliases.set(x.media, [...(aliases.get(x.media) ?? []), x.name]); });
/**
 * What search and the picker list: one entry per real exercise, so linked hand-list entries are left
 * out. Sorted by name once here, with names already normalised, since the picker searches often.
 */
const SEARCHABLE = [...byId.values()].filter((x) => !x.media)
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((x) => ({ x, names: [x.name, ...(aliases.get(x.id) ?? [])].map(norm) }));
const KNOWN_NAMES = new Set(SEARCHABLE.flatMap((s) => s.names));

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How to do an exercise, from free-exercise-db. */
export interface HowTo { images: string[]; instructions: string[]; primary: string[]; secondary: string[]; equipment: string; level: string }

/** The ranked muscles each picker group shows first. */
export const GROUP_MUSCLES: Record<Muscle, RankedMuscle[]> = {
  CHEST: ['chest', 'upperChest'],
  BACK: ['lats', 'midBack'],
  SHOULDERS: ['frontDelts', 'sideDelts', 'rearDelts'],
  ARMS: ['biceps', 'triceps'],
  LEGS: ['quads', 'hamstrings', 'calves'],
  GLUTES: ['glutes'],
  CORE: ['abs'],
  CARDIO: [],
  OTHER: [],
};

/** The group's ranked exercise ids interleaved by rank: all #1s, then all #2s, and so on. */
function interleavedRanking(group: Muscle): string[] {
  const lists = GROUP_MUSCLES[group].map((m) => RANKING[m]);
  const out: string[] = [];
  for (let i = 0; i < Math.max(0, ...lists.map((l) => l.length)); i++) for (const l of lists) if (l[i]) out.push(l[i].exerciseId);
  return out;
}

export const ExerciseLibrary = {
  /** Any exercise by id: hand list (also the linked ones), generator, database. */
  find: (id: string) => byId.get(id),
  custom(name: string): Exercise {
    const trimmed = name.trim();
    return e('custom:' + trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_'), trimmed, 'OTHER', 'OTHER');
  },
  /** The id history is grouped by: a linked hand-list id and its database id are the same exercise. */
  key: (id: string): string => byId.get(id)?.media ?? id,
  /** Muscle group for any exercise id, including custom ones. */
  muscleOf: (id: string): Muscle => byId.get(id)?.muscle ?? 'OTHER',
  isBodyweight: (id: string) => byId.get(id)?.equipment === 'BODYWEIGHT',
  /**
   * Search used by the picker and the library page: every typed word must appear in the name or in
   * one of its aliases. Exercises done before (`done` holds `key()`s) come first, then exact names,
   * then names starting with the query, then the rest, each alphabetically. With a muscle and no
   * typed query, the group's ranked exercises come before all of that, interleaved by rank.
   */
  search(query: string, muscle: Muscle | null, done?: ReadonlySet<string>): Exercise[] {
    const q = norm(query);
    const words = query.split(' ').map(norm).filter(Boolean);
    const buckets: Exercise[][] = [[], [], [], [], [], []];
    for (const { x, names } of SEARCHABLE) {
      if (muscle != null && x.muscle !== muscle) continue;
      if (!names.some((n) => words.every((w) => n.includes(w)))) continue;
      const match = q === '' || names.includes(q) ? 0 : names.some((n) => n.startsWith(q)) ? 1 : 2;
      buckets[(done?.has(ExerciseLibrary.key(x.id)) ? 0 : 3) + match].push(x);
    }
    const flat = buckets.flat();
    if (muscle == null || words.length > 0) return flat;
    const rest = new Map(flat.map((x) => [ExerciseLibrary.key(x.id), x]));
    const ranked: Exercise[] = [];
    for (const id of interleavedRanking(muscle)) {
      const x = rest.get(id);
      if (x) { ranked.push(x); rest.delete(id); }
    }
    return [...ranked, ...flat.filter((x) => rest.get(ExerciseLibrary.key(x.id)) === x)];
  },
  /** 1-based rank of an exercise within its muscle's ranking, or null when unranked. A linked id shares its twin's rank. */
  rankOf: (id: string): number | null => rankingOf(ExerciseLibrary.key(id))?.rank ?? null,
  /** The "also grows" lines for a group's muscles. */
  alsoFor: (group: Muscle): string[] => GROUP_MUSCLES[group].flatMap((m) => (ALSO[m] ? [ALSO[m]!] : [])),
  /** Whether a name (or a hidden hand-list name) is already in the library: no custom twin then. */
  hasName: (name: string): boolean => KNOWN_NAMES.has(norm(name)),
  /** Muscles in the generator's terms, for the sets notice: the generator's catalog first, then the database's labels. */
  generatorMuscles(id: string): { primary: CatalogMuscle[]; secondary: CatalogMuscle[] } | undefined {
    const key = ExerciseLibrary.key(id);
    const known = CATALOG[id] ?? CATALOG[key];
    if (known) return { primary: known.primary, secondary: known.secondary };
    const x = dbFind(key);
    return x ? generatorMusclesOfDb(x) : undefined;
  },
  /** Photos, steps and muscles; null when the exercise isn't in free-exercise-db. */
  howTo(id: string): HowTo | null {
    const x = dbFind(ExerciseLibrary.key(id));
    if (!x) return null;
    return {
      images: photoUrls(x),
      instructions: x.instructions,
      primary: x.primaryMuscles.map(capital),
      secondary: x.secondaryMuscles.map(capital),
      equipment: capital(x.equipment ?? 'none'),
      level: capital(x.level),
    };
  },
  /** Starter routines built from the person's AscendLab plan. */
  starterExercises(title: string, home: boolean): string[] {
    switch (title) {
      case 'Full body': return home ? ['bodyweight_squat', 'push_up', 'inverted_row', 'glute_bridge', 'plank']
        : ['squat', 'bench_press', 'barbell_row', 'romanian_deadlift', 'plank'];
      case 'Upper body': return home ? ['push_up', 'inverted_row', 'pike_push_up', 'bench_dip', 'band_row']
        : ['bench_press', 'lat_pulldown', 'db_shoulder_press', 'seated_cable_row', 'db_curl', 'triceps_pushdown'];
      case 'Lower body': return home ? ['bodyweight_squat', 'lunge', 'glute_bridge', 'calf_raise', 'dead_bug']
        : ['squat', 'romanian_deadlift', 'leg_press', 'leg_curl', 'standing_calf_raise_machine', 'hanging_leg_raise'];
      case 'Push': return home ? ['push_up', 'pike_push_up', 'bench_dip', 'knee_push_up']
        : ['bench_press', 'overhead_press', 'incline_db_press', 'lateral_raise', 'triceps_pushdown'];
      case 'Pull': return home ? ['inverted_row', 'band_row', 'back_extension', 'russian_twist']
        : ['deadlift', 'pull_up', 'barbell_row', 'face_pull', 'barbell_curl', 'hammer_curl'];
      case 'Legs': return home ? ['bodyweight_squat', 'bulgarian_split_squat', 'glute_bridge', 'step_up', 'calf_raise']
        : ['squat', 'leg_press', 'romanian_deadlift', 'leg_extension', 'leg_curl', 'standing_calf_raise_machine'];
      default: return [];
    }
  },
};

// ---------------------------------------------------------------- Programs and routines

export function uuid(): string {
  // RFC 4122 v4 layout, enough for client-side ids.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** An exercise inside a routine, with how many sets and reps to aim for. */
export interface RoutineExercise {
  exerciseId: string; name: string; sets: number; reps: number;
  /** The generator's movement slot this exercise fills; its alternatives come from there. */
  slot?: Slot;
}

/** A saved session you can start again and again. */
export interface Routine { id: string; name: string; exercises: RoutineExercise[] }

/** A group of routines, e.g. "Push / Pull / Legs". One program is active at a time. */
export interface Program { id: string; name: string; routines: Routine[]; createdAt: number }

const asNum = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);
const asStr = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

export function routineExerciseFromMap(m: Record<string, unknown>): RoutineExercise {
  const exerciseId = asStr(m.exerciseId, '');
  // Routines saved before slots existed have no slot field: they get theirs back from the exercise
  // (one slot per exercise). A stored null means "no slot" (e.g. an exercise added next to another).
  // A library pick that replaced a generated exercise keeps that slot, so any slot name is kept.
  const slot = !('slot' in m) ? slotOf(exerciseId) : isSlot(m.slot) ? m.slot : null;
  return {
    exerciseId,
    name: asStr(m.name, 'Exercise'),
    sets: Math.trunc(asNum(m.sets, 3)),
    reps: Math.trunc(asNum(m.reps, 10)),
    ...(slot ? { slot } : {}),
  };
}

export function routineFromMap(m: Record<string, unknown>): Routine {
  const list = Array.isArray(m.exercises) ? m.exercises : [];
  return {
    id: asStr(m.id, uuid()),
    name: asStr(m.name, 'Routine'),
    exercises: list.filter((x) => x && typeof x === 'object').map((x) => routineExerciseFromMap(x as Record<string, unknown>)),
  };
}

export const routineToMap = (r: Routine) => ({
  id: r.id,
  name: r.name,
  // Null, not undefined (Firestore rejects undefined): "no slot", so loading doesn't recover one.
  exercises: r.exercises.map((x) => ({ exerciseId: x.exerciseId, name: x.name, sets: x.sets, reps: x.reps, slot: x.slot ?? null })),
});

/**
 * The starter routines. Gym: one routine per session of the generated program, with its
 * exercises, sets and the top of the rep range as target. Home: the simple starter lists.
 */
export function starterRoutines(profile: UserProfile): Routine[] {
  const plan = profile.place === 'HOME' ? null : gymPlan(profile);
  if (plan) {
    // A 6-day plan repeats each session; like a Hevy folder, each routine is listed once, in order.
    const unique = plan.state.schedule.cycle.filter((d, i, all) => all.findIndex((x) => x.name === d.name) === i);
    return unique.map((day) => ({
      id: uuid(),
      name: day.name,
      exercises: day.exercises.map((x) => ({
        exerciseId: x.exerciseId, name: ExerciseLibrary.find(x.exerciseId)?.name ?? x.exerciseId, sets: x.sets, reps: x.repMax, slot: x.slot,
      })),
    }));
  }
  const week = PlanCalculator.training(profile);
  const reps = profile.goal === 'BUILD_MUSCLE' || profile.goal === 'GAIN_WEIGHT' ? 10 : 12;
  const titles = [...new Set(week.days.map((d) => d.title))];
  return titles.map((title) => ({
    id: uuid(),
    name: title,
    exercises: ExerciseLibrary.starterExercises(title, profile.place === 'HOME')
      .flatMap((id) => { const x = ExerciseLibrary.find(id); return x ? [x] : []; })
      .map((x) => ({ exerciseId: x.id, name: x.name, sets: 3, reps })),
  }));
}

// ---------------------------------------------------------------- Live workout

/** Set types. Warm-ups never count toward records. */
export type SetType = 'NORMAL' | 'WARMUP' | 'FAILURE' | 'DROP';
export const SET_TYPES: SetType[] = ['NORMAL', 'WARMUP', 'FAILURE', 'DROP'];
export const SET_TYPE: Record<SetType, { short: string; label: string }> = {
  NORMAL: { short: '', label: 'Normal set' },
  WARMUP: { short: 'W', label: 'Warm-up set' },
  FAILURE: { short: 'F', label: 'Failure set' },
  DROP: { short: 'D', label: 'Drop set' },
};
const setTypeOf = (v: unknown): SetType => (SET_TYPES.includes(v as SetType) ? (v as SetType) : 'NORMAL');

/** One set while training. Weight and reps are kept as typed, in the person's units. */
export interface SetEntry { weight: string; reps: string; done: boolean; type: SetType }
export const newSet = (partial: Partial<SetEntry> = {}): SetEntry => ({ weight: '', reps: '', done: false, type: 'NORMAL', ...partial });

export interface ActiveExercise {
  exerciseId: string;
  name: string;
  sets: SetEntry[];
  targetReps: number | null;
  /** Today's target, suggested weight and advice (program generator exercises only). */
  plan?: ExercisePlan | null;
  /** The routine row's movement slot, for its alternatives. */
  slot?: Slot;
  /** Changed during this workout: shown under the name. */
  tag?: 'swapped' | 'added';
}

/** A swap or add made during a workout; at Finish the person chooses whether to keep it. */
export type WorkoutChange =
  | { kind: 'replace'; slot?: Slot; fromId: string; toId: string; toName: string }
  | { kind: 'add'; afterId: string; toId: string; toName: string };

export interface ActiveWorkout {
  title: string;
  routineId: string | null;
  startedAt: number;
  exercises: ActiveExercise[];
  /** When the current rest countdown ends (epoch ms), or null when not resting. */
  restEndsAt: number | null;
  restSeconds: number;
  /** The session's optional warm-up, one line each (generated sessions only). */
  warmUp?: string[];
  /** Length of the current rest, for the countdown bar (exercises have their own rest). */
  restTotal?: number;
  /** Swaps and adds made during this workout, in order. */
  changes?: WorkoutChange[];
}

export const doneSets = (w: ActiveWorkout) => w.exercises.reduce((n, x) => n + x.sets.filter((s) => s.done).length, 0);

/** Same JSON layout as the Android app, so the format is shared. */
export function activeToJson(w: ActiveWorkout): string {
  return JSON.stringify({
    title: w.title, routineId: w.routineId, startedAt: w.startedAt, restEndsAt: w.restEndsAt, restSeconds: w.restSeconds,
    warmUp: w.warmUp,
    changes: w.changes,
    exercises: w.exercises.map((x) => ({
      exerciseId: x.exerciseId, name: x.name, targetReps: x.targetReps, plan: x.plan ?? undefined, slot: x.slot, tag: x.tag,
      sets: x.sets.map((s) => ({ w: s.weight, r: s.reps, d: s.done, t: s.type })),
    })),
  });
}

export function activeFromJson(json: string): ActiveWorkout | null {
  try {
    const o = JSON.parse(json);
    return {
      title: String(o.title),
      routineId: o.routineId ?? null,
      startedAt: Number(o.startedAt),
      restEndsAt: o.restEndsAt ?? null,
      restSeconds: typeof o.restSeconds === 'number' ? o.restSeconds : 90,
      ...(Array.isArray(o.warmUp) ? { warmUp: o.warmUp.map(String) } : {}),
      ...(Array.isArray(o.changes) ? { changes: o.changes as WorkoutChange[] } : {}),
      exercises: (o.exercises as any[]).map((x) => ({
        exerciseId: String(x.exerciseId),
        name: String(x.name),
        targetReps: x.targetReps ?? null,
        ...(x.plan && typeof x.plan === 'object' ? { plan: x.plan as ExercisePlan } : {}),
        ...(isSlot(x.slot) ? { slot: x.slot } : {}),
        ...(x.tag === 'swapped' || x.tag === 'added' ? { tag: x.tag as 'swapped' | 'added' } : {}),
        sets: (x.sets as any[]).map((s) => ({ weight: String(s.w ?? ''), reps: String(s.r ?? ''), done: !!s.d, type: setTypeOf(s.t) })),
      })),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Finished workouts

/** A completed set, always stored in kg. */
export interface LoggedSet { weightKg: number; reps: number; type: SetType }
export const setVolume = (s: LoggedSet) => s.weightKg * s.reps;
/** Estimated one-rep max (Epley). A single rep is its own max. */
export const oneRepMax = (s: LoggedSet) => (s.reps <= 1 ? s.weightKg : s.weightKg * (1 + s.reps / 30));
export const countsForRecords = (s: LoggedSet) => s.type !== 'WARMUP' && s.reps > 0;

export interface LoggedExercise { exerciseId: string; name: string; sets: LoggedSet[] }

/** A finished workout as stored in history. */
export interface WorkoutRecord {
  id: string;
  title: string;
  /** The routine it was started from, if any. */
  routineId?: string | null;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  volumeKg: number;
  records: number;
  exercises: LoggedExercise[];
}
export const setCount = (w: WorkoutRecord) => w.exercises.reduce((n, x) => n + x.sets.length, 0);

export function workoutFromDoc(id: string, d: Record<string, unknown>): WorkoutRecord {
  const exercises = (Array.isArray(d.exercises) ? d.exercises : []).flatMap((raw) => {
    const m = raw as Record<string, unknown>;
    if (!m || typeof m.exerciseId !== 'string') return [];
    const sets = (Array.isArray(m.sets) ? m.sets : []).filter((s) => s && typeof s === 'object').map((s) => {
      const x = s as Record<string, unknown>;
      return { weightKg: asNum(x.weightKg, 0), reps: Math.trunc(asNum(x.reps, 0)), type: setTypeOf(x.type) };
    });
    return [{ exerciseId: m.exerciseId, name: asStr(m.name, 'Exercise'), sets }];
  });
  return {
    id,
    title: asStr(d.title, 'Workout'),
    routineId: typeof d.routineId === 'string' ? d.routineId : null,
    startedAt: asNum(d.startedAt, 0),
    finishedAt: asNum(d.finishedAt, 0),
    durationSec: Math.trunc(asNum(d.durationSec, 0)),
    volumeKg: asNum(d.volumeKg, 0),
    records: Math.trunc(asNum(d.records, 0)),
    exercises,
  };
}

/** Personal bests for one exercise, computed from history. */
export interface ExerciseRecords {
  heaviestKg: number;
  best1RmKg: number;
  bestSetVolumeKg: number;
  bestSessionVolumeKg: number;
  mostReps: number;
  /** Heaviest weight lifted for each rep count (1..15). */
  byReps: Record<number, number>;
}

export const emptyRecords = (): ExerciseRecords => ({ heaviestKg: 0, best1RmKg: 0, bestSetVolumeKg: 0, bestSessionVolumeKg: 0, mostReps: 0, byReps: {} });

export function recordsFrom(sessions: LoggedSet[][]): ExerciseRecords {
  const sets = sessions.flat().filter(countsForRecords);
  if (sets.length === 0) return emptyRecords();
  const byReps: Record<number, number> = {};
  sets.filter((s) => s.reps >= 1 && s.reps <= 15).forEach((s) => { byReps[s.reps] = Math.max(byReps[s.reps] ?? 0, s.weightKg); });
  return {
    heaviestKg: Math.max(...sets.map((s) => s.weightKg)),
    best1RmKg: Math.max(...sets.map(oneRepMax)),
    bestSetVolumeKg: Math.max(...sets.map(setVolume)),
    bestSessionVolumeKg: Math.max(...sessions.map((s) => s.filter(countsForRecords).reduce((a, x) => a + setVolume(x), 0))),
    mostReps: Math.max(...sets.map((s) => s.reps)),
    byReps,
  };
}

/** Which records `set` would beat, as short labels (empty when none). */
export function beatenBy(r: ExerciseRecords, set: LoggedSet): string[] {
  if (!countsForRecords(set)) return [];
  const out: string[] = [];
  if (set.weightKg > 0 && set.weightKg > r.heaviestKg) out.push('Heaviest weight');
  if (set.weightKg > 0 && oneRepMax(set) > r.best1RmKg + 0.01) out.push('Best 1RM');
  if (set.weightKg > 0 && setVolume(set) > r.bestSetVolumeKg + 0.01) out.push('Best set volume');
  if (set.weightKg <= 0 && set.reps > r.mostReps) out.push('Most reps');
  return out;
}

/** Counts sets that beat a personal record, updating records as it goes (so two PRs in a row count twice). */
export function countRecords(logged: LoggedExercise[], before: Map<string, ExerciseRecords>): number {
  let count = 0;
  logged.forEach((x) => {
    const key = ExerciseLibrary.key(x.exerciseId);
    let rec = before.get(key) ?? emptyRecords();
    x.sets.forEach((set) => {
      if (beatenBy(rec, set).length > 0) {
        // The first time an exercise is logged sets the baseline, not a record.
        if (before.has(key)) count++;
        rec = {
          heaviestKg: Math.max(rec.heaviestKg, set.weightKg),
          best1RmKg: Math.max(rec.best1RmKg, oneRepMax(set)),
          bestSetVolumeKg: Math.max(rec.bestSetVolumeKg, setVolume(set)),
          bestSessionVolumeKg: rec.bestSessionVolumeKg,
          mostReps: Math.max(rec.mostReps, set.reps),
          byReps: rec.byReps,
        };
      }
    });
  });
  return count;
}

export function recordsByExercise(history: WorkoutRecord[]): Map<string, ExerciseRecords> {
  const sessions = new Map<string, LoggedSet[][]>();
  history.forEach((w) => w.exercises.forEach((x) => {
    const key = ExerciseLibrary.key(x.exerciseId);
    const list = sessions.get(key) ?? [];
    list.push(x.sets);
    sessions.set(key, list);
  }));
  const out = new Map<string, ExerciseRecords>();
  sessions.forEach((v, k) => out.set(k, recordsFrom(v)));
  return out;
}

/**
 * The routine to do next: the one after the last workout done from this program (by routine,
 * else by name), wrapping around; the first one before any workout. Sessions follow the
 * program's order, not the calendar, so a missed day just moves to the next training day.
 */
export function nextRoutine(program: Program | null, history: WorkoutRecord[] | null | undefined): Routine | null {
  if (!program || program.routines.length === 0) return null;
  const last = (history ?? []).find((w) => program.routines.some((r) => r.id === w.routineId || (!w.routineId && r.name === w.title)));
  if (!last) return program.routines[0];
  const i = program.routines.findIndex((r) => r.id === last.routineId || (!last.routineId && r.name === last.title));
  return program.routines[(i + 1) % program.routines.length];
}

/** Most recent sets of each exercise, from history (newest first). Powers the "Previous" column. */
/** The most logged exercises, linked ids counted as one, named as most recently logged. History is newest first. */
export function mainExercises(history: WorkoutRecord[], max: number): { id: string; name: string; count: number }[] {
  const counts = new Map<string, { id: string; name: string; count: number }>();
  history.forEach((w) => w.exercises.forEach((x) => {
    const key = ExerciseLibrary.key(x.exerciseId);
    const cur = counts.get(key) ?? { id: key, name: x.name, count: 0 };
    counts.set(key, { ...cur, count: cur.count + 1 });
  }));
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, max);
}

/** The exercise page opens on How to until the exercise has been logged, then on Summary. */
export const defaultExerciseTab = (hasHistory: boolean): 'summary' | 'howto' => (hasHistory ? 'summary' : 'howto');

/** Every exercise in the history, as `ExerciseLibrary.key`s: search lists these first. */
export function doneKeys(history: WorkoutRecord[] | null | undefined): Set<string> {
  return new Set((history ?? []).flatMap((w) => w.exercises.map((x) => ExerciseLibrary.key(x.exerciseId))));
}

/** Last time's sets per exercise, keyed by `ExerciseLibrary.key`. */
export function lastSets(history: WorkoutRecord[] | null | undefined): Map<string, LoggedSet[]> {
  const map = new Map<string, LoggedSet[]>();
  (history ?? []).forEach((w) => w.exercises.forEach((x) => {
    const key = ExerciseLibrary.key(x.exerciseId);
    if (!map.has(key)) map.set(key, x.sets);
  }));
  return map;
}

/** The sessions that include an exercise (under any linked id), in history order (newest first). */
export function setsFor(history: WorkoutRecord[], exerciseId: string): [WorkoutRecord, LoggedSet[]][] {
  const key = ExerciseLibrary.key(exerciseId);
  return history.flatMap((w) => {
    const x = w.exercises.find((e) => ExerciseLibrary.key(e.exerciseId) === key);
    return x ? [[w, x.sets] as [WorkoutRecord, LoggedSet[]]] : [];
  });
}

/** What the feed shows about a finished workout. */
export interface WorkoutLine { name: string; sets: number; best: string }
export interface WorkoutInfo {
  title: string;
  durationSec: number;
  volumeKg: number;
  sets: number;
  exercises: WorkoutLine[];
  records: number;
}

const integerFormat = (n: number) => Math.trunc(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const WorkoutMath = {
  volumeKg: (exercises: LoggedExercise[]) => exercises.reduce((a, x) => a + x.sets.reduce((b, s) => b + s.weightKg * s.reps, 0), 0),

  formatWeight(kg: number, units: Units): string {
    const v = units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg;
    const text = v % 1 === 0 ? String(Math.trunc(v)) : String(roundInt(v * 10) / 10);
    return `${text} ${UNIT[units].weightUnit}`;
  },

  /** Heaviest set (ties broken by reps), e.g. "80 kg × 8" or "12 reps" for bodyweight. */
  bestSet(sets: LoggedSet[], units: Units): string {
    if (sets.length === 0) return '';
    const best = sets.reduce((a, b) => (b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a));
    return best.weightKg <= 0 ? `${best.reps} reps` : `${WorkoutMath.formatWeight(best.weightKg, units)} × ${best.reps}`;
  },

  formatDuration(sec: number): string {
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    if (m > 0) return `${m}min`;
    return `${sec}s`;
  },

  formatVolume(kg: number, units: Units): string {
    const v = units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg;
    return `${integerFormat(roundInt(v))} ${UNIT[units].weightUnit}`;
  },
};

/** "1:05" or "1:02:05" for a running clock. */
export function clock(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

// ---------------------------------------------------------------- Program edits

/** Sets for an exercise added next to another one: the plan's usual count. */
export const ADDED_SETS = SETS;

/** Puts `exerciseId` in every row filling `slot`, keeping each row's sets and reps. */
export function replaceEverywhere(routines: Routine[], slot: Slot, exerciseId: string, name: string): { routines: Routine[]; changedNames: string[] } {
  const changedNames: string[] = [];
  const next = routines.map((r) => {
    if (!r.exercises.some((x) => x.slot === slot)) return r;
    changedNames.push(r.name);
    return { ...r, exercises: r.exercises.map((x) => (x.slot === slot ? { ...x, exerciseId, name } : x)) };
  });
  return { routines: next, changedNames };
}

/** Saved swaps after a replace: a slot option is remembered, a library pick clears the slot. */
export function swapsAfterReplace(swaps: UserProfile['swaps'], slot: Slot, exerciseId: string, level: EngineLevel): UserProfile['swaps'] {
  const { [slot]: _old, ...rest } = swaps;
  return isSlotOption(slot, level, exerciseId) ? { ...rest, [slot]: exerciseId } : rest;
}

export function addAfter(exercises: RoutineExercise[], index: number, ex: RoutineExercise): RoutineExercise[] {
  return [...exercises.slice(0, index + 1), ex, ...exercises.slice(index + 1)];
}

/**
 * Routines as sessions for the sets count, each weighted by how often the generated cycle does it
 * in a week. Null when a routine isn't in the cycle (user-made or renamed): no weekly notices then.
 */
export function volumeSessions(routines: Routine[], cycle: ProgramDay[], daysPerWeek: number): VolumeSession[] | null {
  if (cycle.length === 0) return null;
  const sessions: VolumeSession[] = [];
  for (const r of routines) {
    const count = cycle.filter((d) => d.name === r.name).length;
    if (count === 0) return null;
    sessions.push({
      exercises: r.exercises.map((x) => ({ exerciseId: x.exerciseId, sets: x.sets })),
      timesPerWeek: (count * daysPerWeek) / cycle.length,
    });
  }
  return sessions;
}

/** Notices for changing a generated gym program from `before` to `after` (same routine order). */
export function programNotices(before: Routine[], after: Routine[], profile: UserProfile): VolumeNotice[] {
  if (profile.place === 'HOME') return [];
  const plan = gymPlan(profile);
  const days = planDays(profile);
  if (!plan || days == null) return [];
  const cycle = plan.state.schedule.cycle;
  const was = volumeSessions(before, cycle, days);
  const now = volumeSessions(after, cycle, days);
  return was && now ? volumeNotices(was, now, days, ExerciseLibrary.generatorMuscles) : [];
}

const halves = (x: number) => String(Math.round(x * 2) / 2);

export function noticeText(n: VolumeNotice): string {
  const muscle = capital(n.muscle);
  switch (n.kind) {
    case 'week_above': return `${muscle} now gets ${halves(n.sets)} sets a week, above the ${n.limit} your plan aims for. Fine to keep.`;
    case 'week_below_minimum': return `${muscle} drops to ${halves(n.sets)} sets a week, below the ${n.limit} needed to keep growing.`;
    case 'session_above': return `${muscle} gets ${halves(n.sets)} sets in one workout. Past about ${n.limit}, extra sets add little.`;
  }
}

/** Replaces an exercise mid-workout: ticked sets stay with the old one, so they still get saved. */
export function workoutReplace(exercises: ActiveExercise[], index: number, next: ActiveExercise): ActiveExercise[] {
  const old = exercises[index];
  if (!old) return exercises;
  const done = old.sets.filter((s) => s.done);
  if (done.length === 0) return exercises.map((x, i) => (i === index ? next : x));
  return [...exercises.slice(0, index), { ...old, sets: done }, next, ...exercises.slice(index + 1)];
}

/**
 * "Save to my program" at Finish: a replace with a slot changes every routine with that slot; one
 * without a slot, and every add, only change the routine the workout came from.
 */
export function applyWorkoutChanges(routine: Routine, routines: Routine[], changes: WorkoutChange[]): { routines: Routine[]; changedNames: string[] } {
  let list = routines;
  const changed = new Set<string>();
  const editThis = (edit: (exercises: RoutineExercise[]) => RoutineExercise[]) => {
    list = list.map((r) => (r.id === routine.id ? { ...r, exercises: edit(r.exercises) } : r));
    changed.add(routine.name);
  };
  for (const ch of changes) {
    if (ch.kind === 'replace' && ch.slot) {
      const result = replaceEverywhere(list, ch.slot, ch.toId, ch.toName);
      list = result.routines;
      result.changedNames.forEach((n) => changed.add(n));
    } else if (ch.kind === 'replace') {
      editThis((xs) => xs.map((x) => (x.exerciseId === ch.fromId ? { ...x, exerciseId: ch.toId, name: ch.toName } : x)));
    } else {
      editThis((xs) => {
        const at = xs.findIndex((x) => x.exerciseId === ch.afterId);
        const reps = xs[at]?.reps ?? 10;
        return addAfter(xs, at < 0 ? xs.length - 1 : at, { exerciseId: ch.toId, name: ch.toName, sets: ADDED_SETS, reps });
      });
    }
  }
  return { routines: list, changedNames: [...changed] };
}

/** Draft replaces still visible in the draft: a row removed or replaced again drops its replace. */
export function keptReplaces<R extends { slot: Slot; exerciseId: string }>(replaces: R[], exercises: RoutineExercise[]): R[] {
  return replaces.filter((r) => exercises.some((x) => x.slot === r.slot && x.exerciseId === r.exerciseId));
}

/**
 * Working sets for an exercise that replaces `old` mid-workout. Replace keeps the set count: the
 * sets still to do (ticked ones stay with the old exercise), or all of them when none are ticked.
 */
export function replacementSetCount(old: ActiveExercise): number {
  const working = old.sets.filter((s) => s.type !== 'WARMUP');
  return Math.max(working.filter((s) => !s.done).length, 1);
}

/** Last time's working sets (warm-ups skipped), one per planned set; null where there was none. */
export function previousForSets(last: LoggedSet[] | undefined, count: number): (LoggedSet | null)[] {
  const working = (last ?? []).filter((s) => s.type !== 'WARMUP');
  return Array.from({ length: count }, (_, i) => working[i] ?? null);
}
