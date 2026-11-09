/** Create a routine (routineId null) or edit one, inside a program. */
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { TrainRepository, trainLive } from '../../../data/trainRepo';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { engineLevel } from '../../../data/profile';
import {
  ADDED_SETS, addAfter, EQUIPMENT_LABEL, ExerciseLibrary, keptReplaces, MUSCLE_LABEL, noticeText, Program, programNotices, replaceEverywhere,
  Routine, RoutineExercise, swapsAfterReplace, uuid,
} from '../../../data/training';
import type { Slot } from '../../../lib/program-generator/program';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { c, Gutter } from '../../theme';
import { Button, Hairline, IconButton, PageHeader, PrimaryButton, Screen, T, TextField } from '../../components/core';
import { ActionMenu, toast } from '../../components/overlays';
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
    for (const r of keptReplaces(replaces, exercises)) {
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
      {/* Laid out like the live workout: full-width sections split by hairlines, names in mint, ⋮ menus. */}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 8 }}>
        <View style={{ paddingHorizontal: Gutter, paddingTop: 8, paddingBottom: 12, gap: 8 }}>
          <TextField label="Routine name" placeholder="Push day" value={name} onChangeText={(t) => setName(t.slice(0, 40))} autoCapitalize="sentences" />
          <T v="bodySmall" color={c.onSurfaceVariant}>
            In {program?.name ?? 'this program'} · {exercises.length} exercise{exercises.length === 1 ? '' : 's'} · {exercises.reduce((n, x) => n + x.sets, 0)} sets
          </T>
        </View>
        {exercises.map((x, i) => (
          <ExerciseSection
            key={`${x.exerciseId}-${i}`}
            ex={x}
            first={i === 0}
            last={i === exercises.length - 1}
            onSwap={() => setAlternativesFor(i)}
            onSets={(v) => set(i, { sets: v })}
            onReps={(v) => set(i, { reps: v })}
            onMoveUp={() => move(i, i - 1)}
            onMoveDown={() => move(i, i + 1)}
            onRemove={() => setExercises(exercises.filter((_, j) => j !== i))}
          />
        ))}
        <Hairline />
        <View style={{ paddingHorizontal: Gutter, paddingVertical: 16, gap: 12 }}>
          <Button label="Add exercises" icon="add" onPress={() => setPicking(true)} style={{ height: 52 }} />
          <VolumeNoticeNote lines={notices} />
        </View>
      </ScrollView>
      <PrimaryButton
        label="Save routine"
        enabled={program != null && name.trim() !== '' && exercises.length > 0}
        style={{ marginHorizontal: Gutter, marginVertical: 12 }}
        onPress={() => {
          if (!program) return;
          const kept = keptReplaces(replaces, exercises);
          if (kept.length === 0) {
            TrainRepository.saveRoutine(program, { id: original?.id ?? uuid(), name: name.trim(), exercises });
          } else {
            const { routines, changedNames } = withDraft(name.trim());
            TrainRepository.saveRoutines(program, routines);
            if (profile) {
              const swaps = kept.reduce((acc, r) => swapsAfterReplace(acc, r.slot, r.exerciseId, engineLevel(profile)), profile.swaps);
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

/**
 * One exercise, styled like an exercise in the live workout: mint name with a ⋮ menu (Alternatives,
 * move, remove), a grey line with muscle and equipment, then the sets and reps.
 */
function ExerciseSection({ ex, first, last, onSwap, onSets, onReps, onMoveUp, onMoveDown, onRemove }: {
  ex: RoutineExercise; first: boolean; last: boolean;
  onSwap: () => void; onSets: (v: number) => void; onReps: (v: number) => void;
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const info = ExerciseLibrary.find(ex.exerciseId);
  const kind = info ? `${MUSCLE_LABEL[info.muscle]} · ${EQUIPMENT_LABEL[info.equipment]}` : 'Custom exercise';
  return (
    <View>
      <Hairline />
      <View style={{ paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 4 }}>
          <T v="titleMedium" color={c.primary} lines={2} style={{ flex: 1 }}>{ex.name}</T>
          <IconButton name="more-vert" label="More" onPress={() => setMenu(true)} />
        </View>
        <T v="bodySmall" color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter }}>
          {kind}
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16, paddingLeft: Gutter - 4, paddingRight: Gutter, paddingTop: 4 }}>
          <Stepper label="Sets" value={ex.sets} onChange={onSets} min={1} max={10} />
          <Stepper label="Reps" value={ex.reps} onChange={onReps} min={1} max={50} />
        </View>
      </View>
      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[
        { label: 'Alternatives', icon: 'swap-horiz' as const, onPress: onSwap },
        ...(first ? [] : [{ label: 'Move up', icon: 'keyboard-arrow-up' as const, onPress: onMoveUp }]),
        ...(last ? [] : [{ label: 'Move down', icon: 'keyboard-arrow-down' as const, onPress: onMoveDown }]),
        { label: 'Remove exercise', icon: 'delete-outline' as const, danger: true, onPress: onRemove },
      ]} />
    </View>
  );
}
