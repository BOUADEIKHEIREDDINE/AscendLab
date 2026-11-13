/**
 * Curated gym exercises from free-exercise-db (Unlicense, github.com/yuhonas/free-exercise-db).
 * Ids, names, equipment, mechanic and muscles are copied from the database; muscles are mapped
 * to our groups (lats + middle back → back, quadriceps → quads, abductors → glutes, abdominals → abs;
 * lower back, forearms, traps dropped). One correction: squat and leg press patterns get no hamstring
 * credit, since squats don't grow the hamstrings (Kubo 2019, MRI). A second correction: every exercise
 * in the row, row2 and tBarRow generator slots credits biceps and shoulders as secondary muscles,
 * because horizontal rows flex the elbow and extend the shoulder, and the database labels them
 * inconsistently.
 *
 * Rows with an `Ascend_` id are our own entries for common gym exercises the database lacks
 * (no media yet).
 */
import type { BodyRegion } from './progression';

export type Muscle =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs';

export type ExerciseEquipment = 'barbell' | 'machine' | 'cable' | 'dumbbell' | 'kettlebell' | 'bodyweight';

export type CatalogExercise = {
  id: string;
  name: string;
  equipment: ExerciseEquipment;
  mechanic: 'compound' | 'isolation';
  region: BodyRegion;
  primary: Muscle[];
  secondary: Muscle[];
};

type Row = [string, string, ExerciseEquipment, CatalogExercise['mechanic'], BodyRegion, Muscle[], Muscle[]];

