import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, ScrollView, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { PublicProfile } from '../../../data/social';
import { meStore, SocialRepository } from '../../../data/socialRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { palette, Gutter } from '../../theme';
import { haptics } from '../../haptics';
import { Avatar, Button, EmptyState, IconButton, ListGroup, ListRow, PageHeader, PrimaryButton, Screen, T, TextField, Tile, TileHeader } from '../../components/core';
import { ShapeLoader } from '../../shapes/ShapeLoader';
import { Dialog, toast } from '../../components/overlays';

export function FriendsScreen() {
  const nav = useNav();
  const me = useStore(meStore);
  const [friends, setFriends] = useState<PublicProfile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [removing, setRemoving] = useState<PublicProfile | null>(null);

  const reload = useCallback(() => SocialRepository.friendProfiles().then(
    (list) => { setFriends(list); setLoadError(null); },
    () => { setLoadError("Couldn't load your friends. Check your connection."); setFriends((f) => f ?? []); },
  ), []);

  useEffect(() => {
    SocialRepository.ensureMe().then((p) => setName(p?.name ?? ''), () => undefined);
    SocialRepository.friendProfiles().then(
      (list) => { setFriends(list); setLoadError(null); },
      () => { setLoadError("Couldn't load your friends. Check your connection."); setFriends((f) => f ?? []); },
    );
  }, []);

  async function addFriend() {
    setAdding(true);
    Keyboard.dismiss();
    const failure = await SocialRepository.addFriend(code);
    setAddMessage(failure == null ? { ok: true, text: 'Friend added.' } : { ok: false, text: failure });
    if (failure == null) { haptics.confirm(); setCode(''); reload(); } else haptics.reject();
    setAdding(false);
  }

  const changed = me != null && name.trim() !== '' && name.trim() !== me.name;

  return (
    <Screen keyboard>
      <PageHeader title="Friends" onBack={() => goBack(nav)} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: Gutter, paddingTop: 8, paddingBottom: 32, gap: 10 }}>
        <Tile span="2x1" style={{ gap: 12 }}>
          <TileHeader icon="qr-code-2" text="Your friend code" />
          {me == null ? <View style={{ alignItems: 'center' }}><ShapeLoader /></View> : (
            <>
              <T v="mono" center color={palette.primary} style={{ fontSize: 36, lineHeight: 44, letterSpacing: 6 }}>
                {me.code.slice(0, 3)} {me.code.slice(3)}
              </T>
              <T color={palette.textMuted}>Friends type this code to add you. You'll then see each other's meals.</T>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button kind="tonal" label="Copy" icon="content-copy" style={{ flex: 1 }}
                  onPress={async () => { await Clipboard.setStringAsync(me.code); toast('Code copied'); }} />
                <Button label="Share" icon="share" kind="tonal" style={{ flex: 1 }}
                  onPress={() => Share.share({ message: `Race me on AscendLab: add me with my friend code ${me.code}` }).catch(() => undefined)} />
              </View>
            </>
          )}
        </Tile>

        <Tile span="2x1" style={{ gap: 12 }}>
          <TileHeader icon="person-add-alt" text="Add a friend" />
          <TextField
            label="Their code"
            placeholder="ABC123"
            value={code}
            onChangeText={(v) => { setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setAddMessage(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />
          {addMessage && <T color={addMessage.ok ? palette.primary : palette.error}>{addMessage.text}</T>}
          <PrimaryButton label="Add friend" enabled={code.length === 6} loading={adding} onPress={addFriend} />
        </Tile>

        <Tile span="2x1" style={{ gap: 12 }}>
          <TileHeader icon="badge" text="Your name in the feed" />
          <TextField value={name} onChangeText={(t) => setName(t.slice(0, 30))} autoCapitalize="words" returnKeyType="done" accessibilityLabel="Your name in the feed" />
          {changed && (
            <View style={{ alignItems: 'flex-end' }}>
              <Button kind="text" label="Save name" onPress={async () => {
                Keyboard.dismiss();
                try { await SocialRepository.rename(name); toast('Name saved. New posts use it.'); } catch { toast("Couldn't save. Check your connection.", 'error'); }
              }} />
            </View>
          )}
        </Tile>

        <T v="titleS" style={{ marginTop: 8 }}>Your friends{friends ? ` (${friends.length})` : ''}</T>
        {loadError && <T color={palette.error}>{loadError}</T>}
        {friends == null ? <View style={{ alignItems: 'center' }}><ShapeLoader /></View>
          : friends.length === 0 ? <EmptyState icon="groups" shape="clover" title="No friends yet" hint="Share your code or add theirs above." />
            : (
              <ListGroup style={{ marginHorizontal: 0 }}>
                {friends.map((f) => (
                  <ListRow key={f.uid} title={f.name} leading={<Avatar name={f.name} seed={f.uid} />}
                    trailing={<IconButton name="person-remove" label={`Remove ${f.name}`} color={palette.textMuted} onPress={() => setRemoving(f)} />} />
                ))}
              </ListGroup>
            )}
        <View style={{ height: 8 }} />
      </ScrollView>

      <Dialog
        visible={removing != null}
        onDismiss={() => setRemoving(null)}
        title={`Remove ${removing?.name ?? ''}?`}
        dismiss={{ label: 'Cancel', onPress: () => setRemoving(null) }}
        confirm={{
          label: 'Remove', danger: true, onPress: async () => {
            const f = removing;
            setRemoving(null);
            if (!f) return;
            try { await SocialRepository.removeFriend(f.uid); } catch { toast("Couldn't remove. Check your connection.", 'error'); }
            reload();
          },
        }}
      >
        <T>You'll stop seeing each other's new meals.</T>
      </Dialog>
    </Screen>
  );
}
