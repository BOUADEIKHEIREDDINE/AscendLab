/** The named shapes (DESIGN_SYSTEM §3.2) and the meal shapes (§3.3). */
import type { MealType } from '../../data/social';
import { markStatic, ShapeSpec } from './polar';

const UP = -Math.PI / 2;

export const shapes = {
  circle: { lobes: 0, depth: 0, sharpness: 1, rotation: 0, wobble: 0 },
  cookie9: { lobes: 9, depth: 0.07, sharpness: 1, rotation: UP, wobble: 0 },
  cookie12: { lobes: 12, depth: 0.05, sharpness: 1, rotation: UP, wobble: 0 },
  burst: { lobes: 12, depth: 0.14, sharpness: 2.4, rotation: UP, wobble: 0 },
  emberBurst: { lobes: 16, depth: 0.12, sharpness: 3, rotation: UP, wobble: 0 },
  clover: { lobes: 4, depth: 0.18, sharpness: 1, rotation: UP + Math.PI / 4, wobble: 0 },
  // Rotated so one lobe points straight up: the ascent arrow.
  softTriangle: { lobes: 3, depth: 0.22, sharpness: 1, rotation: UP, wobble: 0 },
  pebble: { lobes: 2, depth: 0.06, sharpness: 1, rotation: 0, wobble: 0.18 },
  flower: { lobes: 6, depth: 0.16, sharpness: 1.4, rotation: UP, wobble: 0 },
  gem: { lobes: 5, depth: 0.12, sharpness: 1.2, rotation: UP, wobble: 0 },
} satisfies Record<string, ShapeSpec>;

markStatic(Object.values(shapes));

export type ShapeName = keyof typeof shapes;

/** Each meal's own shape, used for its icon container everywhere. */
export const mealShape: Record<MealType, ShapeName> = {
  BREAKFAST: 'flower',
  LUNCH: 'gem',
  DINNER: 'cookie9',
  SNACK: 'clover',
};

/** Workouts are an arrow pointing up: ascent. */
export const workoutShape: ShapeName = 'softTriangle';

export const toSpec = (s: ShapeName | ShapeSpec): ShapeSpec => (typeof s === 'string' ? shapes[s] : s);
