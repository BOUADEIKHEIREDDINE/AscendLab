/** Create a routine (routineId null) or edit one, inside a program. */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { TrainRepository, trainLive } from '../../../data/trainRepo';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { engineLevel } from '../../../data/profile';
import {
  ADDED_SETS, addAfter, keptReplaces, noticeText, Program, programNotices, replaceEverywhere, Routine, RoutineExercise, swapsAfterReplace, uuid,
} from '../../../data/training';
import { DEFAULT_TARGET, restSecFor } from '../../../data/progress';
import type { Slot } from '../../../lib/program-generator/program';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { palette, Gutter, radius, space } from '../../theme';
import { Button, IconButton, PageHeader, PrimaryButton, Screen, T, TextField } from '../../components/core';
import { ShapeLoader } from '../../shapes/ShapeLoader';
import { ActionMenu, toast } from '../../components/overlays';
import { AlternativesSheet, ExercisePicker, SetBadge, Stepper, VolumeNoticeNote } from './TrainComponents';

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
          ? <T color={palette.error} style={{ padding: 24 }}>{state.error ?? 'This program no longer exists.'}</T>
          : <View style={{ padding: 32, alignItems: 'center' }}><ShapeLoader /></View>
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
          <T v="bodyS" color={palette.textMuted}>
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
        <View style={{ paddingHorizontal: Gutter, paddingVertical: 8, gap: 12 }}>
          <Button kind="tonal" label="Add exercises" icon="add" onPress={() => setPicking(true)} />
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
          exclude={exercises.map((x) => x.exerciseId)}
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
        exclude={exercises.map((x) => x.exerciseId)}
        onDismiss={() => setPicking(false)}
        onPick={(picked) => {
          setExercises([...exercises, ...picked.map((x) => ({ exerciseId: x.id, name: x.name, sets: 3, reps: 10 }))]);
          setPicking(false);
        }}
      />
    </>
  );
}

/** "3 min", "2.5 min": the same wording as the live workout. */
const restText = (sec: number) => (sec % 60 === 0 ? `${sec / 60} min` : `${Math.floor(sec / 60)}.5 min`);

/**
 * One exercise, laid out like an exercise in the live workout: mint name and ⋮ menu (Alternatives,
 * move, remove), the grey plan line, then a SET / REPS table with one row per set and "Add set".
 * Exercises from the plan show its rep range (not a choice: 6–10 to failure); only exercises
 * outside the plan get a reps setting.
 */
function ExerciseSection({ ex, first, last, onSwap, onSets, onReps, onMoveUp, onMoveDown, onRemove }: {
  ex: RoutineExercise; first: boolean; last: boolean;
  onSwap: () => void; onSets: (v: number) => void; onReps: (v: number) => void;
  onMoveUp: () => void; onMoveDown: () => void; onRemove: () => void;
}) {
  const nav = useNav();
  const [menu, setMenu] = useState(false);
  const rest = restSecFor(ex.exerciseId);
  const planned = rest != null;
  const target = planned ? `${DEFAULT_TARGET.repMin}–${DEFAULT_TARGET.repMax}` : String(ex.reps);
  return (
    <View style={{ marginHorizontal: Gutter, marginBottom: space.tileGap, borderRadius: radius.lg, backgroundColor: palette.surface }}>
      <View style={{ paddingVertical: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: space.tilePad, paddingRight: 4 }}>
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Pressable onPress={() => nav.navigate('ExerciseDetail', { exerciseId: ex.exerciseId, name: ex.name })}
              accessibilityRole="link" accessibilityHint="Opens the exercise page" hitSlop={6}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <T v="titleS" color={palette.primary} lines={2} style={{ paddingVertical: 4 }}>{ex.name}</T>
            </Pressable>
          </View>
          <IconButton name="more-vert" label="More" onPress={() => setMenu(true)} />
        </View>
        <View style={{ paddingHorizontal: space.tilePad, paddingBottom: 4 }}>
          <T v="bodyS" color={palette.textMuted}>
            {planned ? `${ex.sets} × ${target} reps to failure · rest ${restText(rest)}` : `${ex.sets} × ${ex.reps} reps`}
          </T>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 }}>
          <Header text="SET" width={36} />
          <Header text="REPS" flex={1} />
          <View style={{ width: 44 }} />
        </View>
        {Array.from({ length: ex.sets }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 }}>
            <View style={{ width: 36, alignItems: 'center', paddingVertical: 8 }}><SetBadge type="NORMAL" normalIndex={i + 1} /></View>
            <View style={{ flex: 1, marginHorizontal: 4, height: 40, borderRadius: radius.sm, backgroundColor: palette.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
              <T v="displayS" color={palette.textMuted} style={{ fontSize: 17, lineHeight: 22 }}>{target}</T>
            </View>
            <IconButton name="close" label={`Remove set ${i + 1}`} color={palette.textMuted} disabled={ex.sets <= 1} onPress={() => onSets(ex.sets - 1)} />
          </View>
        ))}
        {!planned && (
          <View style={{ paddingHorizontal: space.tilePad - 4 }}>
            <Stepper label="Reps per set" value={ex.reps} onChange={onReps} min={1} max={50} />
          </View>
        )}
        <Button kind="text" label="Add set" icon="add" style={{ marginHorizontal: 8 }} enabled={ex.sets < 10} onPress={() => onSets(ex.sets + 1)} />
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

function Header({ text, width, flex }: { text: string; width?: number; flex?: number }) {
  return <T v="overline" color={palette.textMuted} center style={{ width, flex }}>{text}</T>;
}
