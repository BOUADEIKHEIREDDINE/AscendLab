/** Workout and exercise details, statistics, calendar and the exercise library. */
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { Units } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { historyLive, TrainRepository } from '../../../data/trainRepo';
import {
  countsForRecords, doneKeys, EQUIPMENT_LABEL, ExerciseLibrary, LoggedSet, MUSCLE_LABEL, Muscle, MUSCLES, oneRepMax, recordsFrom,
  setCount, setVolume, WorkoutMath, WorkoutRecord,
} from '../../../data/training';
import { useNow, useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { c, colors, Gutter } from '../../theme';
import { haptics } from '../../haptics';
import { formatDate } from '../../format';
import { Chip, Hairline, Icon, IconButton, PageHeader, PressableScale, ProgressBar, Screen, SectionTitle, SkeletonCard, T, TextField } from '../../components/core';
import { ActionMenu, Dialog } from '../../components/overlays';
import { LineChart } from '../../components/charts';
import { SetBadge } from './TrainComponents';

const DAY_MS = 24 * 3600 * 1000;
const useUnits = (): Units => useStore(profileStore)?.units ?? 'METRIC';
const kg = (v: number, units: Units) => WorkoutMath.formatWeight(v, units);
const setLabel = (s: LoggedSet, units: Units) => (s.weightKg > 0 ? `${kg(s.weightKg, units)} × ${s.reps}` : `${s.reps} reps`);

/** A row of plain numbers with small labels underneath, used at the top of detail pages. */
function StatRow({ stats }: { stats: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 10 }}>
      {stats.map(([label, value]) => (
        <View key={label} style={{ flex: 1 }}>
          <T v="labelMedium" color={c.onSurfaceVariant}>{label}</T>
          <T v="titleMedium">{value}</T>
        </View>
      ))}
    </View>
  );
}

/** Sets numbered 1, 2… with W / F / D for the other set types. */
function SetLines({ sets, units, badgeWidth }: { sets: LoggedSet[]; units: Units; badgeWidth: number }) {
  let normal = 0;
  return (
    <>
      {sets.map((s, i) => {
        if (s.type === 'NORMAL') normal++;
        return (
          <View key={i} style={{ flexDirection: 'row', paddingVertical: badgeWidth > 40 ? 4 : 2 }}>
            <SetBadge type={s.type} normalIndex={normal} width={badgeWidth} />
            <T v={badgeWidth > 40 ? 'bodyLarge' : 'bodyMedium'}>{setLabel(s, units)}</T>
          </View>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- Workout detail

export function WorkoutDetailScreen() {
  const nav = useNav();
  const { workoutId } = useParams<'WorkoutDetail'>();
  const history = useStore(historyLive);
  const units = useUnits();
  const workout = history?.find((w) => w.id === workoutId);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Screen>
      <PageHeader title={workout?.title ?? 'Workout'} onBack={() => goBack(nav)} actions={<IconButton name="more-vert" label="More" onPress={() => setMenu(true)} />} />
      {history == null ? <SkeletonCard />
        : !workout ? <T color={c.onSurfaceVariant} style={{ padding: Gutter }}>This workout was deleted.</T> : (
          <FlatList
            data={workout.exercises}
            keyExtractor={(x, i) => `${x.exerciseId}-${i}`}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListHeaderComponent={
              <View>
                <T color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter }}>{formatDate.full(workout.startedAt)}</T>
                <StatRow stats={[
                  ['Time', WorkoutMath.formatDuration(workout.durationSec)],
                  ['Volume', WorkoutMath.formatVolume(workout.volumeKg, units)],
                  ['Sets', `${setCount(workout)}`],
                  ['Records', `${workout.records}`],
                ]} />
                <Hairline />
              </View>
            }
            renderItem={({ item }) => (
              <View>
                <View style={{ paddingVertical: 12 }}>
                  <PressableScale onPress={() => nav.navigate('ExerciseDetail', { exerciseId: item.exerciseId, name: item.name })}
                    style={{ paddingHorizontal: Gutter, paddingVertical: 4, alignSelf: 'flex-start' }}>
                    <T v="titleMedium" color={c.primary}>{item.name}</T>
                  </PressableScale>
                  <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 4 }}>
                    <T v="labelSmall" color={c.onSurfaceVariant} style={{ width: 48 }}>SET</T>
                    <T v="labelSmall" color={c.onSurfaceVariant}>WEIGHT & REPS</T>
                  </View>
                  <View style={{ paddingHorizontal: Gutter }}><SetLines sets={item.sets} units={units} badgeWidth={48} /></View>
                </View>
                <Hairline />
              </View>
            )}
          />
        )}
      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[{ label: 'Delete workout', icon: 'delete-outline', danger: true, onPress: () => setConfirmDelete(true) }]} />
      <Dialog
        visible={confirmDelete}
        onDismiss={() => setConfirmDelete(false)}
        title="Delete this workout?"
        dismiss={{ label: 'Cancel', onPress: () => setConfirmDelete(false) }}
        confirm={{ label: 'Delete', danger: true, onPress: () => { setConfirmDelete(false); TrainRepository.deleteWorkout(workoutId); goBack(nav); } }}
      >
        <T>It's removed from your history and stats. A post in the feed stays until you delete it there.</T>
      </Dialog>
    </Screen>
  );
}

