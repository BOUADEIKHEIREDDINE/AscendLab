import React, { useState } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { splitChoice } from '../../../data/profile';
import type { Split } from '../../../lib/program-generator/program';
import { activeProgramOf, activeStore, historyLive, TrainRepository, trainLive } from '../../../data/trainRepo';
import { doneSets, nextRoutine, Routine, setCount, WorkoutMath } from '../../../data/training';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { palette, Gutter, radius, space, tone } from '../../theme';
import { haptics } from '../../haptics';
import { relativeDay } from '../../format';
import {
  Button, EmptyState, HeroButton, Icon, ListGroup, ListRow, PressableScale, Screen, SectionTitle, SkeletonCard, SplitButton, T, TabHeader, Tile,
} from '../../components/core';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { ActionMenu, Dialog, toast } from '../../components/overlays';
import { SplitSheet } from './TrainComponents';

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
        <Tile span="2x1" onPress={() => nav.navigate('WorkoutSession')} label={`${active.title}, in progress. Resume`}
          style={{ marginHorizontal: Gutter, marginBottom: space.tileGap, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 }}
          overlay={(
            <View pointerEvents="box-none" style={{ position: 'absolute', right: space.tilePad, top: 0, bottom: 0, justifyContent: 'center' }}>
              <Button kind="tonal" label="Resume" compact onPress={() => nav.navigate('WorkoutSession')} />
            </View>
          )}>
          <ExpressiveShape shape="softTriangle" size={48} fill={tone(palette.primary, 0.18)}>
            <Icon name="fitness-center" size={20} color={palette.primary} />
          </ExpressiveShape>
          <View style={{ flex: 1 }}>
            <T v="overline" color={palette.primary}>In progress</T>
            <T v="titleS" lines={1}>{active.title}</T>
            <T v="bodyS" color={palette.textMuted}>{doneSets(active)} sets done</T>
          </View>
          {/* Room for the Resume button, drawn over the tile as a sibling. */}
          <View style={{ width: 92 }} />
        </Tile>
      )}
      {!active && <HeroButton label="Start empty workout" icon="add" onPress={() => start(null)} style={{ marginHorizontal: Gutter, marginVertical: 8 }} />}

      {/* Program switcher: the title of the routine list, like a folder name. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter - 8, paddingTop: 20 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <PressableScale onPress={() => setProgramMenu(true)} label="Change program" style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }}>
            <T v="title" lines={1}>{program?.name ?? (state.loading && !state.error ? 'Loading…' : 'No program yet')}</T>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter - 8, paddingBottom: 6 }}>
          <T v="bodyS" color={palette.textMuted} style={{ flex: 1 }}>Your plan: {splitLabel}</T>
          {splits.length > 1 && <Button kind="text" label="Change split" icon="swap-horiz" onPress={() => setSplitMenu(true)} compact />}
        </View>
      )}
      {state.error && <T color={palette.error} style={{ paddingHorizontal: Gutter, paddingVertical: 8 }}>{state.error}</T>}
      {state.loading && state.programs.length === 0 && !state.error ? <><SkeletonCard /><SkeletonCard /></>
        : (!program || program.routines.length === 0) && (
          <EmptyState icon="fitness-center" shape="softTriangle" title={!program ? 'No program yet' : 'No routines yet'}
            hint={!program ? 'Create a program to group your routines.' : 'Tap + Routine to build one.'} />
        )}
    </View>
  );

  const footer = recent.length > 0 ? (
    <View>
      <SectionTitle text="History" />
      <ListGroup>
        {recent.map((h) => (
          <ListRow key={h.id} title={h.title} onPress={() => nav.navigate('WorkoutDetail', { workoutId: h.id })}
            subtitle={`${relativeDay(h.finishedAt)} · ${setCount(h)} sets · ${WorkoutMath.formatVolume(h.volumeKg, units)}`}
            trailing={
              <View style={{ alignItems: 'flex-end' }}>
                <T v="displayS" style={{ fontSize: 17, lineHeight: 22 }}>{WorkoutMath.formatDuration(h.durationSec)}</T>
                {h.records > 0 && <T v="bodyS" color={palette.gold}>{h.records} PR</T>}
              </View>
            } />
        ))}
      </ListGroup>
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
          <View style={{ paddingHorizontal: Gutter, paddingBottom: space.tileGap }}>
            <RoutineRow
              routine={item}
              next={item.id === upNext?.id}
              onStart={() => start(item)}
              onOpen={() => program && nav.navigate('RoutineDetail', { programId: program.id, routineId: item.id })}
              onEdit={() => program && nav.navigate('RoutineEditor', { programId: program.id, routineId: item.id })}
              onDelete={() => setDeleting(item)}
            />
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

      {currentSplit && (
        <SplitSheet
          visible={splitMenu}
          onDismiss={() => setSplitMenu(false)}
          options={splits}
          current={currentSplit}
          // Opened after the sheet closes: stacked popups misbehave, mostly on iOS.
          onPick={(o) => setTimeout(() => setPendingSplit({ split: o.split, label: o.label }), Platform.OS === 'ios' ? 350 : 0)}
        />
      )}

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
            else toast('Finish your goals in Settings first', 'info');
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
            else toast('Finish your goals in Settings first', 'info');
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

function RoutineRow({ routine, next, onStart, onOpen, onEdit, onDelete }: {
  routine: Routine; next: boolean; onStart: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <Tile span="2x1" onPress={onOpen} label={routine.name} border={next ? palette.primary : undefined} style={{ gap: 10 }}
      overlay={(
        <View pointerEvents="box-none" style={{ position: 'absolute', right: space.tilePad, bottom: space.tilePad }}>
          <SplitButton label="Start" kind="tonal" onPress={onStart} onMenu={() => setMenu(true)} enabled={routine.exercises.length > 0} menuLabel={`More for ${routine.name}`} />
        </View>
      )}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <T v="titleS" style={{ flexShrink: 1 }} lines={1}>{routine.name}</T>
        {next && (
          <View style={{ backgroundColor: palette.primary, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3 }}>
            <T v="overline" color={palette.onPrimary}>Up next</T>
          </View>
        )}
      </View>
      <T v="bodyS" color={palette.textMuted} lines={2}>
        {routine.exercises.length === 0 ? 'No exercises yet' : routine.exercises.map((x) => x.name).join(', ')}
      </T>
      {/* 40 high: the Start split button sits over this row as a sibling of the tile. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 40 }}>
        <T v="bodyS" color={palette.textFaint} style={{ flex: 1 }}>{routine.exercises.length} exercise{routine.exercises.length === 1 ? '' : 's'}</T>
      </View>
      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[
        { label: 'Start', icon: 'play-arrow', onPress: onStart },
        { label: 'Edit', icon: 'edit', onPress: onEdit },
        { label: 'Delete', icon: 'delete-outline', danger: true, onPress: onDelete },
      ]} />
    </Tile>
  );
}
