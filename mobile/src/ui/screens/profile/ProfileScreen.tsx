import React, { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BodyRepository, WeightEntry, weightsLive } from '../../../data/bodyRepo';
import { BodyChecks, Convert, formatKcal, GOAL, hasEverythingForPlan, PlanCalculator, roundInt, UNIT, Units } from '../../../data/profile';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { FeedPost, MEAL } from '../../../data/social';
import { meStore, myPostsLive, SocialRepository } from '../../../data/socialRepo';
import { TrainRepository } from '../../../data/trainRepo';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { prepareFeed } from '../../../state/session';
import { palette, Gutter, withAlpha } from '../../theme';
import { haptics } from '../../haptics';
import { formatDate } from '../../format';
import {
  Avatar, Button, digits, Icon, IconButton, IconName, PressableScale, Screen, SectionTitle, Skeleton, T, TabHeader, TextField,
} from '../../components/core';
import { BarChart, LineChart } from '../../components/charts';
import { Dialog } from '../../components/overlays';
import { MealPhoto } from '../../components/feed';

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
      <TabHeader title={me?.name ?? 'Profile'} actions={<IconButton name="settings" label="Settings" onPress={() => nav.navigate('Settings')} />} />

      {/* Avatar, then the numbers that matter, the way social profiles do it. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 8 }}>
        {me ? <Avatar name={me.name} seed={me.uid} size={76} /> : <Skeleton width={76} height={76} radius={38} />}
        <View style={{ flex: 1, flexDirection: 'row', marginLeft: 16 }}>
          <HeaderStat value={stats ? (stats.capped ? `${stats.total}+` : `${stats.total}`) : null} label="workouts" />
          <HeaderStat value={stats ? `${stats.streak}` : null} label="week streak" />
          <HeaderStat value={me ? `${me.friends.length}` : null} label="friends" onPress={() => nav.navigate('Friends')} />
        </View>
      </View>

      {/* Dashboard: the doors to everything you've logged. */}
      <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 4, gap: 10 }}>
        <DashButton icon="bar-chart" label="Statistics" onPress={() => nav.navigate('Statistics')} />
        <DashButton icon="fitness-center" label="Exercises" onPress={() => nav.navigate('ExerciseLibrary')} />
        <DashButton icon="calendar-month" label="Calendar" onPress={() => nav.navigate('Calendar')} />
        <DashButton icon="groups" label="Compare" onPress={() => nav.navigate('Compare')} />
      </View>

      <SectionTitle text="Workouts per week" />
      <View style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}>
        {stats == null ? <Skeleton height={140} /> : (
          <BarChart
            values={stats.perWeek}
            labels={stats.weekStarts.map(formatDate.numeric)}
            valueLabel={(i, v) => {
              const last = i === stats.perWeek.length - 1;
              const label = last ? 'This week' : `Week of ${formatDate.numeric(stats.weekStarts[i])}`;
              const goal = last && profile?.daysPerWeek ? ` of ${profile.daysPerWeek} planned` : '';
              return `${label}: ${v} workout${v === 1 ? '' : 's'}${goal}`;
            }}
          />
        )}
      </View>

      <SectionTitle text="Body weight" trailing={weights && weights.length > 0
        ? <Button kind="text" label="Log" icon="add" onPress={() => setLoggingWeight(true)} /> : undefined} />
      <WeightSection entries={weights} profileKg={profile?.weightKg ?? null} units={units} onLog={() => setLoggingWeight(true)} />

      {hasEverythingForPlan(profile) && (() => {
        const t = PlanCalculator.nutrition(profile);
        return (
          <>
            <SectionTitle text="Goal" />
            <PressableScale onPress={() => nav.navigate('EditGoals')} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="body">{GOAL[profile.goal].label}</T>
                <T color={palette.textMuted}>{formatKcal(t.calories)} kcal · {t.proteinG} g protein · {profile.daysPerWeek} days a week</T>
              </View>
              <Icon name="keyboard-arrow-right" color={palette.textMuted} />
            </PressableScale>
          </>
        );
      })()}

      {/* A grid of everything you've posted. */}
      <SectionTitle text="Posts" />
      {posts == null ? <View style={{ paddingHorizontal: Gutter }}><Skeleton height={120} /></View>
        : posts.length === 0 ? <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}>Your meals and workouts will show up here.</T> : null}
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
          <View style={{ flexDirection: 'row', gap: 2, marginBottom: 2 }}>
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

