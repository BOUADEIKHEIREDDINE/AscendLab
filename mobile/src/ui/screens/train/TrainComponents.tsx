/** Pieces shared by the Train pages: exercise picker, alternatives sheet, stepper, set badge, name dialog. */
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { historyLive } from '../../../data/trainRepo';
import { doneKeys, Exercise, EQUIPMENT_LABEL, ExerciseLibrary, MUSCLE_LABEL, Muscle, MUSCLES } from '../../../data/training';
import { useStore } from '../../../lib/store';
import { palette, radius, space } from '../../theme';
import { haptics } from '../../haptics';
import { Button, Chip, Hairline, HelpNote, Icon, IconButton, Notice, PrimaryButton, T, TextField } from '../../components/core';
import { BottomSheet, Dialog } from '../../components/overlays';
import { ExerciseInfoPanel, ExerciseThumb } from '../../components/exerciseInfo';
import { slotAlternatives, type Level as EngineLevel, type Slot } from '../../../lib/program-generator/program';

/** Set badges now live with the other workout pieces; re-exported for existing imports. */
export { SetBadge } from '../../components/workout';

/**
 * Full-screen exercise search: filter by muscle, tap several exercises, then add them
 * all at once. Typing a name that isn't listed offers a custom exercise.
 */
export function ExercisePicker({ visible, onDismiss, onPick, muscle: initialMuscle, single }: {
  visible: boolean; onDismiss: () => void; onPick: (list: Exercise[]) => void;
  /** Muscle filter to open with. */
  muscle?: Muscle;
  /** One tap picks one exercise and returns it. */
  single?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(initialMuscle ?? null);
  // Each time it opens, start from the requested muscle filter.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setMuscle(initialMuscle ?? null);
  }
  const [picked, setPicked] = useState<Exercise[]>([]);
  // The exercise whose photos and instructions are open over the list.
  const [info, setInfo] = useState<Exercise | null>(null);
  const history = useStore(historyLive);
  const done = useMemo(() => doneKeys(history), [history]);
  // Hidden pickers stay mounted under screens that re-render every second: search only when open.
  const results = useMemo(() => (visible ? ExerciseLibrary.search(query, muscle, done) : []), [visible, query, muscle, done]);
  const canCreate = query.trim() !== '' && !ExerciseLibrary.hasName(query);
  const has = (x: Exercise) => picked.some((p) => p.id === x.id);
  const toggle = (x: Exercise) => {
    if (single) { onPick([x]); setQuery(''); return; }
    setPicked(has(x) ? picked.filter((p) => p.id !== x.id) : [...picked, x]);
  };
  const close = () => { setInfo(null); setPicked([]); setQuery(''); setMuscle(null); onDismiss(); };
  const customs = picked.filter((p) => p.id.startsWith('custom:'));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => (info ? setInfo(null) : close())} presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: space.gutter - 4, paddingTop: 8, paddingRight: 16, gap: 12 }}>
          <IconButton variant="tonal" name="close" label="Close" onPress={close} />
          <T v="title">{single ? 'Pick an exercise' : 'Add exercises'}</T>
        </View>
        <TextField
          value={query}
          onChangeText={(t) => setQuery(t.slice(0, 40))}
          placeholder="Search exercises"
          autoCapitalize="words"
          accessibilityLabel="Search exercises"
          style={{ marginHorizontal: 16, marginVertical: 8 }}
          right={<Icon name="search" color={palette.textMuted} />}
        />
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
            <Chip label="All" selected={muscle == null} onPress={() => setMuscle(null)} />
            {MUSCLES.map((m) => <Chip key={m} label={MUSCLE_LABEL[m]} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />)}
          </ScrollView>
        </View>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 8 }}
          keyboardShouldPersistTaps="handled"
          data={results}
          keyExtractor={(x) => x.id}
          ListHeaderComponent={
            <>
              {canCreate && (
                <ExerciseRow title={`Create "${query.trim()}"`} subtitle="Custom exercise" selected={false} create
                  onPress={() => { if (single) { toggle(ExerciseLibrary.custom(query)); return; } setPicked([...picked, ExerciseLibrary.custom(query)]); setQuery(''); }} />
              )}
              {customs.map((x) => <ExerciseRow key={x.id} exerciseId={x.id} single={single} title={x.name} subtitle="Custom exercise" selected onPress={() => toggle(x)} onInfo={() => setInfo(x)} />)}
            </>
          }
          ListFooterComponent={
            muscle != null && query.trim() === '' ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
                {ExerciseLibrary.alsoFor(muscle).map((line) => <HelpNote key={line} text={line} />)}
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <ExerciseRow exerciseId={item.id} single={single} topPick={muscle != null && ExerciseLibrary.rankOf(item.id) != null} title={item.name} subtitle={`${MUSCLE_LABEL[item.muscle]} · ${EQUIPMENT_LABEL[item.equipment]}`}
              selected={has(item)} onPress={() => toggle(item)} onInfo={() => setInfo(item)} />
          )}
        />
        {!single && <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <PrimaryButton
            label={picked.length === 0 ? 'Pick exercises' : `Add ${picked.length} exercise${picked.length === 1 ? '' : 's'}`}
            enabled={picked.length > 0}
            onPress={() => { onPick(picked); setPicked([]); setQuery(''); setMuscle(null); }}
          />
        </View>}
        {info && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
            <ExerciseInfoPanel exerciseId={info.id} name={info.name} onClose={() => setInfo(null)}
              action={{
                label: single ? 'Pick this exercise' : has(info) ? 'Remove from selection' : 'Add to selection',
                onPress: () => { const x = info; setInfo(null); toggle(x); },
              }} />
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

export type AlternativeChoice = { exerciseId: string; name: string; mode: 'replace' | 'add' };

/**
 * "Instead of …": the generator's other options for the exercise's slot, each with Replace or
 * + Add, then every library exercise for the same muscle. The picker opens in place of the sheet
 * (stacked modals misbehave), and its pick comes back here to choose Replace or Add.
 */
export function AlternativesSheet({ visible, onDismiss, current, level, onChoose }: {
  visible: boolean; onDismiss: () => void;
  current: { exerciseId: string; name: string; slot?: Slot };
  level: EngineLevel;
  onChoose: (choice: AlternativeChoice) => void;
}) {
  const [picking, setPicking] = useState(false);
  const [libraryPick, setLibraryPick] = useState<Exercise | null>(null);
  const [info, setInfo] = useState<{ id: string; name: string } | null>(null);
  const muscle = ExerciseLibrary.muscleOf(current.exerciseId);
  const options = current.slot ? slotAlternatives(current.slot, level, current.exerciseId) : [];
  const close = () => { setPicking(false); setLibraryPick(null); setInfo(null); onDismiss(); };
  const choose = (choice: AlternativeChoice) => { haptics.tick(); setLibraryPick(null); onChoose(choice); };

  const option = (id: string, name: string, subtitle: string) => (
    <View key={id} style={{ paddingHorizontal: 20, paddingVertical: 10, gap: 8 }}>
      <Pressable onPress={() => { haptics.tick(); setInfo({ id, name }); }} accessibilityRole="button" accessibilityHint="Shows photos and instructions"
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.md, opacity: pressed ? 0.7 : 1 })}>
        <ExerciseThumb exerciseId={id} />
        <View style={{ flex: 1 }}>
          <T v="body">{name}</T>
          <T v="bodyS" color={palette.textMuted}>{subtitle}</T>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button kind="tonal" label="Replace" icon="swap-horiz" onPress={() => choose({ exerciseId: id, name, mode: 'replace' })} compact />
        <Button kind="outline" label="Add" icon="add" onPress={() => choose({ exerciseId: id, name, mode: 'add' })} compact />
      </View>
    </View>
  );

  return (
    <>
      <BottomSheet visible={visible && !picking && !info} onDismiss={close}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <T v="title">Instead of {current.name}</T>
          {options.length > 0 && <T v="bodyS" color={palette.textMuted}>Same movement, works the same muscles</T>}
        </View>
        {libraryPick && option(libraryPick.id, libraryPick.name, `From the library · ${EQUIPMENT_LABEL[libraryPick.equipment]}`)}
        {!libraryPick && options.map((id) => {
          const ex = ExerciseLibrary.find(id);
          return option(id, ex?.name ?? id, ex ? EQUIPMENT_LABEL[ex.equipment] : '');
        })}
        <Button kind="text" label={`More exercises for ${MUSCLE_LABEL[muscle].toLowerCase()}`} icon="search"
          onPress={() => setPicking(true)} style={{ marginHorizontal: 8, marginTop: 4 }} />
      </BottomSheet>
      <ExercisePicker
        visible={visible && picking}
        single
        muscle={muscle === 'OTHER' ? undefined : muscle}
        onDismiss={() => setPicking(false)}
        onPick={([x]) => { setPicking(false); if (x) setLibraryPick(x); }}
      />
      <Modal visible={visible && info != null} animationType="slide" onRequestClose={() => setInfo(null)} presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.ink }}>
          {info && <ExerciseInfoPanel exerciseId={info.id} name={info.name} onClose={() => setInfo(null)} />}
        </SafeAreaView>
      </Modal>
    </>
  );
}

