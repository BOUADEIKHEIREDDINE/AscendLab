import { CATALOG } from '../catalog';
import { HIDDEN, RANKING, rankOf, SLOT_MUSCLE, type RankedMuscle } from '../ranking';

const muscles = Object.keys(RANKING) as RankedMuscle[];
const entries = muscles.flatMap((m) => RANKING[m].map((e) => ({ muscle: m, ...e })));

describe('exercise ranking', () => {
  it('every ranked id is in CATALOG', () => {
    expect(entries.filter((e) => !CATALOG[e.exerciseId]).map((e) => e.exerciseId)).toEqual([]);
  });

  it('every ranked entry reads its own muscle', () => {
    expect(entries.filter((e) => SLOT_MUSCLE[e.slot] !== e.muscle).map((e) => e.exerciseId)).toEqual([]);
  });

  it('no exercise is ranked twice', () => {
    const ids = entries.map((e) => e.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers 14 muscles with lists between 1 and 10 long', () => {
    expect(muscles).toHaveLength(14);
    muscles.forEach((m) => {
      expect(RANKING[m].length).toBeGreaterThanOrEqual(1);
      expect(RANKING[m].length).toBeLessThanOrEqual(10);
    });
  });

  it('hidden ids are never ranked', () => {
    const ids = new Set(entries.map((e) => e.exerciseId));
    expect(HIDDEN.filter((id) => ids.has(id))).toEqual([]);
  });

  it('rankOf finds the position', () => {
    expect(rankOf(RANKING.quads[0].exerciseId)).toEqual({ muscle: 'quads', rank: 1 });
    expect(rankOf('not_an_id')).toBeNull();
  });
});
