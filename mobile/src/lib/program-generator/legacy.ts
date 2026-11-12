import { CATALOG } from './catalog';
import type { Level, Slot } from './program';

/**
 * The slot lists as they were before the exercise ranking. Kept so every exercise saved in a
 * plan or log still maps to its slot, and so tests can compare the ranked defaults with the old ones.
 */
export const LEGACY_SLOT_OPTIONS: Readonly<Record<Slot, readonly string[]>> = {
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

/** The default exercise before the ranking: the first option, for beginners the first without a barbell. */
export function legacyDefault(slot: Slot, level: Level): string {
  const options = LEGACY_SLOT_OPTIONS[slot];
  return (level === 'beginner' ? options.find((id) => CATALOG[id].equipment !== 'barbell') : undefined) ?? options[0];
}