// prettier-ignore
const ROWS: Row[] = [
  // Chest
  ['Barbell_Bench_Press_-_Medium_Grip', 'Barbell Bench Press - Medium Grip', 'barbell', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Machine_Bench_Press', 'Machine Bench Press', 'machine', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Dumbbell_Bench_Press', 'Dumbbell Bench Press', 'dumbbell', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Leverage_Chest_Press', 'Leverage Chest Press', 'machine', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'Barbell Incline Bench Press - Medium Grip', 'barbell', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Leverage_Incline_Chest_Press', 'Leverage Incline Chest Press', 'machine', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Incline_Dumbbell_Press', 'Incline Dumbbell Press', 'dumbbell', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Incline_Cable_Chest_Press', 'Incline Cable Chest Press', 'cable', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Butterfly', 'Butterfly', 'machine', 'isolation', 'upper', ['chest'], []],
  ['Dumbbell_Flyes', 'Dumbbell Flyes', 'dumbbell', 'isolation', 'upper', ['chest'], []],
  ['Flat_Bench_Cable_Flyes', 'Flat Bench Cable Flyes', 'cable', 'isolation', 'upper', ['chest'], []],
  // Back
  ['Seated_Cable_Rows', 'Seated Cable Rows', 'cable', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Bent_Over_Barbell_Row', 'Bent Over Barbell Row', 'barbell', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['One-Arm_Dumbbell_Row', 'One-Arm Dumbbell Row', 'dumbbell', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Dumbbell_Incline_Row', 'Dumbbell Incline Row', 'dumbbell', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Wide-Grip_Lat_Pulldown', 'Wide-Grip Lat Pulldown', 'cable', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Close-Grip_Front_Lat_Pulldown', 'Close-Grip Front Lat Pulldown', 'cable', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Pullups', 'Pullups', 'bodyweight', 'compound', 'upper', ['back'], ['biceps']],
  ['T-Bar_Row_with_Handle', 'T-Bar Row with Handle', 'barbell', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Lying_T-Bar_Row', 'Lying T-Bar Row', 'machine', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Bent_Over_Two-Dumbbell_Row', 'Bent Over Two-Dumbbell Row', 'dumbbell', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Leverage_Iso_Row', 'Leverage Iso Row', 'machine', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Smith_Machine_Bent_Over_Row', 'Smith Machine Bent Over Row', 'machine', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Leverage_High_Row', 'Leverage High Row', 'machine', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Seated_One-arm_Cable_Pulley_Rows', 'Seated One-arm Cable Pulley Rows', 'cable', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['V-Bar_Pulldown', 'V-Bar Pulldown', 'cable', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['One_Arm_Lat_Pulldown', 'One Arm Lat Pulldown', 'cable', 'compound', 'upper', ['back'], ['biceps']],
  ['Straight-Arm_Pulldown', 'Straight-Arm Pulldown', 'cable', 'isolation', 'upper', ['back'], []],
  ['Rope_Straight-Arm_Pulldown', 'Rope Straight-Arm Pulldown', 'cable', 'isolation', 'upper', ['back'], []],
  // Shoulders
  ['Side_Lateral_Raise', 'Side Lateral Raise', 'dumbbell', 'isolation', 'upper', ['shoulders'], []],
  ['Cable_Seated_Lateral_Raise', 'Cable Seated Lateral Raise', 'cable', 'isolation', 'upper', ['shoulders'], ['back']],
  ['Machine_Shoulder_Military_Press', 'Machine Shoulder (Military) Press', 'machine', 'compound', 'upper', ['shoulders'], ['triceps']],
  ['Dumbbell_Shoulder_Press', 'Dumbbell Shoulder Press', 'dumbbell', 'compound', 'upper', ['shoulders'], ['triceps']],
  ['Seated_Barbell_Military_Press', 'Seated Barbell Military Press', 'barbell', 'compound', 'upper', ['shoulders'], ['triceps']],
  ['Arnold_Dumbbell_Press', 'Arnold Dumbbell Press', 'dumbbell', 'compound', 'upper', ['shoulders'], ['triceps']],
  ['Seated_Side_Lateral_Raise', 'Seated Side Lateral Raise', 'dumbbell', 'isolation', 'upper', ['shoulders'], []],
  ['One-Arm_Side_Laterals', 'One-Arm Side Laterals', 'dumbbell', 'isolation', 'upper', ['shoulders'], []],
  ['Reverse_Flyes', 'Reverse Flyes', 'dumbbell', 'isolation', 'upper', ['shoulders'], []],
  ['Cable_Rear_Delt_Fly', 'Cable Rear Delt Fly', 'cable', 'isolation', 'upper', ['shoulders'], []],
  ['Face_Pull', 'Face Pull', 'cable', 'compound', 'upper', ['shoulders'], ['back']],
  ['Seated_Bent-Over_Rear_Delt_Raise', 'Seated Bent-Over Rear Delt Raise', 'dumbbell', 'isolation', 'upper', ['shoulders'], []],
  // Arms
  ['Dumbbell_Bicep_Curl', 'Dumbbell Bicep Curl', 'dumbbell', 'isolation', 'upper', ['biceps'], []],
  ['Hammer_Curls', 'Hammer Curls', 'dumbbell', 'isolation', 'upper', ['biceps'], []],
  ['Barbell_Curl', 'Barbell Curl', 'barbell', 'isolation', 'upper', ['biceps'], []],
  ['Machine_Bicep_Curl', 'Machine Bicep Curl', 'machine', 'isolation', 'upper', ['biceps'], []],
  ['Standing_Biceps_Cable_Curl', 'Standing Biceps Cable Curl', 'cable', 'isolation', 'upper', ['biceps'], []],
  ['Incline_Dumbbell_Curl', 'Incline Dumbbell Curl', 'dumbbell', 'isolation', 'upper', ['biceps'], []],
  ['Cable_Hammer_Curls_-_Rope_Attachment', 'Cable Hammer Curls - Rope Attachment', 'cable', 'isolation', 'upper', ['biceps'], []],
  ['Cross_Body_Hammer_Curl', 'Cross Body Hammer Curl', 'dumbbell', 'isolation', 'upper', ['biceps'], []],
  ['Preacher_Hammer_Dumbbell_Curl', 'Preacher Hammer Dumbbell Curl', 'dumbbell', 'isolation', 'upper', ['biceps'], []],
  ['Machine_Preacher_Curls', 'Machine Preacher Curls', 'machine', 'isolation', 'upper', ['biceps'], []],
  ['Preacher_Curl', 'Preacher Curl', 'barbell', 'isolation', 'upper', ['biceps'], []],
  ['Two-Arm_Dumbbell_Preacher_Curl', 'Two-Arm Dumbbell Preacher Curl', 'dumbbell', 'isolation', 'upper', ['biceps'], []],
  ['Cable_Preacher_Curl', 'Cable Preacher Curl', 'cable', 'isolation', 'upper', ['biceps'], []],
  ['Triceps_Pushdown', 'Triceps Pushdown', 'cable', 'isolation', 'upper', ['triceps'], []],
  ['Triceps_Pushdown_-_Rope_Attachment', 'Triceps Pushdown - Rope Attachment', 'cable', 'isolation', 'upper', ['triceps'], []],
  ['Machine_Triceps_Extension', 'Machine Triceps Extension', 'machine', 'isolation', 'upper', ['triceps'], []],
  ['Standing_Dumbbell_Triceps_Extension', 'Standing Dumbbell Triceps Extension', 'dumbbell', 'isolation', 'upper', ['triceps'], []],
  ['Cable_Rope_Overhead_Triceps_Extension', 'Cable Rope Overhead Triceps Extension', 'cable', 'isolation', 'upper', ['triceps'], []],
  ['Dip_Machine', 'Dip Machine', 'machine', 'compound', 'upper', ['triceps'], ['chest', 'shoulders']],
  ['Dips_-_Triceps_Version', 'Dips - Triceps Version', 'bodyweight', 'compound', 'upper', ['triceps'], ['chest', 'shoulders']],
  ['Close-Grip_Barbell_Bench_Press', 'Close-Grip Barbell Bench Press', 'barbell', 'compound', 'upper', ['triceps'], ['chest', 'shoulders']],
  ['Smith_Machine_Close-Grip_Bench_Press', 'Smith Machine Close-Grip Bench Press', 'machine', 'compound', 'upper', ['triceps'], ['chest', 'shoulders']],
  // Legs
  ['Barbell_Squat', 'Barbell Squat', 'barbell', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Leg_Press', 'Leg Press', 'machine', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Hack_Squat', 'Hack Squat', 'machine', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Dumbbell_Squat', 'Dumbbell Squat', 'dumbbell', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Smith_Machine_Squat', 'Smith Machine Squat', 'machine', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Smith_Machine_Leg_Press', 'Smith Machine Leg Press', 'machine', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Dumbbell_Rear_Lunge', 'Dumbbell Rear Lunge', 'dumbbell', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Narrow_Stance_Leg_Press', 'Narrow Stance Leg Press', 'machine', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Smith_Single-Leg_Split_Squat', 'Smith Single-Leg Split Squat', 'machine', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Ascend_Bulgarian_Split_Squat', 'Bulgarian Split Squat', 'dumbbell', 'compound', 'lower', ['quads'], ['glutes']],
  ['Dumbbell_Lunges', 'Dumbbell Lunges', 'dumbbell', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Split_Squat_with_Dumbbells', 'Split Squat with Dumbbells', 'dumbbell', 'compound', 'lower', ['quads'], ['glutes']],
  ['Leg_Extensions', 'Leg Extensions', 'machine', 'isolation', 'lower', ['quads'], []],
  ['Single-Leg_Leg_Extension', 'Single-Leg Leg Extension', 'machine', 'isolation', 'lower', ['quads'], []],
  ['Romanian_Deadlift', 'Romanian Deadlift', 'barbell', 'compound', 'lower', ['hamstrings'], ['calves', 'glutes']],
  ['Stiff-Legged_Dumbbell_Deadlift', 'Stiff-Legged Dumbbell Deadlift', 'dumbbell', 'compound', 'lower', ['hamstrings'], ['glutes']],
  ['Smith_Machine_Stiff-Legged_Deadlift', 'Smith Machine Stiff-Legged Deadlift', 'machine', 'compound', 'lower', ['hamstrings'], ['glutes']],
  ['Kettlebell_One-Legged_Deadlift', 'Kettlebell One-Legged Deadlift', 'kettlebell', 'compound', 'lower', ['hamstrings'], ['glutes']],
  ['Lying_Leg_Curls', 'Lying Leg Curls', 'machine', 'isolation', 'lower', ['hamstrings'], []],
  ['Seated_Leg_Curl', 'Seated Leg Curl', 'machine', 'isolation', 'lower', ['hamstrings'], []],
  ['Standing_Leg_Curl', 'Standing Leg Curl', 'machine', 'isolation', 'lower', ['hamstrings'], []],
  ['Barbell_Hip_Thrust', 'Barbell Hip Thrust', 'barbell', 'compound', 'lower', ['glutes'], ['calves', 'hamstrings']],
  ['One-Legged_Cable_Kickback', 'One-Legged Cable Kickback', 'cable', 'isolation', 'lower', ['glutes'], ['hamstrings']],
  ['Glute_Kickback', 'Glute Kickback', 'bodyweight', 'compound', 'lower', ['glutes'], ['hamstrings']],
  ['Barbell_Glute_Bridge', 'Barbell Glute Bridge', 'barbell', 'compound', 'lower', ['glutes'], ['calves', 'hamstrings']],
  ['Single_Leg_Glute_Bridge', 'Single Leg Glute Bridge', 'bodyweight', 'isolation', 'lower', ['glutes'], ['hamstrings']],
  ['Ascend_Hip_Thrust_Machine', 'Hip Thrust Machine', 'machine', 'compound', 'lower', ['glutes'], ['hamstrings']],
  ['Ascend_Smith_Machine_Hip_Thrust', 'Smith Machine Hip Thrust', 'machine', 'compound', 'lower', ['glutes'], ['hamstrings']],
  ['Ascend_Glute_Kickback_Machine', 'Glute Kickback Machine', 'machine', 'isolation', 'lower', ['glutes'], ['hamstrings']],
  ['Thigh_Abductor', 'Thigh Abductor', 'machine', 'isolation', 'lower', ['glutes'], []],
  ['Ascend_Cable_Hip_Abduction', 'Cable Hip Abduction', 'cable', 'isolation', 'lower', ['glutes'], []],
  ['Ascend_Multi_Hip_Abduction', 'Multi-Hip Machine Abduction', 'machine', 'isolation', 'lower', ['glutes'], []],
  // Abs (the region only sets rest and load step)
  ['Ab_Crunch_Machine', 'Ab Crunch Machine', 'machine', 'isolation', 'upper', ['abs'], []],
  ['Cable_Crunch', 'Cable Crunch', 'cable', 'isolation', 'upper', ['abs'], []],
  ['Cable_Seated_Crunch', 'Cable Seated Crunch', 'cable', 'isolation', 'upper', ['abs'], []],
  ['Decline_Crunch', 'Decline Crunch', 'bodyweight', 'isolation', 'upper', ['abs'], []],
  ['Standing_Calf_Raises', 'Standing Calf Raises', 'machine', 'isolation', 'lower', ['calves'], []],
  ['Seated_Calf_Raise', 'Seated Calf Raise', 'machine', 'isolation', 'lower', ['calves'], []],
  ['Calf_Press_On_The_Leg_Press_Machine', 'Calf Press On The Leg Press Machine', 'machine', 'isolation', 'lower', ['calves'], []],
  // Added for the exercise ranking (docs/Research/Evidence/Training - Exercise ranking.md)
  ['Smith_Machine_Bench_Press', 'Smith Machine Bench Press', 'machine', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Cable_Crossover', 'Cable Crossover', 'cable', 'isolation', 'upper', ['chest'], ['shoulders']],
  ['Pushups', 'Pushups', 'bodyweight', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Smith_Machine_Incline_Bench_Press', 'Smith Machine Incline Bench Press', 'machine', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Hammer_Grip_Incline_DB_Bench_Press', 'Hammer Grip Incline DB Bench Press', 'dumbbell', 'compound', 'upper', ['chest'], ['shoulders', 'triceps']],
  ['Underhand_Cable_Pulldowns', 'Underhand Cable Pulldowns', 'cable', 'compound', 'upper', ['back'], ['biceps', 'shoulders']],
  ['Chin-Up', 'Chin-Up', 'bodyweight', 'compound', 'upper', ['back'], ['biceps']],
  ['Smith_Machine_Overhead_Shoulder_Press', 'Smith Machine Overhead Shoulder Press', 'machine', 'compound', 'upper', ['shoulders'], ['triceps']],
  ['Leverage_Shoulder_Press', 'Leverage Shoulder Press', 'machine', 'compound', 'upper', ['shoulders'], ['triceps']],
  ['Standing_Military_Press', 'Standing Military Press', 'barbell', 'compound', 'upper', ['shoulders'], ['triceps']],
  ['Standing_Low-Pulley_Deltoid_Raise', 'Standing Low-Pulley Deltoid Raise', 'cable', 'isolation', 'upper', ['shoulders'], []],
  ['One-Arm_Incline_Lateral_Raise', 'One-Arm Incline Lateral Raise', 'dumbbell', 'isolation', 'upper', ['shoulders'], []],
  ['Reverse_Machine_Flyes', 'Reverse Machine Flyes', 'machine', 'isolation', 'upper', ['shoulders'], []],
  ['Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench', 'Bent Over Dumbbell Rear Delt Raise With Head On Bench', 'dumbbell', 'isolation', 'upper', ['shoulders'], []],
  ['Cable_One_Arm_Tricep_Extension', 'Cable One Arm Tricep Extension', 'cable', 'isolation', 'upper', ['triceps'], []],
  ['Goblet_Squat', 'Goblet Squat', 'kettlebell', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Front_Barbell_Squat', 'Front Barbell Squat', 'barbell', 'compound', 'lower', ['quads'], ['calves', 'glutes']],
  ['Hyperextensions_Back_Extensions', 'Hyperextensions (Back Extensions)', 'bodyweight', 'isolation', 'lower', ['hamstrings'], ['glutes']],
  ['Glute_Ham_Raise', 'Glute Ham Raise', 'machine', 'compound', 'lower', ['hamstrings'], ['calves', 'glutes']],
  ['Calf_Press', 'Calf Press', 'machine', 'isolation', 'lower', ['calves'], []],
  ['Smith_Machine_Calf_Raise', 'Smith Machine Calf Raise', 'machine', 'isolation', 'lower', ['calves'], []],
  ['Donkey_Calf_Raises', 'Donkey Calf Raises', 'bodyweight', 'isolation', 'lower', ['calves'], []],
  ['Standing_Dumbbell_Calf_Raise', 'Standing Dumbbell Calf Raise', 'dumbbell', 'isolation', 'lower', ['calves'], []],
  ['Standing_Barbell_Calf_Raise', 'Standing Barbell Calf Raise', 'barbell', 'isolation', 'lower', ['calves'], []],
  ['Weighted_Crunches', 'Weighted Crunches', 'dumbbell', 'isolation', 'upper', ['abs'], []],
  ['Reverse_Crunch', 'Reverse Crunch', 'bodyweight', 'isolation', 'upper', ['abs'], []],
  ['Knee_Hip_Raise_On_Parallel_Bars', 'Knee/Hip Raise On Parallel Bars', 'bodyweight', 'isolation', 'upper', ['abs'], []],
  ['Hanging_Leg_Raise', 'Hanging Leg Raise', 'bodyweight', 'isolation', 'upper', ['abs'], []],
  ['Ab_Roller', 'Ab Roller', 'bodyweight', 'isolation', 'upper', ['abs'], ['shoulders']],
  ['Ascend_Machine_Lateral_Raise', 'Machine Lateral Raise', 'machine', 'isolation', 'upper', ['shoulders'], []],
];

export const CATALOG: Record<string, CatalogExercise> = Object.fromEntries(
  ROWS.map(([id, name, equipment, mechanic, region, primary, secondary]) => [
    id,
    { id, name, equipment, mechanic, region, primary, secondary },
  ]),
);
