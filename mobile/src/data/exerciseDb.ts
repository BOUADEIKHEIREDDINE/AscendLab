/**
 * The gym exercises of free-exercise-db (Unlicense, github.com/yuhonas/free-exercise-db) at a
 * pinned commit, and how they map to the app's groups. The JSON comes from
 * scripts/build-exercise-db.mjs. Photos stay on the CDN (not bundled) until launch.
 */
import type { Muscle as CatalogMuscle } from '../lib/program-generator/catalog';
import type { Equipment, Muscle } from './training';
import file from './exercise-db.json';

export type DbExercise = {
  id: string;
  name: string;
  category: string;
  level: string;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  images: string[];
};

export const DB_SOURCE_COMMIT: string = file.commit;
export const DB_EXERCISES: DbExercise[] = file.exercises as DbExercise[];
const byId = new Map(DB_EXERCISES.map((x) => [x.id, x]));
export const dbFind = (id: string): DbExercise | undefined => byId.get(id);

const GROUP: Record<string, Muscle> = {
  chest: 'CHEST',
  lats: 'BACK', 'middle back': 'BACK', 'lower back': 'BACK', traps: 'BACK',
  shoulders: 'SHOULDERS',
  biceps: 'ARMS', triceps: 'ARMS', forearms: 'ARMS',
  quadriceps: 'LEGS', hamstrings: 'LEGS', calves: 'LEGS', adductors: 'LEGS',
  glutes: 'GLUTES', abductors: 'GLUTES',
  abdominals: 'CORE',
};
/** The app's muscle group for one of the database's muscle names. */
export const groupOfDbMuscle = (m: string): Muscle => GROUP[m] ?? 'OTHER';

const EQUIPMENT: Record<string, Equipment> = {
  barbell: 'BARBELL', 'e-z curl bar': 'BARBELL', dumbbell: 'DUMBBELL', machine: 'MACHINE', cable: 'CABLE',
  'body only': 'BODYWEIGHT', kettlebells: 'KETTLEBELL', bands: 'BAND',
};
export const equipmentOfDb = (e: string | null): Equipment => (e != null && EQUIPMENT[e]) || 'OTHER';

const PHOTO_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${DB_SOURCE_COMMIT}/exercises/`;
export const photoUrls = (x: DbExercise): string[] => x.images.map((p) => PHOTO_BASE + p);

/** The generator's muscle names, as in catalog.ts: lower back, forearms, traps, neck and adductors aren't counted. */
const GENERATOR: Record<string, CatalogMuscle> = {
  chest: 'chest', lats: 'back', 'middle back': 'back', shoulders: 'shoulders', biceps: 'biceps', triceps: 'triceps',
  quadriceps: 'quads', hamstrings: 'hamstrings', glutes: 'glutes', abductors: 'glutes', calves: 'calves', abdominals: 'abs',
};
const toGenerator = (ms: string[]): CatalogMuscle[] => [...new Set(ms.flatMap((m) => (GENERATOR[m] ? [GENERATOR[m]] : [])))];

export function generatorMusclesOfDb(x: DbExercise): { primary: CatalogMuscle[]; secondary: CatalogMuscle[] } {
  const primary = toGenerator(x.primaryMuscles);
  return { primary, secondary: toGenerator(x.secondaryMuscles).filter((m) => !primary.includes(m)) };
}
