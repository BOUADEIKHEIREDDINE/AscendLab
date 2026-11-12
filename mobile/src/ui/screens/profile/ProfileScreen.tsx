import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { BodyRepository, WeightEntry, weightsLive } from '../../../data/bodyRepo';
import { BodyChecks, Convert, formatKcal, GOAL, hasEverythingForPlan, PlanCalculator, roundInt, UNIT, Units } from '../../../data/profile';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { FeedPost } from '../../../data/social';
import { meStore, myPostsLive, SocialRepository } from '../../../data/socialRepo';
import { TrainRepository } from '../../../data/trainRepo';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { prepareFeed } from '../../../state/session';
import { palette, Gutter, radius, space, tone, withAlpha } from '../../theme';
import { haptics } from '../../haptics';
import { formatDate } from '../../format';
import {
  Avatar, Bento, Button, digits, EmptyState, Icon, IconButton, IconName, ListGroup, ListRow, PressableScale, Screen, SectionTitle, Skeleton, T,
  TabHeader, TextField, Tile, TileHeader,
} from '../../components/core';
import { BarChart, LineChart } from '../../components/charts';
import { Dialog } from '../../components/overlays';
import { MealPhoto, MiniCover } from '../../components/feed';
import { StreakTile } from '../../components/progress';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { ShapeName } from '../../shapes/library';

const WEEKS_SHOWN = 8;
const DAY_MS = 24 * 3600 * 1000;

/** Weekly workout counts, oldest first, plus the current week streak. */
interface WorkoutStats { total: number; capped: boolean; perWeek: number[]; weekStarts: number[]; streak: number }

/** Monday 00:00 (local time) of the week containing `t`. */
function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // days since Monday
  return d.getTime();
}

function statsFrom(times: number[], limit: number): WorkoutStats {
  const now = Date.now();
  const current = weekStart(now);
  // Each week start is re-normalised with weekStart(), so daylight-saving changes don't drift.
  const starts = Array.from({ length: WEEKS_SHOWN }, (_, i) => weekStart(now - (WEEKS_SHOWN - 1 - i) * 7 * DAY_MS));
  const byWeek = new Map<number, number>();
  times.forEach((t) => byWeek.set(weekStart(t), (byWeek.get(weekStart(t)) ?? 0) + 1));
  // A streak counts back from this week; an empty current week doesn't break it yet.
  const previous = (w: number) => weekStart(w - 3 * DAY_MS);
  let streak = 0;
  let w = (byWeek.get(current) ?? 0) > 0 ? current : previous(current);
  while ((byWeek.get(w) ?? 0) > 0) { streak++; w = previous(w); }
  return { total: times.length, capped: times.length >= limit, perWeek: starts.map((s) => byWeek.get(s) ?? 0), weekStarts: starts, streak };
}

