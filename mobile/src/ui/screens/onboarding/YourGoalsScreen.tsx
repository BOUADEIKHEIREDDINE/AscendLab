import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  chosenDays, GOAL, Goal, GOALS, LEVEL, LEVELS, MAX_DAYS, MIN_DAYS, PLACE, PLACES, PlanCalculator, TrainingPlace, UserProfile, withDays,
} from '../../../data/profile';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { draftStore, Onboarding } from '../../../state/session';
import { c } from '../../theme';
import { haptics } from '../../haptics';
import { Appear, HelpNote, IconName, SectionLabel, T } from '../../components/core';
import { ChoiceCard, OnboardingScaffold } from '../../components/onboarding';

/** Everything this form needs before a plan can be built. */
export const goalsComplete = (p: UserProfile) =>
  p.goal != null && p.level != null && chosenDays(p) != null && p.place != null;

export function YourGoalsScreen() {
  const nav = useNav();
  const draft = useStore(draftStore);
  const [showErrors, setShowErrors] = useState(false);

  return (
    <OnboardingScaffold
      step={3}
      title="Your goals"
      subtitle="A few quick choices and your plan is ready."
      primaryLabel="Build my plan"
      onBack={() => nav.goBack()}
      onPrimary={() => {
        setShowErrors(true);
        if (goalsComplete(draft)) {
          Onboarding.saveProgress();
          nav.navigate('PlanReady');
        }
      }}
    >
      <GoalsForm value={draft} onChange={(p) => Onboarding.update(() => p)} showErrors={showErrors} />
    </OnboardingScaffold>
  );
}

const GOAL_ICON: Record<Goal, IconName> = {
  LOSE_FAT: 'local-fire-department', BUILD_MUSCLE: 'fitness-center', GAIN_WEIGHT: 'trending-up',
  RECOMPOSITION: 'autorenew', MAINTAIN: 'sports-gymnastics',
};
const PLACE_ICON: Record<TrainingPlace, IconName> = { GYM: 'fitness-center', HOME: 'home' };

/** Goal, level, training days and gym or home. Shared by onboarding and Settings > Edit goals. */
export function GoalsForm({ value, onChange, showErrors, firstIndex = 1 }: {
  value: UserProfile; onChange: (p: UserProfile) => void; showErrors: boolean; firstIndex?: number;
}) {
  const tapped = value.trainingDays ?? [];
  const days = chosenDays(value);
  let i = firstIndex;
  return (
    <View style={{ gap: 12 }}>
      <Appear index={i++}><SectionLabel text="What's your main goal?" /></Appear>
      {GOALS.map((g) => (
        <Appear key={g} index={i++}>
          <ChoiceCard selected={value.goal === g} onPress={() => onChange({ ...value, goal: g })} title={GOAL[g].label}
            description={GOAL[g].description} icon={GOAL_ICON[g]} />
        </Appear>
      ))}
      {showErrors && value.goal == null && <T color={c.error}>Pick the goal that matters most to you right now.</T>}

      <Appear index={i++}><SectionLabel text="How much have you trained?" /></Appear>
      {LEVELS.map((l) => (
        <Appear key={l} index={i++}>
          <ChoiceCard selected={value.level === l} onPress={() => onChange({ ...value, level: l })} title={LEVEL[l].label}
            description={LEVEL[l].description} />
        </Appear>
      ))}
      {showErrors && value.level == null && <T color={c.error}>Pick your level. Not sure? Choose beginner.</T>}

      <Appear index={i++}><SectionLabel text="Which days can you train?" /></Appear>
      <Appear index={i++}>
        <WeekdayPicker selected={tapped} onToggle={(d) => {
          const next = tapped.includes(d) ? tapped.filter((x) => x !== d) : [...tapped, d];
          onChange(withDays(value, next, value.trainCount));
        }} />
      </Appear>
      {tapped.length >= 3 && (
        <Appear index={i++}>
          <CountPicker tapped={tapped.length} count={value.trainCount} onSelect={(n) => onChange(withDays(value, tapped, n))} />
        </Appear>
      )}
      {/* The advice slides in each time the number changes, explaining what that choice means. */}
      <Appear key={days?.length ?? 'none'}>
        <HelpNote text={days != null ? PlanCalculator.daysAdvice(days.length)
          : 'Tap every day you could train. Be realistic: a plan you can keep beats a perfect plan you skip.'} />
      </Appear>
      {showErrors && days == null && <T color={c.error}>Tap at least 2 days.</T>}

      <Appear index={i++}><SectionLabel text="Where will you train?" /></Appear>
      <Appear index={i++}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {PLACES.map((p) => (
            <ChoiceCard key={p} selected={value.place === p} onPress={() => onChange({ ...value, place: p })} title={PLACE[p].label}
              description={PLACE[p].description} icon={PLACE_ICON[p]} tall style={{ flex: 1 }} />
          ))}
        </View>
      </Appear>
      {showErrors && value.place == null && <T color={c.error}>Pick where you'll train.</T>}
      <Appear index={i++}>
        <HelpNote text="Not sure? Choose what's easiest for you today. You can change all of this later in Settings." />
      </Appear>
    </View>
  );
}

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Seven round day buttons, Monday first. Tapped days fill with mint. */
function WeekdayPicker({ selected, onToggle }: { selected: number[]; onToggle: (day: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {LETTERS.map((letter, d) => {
        const on = selected.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => { haptics.tick(); onToggle(d); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={NAMES[d]}
            style={{
              flex: 1, aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? c.primary : c.surfaceContainer, borderWidth: on ? 0 : 1, borderColor: c.outlineVariant,
              transform: [{ scale: on ? 1.08 : 1 }],
            }}
          >
            <T v="titleMedium" color={on ? c.onPrimary : c.onSurface}>{letter}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** "Train on all of them" or "only N", when 3+ days are tapped. 7 tapped days still keep one rest day. */
function CountPicker({ tapped, count, onSelect }: { tapped: number; count: number | null; onSelect: (n: number | null) => void }) {
  const all = Math.min(tapped, MAX_DAYS);
  const numbers = Array.from({ length: all - MIN_DAYS }, (_, k) => MIN_DAYS + k);
  const options: { label: string; value: number | null }[] = [
    { label: `All (${all})`, value: null },
    ...numbers.map((n) => ({ label: `Only ${n}`, value: n })),
  ];
  return (
    <View style={{ gap: 8 }}>
      <T v="bodySmall" color={c.onSurfaceVariant}>Train on all of them, or only some? We pick the best-spaced days.</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = count === o.value;
          return (
            <Pressable
              key={o.label}
              onPress={() => { haptics.tick(); onSelect(o.value); }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={{
                borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
                backgroundColor: on ? c.primary : c.surfaceContainer, borderWidth: on ? 0 : 1, borderColor: c.outlineVariant,
              }}
            >
              <T v="labelLarge" color={on ? c.onPrimary : c.onSurface}>{o.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