// ---------------------------------------------------------------- Exercise detail

type Metric = 'HEAVIEST' | 'ONE_RM' | 'SESSION_VOLUME' | 'REPS';
const METRIC_LABEL: Record<Metric, string> = { HEAVIEST: 'Heaviest weight', ONE_RM: 'Best 1RM', SESSION_VOLUME: 'Session volume', REPS: 'Most reps' };

export function ExerciseDetailScreen() {
  const nav = useNav();
  const { exerciseId, name: fallbackName } = useParams<'ExerciseDetail'>();
  const history = useStore(historyLive);
  const units = useUnits();
  const exercise = ExerciseLibrary.find(exerciseId);
  const name = exercise?.name ?? (fallbackName || 'Exercise');
  const [tab, setTab] = useState(0);

  // Oldest first, only sessions that include this exercise.
  const sessions = useMemo(() => (history ?? []).flatMap((w) => {
    const x = w.exercises.find((e) => e.exerciseId === exerciseId);
    return x ? [[w, x.sets] as [WorkoutRecord, LoggedSet[]]] : [];
  }).reverse(), [history, exerciseId]);
  const records = useMemo(() => recordsFrom(sessions.map((s) => s[1])), [sessions]);

  return (
    <Screen>
      <PageHeader title={name} onBack={() => goBack(nav)} />
      {exercise && <T color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter }}>{MUSCLE_LABEL[exercise.muscle]} · {EQUIPMENT_LABEL[exercise.equipment]}</T>}
      <View style={{ flexDirection: 'row', marginTop: 8, borderBottomWidth: 0.5, borderBottomColor: c.outline }}>
        {['Summary', 'History', 'Records'].map((t, i) => (
          <Pressable key={t} onPress={() => { haptics.tick(); setTab(i); }} accessibilityRole="tab" accessibilityState={{ selected: tab === i }}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
            <T v="titleSmall" color={tab === i ? c.primary : c.onSurfaceVariant}>{t}</T>
            {tab === i && <View style={{ position: 'absolute', bottom: 0, height: 3, width: 48, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: c.primary }} />}
          </Pressable>
        ))}
      </View>
      {history == null ? <SkeletonCard />
        : sessions.length === 0 ? <T color={c.onSurfaceVariant} style={{ padding: Gutter }}>No sets logged yet. Do this exercise in a workout to see your progress here.</T>
          : tab === 0 ? <ExerciseSummary sessions={sessions} records={records} units={units} />
            : tab === 1 ? <ExerciseHistory sessions={[...sessions].reverse()} units={units} onOpen={(id) => nav.navigate('WorkoutDetail', { workoutId: id })} />
              : <ExerciseRecordsTab byReps={records.byReps} units={units} />}
    </Screen>
  );
}

