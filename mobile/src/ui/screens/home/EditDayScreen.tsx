/** Set the times of "My day" and which days are training days. */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { clock, DaySettings, settingsFromProfile, TIME_SLOTS } from '../../../data/dayPlan';
import { chosenDays } from '../../../data/profile';
import { daySettingsStore, DaySettingsRepository } from '../../../data/dayPlanRepo';
import { profileStore } from '../../../data/profileRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { Gutter, palette, space, tone } from '../../theme';
import { haptics } from '../../haptics';
import { IconButton, ListGroup, PageHeader, PressableScale, PrimaryButton, Screen, SectionTitle, T } from '../../components/core';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { workoutShape } from '../../shapes/library';

const STEP = 15;
// Shown Monday first; values follow Date.getDay() (0 = Sunday).
const WEEK = [{ d: 1, l: 'Mon' }, { d: 2, l: 'Tue' }, { d: 3, l: 'Wed' }, { d: 4, l: 'Thu' }, { d: 5, l: 'Fri' }, { d: 6, l: 'Sat' }, { d: 0, l: 'Sun' }];

export function EditDayScreen() {
  const nav = useNav();
  const profile = useStore(profileStore);
  const saved = useStore(daySettingsStore);
  const [draft, setDraft] = useState<DaySettings>(() => saved ?? settingsFromProfile(profile ? chosenDays(profile) : null, profile?.daysPerWeek ?? null));

  const shift = (key: keyof DaySettings['times'], by: number) => {
    haptics.tick();
    setDraft((d) => ({ ...d, times: { ...d.times, [key]: (d.times[key] + by + 1440) % 1440 } }));
  };
  const toggleDay = (day: number) => {
    haptics.tick();
    setDraft((d) => ({ ...d, trainingDays: d.trainingDays.includes(day) ? d.trainingDays.filter((x) => x !== day) : [...d.trainingDays, day].sort() }));
  };

  async function save() {
    await DaySettingsRepository.save(draft);
    haptics.confirm();
    goBack(nav);
  }

  return (
    <Screen>
      <PageHeader title="My day" onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <T color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>
          Set the times that suit your routine. Your home screen lines up meals, training and sleep around them.
        </T>

        <SectionTitle text="Times" />
        <ListGroup>
          {TIME_SLOTS.map((s) => (
            <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: space.tilePad, paddingRight: 10, paddingVertical: 8, gap: 6 }}>
              <T v="titleS" style={{ flex: 1 }}>{s.label}</T>
              <IconButton variant="tonal" name="remove" label={`${s.label} 15 minutes earlier`} onPress={() => shift(s.key, -STEP)} />
              <T v="displayS" style={{ width: 84, textAlign: 'center', fontSize: 24 }}>{clock(draft.times[s.key])}</T>
              <IconButton variant="tonal" name="add" label={`${s.label} 15 minutes later`} onPress={() => shift(s.key, STEP)} />
            </View>
          ))}
        </ListGroup>

        <SectionTitle text="Training days" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Gutter }}>
          {WEEK.map(({ d, l }) => {
            const on = draft.trainingDays.includes(d);
            return (
              <PressableScale key={d} onPress={() => toggleDay(d)} noHaptic role="button" selected={on} label={`${l}, ${on ? 'training day' : 'rest day'}`}>
                {/* Training days take the ascent shape; rest days stay a plain circle. */}
                <ExpressiveShape shape={on ? workoutShape : 'circle'} size={44} token="fast"
                  fill={on ? tone(palette.primary, 0.22, palette.ink) : palette.surfaceHigh}>
                  <T v="label" color={on ? palette.primary : palette.textMuted}>{l}</T>
                </ExpressiveShape>
              </PressableScale>
            );
          })}
        </View>
        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingTop: 12 }}>
          {draft.trainingDays.length === 0 ? 'No training days: every day is a rest day.'
            : `${draft.trainingDays.length} training ${draft.trainingDays.length === 1 ? 'day' : 'days'} a week. Your plan suggests ${profile?.daysPerWeek ?? 3}.`}
        </T>
      </ScrollView>
      <View style={{ paddingHorizontal: Gutter, paddingVertical: 12 }}>
        <PrimaryButton label="Save my day" onPress={save} />
      </View>
    </Screen>
  );
}
