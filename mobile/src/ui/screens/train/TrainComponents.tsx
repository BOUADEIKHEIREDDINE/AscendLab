/** Pieces shared by the Train pages: exercise picker, stepper, set badge, name dialog. */
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Exercise, EQUIPMENT_LABEL, ExerciseLibrary, MUSCLE_LABEL, Muscle, MUSCLES, SetType } from '../../../data/training';
import { c, colors } from '../../theme';
import { haptics } from '../../haptics';
import { Chip, Hairline, Icon, IconButton, PrimaryButton, T, TextField } from '../../components/core';
import { Dialog } from '../../components/overlays';

/**
 * Full-screen exercise search: filter by muscle, tap several exercises, then add them
 * all at once. Typing a name that isn't listed offers a custom exercise.
 */
export function ExercisePicker({ visible, onDismiss, onPick }: { visible: boolean; onDismiss: () => void; onPick: (list: Exercise[]) => void }) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);
  const [picked, setPicked] = useState<Exercise[]>([]);
  const results = ExerciseLibrary.search(query, muscle);
  const canCreate = query.trim() !== '' && !ExerciseLibrary.search('', null).some((x) => x.name.toLowerCase() === query.trim().toLowerCase());
  const has = (x: Exercise) => picked.some((p) => p.id === x.id);
  const toggle = (x: Exercise) => setPicked(has(x) ? picked.filter((p) => p.id !== x.id) : [...picked, x]);
  const close = () => { setPicked([]); setQuery(''); setMuscle(null); onDismiss(); };
  const customs = picked.filter((p) => p.id.startsWith('custom:'));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} presentationStyle="fullScreen">
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingTop: 8, paddingRight: 16 }}>
          <IconButton name="close" label="Close" onPress={close} />
          <T v="headlineSmall">Add exercises</T>
        </View>
        <TextField
          value={query}
          onChangeText={(t) => setQuery(t.slice(0, 40))}
          placeholder="Search exercises"
          autoCapitalize="words"
          accessibilityLabel="Search exercises"
          style={{ marginHorizontal: 16, marginVertical: 8 }}
          right={<Icon name="search" color={c.onSurfaceVariant} />}
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
                  onPress={() => { setPicked([...picked, ExerciseLibrary.custom(query)]); setQuery(''); }} />
              )}
              {customs.map((x) => <ExerciseRow key={x.id} title={x.name} subtitle="Custom exercise" selected onPress={() => toggle(x)} />)}
            </>
          }
          renderItem={({ item }) => (
            <ExerciseRow title={item.name} subtitle={`${MUSCLE_LABEL[item.muscle]} · ${EQUIPMENT_LABEL[item.equipment]}`} selected={has(item)} onPress={() => toggle(item)} />
          )}
        />
        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 }}>
          <PrimaryButton
            label={picked.length === 0 ? 'Pick exercises' : `Add ${picked.length} exercise${picked.length === 1 ? '' : 's'}`}
            enabled={picked.length > 0}
            onPress={() => { onPick(picked); setPicked([]); setQuery(''); setMuscle(null); }}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ExerciseRow({ title, subtitle, selected, onPress, create }: { title: string; subtitle: string; selected: boolean; onPress: () => void; create?: boolean }) {
  return (
    <View>
      <Pressable onPress={() => { haptics.tick(); onPress(); }} accessibilityRole="button" accessibilityState={{ selected }}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14, backgroundColor: selected ? c.primaryContainer : c.background }}>
        {create && <Icon name="add" color={c.primary} />}
        <View style={{ flex: 1 }}>
          <T v="bodyLarge">{title}</T>
          <T v="bodySmall" color={c.onSurfaceVariant}>{subtitle}</T>
        </View>
        {selected && <Icon name="check-circle" color={c.primary} label="Selected" />}
      </Pressable>
      <Hairline inset={20} />
    </View>
  );
}

/** "−  3  +" for a small whole number. */
export function Stepper({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <T color={c.onSurfaceVariant}>{label}</T>
      <IconButton name="remove" label={`Fewer ${label}`} disabled={value <= min} onPress={() => { haptics.tick(); onChange(Math.max(value - 1, min)); }} />
      <T v="titleMedium" center style={{ width: 28 }}>{value}</T>
      <IconButton name="add" label={`More ${label}`} disabled={value >= max} onPress={() => { haptics.tick(); onChange(Math.min(value + 1, max)); }} />
    </View>
  );
}

/** "1", "2"… for normal sets, or a coloured W / F / D for the other set types. */
export function SetBadge({ type, normalIndex, width }: { type: SetType; normalIndex: number; width?: number }) {
  const [text, color] = type === 'NORMAL' ? [`${normalIndex}`, c.onSurface]
    : type === 'WARMUP' ? ['W', colors.apricot] : type === 'FAILURE' ? ['F', c.error] : ['D', c.primary];
  return <T v="titleSmall" color={color} style={[{ fontWeight: '600' }, width != null && { width }]}>{text}</T>;
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

