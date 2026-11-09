/**
 * A routine, read-only: each exercise with its plan and what was lifted last time, and Start.
 * Editing goes through the ⋮ menu, like Hevy.
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Convert, formatNumber } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { DEFAULT_TARGET, restSecFor } from '../../../data/progress';
import { activeStore, historyLive, TrainRepository, trainLive } from '../../../data/trainRepo';
import { ExerciseLibrary, lastSets, LoggedSet, previousForSets, RoutineExercise } from '../../../data/training';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { c, Gutter } from '../../theme';
import { haptics } from '../../haptics';
import { Hairline, IconButton, PageHeader, PrimaryButton, Screen, T } from '../../components/core';
import { ActionMenu, Dialog } from '../../components/overlays';
import { SetBadge } from './TrainComponents';

const restText = (sec: number) => (sec % 60 === 0 ? `${sec / 60} min` : `${Math.floor(sec / 60)}.5 min`);

export function RoutineDetailScreen() {
  const nav = useNav();
  const { programId, routineId } = useParams<'RoutineDetail'>();
  const state = useStore(trainLive);
  const history = useStore(historyLive);
  const active = useStore(activeStore);
  const units = useStore(profileStore)?.units ?? 'METRIC';
  const [menu, setMenu] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const program = state.programs.find((p) => p.id === programId) ?? null;
  const routine = program?.routines.find((r) => r.id === routineId) ?? null;
  const previous = useMemo(() => lastSets(history), [history]);

  const start = () => {
    if (!routine) return;
    TrainRepository.start(routine, history ?? []);
    nav.navigate('WorkoutSession');
  };

  if (!routine || !program) {
    return (
      <Screen>
        <PageHeader title="Routine" onBack={() => goBack(nav)} />
        {state.loading ? <ActivityIndicator color={c.primary} style={{ padding: 32 }} />
          : <T color={c.onSurfaceVariant} style={{ padding: Gutter }}>This routine no longer exists.</T>}
      </Screen>
    );
  }

  const sets = routine.exercises.reduce((n, x) => n + x.sets, 0);
  return (
    <Screen>
      <PageHeader title={routine.name} onBack={() => goBack(nav)}
        actions={<IconButton name="more-vert" label="More" onPress={() => setMenu(true)} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={{ paddingHorizontal: Gutter, paddingTop: 4, paddingBottom: 12, gap: 12 }}>
          <T v="bodySmall" color={c.onSurfaceVariant}>
            In {program.name} · {routine.exercises.length} exercise{routine.exercises.length === 1 ? '' : 's'} · {sets} sets
          </T>
          <PrimaryButton label="Start workout" icon="play-arrow" enabled={routine.exercises.length > 0}
            onPress={() => { haptics.confirm(); if (active) setConfirmReplace(true); else start(); }} />
        </View>
        {routine.exercises.map((x, i) => (
          <ExerciseView key={`${x.exerciseId}-${i}`} ex={x} last={previous.get(ExerciseLibrary.key(x.exerciseId))} units={units}
            onOpen={() => nav.navigate('ExerciseDetail', { exerciseId: x.exerciseId, name: x.name })} />
        ))}
        <Hairline />
      </ScrollView>

      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[
        { label: 'Edit routine', icon: 'edit', onPress: () => nav.navigate('RoutineEditor', { programId: program.id, routineId: routine.id }) },
        { label: 'Delete routine', icon: 'delete-outline', danger: true, onPress: () => setDeleting(true) },
      ]} />
      <Dialog
        visible={confirmReplace}
        onDismiss={() => setConfirmReplace(false)}
        title="Workout in progress"
        dismiss={{ label: 'Resume current', onPress: () => { setConfirmReplace(false); nav.navigate('WorkoutSession'); } }}
        confirm={{ label: 'Discard and start', danger: true, onPress: () => { setConfirmReplace(false); start(); } }}
      >
        <T>You already have a workout going. Discard it and start a new one?</T>
      </Dialog>
      <Dialog
        visible={deleting}
        onDismiss={() => setDeleting(false)}
        title={`Delete ${routine.name}?`}
        dismiss={{ label: 'Cancel', onPress: () => setDeleting(false) }}
        confirm={{ label: 'Delete', danger: true, onPress: () => { setDeleting(false); TrainRepository.deleteRoutine(program, routine.id); goBack(nav); } }}
      >
        <T>The routine is removed from this program. Past workouts stay in your history.</T>
      </Dialog>
    </Screen>
  );
}

/** One exercise, read-only, in the workout's layout: SET · PREVIOUS (last time) · REPS (target). */
function ExerciseView({ ex, last, units, onOpen }: { ex: RoutineExercise; last: LoggedSet[] | undefined; units: 'METRIC' | 'IMPERIAL'; onOpen: () => void }) {
  const rest = restSecFor(ex.exerciseId);
  const target = rest != null ? `${DEFAULT_TARGET.repMin}–${DEFAULT_TARGET.repMax}` : String(ex.reps);
  const unit = units === 'IMPERIAL' ? 'lb' : 'kg';
  const weight = (kg: number) => formatNumber(units === 'IMPERIAL' ? Convert.kgToLb(kg) : kg);
  const rows = previousForSets(last, ex.sets);
  return (
    <View>
      <Hairline />
      <View style={{ paddingVertical: 12 }}>
        <View style={{ paddingHorizontal: Gutter, alignItems: 'flex-start' }}>
          <Pressable onPress={onOpen} accessibilityRole="link" style={{ paddingVertical: 4 }}>
            <T v="titleMedium" color={c.primary}>{ex.name}</T>
          </Pressable>
          <T v="bodySmall" color={c.onSurfaceVariant}>
            {rest != null ? `${ex.sets} × ${target} reps to failure · rest ${restText(rest)}` : `${ex.sets} × ${ex.reps} reps`}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter - 8, paddingTop: 8, paddingBottom: 4 }}>
          <Header text="SET" width={36} />
          <Header text="PREVIOUS" flex={1.4} />
          <Header text="REPS" flex={1} />
        </View>
        {rows.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter - 8, paddingVertical: 8 }}>
            <View style={{ width: 36, alignItems: 'center' }}><SetBadge type="NORMAL" normalIndex={i + 1} /></View>
            <T color={p ? c.onSurface : c.onSurfaceVariant} center style={{ flex: 1.4 }}>
              {p ? `${p.weightKg > 0 ? `${weight(p.weightKg)} ${unit} × ` : ''}${p.reps}` : '–'}
            </T>
            <T color={c.onSurfaceVariant} center style={{ flex: 1 }}>{target}</T>
          </View>
        ))}
      </View>
    </View>
  );
}

function Header({ text, width, flex }: { text: string; width?: number; flex?: number }) {
  return <T v="labelSmall" color={c.onSurfaceVariant} center style={{ width, flex }}>{text}</T>;
}