export function ProfileScreen() {
  const nav = useNav();
  const profile = useStore(profileStore);
  const me = useStore(meStore);
  const weights = useStore(weightsLive);
  const posts = useStore(myPostsLive);
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loggingWeight, setLoggingWeight] = useState(false);
  const units = profile?.units ?? 'METRIC';

  useEffect(() => {
    prepareFeed();
    if (!profileStore.get()) ProfileRepository.load();
    SocialRepository.ensureMe().catch(() => null);
    TrainRepository.workoutTimes(200).then((t) => setStats(statsFrom(t, 200)));
  }, []);

  const rows: FeedPost[][] = [];
  (posts ?? []).forEach((p, i) => { if (i % 3 === 0) rows.push([]); rows[rows.length - 1].push(p); });

  const header = (
    <View>
      <TabHeader title="Profile" actions={<IconButton variant="tonal" name="settings" label="Settings" onPress={() => nav.navigate('Settings')} />} />

      {/* Avatar in a clover ring, then the name. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 8, gap: 16 }}>
        <ExpressiveShape shape="clover" size={104} fill={tone(palette.primary, 0.12, palette.ink)} stroke={palette.primary} strokeWidth={2}>
          {me ? <Avatar name={me.name} seed={me.uid} size={72} /> : <Skeleton width={72} height={72} radius={36} />}
        </ExpressiveShape>
        <View style={{ flex: 1 }}>
          <T v="headline" lines={2}>{me?.name ?? ' '}</T>
          {me?.code ? <T color={palette.textMuted}>Friend code {me.code}</T> : null}
        </View>
      </View>

      {/* Stats bento: workouts, week streak, friends. */}
      <Bento style={{ marginTop: 8 }}>
        <Tile span="1x1" center>
          <StreakTile streak={stats ? stats.streak : null} size={110} />
        </Tile>
        <View style={{ gap: space.tileGap, flex: 1 }}>
          <StatShapeTile shape="circle" icon="fitness-center" label="Workouts" value={stats ? (stats.capped ? `${stats.total}+` : `${stats.total}`) : null} />
          <StatShapeTile shape="clover" icon="groups" label="Friends" value={me ? `${me.friends.length}` : null} onPress={() => nav.navigate('Friends')} />
        </View>
      </Bento>

      {/* Dashboard: the doors to everything you've logged. */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingTop: space.tileGap, gap: 8 }}>
        <DashButton icon="bar-chart" shape="cookie9" label="Statistics" onPress={() => nav.navigate('Statistics')} />
        <DashButton icon="fitness-center" shape="softTriangle" label="Exercises" onPress={() => nav.navigate('ExerciseLibrary')} />
        <DashButton icon="calendar-month" shape="gem" label="Calendar" onPress={() => nav.navigate('Calendar')} />
        <DashButton icon="groups" shape="clover" label="Compare" onPress={() => nav.navigate('Compare')} />
      </View>

      <SectionTitle text="Workouts per week" />
      <Tile span="2x1" style={{ marginHorizontal: Gutter }}>
        {stats == null ? <Skeleton height={140} /> : (
          <BarChart
            values={stats.perWeek}
            labels={stats.weekStarts.map(formatDate.numeric)}
            goal={profile?.daysPerWeek ?? undefined}
            valueLabel={(i, v) => {
              const last = i === stats.perWeek.length - 1;
              const label = last ? 'This week' : `Week of ${formatDate.numeric(stats.weekStarts[i])}`;
              const goal = last && profile?.daysPerWeek ? ` of ${profile.daysPerWeek} planned` : '';
              return `${label}: ${v} workout${v === 1 ? '' : 's'}${goal}`;
            }}
          />
        )}
      </Tile>

      <SectionTitle text="Body weight" trailing={weights && weights.length > 0
        ? <Button kind="text" label="Log" icon="add" onPress={() => setLoggingWeight(true)} /> : undefined} />
      <WeightSection entries={weights} profileKg={profile?.weightKg ?? null} units={units} onLog={() => setLoggingWeight(true)} />

      {hasEverythingForPlan(profile) && (() => {
        const t = PlanCalculator.nutrition(profile);
        return (
          <>
            <SectionTitle text="Goal" />
            <ListGroup>
              <ListRow icon="flag" iconColor={palette.primary} title={GOAL[profile.goal].label} onPress={() => nav.navigate('EditGoals')}
                subtitle={`${formatKcal(t.calories)} kcal · ${t.proteinG} g protein · ${profile.daysPerWeek} days a week`} />
              <ListRow icon="local-fire-department" iconColor={palette.ember} title="Daily targets" onPress={() => nav.navigate('EditTargets')}
                subtitle={t.custom ? 'Set by you · tap to change' : 'Recommended · tap to use your own'} />
            </ListGroup>
          </>
        );
      })()}

      {/* A grid of everything you've posted. */}
      <SectionTitle text="Posts" />
      {posts == null ? <View style={{ paddingHorizontal: Gutter }}><Skeleton height={120} /></View>
        : posts.length === 0 ? <EmptyState icon="photo-library" shape="cookie9" title="No posts yet" hint="Your meals and workouts will show up here." /> : null}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(row) => row[0].id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4, paddingHorizontal: Gutter }}>
            {item.map((p) => <GridTile key={p.id} post={p} onPress={() => nav.navigate('Comments', { postId: p.id })} />)}
            {Array.from({ length: 3 - item.length }, (_, i) => <View key={i} style={{ flex: 1 }} />)}
          </View>
        )}
      />
      {loggingWeight && (
        <LogWeightDialog units={units} current={weights?.[weights.length - 1]?.kg ?? profile?.weightKg ?? null} onDismiss={() => setLoggingWeight(false)} />
      )}
    </Screen>
  );
}

/** A wide-ish stat tile: a tonal shape with the icon, then the number. */
function StatShapeTile({ shape, icon, label, value, onPress }: { shape: ShapeName; icon: IconName; label: string; value: string | null; onPress?: () => void }) {
  return (
    <Tile span="auto" onPress={onPress} label={`${value ?? ''} ${label}`} padding={14} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ExpressiveShape shape={shape} size={44} fill={tone(palette.primary, 0.16)}>
        <Icon name={icon} size={20} color={palette.primary} />
      </ExpressiveShape>
      <View style={{ flex: 1 }}>
        {value != null ? <T v="displayS">{value}</T> : <Skeleton width={36} height={28} />}
        <T v="overline" color={palette.textMuted}>{label}</T>
      </View>
    </Tile>
  );
}

