/** Create a routine (routineId null) or edit one, inside a program. */
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { TrainRepository, trainLive } from '../../../data/trainRepo';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { engineLevel } from '../../../data/profile';
import {
  ADDED_SETS, addAfter, noticeText, Program, programNotices, replaceEverywhere, Routine, RoutineExercise, swapsAfterReplace, uuid,
} from '../../../data/training';
import type { Slot } from '../../../lib/program-generator/program';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { c, Gutter } from '../../theme';
import { Button, Hairline, IconButton, PageHeader, PrimaryButton, Screen, T, TextField } from '../../components/core';
import { toast } from '../../components/overlays';
import { AlternativesSheet, ExercisePicker, Stepper, VolumeNoticeNote } from './TrainComponents';

export function RoutineEditorScreen() {
  const nav = useNav();
  const { programId, routineId } = useParams<'RoutineEditor'>();
  const state = useStore(trainLive);
  const program = state.programs.find((p) => p.id === programId) ?? null;
  // The form is filled once, from the routine as it was when the program first loaded.
  const [original, setOriginal] = useState<{ routine: Routine | null } | null>(null);
  if (program && !original) setOriginal({ routine: program.routines.find((r) => r.id === routineId) ?? null });

  return (
    <Screen keyboard>
      <PageHeader title={routineId == null ? 'New routine' : 'Edit routine'} onBack={() => goBack(nav)} />
      {!original ? (
        state.error || (!state.loading && !program)
          ? <T color={c.error} style={{ padding: 24 }}>{state.error ?? 'This program no longer exists.'}</T>
          : <ActivityIndicator color={c.primary} style={{ padding: 32 }} />
      ) : (
        <RoutineForm program={program} original={original.routine} onDone={() => goBack(nav)} />
      )}
    </Screen>
  );
}

function RoutineForm({ program, original, onDone }: { program: Program | null; original: Routine | null; onDone: () => void }) {
  const [name, setName] = useState(original?.name ?? '');
  const [exercises, setExercises] = useState<RoutineExercise[]>(original?.exercises ?? []);
  const [picking, setPicking] = useState(false);
  const profile = useStore(profileStore);
  /** Row whose alternatives are open. */
  const [alternativesFor, setAlternativesFor] = useState<number | null>(null);
  /** Slot replaces in this draft; on save they apply to every routine with the slot. */
  const [replaces, setReplaces] = useState<{ slot: Slot; exerciseId: string; name: string }[]>([]);

  /** The program's routines with this draft in place and its replaces applied everywhere. */
  const withDraft = (draftName: string): { routines: Routine[]; changedNames: string[] } => {
    const id = original?.id ?? '';
    const draft: Routine = { id: id || uuid(), name: draftName, exercises };
    const base = program?.routines ?? [];
    let routines = base.some((r) => r.id === id) ? base.map((r) => (r.id === id ? draft : r)) : [...base, draft];
    const changed = new Set<string>();
    for (const r of replaces) {
      const result = replaceEverywhere(routines, r.slot, r.exerciseId, r.name);
      routines = result.routines;
      result.changedNames.forEach((n) => changed.add(n));
    }
    changed.delete(draftName);
    return { routines, changedNames: [...changed] };
  };
  const notices = program && profile && (replaces.length > 0 || exercises !== (original?.exercises ?? []))
    ? programNotices(program.routines, withDraft(original?.name ?? name).routines, profile).map(noticeText) : [];

  const move = (from: number, to: number) => {
    const list = [...exercises];
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    setExercises(list);
  };
  const set = (i: number, change: Partial<RoutineExercise>) => setExercises(exercises.map((x, j) => (j === i ? { ...x, ...change } : x)));

  return (
    <>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 8, gap: 12 }}>
        <TextField label="Routine name" placeholder="Push day" value={name} onChangeText={(t) => setName(t.slice(0, 40))} autoCapitalize="sentences" />
        <T v="bodySmall" color={c.onSurfaceVariant}>In {program?.name ?? 'this program'}</T>
        {exercises.map((x, i) => (
          <View key={`${x.exerciseId}-${i}`}>
            <Hairline />
            <View style={{ paddingVertical: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <T v="titleMedium" color={c.primary} style={{ flex: 1 }}>{x.name}</T>
                <IconButton name="swap-horiz" label={`Alternatives for ${x.name}`} onPress={() => setAlternativesFor(i)} />
                <IconButton name="keyboard-arrow-up" label="Move up" disabled={i === 0} onPress={() => move(i, i - 1)} />
                <IconButton name="keyboard-arrow-down" label="Move down" disabled={i === exercises.length - 1} onPress={() => move(i, i + 1)} />
                <IconButton name="close" label={`Remove ${x.name}`} onPress={() => setExercises(exercises.filter((_, j) => j !== i))} />
              </View>
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <Stepper label="Sets" value={x.sets} onChange={(v) => set(i, { sets: v })} min={1} max={10} />
                <Stepper label="Reps" value={x.reps} onChange={(v) => set(i, { reps: v })} min={1} max={50} />
              </View>
            </View>
          </View>
        ))}
        <Button label="Add exercises" icon="add" onPress={() => setPicking(true)} style={{ height: 52 }} />
        <VolumeNoticeNote lines={notices} />
      </ScrollView>
      <PrimaryButton
        label="Save routine"
        enabled={program != null && name.trim() !== '' && exercises.length > 0}
        style={{ marginHorizontal: Gutter, marginVertical: 12 }}
        onPress={() => {
          if (!program) return;
          if (replaces.length === 0) {
            TrainRepository.saveRoutine(program, { id: original?.id ?? uuid(), name: name.trim(), exercises });
          } else {
            const { routines, changedNames } = withDraft(name.trim());
            TrainRepository.saveRoutines(program, routines);
            if (profile) {
              const swaps = replaces.reduce((acc, r) => swapsAfterReplace(acc, r.slot, r.exerciseId, engineLevel(profile)), profile.swaps);
              ProfileRepository.save({ ...profile, swaps }).catch(() => undefined);
            }
            toast(changedNames.length > 0 ? `Saved to your program. Also changed in ${changedNames.join(', ')}` : 'Saved to your program');
          }
          onDone();
        }}
      />
      {alternativesFor != null && exercises[alternativesFor] && (
        <AlternativesSheet
          visible
          onDismiss={() => setAlternativesFor(null)}
          current={exercises[alternativesFor]}
          level={profile ? engineLevel(profile) : 'beginner'}
          onChoose={({ exerciseId, name: picked, mode }) => {
            const i = alternativesFor;
            const row = exercises[i];
            setAlternativesFor(null);
            if (mode === 'add') {
              setExercises(addAfter(exercises, i, { exerciseId, name: picked, sets: ADDED_SETS, reps: row.reps }));
              return;
            }
            set(i, { exerciseId, name: picked });
            if (row.slot) setReplaces([...replaces.filter((r) => r.slot !== row.slot), { slot: row.slot, exerciseId, name: picked }]);
          }}
        />
      )}
      <ExercisePicker
        visible={picking}
        onDismiss={() => setPicking(false)}
        onPick={(picked) => {
          setExercises([...exercises, ...picked.map((x) => ({ exerciseId: x.id, name: x.name, sets: 3, reps: 10 }))]);
          setPicking(false);
        }}
      />
    </>
  );
}