function HeaderStat({ value, label, onPress }: { value: string | null; label: string; onPress?: () => void }) {
  const content = (
    <View style={{ alignItems: 'center', paddingVertical: 4 }}>
      {value != null ? <T v="title">{value}</T> : <Skeleton width={28} height={24} />}
      <T v="bodyS" color={palette.textMuted}>{label}</T>
    </View>
  );
  return <View style={{ flex: 1 }}>{onPress ? <PressableScale onPress={onPress} label={`${value ?? ''} ${label}`}>{content}</PressableScale> : content}</View>;
}

function DashButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} label={label} style={{ flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: palette.outline, borderRadius: 20 }}>
      <Icon name={icon} color={palette.lime} />
      <T v="label" color={palette.lime} style={{ marginTop: 4 }} lines={1}>{label}</T>
    </PressableScale>
  );
}

/** A square in the posts grid: the photo, or a small cover with the key number. */
function GridTile({ post, onPress }: { post: FeedPost; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} style={{ flex: 1, aspectRatio: 1 }} label={post.workout ? post.workout.title : `${post.calories} kcal`}>
      {post.photo ? <MealPhoto photo={post.photo} style={{ flex: 1 }} /> : (
        <LinearGradient colors={post.workout ? ['#15302B', '#1C2934'] : ['#1C3A3A', '#2A2420']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          {post.workout ? (
            <>
              <Icon name="fitness-center" color={palette.lime} />
              <T v="label" color="#FFFFFF" lines={2} center>{post.workout.title}</T>
            </>
          ) : (
            <>
              <T v="title" color="#FFFFFF">{formatKcal(post.calories)}</T>
              <T v="bodyS" color={withAlpha('#FFFFFF', 0.7)}>kcal · {MEAL[post.mealType].label.toLowerCase()}</T>
            </>
          )}
        </LinearGradient>
      )}
      {(post.commentCount > 0 || post.likes.length > 0) && (
        <T v="bodyS" color="#FFFFFF" style={{ position: 'absolute', left: 6, bottom: 6 }}>♥ {post.likes.length}</T>
      )}
    </PressableScale>
  );
}

const formatPrecise = (kg: number, units: Units) => `${roundInt((units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg) * 10) / 10} ${UNIT[units].weightUnit}`;

function WeightSection({ entries, profileKg, units, onLog }: { entries: WeightEntry[] | null; profileKg: number | null; units: Units; onLog: () => void }) {
  if (entries == null) return <View style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}><Skeleton height={120} /></View>;
  if (entries.length === 0) {
    return (
      <View style={{ paddingHorizontal: Gutter, paddingVertical: 8, gap: 12 }}>
        <T v="title">{profileKg != null ? Convert.formatWeight(profileKg, units) : '–'}</T>
        <T color={palette.textMuted}>Log your weight regularly to see the trend.</T>
        <Button kind="tonal" label="Log today's weight" onPress={onLog} />
      </View>
    );
  }
  const latest = entries[entries.length - 1];
  const change = latest.kg - entries[0].kg;
  const sign = change > 0 ? '+' : change < 0 ? '−' : '±';
  return (
    <View style={{ paddingHorizontal: Gutter, paddingVertical: 8, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <T v="title">{formatPrecise(latest.kg, units)}</T>
        {entries.length > 1 && (
          <T color={palette.textMuted} style={{ marginBottom: 3 }}>{sign}{formatPrecise(Math.abs(change), units)} since {formatDate.dayMonth(entries[0].at)}</T>
        )}
      </View>
      {entries.length > 1
        ? <LineChart points={entries.map((e) => [e.at, e.kg])} pointLabel={([at, kg]) => `${formatDate.dayMonth(at)}: ${formatPrecise(kg, units)}`} />
        : <T color={palette.textMuted}>Log again on another day to start your trend line.</T>}
    </View>
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