function ExerciseSummary({ sessions, records, units }: { sessions: [WorkoutRecord, LoggedSet[]][]; records: ReturnType<typeof recordsFrom>; units: Units }) {
  const bodyweight = records.heaviestKg <= 0;
  const [metric, setMetric] = useState<Metric>(bodyweight ? 'REPS' : 'HEAVIEST');
  const points: [number, number][] = sessions.map(([w, sets]) => {
    const counted = sets.filter(countsForRecords);
    const max = (f: (s: LoggedSet) => number) => (counted.length ? Math.max(...counted.map(f)) : 0);
    const v = metric === 'HEAVIEST' ? max((s) => s.weightKg) : metric === 'ONE_RM' ? max(oneRepMax)
      : metric === 'SESSION_VOLUME' ? counted.reduce((a, s) => a + setVolume(s), 0) : max((s) => s.reps);
    return [w.finishedAt, v];
  });
  const show = (v: number) => (metric === 'REPS' ? `${Math.trunc(v)} reps` : metric === 'SESSION_VOLUME' ? WorkoutMath.formatVolume(v, units) : kg(v, units));
  const rows: [string, string][] = [
    ...(!bodyweight ? [
      ['Heaviest weight', kg(records.heaviestKg, units)],
      ['Best 1RM (estimated)', kg(records.best1RmKg, units)],
      ['Best set volume', WorkoutMath.formatVolume(records.bestSetVolumeKg, units)],
      ['Best session volume', WorkoutMath.formatVolume(records.bestSessionVolumeKg, units)],
    ] as [string, string][] : []),
    ['Most reps in a set', `${records.mostReps}`],
    ['Workouts', `${sessions.length}`],
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
        {(Object.keys(METRIC_LABEL) as Metric[]).filter((m) => !bodyweight || m === 'REPS').map((m) => (
          <Chip key={m} label={METRIC_LABEL[m]} selected={metric === m} onPress={() => setMetric(m)} />
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: Gutter }}>
        {points.length >= 2
          ? <LineChart points={points} pointLabel={([at, v]) => `${formatDate.dayMonth(at)}: ${show(v)}`} />
          : <T color={c.onSurfaceVariant}>Log this exercise in one more workout to draw your progress line.</T>}
      </View>
      <SectionTitle text="Personal records" />
      {rows.map(([label, value]) => (
        <View key={label}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 12 }}>
            <Icon name="emoji-events" size={18} color={colors.apricot} />
            <T v="bodyLarge" style={{ flex: 1, marginLeft: 12 }}>{label}</T>
            <T v="titleSmall">{value}</T>
          </View>
          <Hairline inset={Gutter + 30} />
        </View>
      ))}
    </ScrollView>
  );
}

function ExerciseHistory({ sessions, units, onOpen }: { sessions: [WorkoutRecord, LoggedSet[]][]; units: Units; onOpen: (id: string) => void }) {
  return (
    <FlatList
      data={sessions}
      keyExtractor={([w]) => w.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      renderItem={({ item: [w, sets] }) => (
        <View>
          <PressableScale onPress={() => onOpen(w.id)} style={{ paddingHorizontal: Gutter, paddingVertical: 12 }}>
            <T v="titleSmall">{w.title}</T>
            <T v="bodySmall" color={c.onSurfaceVariant}>{formatDate.shortWithYear(w.finishedAt)}</T>
            <View style={{ height: 6 }} />
            <SetLines sets={sets} units={units} badgeWidth={32} />
          </PressableScale>
          <Hairline />
        </View>
      )}
    />
  );
}

function ExerciseRecordsTab({ byReps, units }: { byReps: Record<number, number>; units: Units }) {
  const rows = Object.entries(byReps).map(([r, w]) => [Number(r), w] as [number, number]).filter(([, w]) => w > 0).sort((a, b) => a[0] - b[0]);
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      <T color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter, paddingVertical: 12 }}>Heaviest weight you've lifted for each number of reps.</T>
      <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 4 }}>
        <T v="labelSmall" color={c.onSurfaceVariant} style={{ flex: 1 }}>REPS</T>
        <T v="labelSmall" color={c.onSurfaceVariant}>BEST WEIGHT</T>
      </View>
      {rows.length === 0 && <T color={c.onSurfaceVariant} style={{ padding: Gutter }}>No weighted sets yet.</T>}
      {rows.map(([reps, w]) => (
        <View key={reps}>
          <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 12 }}>
            <T v="bodyLarge" style={{ flex: 1 }}>{reps} rep{reps === 1 ? '' : 's'}</T>
            <T v="titleSmall">{kg(w, units)}</T>
          </View>
          <Hairline inset={Gutter} />
        </View>
      ))}
    </ScrollView>
  );
}

