/** Smoothing factor: how far the trend moves toward each new weigh-in. */
const TREND_ALPHA = 0.1;

export type WeighIn = {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  weightKg: number;
};

export type TrendPoint = WeighIn & { trendKg: number };

/** Exponentially smoothed weight trend, to hide day-to-day water and salt swings. */
export function weightTrend(weighIns: WeighIn[]): TrendPoint[] {
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));
  const points: TrendPoint[] = [];
  for (const w of sorted) {
    const previous = points.at(-1)?.trendKg ?? w.weightKg;
    points.push({ ...w, trendKg: previous + TREND_ALPHA * (w.weightKg - previous) });
  }
  return points;
}
