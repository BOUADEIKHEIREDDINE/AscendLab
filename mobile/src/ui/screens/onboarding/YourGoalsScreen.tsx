import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { GOAL, Goal, GOALS, MAX_DAYS, MIN_DAYS, PLACE, PLACES, PlanCalculator, TrainingPlace } from '../../../data/profile';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { draftStore, Onboarding } from '../../../state/session';
import { c } from '../../theme';
import { haptics } from '../../haptics';
import { Appear, HelpNote, IconName, SectionLabel, T } from '../../components/core';
import { ChoiceCard, OnboardingScaffold } from '../../components/onboarding';

export function YourGoalsScreen() {
  const nav = useNav();
  const draft = useStore(draftStore);
  const [showErrors, setShowErrors] = useState(false);
  const complete = draft.goal != null && draft.daysPerWeek != null && draft.place != null;

  return (
    <OnboardingScaffold
      step={3}
      title="Your goals"
      subtitle="Three quick choices and your plan is ready."
      primaryLabel="Build my plan"
      onBack={() => nav.goBack()}
      onPrimary={() => {
        setShowErrors(true);
        if (complete) {
          Onboarding.saveProgress();
          nav.navigate('PlanReady');
        }
      }}
    >
      <GoalsForm
        goal={draft.goal}
        days={draft.daysPerWeek}
        place={draft.place}
        onGoal={(goal) => Onboarding.update((p) => ({ ...p, goal }))}
        onDays={(daysPerWeek) => Onboarding.update((p) => ({ ...p, daysPerWeek }))}
        onPlace={(place) => Onboarding.update((p) => ({ ...p, place }))}
        showErrors={showErrors}
      />
    </OnboardingScaffold>
  );
}

const GOAL_ICON: Record<Goal, IconName> = { LOSE_FAT: 'local-fire-department', BUILD_MUSCLE: 'fitness-center', GET_FIT: 'sports-gymnastics' };
const PLACE_ICON: Record<TrainingPlace, IconName> = { GYM: 'fitness-center', HOME: 'home' };

/** Goal, days per week and gym or home. Shared by onboarding and Settings > Edit goals. */
export function GoalsForm({ goal, days, place, onGoal, onDays, onPlace, showErrors, firstIndex = 1 }: {
  goal: Goal | null; days: number | null; place: TrainingPlace | null;
  onGoal: (g: Goal) => void; onDays: (d: number) => void; onPlace: (p: TrainingPlace) => void;
  showErrors: boolean; firstIndex?: number;
}) {
  return (
    <View style={{ gap: 12 }}>
      <Appear index={firstIndex}><SectionLabel text="What's your main goal?" /></Appear>
      {GOALS.map((g, i) => (
        <Appear key={g} index={firstIndex + 1 + i}>
          <ChoiceCard selected={goal === g} onPress={() => onGoal(g)} title={GOAL[g].label} description={GOAL[g].description} icon={GOAL_ICON[g]} />
        </Appear>
      ))}
      {showErrors && goal == null && <T color={c.error}>Pick the goal that matters most to you right now.</T>}

      <Appear index={firstIndex + 4}><SectionLabel text="How many days a week can you train?" /></Appear>
      <Appear index={firstIndex + 5}><DaysPicker selected={days} onSelect={onDays} /></Appear>
      {/* The advice slides in each time the number changes, explaining what that choice means. */}
      <Appear key={days ?? 'none'}>
        <HelpNote text={days != null ? PlanCalculator.daysAdvice(days)
          : 'Be realistic: a plan you can keep beats a perfect plan you skip. 3 days is a great start.'} />
      </Appear>
      {showErrors && days == null && <T color={c.error}>Pick how many days you can train.</T>}

      <Appear index={firstIndex + 6}><SectionLabel text="Where will you train?" /></Appear>
      <Appear index={firstIndex + 7}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {PLACES.map((p) => (
            <ChoiceCard key={p} selected={place === p} onPress={() => onPlace(p)} title={PLACE[p].label}
              description={PLACE[p].description} icon={PLACE_ICON[p]} tall style={{ flex: 1 }} />
          ))}
        </View>
      </Appear>
      {showErrors && place == null && <T color={c.error}>Pick where you'll train.</T>}
      <Appear index={firstIndex + 8}>
        <HelpNote text="Not sure? Choose what's easiest for you today. You can change all of this later in Settings." />
      </Appear>
    </View>
  );
}

/** A row of round number buttons, 2 to 6. The chosen one fills with mint. */
function DaysPicker({ selected, onSelect }: { selected: number | null; onSelect: (d: number) => void }) {
  const options = Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, i) => MIN_DAYS + i);
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {options.map((d) => {
        const on = selected === d;
        return (
          <Pressable
            key={d}
            onPress={() => { haptics.tick(); onSelect(d); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${d} days a week`}
            style={{
              flex: 1, aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? c.primary : c.surfaceContainer, borderWidth: on ? 0 : 1, borderColor: c.outlineVariant,
              transform: [{ scale: on ? 1.08 : 1 }],
            }}
          >
            <T v="titleLarge" color={on ? c.onPrimary : c.onSurface}>{d}</T>
          </Pressable>
        );
      })}
    </View>
  );
}