// ---------------------------------------------------------------- Statistics

type Range = { label: string; days: number | null };
const RANGES: Range[] = [{ label: '30 days', days: 30 }, { label: '3 months', days: 91 }, { label: 'Year', days: 365 }, { label: 'All time', days: null }];

export function StatisticsScreen() {
  const nav = useNav();
  const history = useStore(historyLive);
  const units = useUnits();
  const [range, setRange] = useState(RANGES[0]);
  const now = useNow();
  const all = history ?? [];
  const week = all.filter((w) => w.finishedAt >= now - 7 * DAY_MS);
  const inRange = range.days == null ? all : all.filter((w) => w.finishedAt >= now - range.days! * DAY_MS);

  const perMuscle = new Map<Muscle, number>();
  inRange.forEach((w) => w.exercises.forEach((x) => {
    const m = ExerciseLibrary.muscleOf(x.exerciseId);
    perMuscle.set(m, (perMuscle.get(m) ?? 0) + x.sets.filter((s) => s.type !== 'WARMUP').length);
  }));
  const setsPerMuscle = [...perMuscle.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const counts = new Map<string, { id: string; name: string; count: number }>();
  inRange.forEach((w) => w.exercises.forEach((x) => {
    const key = `${x.exerciseId}\u0000${x.name}`;
    const cur = counts.get(key) ?? { id: x.exerciseId, name: x.name, count: 0 };
    counts.set(key, { ...cur, count: cur.count + 1 });
  }));
  const mainExercises = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  return (
    <Screen>
      <PageHeader title="Statistics" onBack={() => goBack(nav)} />
      {history == null ? <SkeletonCard /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <SectionTitle text="Last 7 days" />
          <StatRow stats={[
            ['Workouts', `${week.length}`],
            ['Time', WorkoutMath.formatDuration(week.reduce((a, w) => a + w.durationSec, 0))],
            ['Volume', WorkoutMath.formatVolume(week.reduce((a, w) => a + w.volumeKg, 0), units)],
            ['Sets', `${week.reduce((a, w) => a + setCount(w), 0)}`],
          ]} />
          <PressableScale onPress={() => nav.navigate('Calendar')} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 12 }}>
            <T v="bodyLarge" style={{ flex: 1 }}>Workout calendar</T>
            <Icon name="keyboard-arrow-right" color={c.onSurfaceVariant} />
          </PressableScale>
          <Hairline />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
            {RANGES.map((r) => <Chip key={r.label} label={r.label} selected={range === r} onPress={() => setRange(r)} />)}
          </ScrollView>
          <SectionTitle text="Sets per muscle group" />
          {setsPerMuscle.length === 0 ? <T color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}>No sets in this period.</T>
            : setsPerMuscle.map(([m, n]) => (
              <View key={m} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 8 }}>
                <T style={{ width: 88 }}>{MUSCLE_LABEL[m]}</T>
                <View style={{ flex: 1 }}><ProgressBar progress={n / setsPerMuscle[0][1]} height={8} track="transparent" /></View>
                <T v="titleSmall" style={{ width: 40, textAlign: 'right' }}>{n}</T>
              </View>
            ))}
          <SectionTitle text="Main exercises" />
          {mainExercises.map((x) => (
            <View key={`${x.id}-${x.name}`}>
              <PressableScale onPress={() => nav.navigate('ExerciseDetail', { exerciseId: x.id, name: x.name })}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 12 }}>
                <View style={{ flex: 1 }}>
                  <T v="bodyLarge" lines={1}>{x.name}</T>
                  <T v="bodySmall" color={c.onSurfaceVariant}>{MUSCLE_LABEL[ExerciseLibrary.muscleOf(x.id)]}</T>
                </View>
                <T color={c.onSurfaceVariant}>{x.count} workout{x.count === 1 ? '' : 's'}</T>
                <Icon name="keyboard-arrow-right" color={c.onSurfaceVariant} />
              </PressableScale>
              <Hairline inset={Gutter} />
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------- Calendar

export function CalendarScreen() {
  const nav = useNav();
  const history = useStore(historyLive);
  const [offset, setOffset] = useState(0); // months back from now
  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  const y = month.getFullYear(), m = month.getMonth();
  const inMonth = (history ?? []).filter((w) => { const d = new Date(w.finishedAt); return d.getFullYear() === y && d.getMonth() === m; });
  const days = new Set(inMonth.map((w) => new Date(w.finishedAt).getDate()));
  const leading = (month.getDay() + 6) % 7; // Monday-first
  const count = new Date(y, m + 1, 0).getDate();
  const cells = [...Array(leading).fill(0), ...Array.from({ length: count }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(0);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  return (
    <Screen>
      <PageHeader title="Calendar" onBack={() => goBack(nav)} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <IconButton name="keyboard-arrow-left" label="Previous month" onPress={() => { haptics.tick(); setOffset(offset + 1); }} />
        <T v="titleMedium" center style={{ flex: 1 }}>{formatDate.monthYear(month.getTime())}</T>
        <IconButton name="keyboard-arrow-right" label="Next month" disabled={offset === 0} onPress={() => { haptics.tick(); setOffset(offset - 1); }} />
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 8 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={i} v="labelMedium" color={c.onSurfaceVariant} center style={{ flex: 1 }}>{d}</T>)}
      </View>
      {weeks.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', paddingHorizontal: Gutter }}>
          {row.map((d, i) => {
            const trained = d > 0 && days.has(d);
            const isToday = offset === 0 && d === today.getDate();
            return (
              <View key={i} style={{ flex: 1, aspectRatio: 1, padding: 4 }}>
                {d > 0 && (
                  <View style={{ flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: trained ? c.primary : 'transparent' }}
                    accessible accessibilityLabel={`${d}${trained ? ', workout' : ''}${isToday ? ', today' : ''}`}>
                    <T style={isToday && { fontWeight: '700' }} color={trained ? c.onPrimary : isToday ? c.primary : c.onSurface}>{d}</T>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
      <T color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter, paddingVertical: 16 }}>
        {inMonth.length} workout{inMonth.length === 1 ? '' : 's'} on {days.size} day{days.size === 1 ? '' : 's'}
      </T>
    </Screen>
  );
}

// ---------------------------------------------------------------- Exercise library

export function ExerciseLibraryScreen() {
  const nav = useNav();
  const history = useStore(historyLive);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const sessionsById = useMemo(() => {
    const map = new Map<string, number>();
    (history ?? []).forEach((w) => w.exercises.forEach((x) => map.set(x.exerciseId, (map.get(x.exerciseId) ?? 0) + 1)));
    return map;
  }, [history]);
  const done = useMemo(() => doneKeys(history), [history]);
  const results = ExerciseLibrary.search(query, muscle, done);

  return (
    <Screen keyboard>
      <PageHeader title="Exercises" onBack={() => goBack(nav)} />
      <TextField value={query} onChangeText={(t) => setQuery(t.slice(0, 40))} placeholder="Search exercises" accessibilityLabel="Search exercises"
        style={{ marginHorizontal: Gutter, marginVertical: 4 }} right={<Icon name="search" color={c.onSurfaceVariant} />} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 8, gap: 8 }}>
          <Chip label="All" selected={muscle == null} onPress={() => setMuscle(null)} />
          {MUSCLES.filter((x) => x !== 'OTHER').map((x) => <Chip key={x} label={MUSCLE_LABEL[x]} selected={muscle === x} onPress={() => setMuscle(muscle === x ? null : x)} />)}
        </ScrollView>
      </View>
      <FlatList
        data={results}
        keyExtractor={(x) => x.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View>
            <PressableScale onPress={() => nav.navigate('ExerciseDetail', { exerciseId: item.id, name: item.name })}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 12 }}>
              <View style={{ flex: 1 }}>
                <T v="bodyLarge">{item.name}</T>
                <T v="bodySmall" color={c.onSurfaceVariant}>{MUSCLE_LABEL[item.muscle]} · {EQUIPMENT_LABEL[item.equipment]}</T>
              </View>
              {sessionsById.has(item.id) && <T v="labelLarge" color={c.primary}>{sessionsById.get(item.id)}×</T>}
            </PressableScale>
            <Hairline inset={Gutter} />
          </View>
        )}
      />
    </Screen>
  );
}
