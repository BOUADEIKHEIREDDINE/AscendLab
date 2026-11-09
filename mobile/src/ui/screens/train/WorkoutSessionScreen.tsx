/** The live workout: a dedicated full-screen training mode without the tab bar. */
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, FlatList, Platform, Pressable, TextInput, View } from 'react-native';
import { Convert, engineLevel, formatNumber, UNIT, Units } from '../../../data/profile';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { activeProgramOf, activeStore, TrainRepository, trainLive } from '../../../data/trainRepo';
import { afterFindWeightSet } from '../../../data/progress';
import {
  ActiveExercise, ActiveWorkout, applyWorkoutChanges, beatenBy, clock, doneSets, ExerciseLibrary, ExerciseRecords, LoggedSet, newSet,
  noticeText, programNotices, replacementSetCount, recordsByExercise, recordsFrom, SET_TYPE, SET_TYPES, SetEntry, SetType, swapsAfterReplace, WorkoutMath,
  workoutReplace, WorkoutRecord,
} from '../../../data/training';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { c, colors, Gutter, type } from '../../theme';
import { haptics } from '../../haptics';
import { Button, digits, Hairline, Icon, IconButton, PrimaryButton, ProgressBar, Screen, T, TextField, Toggle } from '../../components/core';
import { ActionMenu, Dialog, toast } from '../../components/overlays';
import { AlternativesSheet, ExercisePicker, SetBadge, VolumeNoticeNote } from './TrainComponents';

const toKg = (text: string, units: Units) => {
  const v = parseFloat(text) || 0;
  return units === 'IMPERIAL' ? Convert.lbToKg(v) : v;
};

function volumeKg(w: ActiveWorkout, units: Units): number {
  return w.exercises.reduce((a, x) => a + x.sets.filter((s) => s.done).reduce((b, s) => b + toKg(s.weight, units) * (parseInt(s.reps, 10) || 0), 0), 0);
}

