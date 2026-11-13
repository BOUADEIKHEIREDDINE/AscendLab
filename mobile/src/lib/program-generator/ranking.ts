/**
 * The exercise ranking per muscle: which exercise the app suggests first. Order = rank.
 * Transcribed from docs/Research/Evidence/Training - Exercise ranking.md ("What the app uses").
 * `basis` is 'study' when a training study backs the place, 'principle' when the tie-breakers,
 * anatomy or practicality decide. `source` is the note's source key(s).
 */
import type { Slot } from './program';

export type RankedMuscle =
  | 'chest'
  | 'upperChest'
  | 'lats'
  | 'midBack'
  | 'frontDelts'
  | 'sideDelts'
  | 'rearDelts'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

export type RankedEntry = { exerciseId: string; slot: Slot; basis: 'study' | 'principle'; source: string };

// prettier-ignore
export const RANKING: Record<RankedMuscle, RankedEntry[]> = {
  chest: [
    { exerciseId: 'Machine_Bench_Press', slot: 'chestPress', basis: 'study', source: 'hernandez2023 (equal to barbell); stability' },
    { exerciseId: 'Dumbbell_Bench_Press', slot: 'chestPress', basis: 'principle', source: 'user decision; equipment' },
    { exerciseId: 'Butterfly', slot: 'chestFly', basis: 'principle', source: 'user decision; stability, isolation; pinto2025 (support)' },
    { exerciseId: 'Leverage_Chest_Press', slot: 'chestPress', basis: 'principle', source: 'equipment, stability' },
    { exerciseId: 'Smith_Machine_Bench_Press', slot: 'chestPress', basis: 'principle', source: 'equipment, stability' },
    { exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', slot: 'chestPress', basis: 'study', source: 'lanza2024, hernandez2023; free bar, injury (kerr2010)' },
    { exerciseId: 'Flat_Bench_Cable_Flyes', slot: 'chestFly', basis: 'principle', source: 'isolation; lying = supported' },
    { exerciseId: 'Cable_Crossover', slot: 'chestFly', basis: 'principle', source: 'isolation; standing' },
    { exerciseId: 'Dumbbell_Flyes', slot: 'chestFly', basis: 'principle', source: 'length; free weight at the stretch' },
    { exerciseId: 'Pushups', slot: 'chestPress', basis: 'study', source: 'kikuchi2017; hard to overload' },
  ],
  upperChest: [
    { exerciseId: 'Smith_Machine_Incline_Bench_Press', slot: 'inclinePress', basis: 'principle', source: 'chaves2020 (incline angle), equipment, stability' },
    { exerciseId: 'Leverage_Incline_Chest_Press', slot: 'inclinePress', basis: 'principle', source: 'equipment, stability, ease' },
    { exerciseId: 'Barbell_Incline_Bench_Press_-_Medium_Grip', slot: 'inclinePress', basis: 'study', source: 'chaves2020' },
    { exerciseId: 'Incline_Dumbbell_Press', slot: 'inclinePress', basis: 'principle', source: 'equipment' },
    { exerciseId: 'Incline_Cable_Chest_Press', slot: 'inclinePress', basis: 'principle', source: 'equipment; harder setup (ease)' },
    { exerciseId: 'Hammer_Grip_Incline_DB_Bench_Press', slot: 'inclinePress', basis: 'principle', source: 'anatomy; same stability as #4, less common grip' },
  ],
  lats: [
    { exerciseId: 'Wide-Grip_Lat_Pulldown', slot: 'verticalPull', basis: 'principle', source: 'stability (thigh pad), ease; difonza2026 (emg)' },
    { exerciseId: 'Close-Grip_Front_Lat_Pulldown', slot: 'verticalPull', basis: 'principle', source: 'stability; andersen2014 (emg: grip width similar)' },
    { exerciseId: 'Straight-Arm_Pulldown', slot: 'straightArm', basis: 'principle', source: 'user-approved top 3; isolation, prime' },
    { exerciseId: 'V-Bar_Pulldown', slot: 'verticalPull', basis: 'principle', source: 'stability' },
    { exerciseId: 'Underhand_Cable_Pulldowns', slot: 'verticalPull', basis: 'principle', source: 'stability' },
    { exerciseId: 'Rope_Straight-Arm_Pulldown', slot: 'straightArm', basis: 'principle', source: 'standing cable; isolation' },
    { exerciseId: 'Pullups', slot: 'verticalPull', basis: 'principle', source: 'hanging (stability), hard for beginners, coarse overload' },
    { exerciseId: 'One_Arm_Lat_Pulldown', slot: 'straightArm', basis: 'principle', source: 'user decision: keep at #8' },
    { exerciseId: 'Chin-Up', slot: 'verticalPull', basis: 'principle', source: 'hanging; bodyweight' },
  ],
  midBack: [
    { exerciseId: 'Leverage_Iso_Row', slot: 'row', basis: 'principle', source: 'stability, injury, ease' },
    { exerciseId: 'Seated_Cable_Rows', slot: 'row', basis: 'principle', source: 'stability (seated, feet braced)' },
    { exerciseId: 'Leverage_High_Row', slot: 'row2', basis: 'principle', source: 'stability (seated, knee pad)' },
    { exerciseId: 'Lying_T-Bar_Row', slot: 'tBarRow', basis: 'principle', source: 'stability, injury' },
    { exerciseId: 'Dumbbell_Incline_Row', slot: 'tBarRow', basis: 'principle', source: 'stability (chest on bench); free weights' },
    { exerciseId: 'Seated_One-arm_Cable_Pulley_Rows', slot: 'row', basis: 'principle', source: 'stability' },
    { exerciseId: 'One-Arm_Dumbbell_Row', slot: 'row2', basis: 'principle', source: 'hand and knee on bench, but free weight' },
    { exerciseId: 'Smith_Machine_Bent_Over_Row', slot: 'tBarRow', basis: 'principle', source: 'guided bar, bent-over back' },
    { exerciseId: 'T-Bar_Row_with_Handle', slot: 'tBarRow', basis: 'principle', source: 'bent-over, lower-back load' },
    { exerciseId: 'Bent_Over_Barbell_Row', slot: 'tBarRow', basis: 'principle', source: 'least stable; lower back tires first' },
  ],
  frontDelts: [
    { exerciseId: 'Machine_Shoulder_Military_Press', slot: 'overheadPress', basis: 'principle', source: 'stability, injury, ease' },
    { exerciseId: 'Smith_Machine_Overhead_Shoulder_Press', slot: 'overheadPress', basis: 'principle', source: 'stability' },
    { exerciseId: 'Leverage_Shoulder_Press', slot: 'overheadPress', basis: 'principle', source: 'stability' },
    { exerciseId: 'Seated_Barbell_Military_Press', slot: 'overheadPress', basis: 'principle', source: 'equipment; free bar' },
    { exerciseId: 'Dumbbell_Shoulder_Press', slot: 'overheadPress', basis: 'principle', source: 'equipment; least stable seated press (saeterbakken2013)' },
    { exerciseId: 'Arnold_Dumbbell_Press', slot: 'overheadPress', basis: 'principle', source: 'dumbbells; harder to execute' },
    { exerciseId: 'Standing_Military_Press', slot: 'overheadPress', basis: 'principle', source: 'standing; balance lowers the load (saeterbakken2013)' },
  ],
  sideDelts: [
    { exerciseId: 'Ascend_Machine_Lateral_Raise', slot: 'lateralRaise', basis: 'principle', source: 'user decision; stability; larsen2025lr (support: equipment didn\'t change growth)' },
    { exerciseId: 'Standing_Low-Pulley_Deltoid_Raise', slot: 'lateralRaise', basis: 'study', source: 'user decision; larsen2025lr; free hand braced' },
    { exerciseId: 'Seated_Side_Lateral_Raise', slot: 'lateralRaise', basis: 'principle', source: 'user decision; stability (seated)' },
    { exerciseId: 'One-Arm_Incline_Lateral_Raise', slot: 'lateralRaise', basis: 'principle', source: 'stability (body on bench), length' },
    { exerciseId: 'Cable_Seated_Lateral_Raise', slot: 'lateralRaise', basis: 'study', source: 'larsen2025lr; user: setup missing in most gyms' },
    { exerciseId: 'One-Arm_Side_Laterals', slot: 'lateralRaise', basis: 'principle', source: 'standing, free hand braced' },
    { exerciseId: 'Side_Lateral_Raise', slot: 'lateralRaise', basis: 'study', source: 'larsen2025lr; standing, both arms, easiest to swing' },
  ],
  rearDelts: [
    { exerciseId: 'Reverse_Machine_Flyes', slot: 'rearDelt', basis: 'principle', source: 'user decision; stability, isolation; schoenfeld2013 (emg: neutral grip)' },
    { exerciseId: 'Cable_Rear_Delt_Fly', slot: 'rearDelt', basis: 'principle', source: 'user decision; isolation' },
    { exerciseId: 'Reverse_Flyes', slot: 'rearDelt', basis: 'principle', source: 'stability (chest on bench)' },
    { exerciseId: 'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench', slot: 'rearDelt', basis: 'principle', source: 'stability (head supported)' },
    { exerciseId: 'Seated_Bent-Over_Rear_Delt_Raise', slot: 'rearDelt', basis: 'principle', source: 'seated, torso unsupported' },
    { exerciseId: 'Face_Pull', slot: 'rearDelt', basis: 'principle', source: 'less isolation (upper back, rotator cuff)' },
  ],
  biceps: [
    { exerciseId: 'Incline_Dumbbell_Curl', slot: 'curl', basis: 'study', source: 'kobayashi2026 (biceps head grew more); seated, back supported' },
    { exerciseId: 'Machine_Preacher_Curls', slot: 'preacherCurl', basis: 'principle', source: 'kobayashi2026 (preacher: brachialis, equal total); stability' },
    { exerciseId: 'Preacher_Curl', slot: 'preacherCurl', basis: 'study', source: 'nunes2020pc, pedrosa2023; arm supported' },
    { exerciseId: 'Cable_Preacher_Curl', slot: 'preacherCurl', basis: 'study', source: 'nunes2020pc, attarieh2025; arm supported' },
    { exerciseId: 'Barbell_Curl', slot: 'curl', basis: 'principle', source: 'standing; one bar is steadier than two dumbbells' },
    { exerciseId: 'Dumbbell_Bicep_Curl', slot: 'curl', basis: 'principle', source: 'standing; easy to swing' },
    { exerciseId: 'Standing_Biceps_Cable_Curl', slot: 'curl', basis: 'principle', source: 'standing; ties #6, finer load steps on dumbbells (overload)' },
    { exerciseId: 'Hammer_Curls', slot: 'hammerCurl', basis: 'principle', source: 'anatomy (brachialis, brachioradialis): less biceps' },
    { exerciseId: 'Cable_Hammer_Curls_-_Rope_Attachment', slot: 'hammerCurl', basis: 'principle', source: 'anatomy' },
  ],
  triceps: [
    { exerciseId: 'Cable_Rope_Overhead_Triceps_Extension', slot: 'triceps', basis: 'study', source: 'user decision; maeo2023' },
    { exerciseId: 'Cable_One_Arm_Tricep_Extension', slot: 'triceps', basis: 'study', source: 'user decision; maeo2023 (neutral-arm condition = one-arm cable extension)' },
    { exerciseId: 'Triceps_Pushdown', slot: 'triceps', basis: 'study', source: 'maeo2023; stability, overload' },
    { exerciseId: 'Machine_Triceps_Extension', slot: 'triceps', basis: 'principle', source: 'stability (seated, guided), isolation' },
    { exerciseId: 'Dip_Machine', slot: 'tricepsPress', basis: 'principle', source: 'stability; less isolation than #4' },
    { exerciseId: 'Triceps_Pushdown_-_Rope_Attachment', slot: 'triceps', basis: 'study', source: 'maeo2023; standing cable, same as #3' },
    { exerciseId: 'Smith_Machine_Close-Grip_Bench_Press', slot: 'tricepsPress', basis: 'principle', source: 'guided bar' },
    { exerciseId: 'Close-Grip_Barbell_Bench_Press', slot: 'tricepsPress', basis: 'principle', source: 'free bar' },
    { exerciseId: 'Standing_Dumbbell_Triceps_Extension', slot: 'triceps', basis: 'principle', source: 'length; least stable' },
  ],
  quads: [
    { exerciseId: 'Leg_Press', slot: 'squat2', basis: 'study', source: 'kinoshita2026' },
    { exerciseId: 'Leg_Extensions', slot: 'legExtension', basis: 'study', source: 'kinoshita2026, larsen2025le, pedrosa2022' },
    { exerciseId: 'Hack_Squat', slot: 'squat', basis: 'principle', source: 'equipment, stability (user decision: above barbell squat)' },
    { exerciseId: 'Narrow_Stance_Leg_Press', slot: 'squat2', basis: 'principle', source: 'stability (back supported); same move as #1' },
    { exerciseId: 'Single-Leg_Leg_Extension', slot: 'legExtension', basis: 'principle', source: 'stability (seated machine); one leg = coarser overload' },
    { exerciseId: 'Smith_Machine_Squat', slot: 'squat', basis: 'principle', source: 'equipment; guided bar, standing; hernandez2023 (support)' },
    { exerciseId: 'Barbell_Squat', slot: 'squat', basis: 'study', source: 'kubo2019, plotkin2023; free bar' },
    { exerciseId: 'Goblet_Squat', slot: 'squat', basis: 'principle', source: 'bilateral, low injury, easy; load capped' },
    { exerciseId: 'Front_Barbell_Squat', slot: 'squat', basis: 'principle', source: 'bilateral free bar; hardest technique' },
    { exerciseId: 'Ascend_Bulgarian_Split_Squat', slot: 'splitSquat', basis: 'principle', source: 'split stance; least stable' },
  ],
  hamstrings: [
    { exerciseId: 'Seated_Leg_Curl', slot: 'legCurl', basis: 'study', source: 'maeo2021' },
    { exerciseId: 'Lying_Leg_Curls', slot: 'legCurl', basis: 'study', source: 'maeo2021' },
    { exerciseId: 'Smith_Machine_Stiff-Legged_Deadlift', slot: 'hinge', basis: 'principle', source: 'morin2025 (support), equipment, stability' },
    { exerciseId: 'Standing_Leg_Curl', slot: 'legCurl', basis: 'principle', source: 'stability (guided machine), isolation' },
    { exerciseId: 'Hyperextensions_Back_Extensions', slot: 'hinge', basis: 'study', source: 'bourne2017; body supported (ranked as Bourne\'s 45° hip extension: hinge at the hips, back kept straight, not spinal extension)' },
    { exerciseId: 'Romanian_Deadlift', slot: 'hinge', basis: 'study', source: 'morin2025 (stiff-leg deadlift); free bar' },
    { exerciseId: 'Stiff-Legged_Dumbbell_Deadlift', slot: 'hinge', basis: 'study', source: 'morin2025; dumbbells' },
    { exerciseId: 'Kettlebell_One-Legged_Deadlift', slot: 'hinge', basis: 'principle', source: 'single leg; least stable hinge' },
    { exerciseId: 'Glute_Ham_Raise', slot: 'legCurl', basis: 'principle', source: 'ease, overload (bodyweight minimum)' },
  ],
  glutes: [
    { exerciseId: 'Ascend_Hip_Thrust_Machine', slot: 'hipThrust', basis: 'principle', source: 'user decision; stability, ease; plotkin2023, krauseneto2025 (support)' },
    { exerciseId: 'One-Legged_Cable_Kickback', slot: 'kickback', basis: 'study', source: 'attarieh2026' },
    { exerciseId: 'Thigh_Abductor', slot: 'hipAbduction', basis: 'study', source: 'attarieh2026' },
    { exerciseId: 'Ascend_Glute_Kickback_Machine', slot: 'kickback', basis: 'principle', source: 'stability (torso on pad); same move as #2' },
    { exerciseId: 'Ascend_Smith_Machine_Hip_Thrust', slot: 'hipThrust', basis: 'principle', source: 'guided bar, back on bench' },
    { exerciseId: 'Ascend_Multi_Hip_Abduction', slot: 'hipAbduction', basis: 'principle', source: 'machine, but standing on one leg' },
    { exerciseId: 'Barbell_Hip_Thrust', slot: 'hipThrust', basis: 'study', source: 'plotkin2023; free bar, back on bench' },
    { exerciseId: 'Ascend_Cable_Hip_Abduction', slot: 'hipAbduction', basis: 'principle', source: 'standing cable, one leg' },
    { exerciseId: 'Barbell_Glute_Bridge', slot: 'hipThrust', basis: 'principle', source: 'free bar; shorter range than the thrust' },
  ],
  calves: [
    { exerciseId: 'Standing_Calf_Raises', slot: 'calves', basis: 'study', source: 'kinoshita2023' },
    { exerciseId: 'Calf_Press_On_The_Leg_Press_Machine', slot: 'calves', basis: 'study', source: 'kassiano2023c, nunes2020c' },
    { exerciseId: 'Calf_Press', slot: 'calves', basis: 'principle', source: 'length (knee nearly straight), stability' },
    { exerciseId: 'Smith_Machine_Calf_Raise', slot: 'calves', basis: 'principle', source: 'length; guided bar' },
    { exerciseId: 'Seated_Calf_Raise', slot: 'calves', basis: 'study', source: 'kinoshita2023 (grows the soleus only)' },
    { exerciseId: 'Donkey_Calf_Raises', slot: 'calves', basis: 'principle', source: 'length; torso supported' },
    { exerciseId: 'Standing_Dumbbell_Calf_Raise', slot: 'calves', basis: 'principle', source: 'length; free weight, small loads' },
    { exerciseId: 'Standing_Barbell_Calf_Raise', slot: 'calves', basis: 'principle', source: 'least stable' },
  ],
  abs: [
    { exerciseId: 'Ab_Crunch_Machine', slot: 'abs', basis: 'principle', source: 'stability, overload (user decision: #1)' },
    { exerciseId: 'Cable_Crunch', slot: 'abs', basis: 'principle', source: 'overload' },
    { exerciseId: 'Cable_Seated_Crunch', slot: 'abs', basis: 'principle', source: 'stability (seated), overload' },
    { exerciseId: 'Decline_Crunch', slot: 'abs', basis: 'principle', source: 'lying on a bench; add a plate' },
    { exerciseId: 'Weighted_Crunches', slot: 'abs', basis: 'principle', source: 'lying on the floor; add a weight' },
    { exerciseId: 'Reverse_Crunch', slot: 'abs', basis: 'principle', source: 'lying; escamilla2006 (emg); hard to load' },
    { exerciseId: 'Knee_Hip_Raise_On_Parallel_Bars', slot: 'abs', basis: 'principle', source: 'back supported, legs hanging; escamilla2006 (emg)' },
    { exerciseId: 'Hanging_Leg_Raise', slot: 'abs', basis: 'principle', source: 'escamilla2006 (emg); hanging, least stable, grip limits' },
    { exerciseId: 'Ab_Roller', slot: 'abs', basis: 'principle', source: 'escamilla2006 (emg); highest lower-back demand (injury)' },
  ],
};

/** Other muscles' exercises that a study shows also build the muscle, as the sentence the person reads. */
export const ALSO: Partial<Record<RankedMuscle, string>> = {
  upperChest: 'The pec deck also grows your upper chest as much as the rest of the chest.',
  frontDelts: 'Bench presses also build your front delts.',
  triceps: 'Bench presses and push-ups also build your triceps.',
  hamstrings: 'Squats and hip thrusts barely grow your hamstrings, so they get their own exercises.',
  glutes: 'Deep squats and leg presses also build your glutes well.',
  abs: 'Heavy squats, presses and rows also grew the abs a little.',
};

/** Never a default or an alternative, but still accepted for saved swaps. */
export const HIDDEN: readonly string[] = ['Smith_Machine_Leg_Press', 'Split_Squat_with_Dumbbells'];

export const SLOT_MUSCLE: Record<Slot, RankedMuscle> = {
  chestPress: 'chest',
  chestFly: 'chest',
  inclinePress: 'upperChest',
  verticalPull: 'lats',
  straightArm: 'lats',
  row: 'midBack',
  row2: 'midBack',
  tBarRow: 'midBack',
  overheadPress: 'frontDelts',
  lateralRaise: 'sideDelts',
  rearDelt: 'rearDelts',
  curl: 'biceps',
  hammerCurl: 'biceps',
  preacherCurl: 'biceps',
  tricepsPress: 'triceps',
  triceps: 'triceps',
  squat: 'quads',
  squat2: 'quads',
  splitSquat: 'quads',
  legExtension: 'quads',
  hinge: 'hamstrings',
  legCurl: 'hamstrings',
  hipThrust: 'glutes',
  hipAbduction: 'glutes',
  kickback: 'glutes',
  calves: 'calves',
  abs: 'abs',
};

/** Where an exercise sits in the ranking (rank is 1-based), or null when it isn't ranked. */
export function rankOf(exerciseId: string): { muscle: RankedMuscle; rank: number } | null {
  for (const muscle of Object.keys(RANKING) as RankedMuscle[]) {
    const i = RANKING[muscle].findIndex((e) => e.exerciseId === exerciseId);
    if (i >= 0) return { muscle, rank: i + 1 };
  }
  return null;
}
