/** You vs friends: calories eaten per day and weight change over the last 30 days. */
import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import { Convert, formatKcal, roundInt, UNIT, Units } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { Days } from '../../../data/social';
import { SocialRepository } from '../../../data/socialRepo';
import { PersonStats, StatsRepository } from '../../../data/statsRepo';
import { useNow, useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { palette, Gutter, people } from '../../theme';
import { formatDate } from '../../format';
import { ListGroup, ListRow, PageHeader, Screen, SectionTitle, SkeletonCard, T, Tile, Toggle } from '../../components/core';
import { ChartSeries, MultiLineChart } from '../../components/charts';

const MAX_FRIENDS_SHOWN = 4;
const DAYS = 30;
const DAY_MS = 24 * 3600 * 1000;

const toUnit = (kg: number, units: Units) => (units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg);
function signed(v: number): string {
  const r = roundInt(v * 10) / 10;
  if (Math.abs(r) < 0.05) return '0';
  return r > 0 ? `+${r}` : `−${Math.abs(r)}`;
}

export function CompareScreen() {
  const nav = useNav();
  const units = useStore(profileStore)?.units ?? 'METRIC';
  const [stats, setStats] = useState<PersonStats[] | null>(null);
  const [shareWeight, setShareWeight] = useState(StatsRepository.sharesWeight);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await StatsRepository.syncMine().catch(() => undefined);
      if (cancelled) return;
      setShareWeight(StatsRepository.sharesWeight);
      const self = await SocialRepository.refreshMe();
      const friends = await SocialRepository.friendProfiles().catch(() => []);
      const people: [string, string][] = [...(self ? [[self.uid, 'You'] as [string, string]] : []), ...friends.map((f) => [f.uid, f.name] as [string, string])];
      const loaded = await StatsRepository.load(people);
      // Friends with the most logged days first, so the chart shows the ones you can compare with.
      const rest = loaded.slice(1).sort((a, b) => Object.keys(b.kcal).length - Object.keys(a.kcal).length).slice(0, MAX_FRIENDS_SHOWN);
      if (!cancelled) setStats([...loaded.slice(0, 1), ...rest]);
    })();
    return () => { cancelled = true; };
  }, [reload]);

  const now = useNow();
  const start = now - DAYS * DAY_MS;
  const end = now;
  const todayKey = Days.key();
  const inRange = (key: string) => { const t = Days.parse(key); return t != null && t >= start && t <= end ? t : null; };

  if (stats == null) {
    return <Screen><PageHeader title="You vs friends" onBack={() => goBack(nav)} /><SkeletonCard /></Screen>;
  }

  // Calories stop at yesterday: today isn't finished, and a half day would look like a crash.
  const kcalSeries: ChartSeries[] = stats.map((p, i) => ({
    name: p.name,
    color: people[i],
    points: Object.entries(p.kcal).filter(([k, v]) => k !== todayKey && v > 0)
      .flatMap(([k, v]) => { const t = inRange(k); return t == null ? [] : [[t + DAY_MS / 2, v] as [number, number]]; }),
  }));
  // Weight change since each person's first weigh-in in the period: fair across body sizes.
  const weightSeries: ChartSeries[] = stats.flatMap((p, i) => {
    const pts = Object.entries(p.weights).flatMap(([k, v]) => { const t = inRange(k); return t == null ? [] : [[t + DAY_MS / 2, v] as [number, number]]; })
      .sort((a, b) => a[0] - b[0]);
    if (pts.length === 0) return [];
    const base = pts[0][1];
    return [{ name: p.name, color: people[i], points: pts.map(([t, kg]) => [t, toUnit(kg - base, units)] as [number, number]) }];
  });
  const averages = kcalSeries.filter((s) => s.points.length > 0)
    .map((s) => `${s.name} ${formatKcal(roundInt(s.points.reduce((a, p) => a + p[1], 0) / s.points.length))}`).join('  ·  ');

  return (
    <Screen>
      <PageHeader title="You vs friends" onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {stats.length <= 1 && <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}>Add friends to compare. Until then, here's just you.</T>}

        <SectionTitle text="Calories eaten per day" />
        <Tile span="2x1" style={{ marginHorizontal: Gutter }}>
          <MultiLineChart series={kcalSeries} startMs={start} endMs={end}
            valueLabel={(v) => `${formatKcal(roundInt(v))} kcal`} dayLabel={formatDate.shortDay} />
        </Tile>
        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 10 }}>
          Last 30 days, today not included. Daily average: {averages || 'no meals logged yet'}
        </T>
        <SectionTitle text="Weight change" />
        {weightSeries.length === 0 ? <T color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>No weigh-ins in the last 30 days.</T> : (
          <Tile span="2x1" style={{ marginHorizontal: Gutter }}>
            <MultiLineChart series={weightSeries} startMs={start} endMs={end} zeroLine carryForward
              valueLabel={(v) => `${signed(v)} ${UNIT[units].weightUnit}`} dayLabel={formatDate.shortDay} />
          </Tile>
        )}
        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 10 }}>
          Shown as change from each person's first weigh-in, so different body sizes compare fairly. Only friends who share their weight appear.
        </T>
        <ListGroup>
          <ListRow icon="monitor-weight" title="Share my weight with friends" subtitle="Friends see how your weight changes over time"
            trailing={<Toggle value={shareWeight} label="Share my weight with friends" onChange={async (on) => {
              setShareWeight(on);
              await StatsRepository.setShareWeight(on).catch(() => undefined);
              setReload((r) => r + 1);
            }} />} />
        </ListGroup>
      </ScrollView>
    </Screen>
  );
}
