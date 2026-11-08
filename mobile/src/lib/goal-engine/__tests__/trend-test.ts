import { weightTrend } from '../trend';

describe('weightTrend', () => {
  it('returns nothing without weigh-ins', () => {
    expect(weightTrend([])).toEqual([]);
  });

  it('starts the trend at the first weigh-in', () => {
    expect(weightTrend([{ date: '2026-10-01', weightKg: 80 }])).toEqual([
      { date: '2026-10-01', weightKg: 80, trendKg: 80 },
    ]);
  });

  it('moves the trend 10% toward each new weigh-in', () => {
    const trend = weightTrend([
      { date: '2026-10-01', weightKg: 80 },
      { date: '2026-10-02', weightKg: 82 },
      { date: '2026-10-03', weightKg: 79 },
    ]);
    expect(trend.map((p) => p.trendKg)).toEqual([80, expect.closeTo(80.2), expect.closeTo(80.08)]);
  });

  it('orders weigh-ins by date', () => {
    const trend = weightTrend([
      { date: '2026-10-02', weightKg: 82 },
      { date: '2026-10-01', weightKg: 80 },
    ]);
    expect(trend.map((p) => p.date)).toEqual(['2026-10-01', '2026-10-02']);
    expect(trend[1].trendKg).toBeCloseTo(80.2);
  });
});
