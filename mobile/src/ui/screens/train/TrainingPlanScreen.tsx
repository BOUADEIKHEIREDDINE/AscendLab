import React, { useState } from 'react';
import { FlatList, Platform, Pressable, View } from 'react-native';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { splitChoice } from '../../../data/profile';
import type { Split } from '../../../lib/program-generator/program';
import { activeProgramOf, activeStore, historyLive, TrainRepository, trainLive } from '../../../data/trainRepo';
import { doneSets, nextRoutine, Routine, setCount, WorkoutMath } from '../../../data/training';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { c, Gutter, radius } from '../../theme';
import { haptics } from '../../haptics';
import { relativeDay } from '../../format';
import { Button, Hairline, Icon, IconButton, PressableScale, Screen, SectionTitle, SkeletonCard, T, TabHeader } from '../../components/core';
import { ActionMenu, BottomSheet, Dialog, toast } from '../../components/overlays';

export function TrainingPlanScreen() {
  const nav = useNav();
  const state = useStore(trainLive);
  const active = useStore(activeStore);
  const history = useStore(historyLive);
  const profile = useStore(profileStore);
  const units = profile?.units ?? 'METRIC';
  const [splitMenu, setSplitMenu] = useState(false);
  const [pendingSplit, setPendingSplit] = useState<{ split: Split; label: string } | null>(null);
  // The split of the generated gym plan; "Change split" only when the days allow more than one (5–6).
  const choice = splitChoice(profile);
  const splits = choice?.options ?? [];
  const currentSplit = choice?.current ?? null;
  const splitLabel = splits.find((o) => o.split === currentSplit)?.label ?? null;
  const program = activeProgramOf(state);
  const [programMenu, setProgramMenu] = useState(false);
  const [pendingStart, setPendingStart] = useState<Routine | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [deleting, setDeleting] = useState<Routine | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const recent = (history ?? []).slice(0, 5);
  const upNext = nextRoutine(program, history);

  function start(routine: Routine | null) {
    haptics.confirm();
    if (active) {
      setPendingStart(routine);
      setConfirmReplace(true);
    } else {
      TrainRepository.start(routine, history ?? []);
      nav.navigate('WorkoutSession');
    }
  }

  const header = (
    <View>
      <TabHeader title="Train" />
      {active && (
        <>
          <PressableScale onPress={() => nav.navigate('WorkoutSession')} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 12 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <T v="titleMedium">{active.title}</T>
              <T v="bodySmall" color={c.onSurfaceVariant}>In progress · {doneSets(active)} sets done</T>
            </View>
            <Button kind="filled" label="Resume" onPress={() => nav.navigate('WorkoutSession')} />
          </PressableScale>
          <Hairline />
        </>
      )}
      <Button label="Start empty workout" icon="add" onPress={() => start(null)} style={{ marginHorizontal: Gutter, marginVertical: 8 }} />

      {/* Program switcher: the title of the routine list, like a folder name. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 8, paddingTop: 16 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <PressableScale onPress={() => setProgramMenu(true)} label="Change program" style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
            <T v="titleLarge" lines={1}>{program?.name ?? (state.loading && !state.error ? 'Loading…' : 'No program yet')}</T>
            <Icon name="arrow-drop-down" />
          </PressableScale>
        </View>
        <Button kind="text" label="Routine" icon="add" onPress={() => {
          // A routine lives in a program, so without one we go create a program first.
          if (program) nav.navigate('RoutineEditor', { programId: program.id, routineId: null });
          else nav.navigate('Programs');
        }} />
      </View>
      {splitLabel && (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 8 }}>
          <T v="bodyMedium" color={c.onSurfaceVariant} style={{ flex: 1 }}>Your plan: {splitLabel}</T>
          {splits.length > 1 && <Button kind="text" label="Change split" icon="swap-horiz" onPress={() => setSplitMenu(true)} compact />}
        </View>
      )}
      {state.error && <T color={c.error} style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}>{state.error}</T>}
      {state.loading && state.programs.length === 0 && !state.error ? <><SkeletonCard /><SkeletonCard /></>
        : (!program || program.routines.length === 0) && (
          <T color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter, paddingVertical: 12 }}>
            {!program ? 'Create a program to group your routines.' : 'No routines yet. Tap + Routine to build one.'}
          </T>
        )}
    </View>
  );

  const footer = recent.length > 0 ? (
    <View>
      <SectionTitle text="History" />
      {recent.map((h) => (
        <PressableScale key={h.id} onPress={() => nav.navigate('WorkoutDetail', { workoutId: h.id })}
          style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 10 }}>
          <View style={{ flex: 1 }}>
            <T v="bodyLarge">{h.title}</T>
            <T v="bodySmall" color={c.onSurfaceVariant}>{relativeDay(h.finishedAt)}</T>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <T>{WorkoutMath.formatDuration(h.durationSec)}</T>
            <T v="bodySmall" color={c.onSurfaceVariant}>
              {setCount(h)} sets · {WorkoutMath.formatVolume(h.volumeKg, units)}{h.records > 0 ? ` · ${h.records} PR` : ''}
            </T>
          </View>
        </PressableScale>
      ))}
    </View>
  ) : undefined;

  return (
    <Screen>
      <FlatList
        data={program?.routines ?? []}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View>
            <RoutineRow
              routine={item}
              next={item.id === upNext?.id}
              onStart={() => start(item)}
              onEdit={() => program && nav.navigate('RoutineEditor', { programId: program.id, routineId: item.id })}
              onDelete={() => setDeleting(item)}
            />
            <Hairline inset={Gutter} />
          </View>
        )}
      />

      <ActionMenu
        visible={programMenu}
        onDismiss={() => setProgramMenu(false)}
        items={[
          ...state.programs.map((p) => ({ label: p.name, checked: p.id === program?.id, onPress: () => TrainRepository.selectProgram(p.id) })),
          { label: 'Rebuild my program from my plan', icon: 'autorenew' as const, onPress: () => setRebuilding(true) },
          { label: 'Manage programs', icon: 'settings' as const, onPress: () => nav.navigate('Programs') },
        ]}
      />

      {/* One outlined card per split, the current one highlighted, so the options read apart. */}
      <BottomSheet visible={splitMenu} onDismiss={() => setSplitMenu(false)}>
        <View style={{ paddingHorizontal: Gutter, paddingBottom: 8, gap: 12 }}>
          <T v="titleLarge">Choose your split</T>
          <T v="bodySmall" color={c.onSurfaceVariant}>Both fit your training days. Pick the one you prefer.</T>
          {splits.map((o) => {
            const current = o.split === currentSplit;
            return (
              <Pressable
                key={o.split}
                accessibilityRole="button"
                accessibilityState={{ selected: current }}
                onPress={() => {
                  haptics.tick();
                  setSplitMenu(false);
                  // Opened after the sheet closes: stacked popups misbehave, mostly on iOS.
                  if (!current) setTimeout(() => setPendingSplit({ split: o.split, label: o.label }), Platform.OS === 'ios' ? 350 : 0);
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.md, borderWidth: current ? 2 : 1,
                  borderColor: current ? c.primary : c.outline,
                  backgroundColor: current ? c.primaryContainer : pressed ? c.surfaceContainerHigh : 'transparent',
                })}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <T v="titleMedium">{o.label}</T>
                  <T v="bodySmall" color={c.onSurfaceVariant}>{o.description}</T>
                  {current && <T v="labelSmall" color={c.primary}>Your current split</T>}
                </View>
                {current ? <Icon name="check-circle" color={c.primary} /> : <Icon name="chevron-right" color={c.onSurfaceVariant} />}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>

      <Dialog
        visible={pendingSplit != null}
        onDismiss={() => setPendingSplit(null)}
        title={`Switch to ${pendingSplit?.label ?? ''}?`}
        dismiss={{ label: 'Cancel', onPress: () => setPendingSplit(null) }}
        confirm={{
          label: 'Switch', onPress: () => {
            const next = pendingSplit;
            setPendingSplit(null);
            if (!next || !profile) return;
            // Saving updates the profile on the device at once, so the rebuild uses the new split.
            ProfileRepository.save({ ...profile, split: next.split }).catch(() => undefined);
            if (TrainRepository.rebuildFromPlan()) { haptics.confirm(); toast(`Switched to ${next.label}`); }
            else toast('Finish your goals in Settings first');
          },
        }}
      >
        <T>Your routines are rebuilt for the new split. Your exercise swaps are kept; exercises you added or picked from the library are reset.</T>
      </Dialog>

      <Dialog
        visible={confirmReplace}
        onDismiss={() => setConfirmReplace(false)}
        title="Workout in progress"
        dismiss={{ label: 'Resume current', onPress: () => { setConfirmReplace(false); nav.navigate('WorkoutSession'); } }}
        confirm={{
          label: 'Discard and start', danger: true, onPress: () => {
            setConfirmReplace(false);
            TrainRepository.start(pendingStart, history ?? []);
            nav.navigate('WorkoutSession');
          },
        }}
      >
        <T>You already have a workout going. Discard it and start a new one?</T>
      </Dialog>

      <Dialog
        visible={rebuilding}
        onDismiss={() => setRebuilding(false)}
        title="Rebuild my program?"
        dismiss={{ label: 'Cancel', onPress: () => setRebuilding(false) }}
        confirm={{
          label: 'Rebuild', onPress: () => {
            setRebuilding(false);
            if (TrainRepository.rebuildFromPlan()) { haptics.confirm(); toast('New program built from your plan'); }
            else toast('Finish your goals in Settings first');
          },
        }}
      >
        <T>We build a new program from your current goals, level and training days, and make it active. Your other programs and your history stay. Your exercise swaps are kept; exercises you added or picked from the library are reset.</T>
      </Dialog>

      <Dialog
        visible={deleting != null}
        onDismiss={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? ''}?`}
        dismiss={{ label: 'Cancel', onPress: () => setDeleting(null) }}
        confirm={{ label: 'Delete', danger: true, onPress: () => { if (program && deleting) TrainRepository.deleteRoutine(program, deleting.id); setDeleting(null); } }}
      >
        <T>The routine is removed from this program. Past workouts stay in your history.</T>
      </Dialog>
    </Screen>
  );
}

function RoutineRow({ routine, next, onStart, onEdit, onDelete }: {
  routine: Routine; next: boolean; onStart: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <PressableScale onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 8, paddingVertical: 12 }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <T v="titleMedium">{routine.name}</T>
          {next && (
            <View style={{ backgroundColor: c.primary, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
              <T v="labelSmall" color={c.onPrimary}>Up next</T>
            </View>
          )}
        </View>
        <T v="bodySmall" color={c.onSurfaceVariant} lines={2}>
          {routine.exercises.length === 0 ? 'No exercises yet' : routine.exercises.map((x) => x.name).join(', ')}
        </T>
      </View>
      <Button kind={next ? 'filled' : 'tonal'} label="Start" onPress={onStart} enabled={routine.exercises.length > 0} style={{ marginLeft: 12 }} compact />
      <IconButton name="more-vert" label="More" color={c.onSurfaceVariant} onPress={() => setMenu(true)} />
      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[
        { label: 'Edit', icon: 'edit', onPress: onEdit },
        { label: 'Delete', icon: 'delete-outline', danger: true, onPress: onDelete },
      ]} />
    </PressableScale>
  );
}
