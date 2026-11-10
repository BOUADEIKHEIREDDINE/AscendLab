import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, ScrollView, Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { PublicProfile } from '../../../data/social';
import { meStore, SocialRepository } from '../../../data/socialRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { palette, Gutter } from '../../theme';
import { haptics } from '../../haptics';
import { Avatar, Button, Hairline, IconButton, PageHeader, PrimaryButton, Screen, T, TextField } from '../../components/core';
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
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 8, gap: 16 }}>
        <View style={{ gap: 12, paddingVertical: 8 }}>
          <T v="label" color={palette.lime}>Your friend code</T>
          {me == null ? <ActivityIndicator color={palette.lime} /> : (
            <>
              <T center style={{ fontFamily: 'monospace', fontSize: 36, lineHeight: 44, letterSpacing: 4 }}>
                {me.code.slice(0, 3)} {me.code.slice(3)}
              </T>
              <T color={palette.textMuted}>Friends type this code to add you. You'll then see each other's meals.</T>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Button label="Copy" icon="content-copy" style={{ flex: 1 }}
                  onPress={async () => { await Clipboard.setStringAsync(me.code); toast('Code copied'); }} />
                <Button label="Share" icon="share" kind="filled" style={{ flex: 1 }}
                  onPress={() => Share.share({ message: `Race me on AscendLab: add me with my friend code ${me.code}` }).catch(() => undefined)} />
              </View>
            </>
          )}
        </View>

        <Hairline />
        <View style={{ gap: 12, paddingVertical: 8 }}>
          <T v="label" color={palette.lime}>Add a friend</T>
          <TextField
            label="Their code"
            placeholder="ABC123"
            value={code}
            onChangeText={(v) => { setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setAddMessage(null); }}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />
          {addMessage && <T color={addMessage.ok ? palette.lime : palette.error}>{addMessage.text}</T>}
          <PrimaryButton label="Add friend" enabled={code.length === 6} loading={adding} onPress={addFriend} />
        </View>

        <Hairline />
        <View style={{ gap: 12, paddingVertical: 8 }}>
          <T v="label" color={palette.lime}>Your name in the feed</T>
          <TextField value={name} onChangeText={(t) => setName(t.slice(0, 30))} autoCapitalize="words" returnKeyType="done" accessibilityLabel="Your name in the feed" />
          {changed && (
            <View style={{ alignItems: 'flex-end' }}>
              <Button kind="text" label="Save name" onPress={async () => {
                Keyboard.dismiss();
                try { await SocialRepository.rename(name); toast('Name saved. New posts use it.'); } catch { toast("Couldn't save. Check your connection.", 'error'); }
              }} />
            </View>
          )}
        </View>

        <Hairline />
        <T v="label" color={palette.lime}>Your friends{friends ? ` (${friends.length})` : ''}</T>
        {loadError && <T color={palette.error}>{loadError}</T>}
        {friends == null ? <ActivityIndicator color={palette.lime} />
          : friends.length === 0 ? <T color={palette.textMuted}>No friends yet. Share your code or add theirs above.</T>
            : friends.map((f) => (
              <View key={f.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={f.name} seed={f.uid} />
                <T v="body" style={{ flex: 1 }}>{f.name}</T>
                <IconButton name="person-remove" label={`Remove ${f.name}`} color={palette.textMuted} onPress={() => setRemoving(f)} />
              </View>
            ))}
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
