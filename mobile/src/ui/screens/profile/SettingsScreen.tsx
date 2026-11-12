import React, { ReactNode, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AuthRepository } from '../../../data/authRepo';
import { Convert, formatKcal, GOAL, hasEverythingForPlan, PLACE, PlanCalculator, UserProfile, Units } from '../../../data/profile';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { signOut } from '../../../state/session';
import { palette, space } from '../../theme';
import { Appear, Icon, IconName, ListGroup, ListRow, PageHeader, Screen, Segmented, T, TextField } from '../../components/core';
import { Dialog } from '../../components/overlays';
import { ShapeGallery } from '../../shapes/ShapeGallery';

function goalSummary(p: UserProfile): string | null {
  if (!p.goal || !p.daysPerWeek || !p.place) return null;
  const place = PLACE[p.place].label;
  return `${GOAL[p.goal].label} · ${p.daysPerWeek} days a week · ${place.charAt(0).toLowerCase()}${place.slice(1)}`;
}

function targetsSummary(p: UserProfile | null): string {
  if (!hasEverythingForPlan(p)) return 'Calories and macros';
  const t = PlanCalculator.nutrition(p);
  return `${formatKcal(t.calories)} kcal · ${t.proteinG} g protein · ${t.custom ? 'set by you' : 'recommended'}`;
}

export function SettingsScreen() {
  const nav = useNav();
  const p = useStore(profileStore);
  const [showDelete, setShowDelete] = useState(false);
  const [gallery, setGallery] = useState(false);
  useEffect(() => { if (!profileStore.get()) ProfileRepository.load(); }, []);

  return (
    <Screen>
      <PageHeader title="Settings" onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 32, gap: 24 }}>
        <Appear index={0}>
          <Section title="Your plan">
            <SettingRow icon="flag" title="Edit goals" subtitle={(p && goalSummary(p)) ?? 'Goal, training days and place'} onPress={() => nav.navigate('EditGoals')} />
            <SettingRow icon="local-fire-department" title="Daily targets" subtitle={targetsSummary(p)} onPress={() => nav.navigate('EditTargets')} />
            {p?.heightCm != null && p.weightKg != null && p.age != null && (
                <SettingRow icon="person" title="Your body"
                  subtitle={`${p.age} years · ${Convert.formatHeight(p.heightCm, p.units)} · ${Convert.formatWeight(p.weightKg, p.units)}`} />
            )}
          </Section>
        </Appear>

        <Appear index={1}>
          <Section title="Units">
            <View style={{ padding: space.tilePad, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <Icon name="straighten" color={palette.textMuted} />
                <T v="body">Weight and height</T>
              </View>
              <Segmented<Units>
                options={[{ key: 'METRIC', label: 'kg · cm' }, { key: 'IMPERIAL', label: 'lb · ft / in' }]}
                selected={p?.units ?? 'METRIC'}
                disabled={p == null}
                onSelect={(u) => { if (p) ProfileRepository.save({ ...p, units: u }); }}
              />
            </View>
          </Section>
        </Appear>

        <Appear index={2}>
          <Section title="Coming soon">
            <SettingRow icon="notifications" title="Notifications" subtitle="Reminders for workouts and meals" enabled={false} />
            <SettingRow icon="language" title="Language" subtitle="English" enabled={false} />
          </Section>
        </Appear>

        <Appear index={3}>
          <Section title="Account">
            <SettingRow icon="logout" title="Log out" subtitle={AuthRepository.currentEmail ?? 'Signed in'} onPress={() => signOut(nav)} />
            <SettingRow icon="delete-forever" title="Delete account" subtitle="Permanently remove your account and data" danger onPress={() => setShowDelete(true)} />
          </Section>
        </Appear>

        {__DEV__ && (
          <Section title="Developer">
            <SettingRow icon="category" title="Shape gallery" subtitle="Every shape, morphs and loaders" onPress={() => setGallery(true)} />
          </Section>
        )}
      </ScrollView>

      {__DEV__ && <ShapeGallery visible={gallery} onDismiss={() => setGallery(false)} />}
      {showDelete && <DeleteAccountDialog onDismiss={() => setShowDelete(false)} onDeleted={() => signOut(nav)} />}
    </Screen>
  );
}

/**
 * Confirms before deleting. Firebase requires a fresh sign-in to delete an account,
 * so email accounts re-enter their password and Google accounts pick their account again.
 */
function DeleteAccountDialog({ onDismiss, onDeleted }: { onDismiss: () => void; onDeleted: () => void }) {
  const usesPassword = AuthRepository.usesPassword;
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    const result = await AuthRepository.deleteAccount(usesPassword ? password : null);
    setBusy(false);
    if (result.kind === 'success') onDeleted();
    else if (result.kind === 'error') setError(result.message);
  }

  return (
    <Dialog
      visible
      onDismiss={() => { if (!busy) onDismiss(); }}
      icon="delete-forever"
      title="Delete your account?"
      dismiss={{ label: 'Cancel', onPress: onDismiss, enabled: !busy }}
      confirm={{ label: 'Delete for good', danger: true, loading: busy, enabled: !usesPassword || password !== '', onPress: confirm }}
    >
      <T>This permanently deletes your account, your profile and your plan. It can't be undone.</T>
      {usesPassword ? (
        <TextField label="Your password" value={password} onChangeText={(t) => { setPassword(t); setError(null); }}
          secureTextEntry autoCapitalize="none" editable={!busy} textContentType="password" />
      ) : (
        <T color={palette.textMuted}>To confirm, you'll pick your Google account again.</T>
      )}
      {error && <T color={palette.error}>{error}</T>}
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <T v="overline" color={palette.textMuted} style={{ paddingLeft: space.gutter + 4 }}>{title}</T>
      <ListGroup>{children}</ListGroup>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, onPress, enabled = true, danger }: {
  icon: IconName; title: string; subtitle: string; onPress?: () => void; enabled?: boolean; danger?: boolean;
}) {
  return (
    <ListRow icon={icon} title={title} subtitle={subtitle} onPress={onPress} enabled={enabled} danger={danger}
      trailing={!enabled ? <T v="label" color={palette.textFaint}>Soon</T> : undefined} />
  );
}
