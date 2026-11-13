/**
 * One routine of the plan being set up, before anything is saved: its exercises, a link to each
 * exercise's page, and the plan's own alternatives. A replace goes into the draft profile as a
 * swap, so it carries into the program built after onboarding.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { engineLevel, PlanCalculator } from '../../../data/profile';
import { planRoutine, previewReplace, RoutineExercise, starterRoutines } from '../../../data/training';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { draftStore } from '../../../state/session';
import { palette, Gutter, radius, space } from '../../theme';
import { Button, PageHeader, Screen, T } from '../../components/core';
import { toast } from '../../components/overlays';
import { ExerciseThumb } from '../../components/exerciseInfo';
import { AlternativesSheet, VolumeNoticeNote } from '../train/TrainComponents';

export function PlanRoutineScreen() {
  const nav = useNav();
  const { name } = useParams<'PlanRoutine'>();
  const draft = useStore(draftStore);
  const routine = useMemo(() => planRoutine(draft, name), [draft, name]);
  const focus = useMemo(() => PlanCalculator.training(draft).days.find((d) => d.title === name)?.focus ?? null, [draft, name]);
  const [swapping, setSwapping] = useState<RoutineExercise | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const canSwap = draft.place !== 'HOME';

  useEffect(() => {
    // The plan changed under this page (e.g. another split): the routine is gone, so go back.
    if (!routine) goBack(nav);
  }, [routine, nav]);
  if (!routine) return null;

  const replace = (row: RoutineExercise, exerciseId: string) => {
    if (!row.slot) return;
    const before = starterRoutines(draft);
    const result = previewReplace(draft, row.slot, exerciseId);
    draftStore.update(() => result.profile);
    setNotices(result.notices);
    const after = starterRoutines(result.profile);
    const others = after
      .filter((r) => r.name !== routine.name)
      .filter((r) => {
        const was = before.find((b) => b.name === r.name);
        return was != null && was.exercises.some((x, i) => x.exerciseId !== r.exercises[i]?.exerciseId);
      })
      .map((r) => r.name);
    if (others.length > 0) toast(`Also changed in ${others.join(', ')}`);
  };

  const sets = routine.exercises.reduce((n, x) => n + x.sets, 0);
  return (
    <Screen>
      <PageHeader title={routine.name} onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: Gutter, paddingTop: 4, paddingBottom: 12, gap: 4 }}>
          {focus && <T color={palette.textMuted}>{focus}</T>}
          <T v="bodyS" color={palette.textMuted}>
            {routine.exercises.length} exercise{routine.exercises.length === 1 ? '' : 's'} · {sets} sets
          </T>
        </View>
        {routine.exercises.map((x, i) => (
          <View key={`${x.exerciseId}-${i}`}
            style={{ marginHorizontal: Gutter, marginBottom: space.tileGap, borderRadius: radius.lg, backgroundColor: palette.surface, padding: space.tilePad, gap: 10 }}>
            <Pressable
              onPress={() => nav.navigate('ExerciseDetail', { exerciseId: x.exerciseId, name: x.name })}
              accessibilityRole="link" accessibilityHint="Shows photos and instructions"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.7 : 1 })}
            >
              <ExerciseThumb exerciseId={x.exerciseId} />
              <View style={{ flex: 1 }}>
                <T v="titleS" color={palette.primary}>{x.name}</T>
                <T v="bodyS" color={palette.textMuted}>{x.sets} sets × {x.reps} reps</T>
              </View>
            </Pressable>
            {canSwap && x.slot && (
              <View style={{ flexDirection: 'row' }}>
                <Button kind="tonal" label="Alternatives" icon="swap-horiz" onPress={() => setSwapping(x)} compact />
              </View>
            )}
          </View>
        ))}
        <View style={{ paddingHorizontal: Gutter, paddingTop: 4 }}>
          <VolumeNoticeNote lines={notices} />
        </View>
      </ScrollView>
      {swapping && (
        <AlternativesSheet
          visible
          replaceOnly
          onDismiss={() => setSwapping(null)}
          current={swapping}
          exclude={routine.exercises.map((x) => x.exerciseId)}
          level={engineLevel(draft)}
          onChoose={({ exerciseId }) => {
            const row = swapping;
            setSwapping(null);
            replace(row, exerciseId);
          }}
        />
      )}
    </Screen>
  );
}