/** The sets notice: an ember note with one line per notice. Informs, never blocks. */
export function VolumeNoticeNote({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return <Notice kind="ember" icon="tune" lines={lines} />;
}

/**
 * A picker row. With `onInfo`, the photo and the text open the exercise's photos and instructions
 * and the round box on the right selects it; without it (the "Create" row), the whole row selects.
 */
function ExerciseRow({ exerciseId, title, subtitle, selected, onPress, onInfo, create, single, topPick }: {
  topPick?: boolean; exerciseId?: string; title: string; subtitle: string; selected: boolean; onPress: () => void; onInfo?: () => void; create?: boolean; single?: boolean;
}) {
  const text = (
    <View style={{ flex: 1 }}>
      <T v="titleS" color={selected ? palette.onPrimaryContainer : palette.text}>{title}</T>
      <T v="bodyS" color={palette.textMuted}>{subtitle}</T>
      {topPick && <T v="label" color={palette.primary}>Top pick</T>}
    </View>
  );
  if (!onInfo) {
    return (
      <View>
        <Pressable onPress={() => { haptics.tick(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected }}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', marginHorizontal: 8, paddingHorizontal: 14, paddingVertical: 12, gap: 14, borderRadius: radius.md,
            backgroundColor: selected ? palette.primaryContainer : pressed ? palette.surface : 'transparent' })}>
          {create && <Icon name="add" color={palette.primary} />}
          {text}
          {selected && <Icon name="check-circle" color={palette.primary} label="Selected" />}
        </Pressable>
        {!selected && <Hairline inset={22} style={{ marginRight: 22 }} />}
      </View>
    );
  }
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', marginHorizontal: 8, borderRadius: radius.md, minHeight: 76,
        backgroundColor: selected ? palette.primaryContainer : 'transparent' }}>
        <Pressable onPress={() => { haptics.tick(); onInfo(); }} accessibilityRole="button" accessibilityLabel={title} accessibilityHint="Shows photos and instructions"
          style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 10, paddingVertical: 10, borderRadius: radius.md,
            backgroundColor: pressed && !selected ? palette.surface : 'transparent' })}>
          <ExerciseThumb exerciseId={exerciseId ?? ''} />
          {text}
        </Pressable>
        <Pressable onPress={() => { haptics.tick(); onPress(); }} accessibilityRole={single ? 'button' : 'checkbox'}
          accessibilityState={single ? undefined : { checked: selected }} accessibilityLabel={single ? `Pick ${title}` : `Select ${title}`}
          style={{ width: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={selected ? 'check-circle' : single ? 'add-circle-outline' : 'radio-button-unchecked'} size={28}
            color={selected ? palette.primary : palette.textMuted} />
        </Pressable>
      </View>
      {!selected && <Hairline inset={22} style={{ marginRight: 22 }} />}
    </View>
  );
}

/** "−  3  +" for a small whole number. */
export function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <T color={palette.textMuted} style={{ marginRight: 4 }}>{label}</T>
      <IconButton variant="tonal" name="remove" label={`Fewer ${label}`} disabled={value <= min} onPress={() => onChange(Math.max(value - 1, min))} />
      <T v="displayS" center style={{ width: 36, fontSize: 22, lineHeight: 26 }}>{value}</T>
      <IconButton variant="tonal" name="add" label={`More ${label}`} disabled={value >= max} onPress={() => onChange(Math.min(value + 1, max))} />
    </View>
  );
}

/** Mount it only while open, so it starts from `initial` each time. */
export function NameDialog({ visible, title, initial, confirm, onDismiss, onConfirm }: {
  visible: boolean; title: string; initial: string; confirm: string; onDismiss: () => void; onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      dismiss={{ label: 'Cancel', onPress: onDismiss }}
      confirm={{ label: confirm, enabled: name.trim() !== '', onPress: () => onConfirm(name) }}
    >
      <TextField value={name} onChangeText={(t) => setName(t.slice(0, 40))} placeholder="Push / Pull / Legs" autoCapitalize="sentences" autoFocus accessibilityLabel="Name" />
    </Dialog>
  );
}