export function WorkoutSessionScreen() {
  const nav = useNav();
  const workout = useStore(activeStore);
  const profile = useStore(profileStore);
  const units = profile?.units ?? 'METRIC';
  const [alternativesFor, setAlternativesFor] = useState<number | null>(null);
  const [history, setHistory] = useState<WorkoutRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [prBanner, setPrBanner] = useState<string | null>(null);
  const banner = useState(() => new Animated.Value(0))[0];

  useEffect(() => { TrainRepository.loadHistory().then(setHistory); }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!prBanner) return;
    Animated.spring(banner, { toValue: 1, useNativeDriver: Platform.OS !== 'web' }).start();
    const t = setTimeout(() => Animated.timing(banner, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start(() => setPrBanner(null)), 3500);
    return () => clearTimeout(t);
  }, [prBanner, banner]);

  const previous = useMemo(() => {
    const map = new Map<string, LoggedSet[]>();
    history.forEach((w) => w.exercises.forEach((x) => { if (!map.has(x.exerciseId)) map.set(x.exerciseId, x.sets); }));
    return map;
  }, [history]);
  const records = useMemo(() => recordsByExercise(history), [history]);

  // The rest timer ran out: buzz and clear it.
  const restEndsAt = workout?.restEndsAt ?? null;
  useEffect(() => {
    if (restEndsAt != null && restEndsAt <= now) {
      haptics.heavy();
      TrainRepository.update((w) => ({ ...w, restEndsAt: null }));
    }
  }, [restEndsAt, now]);

  // Finished or discarded: leave the page.
  useEffect(() => { if (!workout) goBack(nav); }, [workout, nav]);
  if (!workout) return null;
  const w = workout;
  const resting = w.restEndsAt != null && w.restEndsAt > now;

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 16, paddingTop: 8 }}>
        <IconButton name="keyboard-arrow-down" label="Minimize" onPress={() => goBack(nav)} />
        <T v="titleLarge" lines={1} style={{ flex: 1 }}>{w.title}</T>
        <Button kind="filled" label="Finish" onPress={() => setFinishing(true)} />
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8 }}>
        <Stat label="Duration" value={clock(Math.trunc((now - w.startedAt) / 1000))} />
        <Stat label="Volume" value={WorkoutMath.formatVolume(volumeKg(w, units), units)} />
        <Stat label="Sets" value={`${doneSets(w)}`} />
      </View>
      <Hairline style={{ marginTop: 8 }} />

      <FlatList
        style={{ flex: 1 }}
        data={w.exercises}
        keyExtractor={(x, i) => `${x.exerciseId}-${i}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={w.exercises.length === 0
          ? <T v="bodyLarge" color={c.onSurfaceVariant} style={{ padding: Gutter }}>Add your first exercise to get going.</T>
          : w.warmUp && w.warmUp.length > 0 ? <WarmUpCard lines={w.warmUp} /> : undefined}
        renderItem={({ item, index }) => (
          <View>
            <ExerciseBlock
              ex={item}
              index={index}
              previous={previous.get(item.exerciseId)}
              records={records.get(item.exerciseId)}
              units={units}
              onOpen={() => nav.navigate('ExerciseDetail', { exerciseId: item.exerciseId, name: item.name })}
              onRecord={(label) => { haptics.heavy(); setPrBanner(`New record: ${label} · ${item.name}`); }}
              onAlternatives={() => setAlternativesFor(index)}
            />
            <Hairline />
          </View>
        )}
        ListFooterComponent={
          <View style={{ paddingHorizontal: Gutter, paddingVertical: 16, gap: 8 }}>
            <Button kind="filled" label="Add exercise" icon="add" onPress={() => setPicking(true)} style={{ height: 52 }} />
            <Button kind="text" label="Discard workout" color={c.error} onPress={() => setConfirmDiscard(true)} />
          </View>
        }
      />

      {/* Docked at the bottom so it never pushes the sets around while you tap. */}
      {resting && <RestBar secondsLeft={Math.max(Math.trunc((w.restEndsAt! - now) / 1000), 0)} total={w.restTotal ?? w.restSeconds} />}

      {/* Live personal-record alert: floats over the header like a toast, so the sets never move. */}
      {prBanner && (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.apricot, flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: Gutter, paddingVertical: 12, gap: 12, opacity: banner,
          transform: [{ translateY: banner.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }],
        }}>
          <Icon name="emoji-events" color={colors.midnightBlue} />
          <T v="titleSmall" color={colors.midnightBlue} style={{ flex: 1 }}>{prBanner}</T>
        </Animated.View>
      )}

      <ExercisePicker
        visible={picking}
        onDismiss={() => setPicking(false)}
        onPick={(picked) => {
          TrainRepository.update((cur) => ({
            ...cur,
            exercises: [...cur.exercises, ...picked.map((x) => {
              const plan = TrainRepository.planForAdded(x.id, history);
              const sets = Array.from({ length: plan?.sets ?? 3 }, () => newSet());
              return { exerciseId: x.id, name: x.name, sets, targetReps: plan?.repMax ?? null, plan };
            })],
          }));
          setPicking(false);
        }}
      />

      {alternativesFor != null && w.exercises[alternativesFor] && (
        <AlternativesSheet
          visible
          onDismiss={() => setAlternativesFor(null)}
          current={w.exercises[alternativesFor]}
          level={profile ? engineLevel(profile) : 'beginner'}
          onChoose={({ exerciseId, name, mode }) => {
            const i = alternativesFor;
            setAlternativesFor(null);
            const plan = TrainRepository.planForAdded(exerciseId, history);
            TrainRepository.update((cur) => {
              const old = cur.exercises[i];
              if (!old) return cur;
              // Replace keeps the row's set count; an add gets the plan's sets for the new exercise.
              const count = mode === 'replace' ? replacementSetCount(old) : plan?.sets ?? replacementSetCount(old);
              const sets = Array.from({ length: count }, () => newSet());
              const next: ActiveExercise = {
                exerciseId, name, sets, targetReps: plan?.repMax ?? old.targetReps, plan: plan ? { ...plan, sets: count } : plan,
                tag: mode === 'replace' ? 'swapped' : 'added',
                ...(mode === 'replace' && old.slot ? { slot: old.slot } : {}),
              };
              if (mode === 'replace') {
                return {
                  ...cur,
                  exercises: workoutReplace(cur.exercises, i, next),
                  changes: [...(cur.changes ?? []), { kind: 'replace', fromId: old.exerciseId, toId: exerciseId, toName: name, ...(old.slot ? { slot: old.slot } : {}) }],
                };
              }
              return {
                ...cur,
                exercises: [...cur.exercises.slice(0, i + 1), next, ...cur.exercises.slice(i + 1)],
                changes: [...(cur.changes ?? []), { kind: 'add', afterId: old.exerciseId, toId: exerciseId, toName: name }],
              };
            });
          }}
        />
      )}

      <Dialog
        visible={confirmDiscard}
        onDismiss={() => setConfirmDiscard(false)}
        title="Discard this workout?"
        dismiss={{ label: 'Keep training', onPress: () => setConfirmDiscard(false) }}
        confirm={{ label: 'Discard', danger: true, onPress: () => { setConfirmDiscard(false); TrainRepository.discard(); } }}
      >
        <T>Nothing from this session will be saved.</T>
      </Dialog>

      {finishing && <FinishDialog w={w} units={units} now={now} onDismiss={() => setFinishing(false)} />}
    </Screen>
  );
}

/** The session's optional warm-up, before the first exercise. */
function WarmUpCard({ lines }: { lines: string[] }) {
  return (
    <View style={{ marginHorizontal: Gutter, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: c.surfaceContainer, gap: 4 }}>
      <T v="titleSmall">Warm-up (optional)</T>
      {lines.map((line) => <T key={line} v="bodySmall" color={c.onSurfaceVariant}>• {line}</T>)}
    </View>
  );
}

const restText = (sec: number) => (sec % 60 === 0 ? `${sec / 60} min` : `${Math.floor(sec / 60)}.5 min`);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <T v="labelMedium" color={c.onSurfaceVariant}>{label}</T>
      <T v="titleMedium">{value}</T>
    </View>
  );
}

function RestBar({ secondsLeft, total }: { secondsLeft: number; total: number }) {
  const shift = (ms: number | null) => TrainRepository.update((w) => ({ ...w, restEndsAt: ms == null ? null : (w.restEndsAt ?? Date.now()) + ms }));
  return (
    <View style={{ backgroundColor: c.primaryContainer, paddingHorizontal: Gutter, paddingVertical: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Icon name="timer" color={c.primary} />
        <T v="titleMedium" color={c.primary} style={{ flex: 1 }}>  Rest  {clock(secondsLeft)}</T>
        <Button kind="text" label="−15" onPress={() => shift(-15_000)} compact />
        <Button kind="text" label="+15" onPress={() => shift(15_000)} compact />
        <Button kind="text" label="Skip" onPress={() => shift(null)} compact />
      </View>
      <ProgressBar progress={secondsLeft / Math.max(total, 1)} height={4} duration={900} />
    </View>
  );
}

function ExerciseBlock({ ex, index, previous, records, units, onOpen, onRecord, onAlternatives }: {
  ex: ActiveExercise; index: number; previous: LoggedSet[] | undefined; records: ExerciseRecords | undefined; units: Units;
  onOpen: () => void; onRecord: (label: string) => void; onAlternatives: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const plan = ex.plan ?? null;
  const bodyweight = ExerciseLibrary.isBodyweight(ex.exerciseId);
  const display = (kgValue: number) => formatNumber(units === 'IMPERIAL' ? Convert.kgToLb(kgValue) : kgValue);
  // "Previous" pairs warm-ups with warm-ups and working sets with working sets.
  const prevWarm = (previous ?? []).filter((s) => s.type === 'WARMUP');
  const prevWork = (previous ?? []).filter((s) => s.type !== 'WARMUP');
  let warmCount = 0;
  const unit = UNIT[units].weightUnit.toUpperCase();

  const updateExercise = (transform: (e: ActiveExercise) => ActiveExercise) =>
    TrainRepository.update((w) => ({ ...w, exercises: w.exercises.map((e, i) => (i === index ? transform(e) : e)) }));
  const setAt = (setIndex: number, s: SetEntry) => updateExercise((e) => ({ ...e, sets: e.sets.map((old, i) => (i === setIndex ? s : old)) }));

  let normalCount = 0;
  return (
    <View style={{ paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 4 }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <Pressable onPress={onOpen} accessibilityRole="link" style={{ paddingVertical: 4 }}>
            <T v="titleMedium" color={c.primary}>{ex.name}</T>
          </Pressable>
          {ex.tag && <T v="labelSmall" color={c.primary}>{ex.tag === 'swapped' ? 'swapped for this workout' : 'added'}</T>}
        </View>
        <IconButton name="more-vert" label="More" onPress={() => setMenu(true)} />
      </View>
      {plan && (
        <View style={{ paddingHorizontal: Gutter, paddingBottom: 4, gap: 2 }}>
          <T v="bodySmall" color={c.onSurfaceVariant}>
            {plan.sets} × {plan.repMin}–{plan.repMax} reps to failure · rest {restText(plan.restSec)}
          </T>
          {plan.note && <T v="bodySmall" color={plan.findWeight ? colors.apricot : c.primary}>{plan.note}</T>}
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter - 8, paddingVertical: 4 }}>
        <Header text="SET" width={36} />
        <Header text="PREVIOUS" flex={1.4} />
        <Header text={bodyweight ? `+${unit}` : unit} flex={1} />
        <Header text="REPS" flex={1} />
        <View style={{ width: 44 }} />
      </View>
      {ex.sets.map((set, setIndex) => {
        if (set.type === 'NORMAL') normalCount++;
        const warm = set.type === 'WARMUP';
        const prev = warm ? prevWarm[warmCount++] : prevWork[setIndex - warmCount];
        const prevWeight = prev && prev.weightKg > 0 ? display(prev.weightKg) : null;
        const prevText = prev ? `${prevWeight ? `${prevWeight} × ` : ''}${prev.reps}` : '–';
        const planWeight = warm ? plan?.warmUpKg : plan?.suggestedKg;
        const repsHint = warm && plan ? '5' : prev ? String(prev.reps) : ex.targetReps != null ? String(ex.targetReps) : '';
        // Grey hint: today's planned weight, else last session's, else the set above.
        const weightHint = planWeight != null && planWeight > 0 ? display(planWeight)
          : prevWeight ?? (ex.sets[setIndex - 1]?.weight || (bodyweight ? '0' : ''));
        return (
          <SetRow
            key={setIndex}
            number={normalCount}
            set={set}
            previous={prevText}
            weightHint={weightHint}
            repsHint={repsHint}
            onChange={(s) => setAt(setIndex, s)}
            onRemove={() => updateExercise((e) => ({ ...e, sets: e.sets.filter((_, i) => i !== setIndex) }))}
            onType={(t) => setAt(setIndex, { ...set, type: t })}
            onToggle={() => {
              const nowDone = !set.done;
              // An empty box means "same as the grey hint".
              const filled: SetEntry = {
                ...set,
                weight: set.weight || weightHint || '',
                reps: set.reps || repsHint,
                done: nowDone,
              };
              if (nowDone && !filled.reps) return;
              if (nowDone && plan?.findWeight && !warm && !filled.weight) { toast('Type the weight you used'); return; }
              if (nowDone && records) {
                // Compare with history plus the sets already done today, so only real bests fire.
                const today = ex.sets.filter((s, j) => j !== setIndex && s.done)
                  .map((s) => ({ weightKg: toKg(s.weight, units), reps: parseInt(s.reps, 10) || 0, type: s.type }));
                const t = recordsFrom([today]);
                const best: ExerciseRecords = {
                  heaviestKg: Math.max(records.heaviestKg, t.heaviestKg),
                  best1RmKg: Math.max(records.best1RmKg, t.best1RmKg),
                  bestSetVolumeKg: Math.max(records.bestSetVolumeKg, t.bestSetVolumeKg),
                  bestSessionVolumeKg: 0,
                  mostReps: Math.max(records.mostReps, t.mostReps),
                  byReps: {},
                };
                const label = beatenBy(best, { weightKg: toKg(filled.weight, units), reps: parseInt(filled.reps, 10) || 0, type: filled.type })[0];
                if (label) onRecord(label);
              }
              // Find your weight: each working set tells the next one what to lift.
              let nextPlan = plan;
              let extraSet = false;
              if (nowDone && plan?.findWeight && !warm) {
                const workingDone = ex.sets.filter((s, j) => (j === setIndex || s.done) && s.type !== 'WARMUP').length;
                const step = afterFindWeightSet(plan, toKg(filled.weight, units), parseInt(filled.reps, 10) || 0, workingDone);
                nextPlan = { ...plan, note: step.note, suggestedKg: step.found ? toKg(filled.weight, units) : step.nextKg, findWeight: !step.found };
                const remaining = ex.sets.some((s, j) => j > setIndex && !s.done && s.type !== 'WARMUP');
                extraSet = step.addSet && !remaining;
              }
              const restSec = warm ? 60 : plan?.restSec ?? undefined;
              TrainRepository.update((w) => ({
                ...w,
                exercises: w.exercises.map((e, i) => (i !== index ? e : {
                  ...e,
                  plan: nextPlan,
                  sets: [...e.sets.map((old, j) => (j === setIndex ? filled : old)), ...(extraSet ? [newSet()] : [])],
                })),
                restEndsAt: nowDone ? Date.now() + (restSec ?? w.restSeconds) * 1000 : w.restEndsAt,
                restTotal: nowDone ? restSec ?? w.restSeconds : w.restTotal,
              }));
            }}
          />
        );
      })}
      <Button kind="text" label="Add set" icon="add" style={{ marginHorizontal: 8 }} onPress={() => {
        haptics.tick();
        updateExercise((e) => ({ ...e, sets: [...e.sets, newSet({ weight: e.sets[e.sets.length - 1]?.weight ?? '' })] }));
      }} />
      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[{
        label: 'Alternatives', icon: 'swap-horiz', onPress: onAlternatives,
      }, {
        label: 'Remove exercise', icon: 'delete-outline', danger: true,
        onPress: () => TrainRepository.update((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== index) })),
      }]} />
    </View>
  );
}

function Header({ text, width, flex }: { text: string; width?: number; flex?: number }) {
  return <T v="labelSmall" color={c.onSurfaceVariant} center style={{ width, flex }}>{text}</T>;
}

function SetRow({ number, set, previous, weightHint, repsHint, onChange, onToggle, onRemove, onType }: {
  number: number; set: SetEntry; previous: string; weightHint: string; repsHint: string;
  onChange: (s: SetEntry) => void; onToggle: () => void; onRemove: () => void; onType: (t: SetType) => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter - 8, paddingVertical: 4, backgroundColor: set.done ? c.primaryContainer : c.background }}>
      {/* Tap the set number to change its type (W / F / D). */}
      <Pressable onPress={() => { haptics.tick(); setMenu(true); }} accessibilityLabel={`Set ${number} type`}
        style={{ width: 36, alignItems: 'center', paddingVertical: 8, borderRadius: 8 }}>
        <SetBadge type={set.type} normalIndex={number} />
      </Pressable>
      <T color={c.onSurfaceVariant} center style={{ flex: 1.4 }}>{previous}</T>
      <NumberBox value={set.weight} hint={weightHint} decimal onChange={(v) => onChange({ ...set, weight: v })} label={`Set ${number} weight`} />
      <NumberBox value={set.reps} hint={repsHint} onChange={(v) => onChange({ ...set, reps: v })} label={`Set ${number} reps`} />
      <Pressable
        onPress={() => { if (set.done) haptics.tick(); else haptics.confirm(); onToggle(); }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.done }}
        accessibilityLabel={set.done ? `Mark set ${number} not done` : `Mark set ${number} done`}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: set.done ? c.primary : c.surfaceContainerHigh, transform: [{ scale: set.done ? 1 : 0.9 }] }}>
          <Icon name="check" size={20} color={set.done ? c.onPrimary : c.onSurfaceVariant} />
        </View>
      </Pressable>
      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[
        ...SET_TYPES.map((t) => ({ label: SET_TYPE[t].label, leading: <View style={{ width: 24, alignItems: 'center' }}><SetBadge type={t} normalIndex={1} /></View>, onPress: () => onType(t) })),
        { label: 'Remove set', icon: 'delete-outline' as const, danger: true, onPress: onRemove },
      ]} />
    </View>
  );
}

function NumberBox({ value, hint, decimal, onChange, label }: { value: string; hint: string; decimal?: boolean; onChange: (v: string) => void; label: string }) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 4 }}>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(digits(t, decimal ? 6 : 3, decimal))}
        placeholder={hint}
        placeholderTextColor="rgba(169,182,194,0.6)"
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        selectionColor={c.primary}
        keyboardAppearance="dark"
        selectTextOnFocus
        accessibilityLabel={label}
        style={[type.titleSmall, { color: c.onSurface, textAlign: 'center', backgroundColor: c.surfaceContainer, borderRadius: 8, paddingVertical: 8 },
          Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
      />
    </View>
  );
}

function FinishDialog({ w, units, now, onDismiss }: { w: ActiveWorkout; units: Units; now: number; onDismiss: () => void }) {
  const [caption, setCaption] = useState('');
  const [share, setShare] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = w.exercises.reduce((n, x) => n + x.sets.filter((s) => !s.done).length, 0);
  const done = doneSets(w);
  const profile = useStore(profileStore);
  const program = activeProgramOf(useStore(trainLive));
  const routine = program?.routines.find((r) => r.id === w.routineId) ?? null;
  const changes = routine ? w.changes ?? [] : [];
  const applied = program && routine && changes.length > 0 ? applyWorkoutChanges(routine, program.routines, changes) : null;
  const notices = applied && program && profile ? programNotices(program.routines, applied.routines, profile).map(noticeText) : [];

  async function save(keep: boolean) {
    setBusy(true);
    const failure = await TrainRepository.finish(caption, share);
    setBusy(false);
    setError(failure);
    if (failure) { haptics.reject(); return; }
    haptics.confirm();
    const saved = share ? 'Workout saved and posted' : 'Workout saved';
    if (!keep || !applied || !program) { toast(saved); return; }
    TrainRepository.saveRoutines(program, applied.routines);
    if (profile) {
      const swaps = changes.reduce(
        (acc, ch) => (ch.kind === 'replace' && ch.slot ? swapsAfterReplace(acc, ch.slot, ch.toId, engineLevel(profile)) : acc),
        profile.swaps,
      );
      ProfileRepository.save({ ...profile, swaps }).catch(() => undefined);
    }
    const others = applied.changedNames.filter((n) => n !== routine?.name);
    toast(others.length > 0 ? `${saved}. Program changed, also in ${others.join(', ')}` : `${saved}. Saved to your program`);
  }

  return (
    <Dialog
      visible
      onDismiss={() => { if (!busy) onDismiss(); }}
      title="Finish workout"
      dismiss={{ label: 'Keep training', onPress: onDismiss, enabled: !busy }}
      confirm={applied ? undefined : { label: done === 0 ? 'Tick a set first' : 'Save', enabled: !busy && done > 0, loading: busy, onPress: () => save(false) }}
    >
      <View style={{ flexDirection: 'row', paddingVertical: 8 }}>
        <Stat label="Duration" value={WorkoutMath.formatDuration(Math.trunc((now - w.startedAt) / 1000))} />
        <Stat label="Volume" value={WorkoutMath.formatVolume(volumeKg(w, units), units)} />
        <View style={{ flex: 0.6 }}><Stat label="Sets" value={`${done}`} /></View>
      </View>
      {pending > 0 && <T v="bodySmall" color={colors.apricot}>{pending} set{pending === 1 ? '' : 's'} not ticked off won't be saved.</T>}
      <TextField label="How did it go?" placeholder="New best on bench!" value={caption} onChangeText={(t) => setCaption(t.slice(0, 300))} multiline autoCapitalize="sentences" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T v="bodyLarge">Post to feed</T>
          <T v="bodySmall" color={c.onSurfaceVariant}>Your friends see this workout</T>
        </View>
        <Toggle value={share} onChange={setShare} label="Post to feed" />
      </View>
      {applied && (
        <View style={{ gap: 8 }}>
          <T v="titleSmall">You changed this routine. Keep the changes for next time?</T>
          {changes.map((ch, i) => (
            <T key={i} v="bodySmall" color={c.onSurfaceVariant}>
              {ch.kind === 'replace' ? `⇄ ${ExerciseLibrary.find(ch.fromId)?.name ?? ch.fromId} → ${ch.toName}` : `+ Added ${ch.toName}`}
            </T>
          ))}
          <VolumeNoticeNote lines={notices} />
          <PrimaryButton label={done === 0 ? 'Tick a set first' : 'Save to my program'} enabled={!busy && done > 0} onPress={() => save(true)} />
          <Button label="Only this workout" enabled={!busy && done > 0} onPress={() => save(false)} />
        </View>
      )}
      {error && <T color={c.error}>{error}</T>}
    </Dialog>
  );
}
