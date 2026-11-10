/** Create, rename, delete and pick the active program. */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { activeProgramOf, TrainRepository, trainLive } from '../../../data/trainRepo';
import { Program } from '../../../data/training';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { palette, Gutter } from '../../theme';
import { IconButton, ListGroup, ListRow, PageHeader, PrimaryButton, Screen, T } from '../../components/core';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
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
        <ListGroup>
          {state.programs.map((p) => {
            const on = p.id === activeId;
            return (
              <ListRow key={p.id} title={p.name} label={`${p.name}${on ? ', selected' : ''}`}
                subtitle={p.routines.length === 0 ? 'No routines' : p.routines.map((r) => r.name).join(' · ')}
                onPress={() => TrainRepository.selectProgram(p.id)}
                leading={(
                  <ExpressiveShape shape={on ? 'cookie9' : 'circle'} size={28} fill={on ? palette.primary : 'none'} stroke={on ? undefined : palette.textMuted} strokeWidth={on ? 0 : 2} token="bouncy">
                    {on && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.onPrimary }} />}
                  </ExpressiveShape>
                )}
                trailing={<IconButton name="more-vert" label="More" color={palette.textMuted} onPress={() => setMenuFor(p)} />} />
            );
          })}
        </ListGroup>
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
