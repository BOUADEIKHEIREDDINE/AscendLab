/**
 * Change goal, training days or place. The new calorie target and week are previewed
 * live, and saving regenerates the plan from the updated answers.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { formatKcal, hasEverythingForPlan, PlanCalculator, UserProfile } from '../../../data/profile';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { c } from '../../theme';
import { Appear, Screen, T } from '../../components/core';
import { OnboardingScaffold } from '../../components/onboarding';
import { CalorieCard, WeekCard } from '../../components/plan';
import { GoalsForm } from '../onboarding/YourGoalsScreen';

export function EditGoalsScreen() {
  const saved = useStore(profileStore);
  useEffect(() => { if (!profileStore.get()) ProfileRepository.load(); }, []);
  if (!hasEverythingForPlan(saved)) {
    return <Screen style={{ alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.primary} /></Screen>;
  }
  return <EditGoalsContent original={saved} />;
}

function EditGoalsContent({ original }: { original: UserProfile }) {
  const nav = useNav();
  const [edited, setEdited] = useState(original);
  const [saving, setSaving] = useState(false);
  const changed = edited.goal !== original.goal || edited.daysPerWeek !== original.daysPerWeek || edited.place !== original.place;
  const before = useMemo(() => PlanCalculator.nutrition(original), [original]);
  const after = useMemo(() => PlanCalculator.nutrition(edited), [edited]);
  const week = useMemo(() => PlanCalculator.training(edited), [edited]);

  return (
    <OnboardingScaffold
      step={null}
      title="Edit goals"
      subtitle="Change what you're working towards. Your plan and calorie target update to match."
      primaryLabel={changed ? 'Save and update my plan' : 'No changes yet'}
      primaryEnabled={changed}
      loading={saving}
      onBack={() => goBack(nav)}
      onPrimary={async () => {
        setSaving(true);
        await ProfileRepository.save(edited);
        goBack(nav);
      }}
    >
      <GoalsForm
        goal={edited.goal}
        days={edited.daysPerWeek}
        place={edited.place}
        onGoal={(goal) => setEdited({ ...edited, goal })}
        onDays={(daysPerWeek) => setEdited({ ...edited, daysPerWeek })}
        onPlace={(place) => setEdited({ ...edited, place })}
        showErrors={false}
        firstIndex={0}
      />
      <Appear index={9}><CalorieCard targets={after} goal={edited.goal!} /></Appear>
      {after.calories !== before.calories && (
        <Appear><View><T color={c.onSurfaceVariant}>Before: {formatKcal(before.calories)} kcal a day</T></View></Appear>
      )}
      <Appear index={10}><WeekCard week={week} /></Appear>
    </OnboardingScaffold>
  );
}
