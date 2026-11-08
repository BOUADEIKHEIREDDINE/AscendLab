import { bmr, tdee, liftingKcalPerDay } from '../energy';

describe('bmr (Mifflin-St Jeor)', () => {
  it('computes male BMR', () => {
    // 10*80 + 6.25*180 - 5*30 + 5
    expect(bmr({ sex: 'male', weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
  });

  it('computes female BMR', () => {
    // 10*60 + 6.25*165 - 5*28 - 161
    expect(bmr({ sex: 'female', weightKg: 60, heightCm: 165, age: 28 })).toBeCloseTo(1330.25);
  });
});

describe('tdee', () => {
  it.each([
    ['sedentary', 1.2],
    ['light', 1.375],
    ['moderate', 1.55],
    ['high', 1.725],
    ['very_high', 1.9],
  ] as const)('multiplies BMR by the %s activity factor', (activity, factor) => {
    expect(tdee(1780, activity)).toBeCloseTo(1780 * factor);
  });
});

describe('liftingKcalPerDay', () => {
  it('2.5 kcal per kg per hour above rest, averaged over 7 days', () => {
    // 73 kg, 6 sessions of ~43 min: 2.5 x 73 x 4.33 h / 7 = 113
    expect(liftingKcalPerDay(73, 260)).toBe(113);
    expect(liftingKcalPerDay(80, 0)).toBe(0);
  });

  it('rejects impossible inputs', () => {
    expect(() => liftingKcalPerDay(0, 100)).toThrow(RangeError);
    expect(() => liftingKcalPerDay(70, -1)).toThrow(RangeError);
  });
});
