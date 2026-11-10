/**
 * One polar shape family (DESIGN_SYSTEM §3.1). Every expressive shape is drawn by the same
 * radius function, so any shape can morph into any other by interpolating its numbers.
 *
 *   radius(θ) = R · (1 − depth + depth · wave(θ))
 *   wave(θ)   = ((cos(lobes · (θ − rotation)) + 1) / 2) ^ sharpness + wobble · sin(2θ + 0.7) · 0.5
 *
 * A fractional `lobes` (mid-morph) blends the waves of the two neighbouring whole lobe
 * counts, so the outline always closes cleanly.
 */

export interface ShapeSpec {
  lobes: number;
  depth: number;
  /** 1 = soft scallops, 3 = spiky. */
  sharpness: number;
  /** Radians. */
  rotation: number;
  /** Organic wobble (pebbles). */
  wobble?: number;
}

export type Point = [number, number];

export const SAMPLES = 144;

const cosWave = (lobes: number, theta: number, rotation: number, sharpness: number) =>
  Math.pow((Math.cos(lobes * (theta - rotation)) + 1) / 2, sharpness);

function wave(spec: ShapeSpec, theta: number): number {
  const lo = Math.floor(spec.lobes), hi = Math.ceil(spec.lobes), f = spec.lobes - lo;
  const w = lo === hi ? cosWave(lo, theta, spec.rotation, spec.sharpness)
    : (1 - f) * cosWave(lo, theta, spec.rotation, spec.sharpness) + f * cosWave(hi, theta, spec.rotation, spec.sharpness);
  return w + (spec.wobble ?? 0) * Math.sin(2 * theta + 0.7) * 0.5;
}

/** Radius at angle θ for a unit shape (max radius 1 before fitting). */
export function radiusAt(spec: ShapeSpec, theta: number): number {
  return 1 - spec.depth + spec.depth * wave(spec, theta);
}

/**
 * `SAMPLES` points around the shape, starting at the top (12 o'clock) and going clockwise,
 * scaled so the shape fits a circle of radius `r` centred on (cx, cy).
 */
export function samplePoints(spec: ShapeSpec, r: number, cx = r, cy = r): Point[] {
  const radii: number[] = [];
  const angles: number[] = [];
  for (let i = 0; i < SAMPLES; i++) {
    const theta = -Math.PI / 2 + (2 * Math.PI * i) / SAMPLES;
    angles.push(theta);
    radii.push(radiusAt(spec, theta));
  }
  // Fit: the furthest point touches the circle, whatever the wobble.
  const max = Math.max(...radii, 1e-6);
  return radii.map((rad, i) => [cx + (rad / max) * r * Math.cos(angles[i]), cy + (rad / max) * r * Math.sin(angles[i])]);
}

const f2 = (n: number) => Math.round(n * 100) / 100;

/** Closed Catmull-Rom spline through the points, as cubic Béziers in an SVG `d` string. */
export function smoothPath(points: Point[], closed = true): string {
  const n = points.length;
  if (n < 2) return '';
  const at = (i: number) => points[closed ? (i + n) % n : Math.min(Math.max(i, 0), n - 1)];
  let d = `M${f2(points[0][0])},${f2(points[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f2(c1[0])},${f2(c1[1])} ${f2(c2[0])},${f2(c2[1])} ${f2(p2[0])},${f2(p2[1])}`;
  }
  return closed ? d + ' Z' : d;
}

/** The shape's outline for a box of `size` × `size`, inset by `inset` (e.g. half the stroke). */
export function shapePath(spec: ShapeSpec, size: number, inset = 0): string {
  const r = size / 2 - inset;
  return smoothPath(samplePoints(spec, r, size / 2, size / 2));
}

/** Length of the closed polyline through the points (close enough to the smooth curve). */
export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    len += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return len;
}

/** The point at `fraction` (0..1) of the way round the outline, measured along it. */
export function pointAt(points: Point[], fraction: number): Point {
  const total = pathLength(points);
  let target = ((fraction % 1) + 1) % 1 * total;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (target <= seg) {
      const t = seg > 0 ? target / seg : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    target -= seg;
  }
  return points[0];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Interpolates two specs. A circle (depth 0) borrows the other shape's lobes, so morphing
 * into a circle only flattens the lobes instead of also changing their count.
 */
export function lerpSpec(a: ShapeSpec, b: ShapeSpec, t: number): ShapeSpec {
  const aLobes = a.depth === 0 ? b.lobes : a.lobes;
  const bLobes = b.depth === 0 ? a.lobes : b.lobes;
  return {
    lobes: lerp(aLobes, bLobes, t),
    depth: lerp(a.depth, b.depth, t),
    sharpness: lerp(a.sharpness, b.sharpness, t),
    rotation: lerp(a.rotation, b.rotation, t),
    wobble: lerp(a.wobble ?? 0, b.wobble ?? 0, t),
  };
}

export const specKey = (s: ShapeSpec) => `${s.lobes}|${s.depth}|${s.sharpness}|${s.rotation}|${s.wobble ?? 0}`;
