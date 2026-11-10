/** Create, rename, delete and pick the active program. */
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { activeProgramOf, TrainRepository, trainLive } from '../../../data/trainRepo';
import { Program } from '../../../data/training';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { palette, Gutter } from '../../theme';
import { haptics } from '../../haptics';
import { Hairline, IconButton, PageHeader, PrimaryButton, Screen, T } from '../../components/core';
import { ActionMenu, Dialog } from '../../components/overlays';
import { NameDialog } from './TrainComponents';

export function ProgramsScreen() {
  const nav = useNav();
  const state = useStore(trainLive);
  const activeId = activeProgramOf(state)?.id;
  const [naming, setNaming] = useState<Program | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Program | null>(null);
  const [menuFor, setMenuFor] = useState<Program | null>(null);

  return (
    <Screen>
      <PageHeader title="Programs" onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 14 }}>
        <T color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>
          A program groups the routines you rotate through. The selected one shows on the Train tab.
        </T>
        <View>
          {state.programs.map((p, i) => {
            const on = p.id === activeId;
            return (
              <View key={p.id}>
                {i > 0 && <Hairline inset={64} />}
                <Pressable
                  onPress={() => { haptics.tick(); TrainRepository.selectProgram(p.id); }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, paddingVertical: 6, gap: 16 }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? palette.lime : palette.textMuted, alignItems: 'center', justifyContent: 'center' }}>
                    {on && <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: palette.lime }} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <T v="body">{p.name}</T>
                    <T v="bodyS" color={palette.textMuted} lines={1}>
                      {p.routines.length === 0 ? 'No routines' : p.routines.map((r) => r.name).join(' · ')}
                    </T>
                  </View>
                  <IconButton name="more-vert" label="More" onPress={() => setMenuFor(p)} />
                </Pressable>
              </View>
            );
          })}
        </View>
        <PrimaryButton label="New program" icon="add" onPress={() => setCreating(true)} style={{ marginHorizontal: Gutter }} />
      </ScrollView>

      <ActionMenu visible={menuFor != null} onDismiss={() => setMenuFor(null)} items={[
        { label: 'Rename', icon: 'edit', onPress: () => setNaming(menuFor) },
        { label: 'Delete', icon: 'delete-outline', danger: true, onPress: () => setDeleting(menuFor) },
      ]} />

      {(creating || naming != null) && <NameDialog
        visible
        title={creating ? 'New program' : 'Rename program'}
        initial={naming?.name ?? ''}
        confirm={creating ? 'Create' : 'Save'}
        onDismiss={() => { setCreating(false); setNaming(null); }}
        onConfirm={(name) => {
          if (naming) TrainRepository.renameProgram(naming.id, name); else TrainRepository.createProgram(name);
          setCreating(false);
          setNaming(null);
        }}
      />}

      <Dialog
        visible={deleting != null}
        onDismiss={() => setDeleting(null)}
        title={`Delete ${deleting?.name ?? ''}?`}
        dismiss={{ label: 'Cancel', onPress: () => setDeleting(null) }}
        confirm={{ label: 'Delete', danger: true, onPress: () => { if (deleting) TrainRepository.deleteProgram(deleting.id); setDeleting(null); } }}
      >
        <T>Its {deleting?.routines.length ?? 0} routines are deleted too. Your workout history stays.</T>
      </Dialog>
    </Screen>
  );
}
