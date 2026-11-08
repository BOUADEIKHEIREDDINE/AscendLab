import { macros, referenceWeightKg } from '../macros';

describe('referenceWeightKg', () => {
  it('uses actual weight when BMI is under 30', () => {
    expect(referenceWeightKg(80, 180)).toBe(80);
  });

  it('caps weight at BMI 30 for obese users', () => {
    // 30 * 1.75^2
    expect(referenceWeightKg(120, 175)).toBeCloseTo(91.875);
  });
});

describe('macros', () => {
  it('sets protein at 1.8 g/kg of reference weight', () => {
    expect(macros(2400, 80, 180).proteinG).toBe(144);
  });

  it('caps protein for obese users at the BMI-30 weight', () => {
    // 1.8 * 91.875 = 165.375
    expect(macros(2400, 120, 175).proteinG).toBe(165);
  });

  it('sets fat at 25% of calories', () => {
    // 2400 * 0.25 / 9 = 66.7
    expect(macros(2400, 80, 180).fatG).toBe(67);
  });

  it('never sets fat under 0.6 g/kg of reference weight', () => {
    // 25% of 1500 kcal = 41.7 g, floor = 0.6 * 90 = 54 g
    expect(macros(1500, 90, 180).fatG).toBe(54);
  });

  it('fills the remaining calories with carbs', () => {
    // (2400 - 144*4 - 66.67*9) / 4 = 306
    expect(macros(2400, 80, 180).carbsG).toBe(306);
  });

  it('never returns negative carbs', () => {
    expect(macros(800, 80, 180).carbsG).toBe(0);
  });
});
