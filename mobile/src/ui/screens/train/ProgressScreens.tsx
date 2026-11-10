/** Workout and exercise details, statistics, calendar and the exercise library. */
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, View } from 'react-native';
import { Units } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { historyLive, TrainRepository } from '../../../data/trainRepo';
import {
  countsForRecords, defaultExerciseTab, mainExercises, doneKeys, EQUIPMENT_LABEL, type HowTo, ExerciseLibrary, LoggedSet, MUSCLE_LABEL, Muscle, MUSCLES, oneRepMax, recordsFrom,
  setCount, setsFor, setVolume, WorkoutMath, WorkoutRecord,
} from '../../../data/training';
import { useNow, useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { palette, Gutter, radius } from '../../theme';
import { formatDate } from '../../format';
import {
  Chip, Hairline, Icon, IconButton, ListGroup, ListRow, PageHeader, PressableScale, ProgressBar, Screen, SectionTitle, Segmented, SkeletonCard, T, TextField, Tile,
} from '../../components/core';
import { StatTile } from '../../components/workout';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { ActionMenu, Dialog } from '../../components/overlays';
import { LineChart } from '../../components/charts';
import { ExerciseAnimation } from '../../components/ExerciseAnimation';
import { SetBadge } from './TrainComponents';

const DAY_MS = 24 * 3600 * 1000;
const useUnits = (): Units => useStore(profileStore)?.units ?? 'METRIC';
const kg = (v: number, units: Units) => WorkoutMath.formatWeight(v, units);
const setLabel = (s: LoggedSet, units: Units) => (s.weightKg > 0 ? `${kg(s.weightKg, units)} × ${s.reps}` : `${s.reps} reps`);

/** A row of plain numbers with small labels underneath, used at the top of detail pages. */
function StatRow({ stats }: { stats: [string, string][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Gutter, paddingVertical: 10, gap: 8 }}>
      {stats.map(([label, value]) => (
        <View key={label} style={{ flexBasis: '47%', flexGrow: 1 }}><StatTile label={label} value={value} /></View>
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
            <T v={badgeWidth > 40 ? 'body' : 'body'}>{setLabel(s, units)}</T>
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
      <PageHeader title={workout?.title ?? 'Workout'} onBack={() => goBack(nav)} actions={<IconButton variant="tonal" name="more-vert" label="More" onPress={() => setMenu(true)} />} />
      {history == null ? <SkeletonCard />
        : !workout ? <T color={palette.textMuted} style={{ padding: Gutter }}>This workout was deleted.</T> : (
          <FlatList
            data={workout.exercises}
            keyExtractor={(x, i) => `${x.exerciseId}-${i}`}
            contentContainerStyle={{ paddingBottom: 32, gap: 10 }}
            ListHeaderComponent={
              <View>
                <T color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>{formatDate.full(workout.startedAt)}</T>
                <StatRow stats={[
                  ['Time', WorkoutMath.formatDuration(workout.durationSec)],
                  ['Volume', WorkoutMath.formatVolume(workout.volumeKg, units)],
                  ['Sets', `${setCount(workout)}`],
                  ['Records', `${workout.records}`],
                ]} />
              </View>
            }
            renderItem={({ item }) => (
              <Tile span="2x1" style={{ marginHorizontal: Gutter, gap: 4 }}>
                <PressableScale onPress={() => nav.navigate('ExerciseDetail', { exerciseId: item.exerciseId, name: item.name })}
                  role="link" style={{ paddingVertical: 4, alignSelf: 'flex-start' }}>
                  <T v="titleS" color={palette.lime}>{item.name}</T>
                </PressableScale>
                <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
                  <T v="overline" color={palette.textMuted} style={{ width: 48 }}>Set</T>
                  <T v="overline" color={palette.textMuted}>Weight & reps</T>
                </View>
                <SetLines sets={item.sets} units={units} badgeWidth={48} />
              </Tile>
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
  const howTo = ExerciseLibrary.howTo(exerciseId);
  // Until the person picks a tab: How to for an exercise never logged, Summary otherwise.
  const [picked, setPicked] = useState<number | null>(null);

  // Oldest first, only sessions that include this exercise.
  const sessions = useMemo(() => setsFor(history ?? [], exerciseId).reverse(), [history, exerciseId]);
  const records = useMemo(() => recordsFrom(sessions.map((s) => s[1])), [sessions]);
  const tab = picked ?? (history != null && defaultExerciseTab(sessions.length > 0) === 'howto' ? 2 : 0);
  const photos = howTo && howTo.images.length > 0
    ? <View style={{ paddingHorizontal: Gutter, paddingTop: 12 }}><ExerciseAnimation images={howTo.images} name={name} /></View> : null;
  const noSets = <T color={palette.textMuted} style={{ padding: Gutter }}>No sets logged yet. Do this exercise in a workout to see your progress here.</T>;

  return (
    <Screen>
      <PageHeader title={name} onBack={() => goBack(nav)} />
      {exercise && <T color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>{MUSCLE_LABEL[exercise.muscle]} · {EQUIPMENT_LABEL[exercise.equipment]}</T>}
      <View style={{ paddingHorizontal: Gutter, paddingTop: 10, paddingBottom: 4 }}>
        <Segmented<'0' | '1' | '2'>
          options={[{ key: '0', label: 'Summary' }, { key: '1', label: 'History' }, { key: '2', label: 'How to' }]}
          selected={String(tab) as '0' | '1' | '2'}
          onSelect={(k) => setPicked(Number(k))}
        />
      </View>
      {tab === 2 ? <ExerciseHowTo howTo={howTo} photos={photos} />
        : history == null ? <SkeletonCard />
          : tab === 0 ? (sessions.length === 0
            ? <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>{photos}{noSets}</ScrollView>
            : <ExerciseSummary sessions={sessions} records={records} units={units} photos={photos} />)
            : sessions.length === 0 ? noSets
              : <ExerciseHistory sessions={[...sessions].reverse()} units={units} onOpen={(id) => nav.navigate('WorkoutDetail', { workoutId: id })} />}
    </Screen>
  );
}

function ExerciseSummary({ sessions, records, units, photos }: {
  sessions: [WorkoutRecord, LoggedSet[]][]; records: ReturnType<typeof recordsFrom>; units: Units; photos: React.ReactNode;
}) {
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
      {photos}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
        {(Object.keys(METRIC_LABEL) as Metric[]).filter((m) => !bodyweight || m === 'REPS').map((m) => (
          <Chip key={m} label={METRIC_LABEL[m]} selected={metric === m} onPress={() => setMetric(m)} />
        ))}
      </ScrollView>
      <Tile span="2x1" style={{ marginHorizontal: Gutter }}>
        {points.length >= 2
          ? <LineChart points={points} pointLabel={([at, v]) => `${formatDate.dayMonth(at)}: ${show(v)}`} />
          : <T color={palette.textMuted}>Log this exercise in one more workout to draw your progress line.</T>}
      </Tile>
      <SectionTitle text="Personal records" />
      <ListGroup>
        {rows.map(([label, value]) => (
          <ListRow key={label} title={label} leading={(
            <ExpressiveShape shape="burst" size={32} fill={palette.goldContainer}><Icon name="emoji-events" size={16} color={palette.gold} /></ExpressiveShape>
          )} trailing={<T v="displayS" style={{ fontSize: 17, lineHeight: 22 }}>{value}</T>} />
        ))}
      </ListGroup>
      {!bodyweight && <BestByReps byReps={records.byReps} units={units} />}
    </ScrollView>
  );
}

function ExerciseHistory({ sessions, units, onOpen }: { sessions: [WorkoutRecord, LoggedSet[]][]; units: Units; onOpen: (id: string) => void }) {
  return (
    <FlatList
      data={sessions}
      keyExtractor={([w]) => w.id}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 32, gap: 10 }}
      renderItem={({ item: [w, sets] }) => (
        <Tile span="2x1" onPress={() => onOpen(w.id)} label={w.title} style={{ marginHorizontal: Gutter }}>
          <T v="titleS">{w.title}</T>
          <T v="bodyS" color={palette.textMuted}>{formatDate.shortWithYear(w.finishedAt)}</T>
          <View style={{ height: 6 }} />
          <SetLines sets={sets} units={units} badgeWidth={32} />
        </Tile>
      )}
    />
  );
}

/** The old Records tab, now at the bottom of Summary: heaviest weight for each number of reps. */
function BestByReps({ byReps, units }: { byReps: Record<number, number>; units: Units }) {
  const rows = Object.entries(byReps).map(([r, w]) => [Number(r), w] as [number, number]).filter(([, w]) => w > 0).sort((a, b) => a[0] - b[0]);
  return (
    <View>
      <SectionTitle text="Best weight by reps" />
      <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingBottom: 8 }}>Heaviest weight you've lifted for each number of reps.</T>
      {rows.length === 0 && <T color={palette.textMuted} style={{ padding: Gutter }}>No weighted sets yet.</T>}
      {rows.length > 0 && (
        <ListGroup>
          {rows.map(([reps, w]) => (
            <ListRow key={reps} title={`${reps} rep${reps === 1 ? '' : 's'}`} trailing={<T v="displayS" style={{ fontSize: 17, lineHeight: 22 }}>{kg(w, units)}</T>} />
          ))}
        </ListGroup>
      )}
    </View>
  );
}

function ExerciseHowTo({ howTo, photos }: { howTo: HowTo | null; photos: React.ReactNode }) {
  if (!howTo) return <T color={palette.textMuted} style={{ padding: Gutter }}>No instructions for this exercise yet.</T>;
  const facts: [string, string][] = [
    ['Main muscles', howTo.primary.join(', ')],
    ...(howTo.secondary.length > 0 ? [['Also works', howTo.secondary.join(', ')] as [string, string]] : []),
    ['Equipment', howTo.equipment],
    ['Level', howTo.level],
  ];
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      {photos}
      <SectionTitle text="Instructions" />
      {howTo.instructions.map((step, i) => (
        <View key={i} style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 6 }}>
          <T v="displayS" color={palette.lime} style={{ width: 32, fontSize: 18, lineHeight: 22 }}>{i + 1}</T>
          <T v="body" style={{ flex: 1 }}>{step}</T>
        </View>
      ))}
      <SectionTitle text="Details" />
      <ListGroup>
        {facts.map(([label, value]) => (
          <View key={label} style={{ flexDirection: 'row', paddingHorizontal: 18, paddingVertical: 14, gap: 16 }}>
            <T v="body" color={palette.textMuted} style={{ width: 110 }}>{label}</T>
            <T v="body" style={{ flex: 1 }}>{value}</T>
          </View>
        ))}
      </ListGroup>
      <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingTop: 16 }}>Photos and instructions: free-exercise-db (public domain)</T>
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
  const mainList = mainExercises(inRange, 6);

  return (
    <Screen>
      <PageHeader title="Statistics" onBack={() => goBack(nav)} />
      {history == null ? <SkeletonCard /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          <SectionTitle text="Last 7 days" />
          <StatRow stats={[
            ['Workouts', `${week.length}`],
            ['Time', WorkoutMath.formatDuration(week.reduce((a, w) => a + w.durationSec, 0))],
            ['Volume', WorkoutMath.formatVolume(week.reduce((a, w) => a + w.volumeKg, 0), units)],
            ['Sets', `${week.reduce((a, w) => a + setCount(w), 0)}`],
          ]} />
          <ListGroup>
            <ListRow icon="calendar-month" title="Workout calendar" onPress={() => nav.navigate('Calendar')} />
          </ListGroup>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
            {RANGES.map((r) => <Chip key={r.label} label={r.label} selected={range === r} onPress={() => setRange(r)} />)}
          </ScrollView>
          <SectionTitle text="Sets per muscle group" />
          {setsPerMuscle.length === 0 ? <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}>No sets in this period.</T> : (
            <Tile span="2x1" style={{ marginHorizontal: Gutter, gap: 4 }}>
              {setsPerMuscle.map(([m, n]) => (
                <View key={m} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
                  <T style={{ width: 88 }}>{MUSCLE_LABEL[m]}</T>
                  <View style={{ flex: 1 }}><ProgressBar progress={n / setsPerMuscle[0][1]} /></View>
                  <T v="displayS" style={{ width: 40, textAlign: 'right', fontSize: 17, lineHeight: 22 }}>{n}</T>
                </View>
              ))}
            </Tile>
          )}
          <SectionTitle text="Main exercises" />
          {mainList.length > 0 && (
            <ListGroup>
              {mainList.map((x) => (
                <ListRow key={`${x.id}-${x.name}`} title={x.name} subtitle={`${MUSCLE_LABEL[ExerciseLibrary.muscleOf(x.id)]} · ${x.count} workout${x.count === 1 ? '' : 's'}`}
                  onPress={() => nav.navigate('ExerciseDetail', { exerciseId: x.id, name: x.name })} />
              ))}
            </ListGroup>
          )}
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
      <Tile span="2x1" padding={12} style={{ marginHorizontal: Gutter, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton variant="tonal" name="keyboard-arrow-left" label="Previous month" onPress={() => setOffset(offset + 1)} />
        <T v="titleS" center style={{ flex: 1 }}>{formatDate.monthYear(month.getTime())}</T>
        <IconButton variant="tonal" name="keyboard-arrow-right" label="Next month" disabled={offset === 0} onPress={() => setOffset(offset - 1)} />
      </View>
      <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <T key={i} v="label" color={palette.textMuted} center style={{ flex: 1 }}>{d}</T>)}
      </View>
      {weeks.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {row.map((d, i) => {
            const trained = d > 0 && days.has(d);
            const isToday = offset === 0 && d === today.getDate();
            return (
              <View key={i} style={{ flex: 1, aspectRatio: 1, padding: 4 }}>
                {d > 0 && (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: isToday && !trained ? 1.5 : 0, borderColor: palette.lime }}
                    accessible accessibilityLabel={`${d}${trained ? ', workout' : ''}${isToday ? ', today' : ''}`}>
                    {trained && <ExpressiveShape shape="cookie9" size={38} fill={palette.lime} style={{ position: 'absolute' }} />}
                    <T style={isToday && { fontWeight: '700' }} color={trained ? palette.onLime : isToday ? palette.lime : palette.text}>{d}</T>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}
      </Tile>
      <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 16 }}>
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
    (history ?? []).forEach((w) => w.exercises.forEach((x) => {
      const key = ExerciseLibrary.key(x.exerciseId);
      map.set(key, (map.get(key) ?? 0) + 1);
    }));
    return map;
  }, [history]);
  const done = useMemo(() => doneKeys(history), [history]);
  const results = ExerciseLibrary.search(query, muscle, done);

  return (
    <Screen keyboard>
      <PageHeader title="Exercises" onBack={() => goBack(nav)} />
      <TextField value={query} onChangeText={(t) => setQuery(t.slice(0, 40))} placeholder="Search exercises" accessibilityLabel="Search exercises"
        style={{ marginHorizontal: Gutter, marginVertical: 4 }} right={<Icon name="search" color={palette.textMuted} />} />
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
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item, index }) => {
          // Rows read as one grouped surface: rounded at the ends, hairlines between.
          const first = index === 0, last = index === results.length - 1;
          return (
            <View style={{ marginHorizontal: Gutter, backgroundColor: palette.surface, overflow: 'hidden',
              borderTopLeftRadius: first ? radius.lg : 0, borderTopRightRadius: first ? radius.lg : 0,
              borderBottomLeftRadius: last ? radius.lg : 0, borderBottomRightRadius: last ? radius.lg : 0 }}>
              {!first && <Hairline inset={18} />}
              <ListRow title={item.name} subtitle={`${MUSCLE_LABEL[item.muscle]} · ${EQUIPMENT_LABEL[item.equipment]}`}
                onPress={() => nav.navigate('ExerciseDetail', { exerciseId: item.id, name: item.name })}
                trailing={sessionsById.has(ExerciseLibrary.key(item.id)) ? <T v="label" color={palette.lime}>{sessionsById.get(ExerciseLibrary.key(item.id))}×</T> : undefined} />
            </View>
          );
        }}
      />
    </Screen>
  );
}