function DashButton({ icon, shape, label, onPress }: { icon: IconName; shape: ShapeName; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} label={label} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderRadius: radius.md, backgroundColor: palette.surface, gap: 6 }}>
      <ExpressiveShape shape={shape} size={38} fill={palette.primaryContainer}>
        <Icon name={icon} size={18} color={palette.onPrimaryContainer} />
      </ExpressiveShape>
      <T v="label" lines={1} style={{ fontSize: 12 }}>{label}</T>
    </PressableScale>
  );
}

/** A square in the posts grid: the photo, or a small cover with the key number. */
function GridTile({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={{ flex: 1, aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden' }} label={post.workout ? post.workout.title : `${post.calories} kcal`}>
      {post.photo ? <MealPhoto photo={post.photo} style={{ flex: 1 }} /> : <MiniCover post={post} />}
      {(post.commentCount > 0 || post.likes.length > 0) && (
        <View style={{ position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: withAlpha(palette.ink, 0.7), borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Icon name="favorite" size={11} color={palette.like} />
          <T v="bodyS" style={{ fontSize: 11, lineHeight: 14 }}>{post.likes.length}</T>
        </View>
      )}
    </PressableScale>
  );
}

const formatPrecise = (kg: number, units: Units) => `${roundInt((units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg) * 10) / 10} ${UNIT[units].weightUnit}`;

function WeightSection({ entries, profileKg, units, onLog }: { entries: WeightEntry[] | null; profileKg: number | null; units: Units; onLog: () => void }) {
  if (entries == null) return <View style={{ paddingHorizontal: Gutter }}><Skeleton height={140} radius={radius.lg} /></View>;
  if (entries.length === 0) {
    return (
      <Tile span="2x1" style={{ marginHorizontal: Gutter, gap: 12 }}>
        <TileHeader icon="monitor-weight" text="Body weight" />
        <T v="displayM">{profileKg != null ? Convert.formatWeight(profileKg, units) : '–'}</T>
        <T color={palette.textMuted}>Log your weight regularly to see the trend.</T>
        <Button kind="tonal" label="Log today's weight" onPress={onLog} />
      </Tile>
    );
  }
  const latest = entries[entries.length - 1];
  const change = latest.kg - entries[0].kg;
  const sign = change > 0 ? '+' : change < 0 ? '−' : '±';
  return (
    <Tile span="2x1" style={{ marginHorizontal: Gutter, gap: 10 }}>
      <TileHeader icon="monitor-weight" text="Body weight" />
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
        <T v="displayM">{formatPrecise(latest.kg, units)}</T>
        {entries.length > 1 && (
          <T color={palette.textMuted} style={{ marginBottom: 3 }}>{sign}{formatPrecise(Math.abs(change), units)} since {formatDate.dayMonth(entries[0].at)}</T>
        )}
      </View>
      {entries.length > 1
        ? <LineChart points={entries.map((e) => [e.at, e.kg])} pointLabel={([at, kg]) => `${formatDate.dayMonth(at)}: ${formatPrecise(kg, units)}`} />
        : <T color={palette.textMuted}>Log again on another day to start your trend line.</T>}
    </Tile>
  );
}

function LogWeightDialog({ units, current, onDismiss }: { units: Units; current: number | null; onDismiss: () => void }) {
  const initial = current != null ? String(roundInt((units === 'IMPERIAL' ? Convert.kgToLb(current) : current) * 10) / 10) : '';
  const [text, setText] = useState(initial);
  const typed = text ? parseFloat(text) : null;
  const kg = typed == null || isNaN(typed) ? null : units === 'IMPERIAL' ? Convert.lbToKg(typed) : typed;
  const error = text ? BodyChecks.weight(kg, units) : null;
  return (
    <Dialog
      visible
      onDismiss={onDismiss}
      title="Log weight"
      dismiss={{ label: 'Cancel', onPress: onDismiss }}
      confirm={{
        label: 'Save', enabled: kg != null && error == null, onPress: () => {
          if (kg == null) return;
          haptics.confirm();
          BodyRepository.log(kg);
          onDismiss();
        },
      }}
    >
      <TextField value={text} onChangeText={(t) => setText(digits(t, 5, true))} suffix={UNIT[units].weightUnit} keyboardType="decimal-pad"
        autoFocus error={error} hint="Weigh yourself at the same time of day for a fair trend." accessibilityLabel="Weight" />
    </Dialog>
  );
}
