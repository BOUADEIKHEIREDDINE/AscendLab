/**
 * Notices for a change to the program: when swapping or adding exercises takes a muscle past a
 * volume line. They inform and never block, and only fire when a change crosses a line in the bad
 * direction; a muscle the plan already puts past a line stays quiet. Numbers from
 * docs/Research/Evidence/Training - Volume.md.
 */
import { CATALOG, type Muscle } from './catalog';
import { SECONDARY_SET_WEIGHT } from './program';

export type VolumeSession = { exercises: { exerciseId: string; sets: number }[]; timesPerWeek: number };

/** The muscles an exercise trains, for exercises outside the catalog too. Unknown → not counted. */
export type MuscleLookup = (exerciseId: string) => { primary: Muscle[]; secondary: Muscle[] } | undefined;
const catalogLookup: MuscleLookup = (id) => CATALOG[id];

export type VolumeNotice =
  | { kind: 'week_above'; muscle: Muscle; sets: number; limit: number }
  | { kind: 'week_below_minimum'; muscle: Muscle; sets: number; limit: number }
  | { kind: 'session_above'; muscle: Muscle; sets: number; limit: number; session: number };

/** Top of the weekly sets range per muscle: 6–8 on 2 days, 8–12 on 3, 10–16 on 4–6 (product decision). */
export const WEEKLY_TOP: Record<2 | 3 | 4 | 5 | 6, number> = { 2: 8, 3: 12, 4: 16, 5: 16, 6: 16 };
/** Minimum effective dose: 4 fractional sets a week (Pelland 2026). */
export const WEEKLY_MINIMUM = 4;
/** Per session, gains level off past ~8 direct sets for a muscle (Krieger, long rests). */
export const SESSION_DIRECT_MAX = 8;

const MUSCLES: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs'];
/** Only these muscles have a weekly range in the evidence notes. */
const RANGED: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings'];

const zero = (): Record<Muscle, number> => Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;

function sessionVolume(s: VolumeSession | undefined, direct: boolean, lookup: MuscleLookup): Record<Muscle, number> {
  const volume = zero();
  for (const { exerciseId, sets } of s?.exercises ?? []) {
    const ex = lookup(exerciseId);
    if (!ex) continue;
    for (const m of ex.primary) volume[m] += sets;
    if (!direct) for (const m of ex.secondary) volume[m] += sets * SECONDARY_SET_WEIGHT;
  }
  return volume;
}

function weekVolume(sessions: VolumeSession[], lookup: MuscleLookup): Record<Muscle, number> {
  const volume = zero();
  for (const s of sessions) {
    const one = sessionVolume(s, false, lookup);
    for (const m of MUSCLES) volume[m] += one[m] * s.timesPerWeek;
  }
  return volume;
}

export function volumeNotices(
  before: VolumeSession[], after: VolumeSession[], daysPerWeek: number, lookup: MuscleLookup = catalogLookup,
): VolumeNotice[] {
  const notices: VolumeNotice[] = [];
  const top = WEEKLY_TOP[daysPerWeek as keyof typeof WEEKLY_TOP];
  const was = weekVolume(before, lookup);
  const now = weekVolume(after, lookup);
  for (const muscle of MUSCLES) {
    if (top != null && RANGED.includes(muscle) && was[muscle] <= top && now[muscle] > top) {
      notices.push({ kind: 'week_above', muscle, sets: now[muscle], limit: top });
    }
    if (was[muscle] >= WEEKLY_MINIMUM && now[muscle] < WEEKLY_MINIMUM) {
      notices.push({ kind: 'week_below_minimum', muscle, sets: now[muscle], limit: WEEKLY_MINIMUM });
    }
  }
  after.forEach((s, i) => {
    const wasDirect = sessionVolume(before[i], true, lookup);
    const nowDirect = sessionVolume(s, true, lookup);
    for (const muscle of MUSCLES) {
      if (wasDirect[muscle] <= SESSION_DIRECT_MAX && nowDirect[muscle] > SESSION_DIRECT_MAX) {
        notices.push({ kind: 'session_above', muscle, sets: nowDirect[muscle], limit: SESSION_DIRECT_MAX, session: i });
      }
    }
  });
  return notices;
}
