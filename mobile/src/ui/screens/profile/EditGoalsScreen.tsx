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
import { palette } from '../../theme';
import { Appear, Screen, T } from '../../components/core';
import { OnboardingScaffold } from '../../components/onboarding';
import { CalorieCard, WeekCard } from '../../components/plan';
import { GoalsForm, goalsComplete } from '../onboarding/YourGoalsScreen';

export function EditGoalsScreen() {
  const saved = useStore(profileStore);
  useEffect(() => { if (!profileStore.get()) ProfileRepository.load(); }, []);
  if (!hasEverythingForPlan(saved)) {
    return <Screen style={{ alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={palette.lime} /></Screen>;
  }
  return <EditGoalsContent original={saved} />;
}

function EditGoalsContent({ original }: { original: UserProfile }) {
  const nav = useNav();
  const [edited, setEdited] = useState(original);
  const [saving, setSaving] = useState(false);
  const fields = (p: UserProfile) => JSON.stringify([p.goal, p.level, p.trainingDays, p.trainCount, p.place]);
  const changed = fields(edited) !== fields(original) && goalsComplete(edited);
  const before = useMemo(() => PlanCalculator.nutrition(original), [original]);
  // While the form is incomplete (e.g. fewer than 2 days tapped) there is nothing to preview.
  const after = useMemo(() => (goalsComplete(edited) ? PlanCalculator.nutrition(edited) : null), [edited]);
  const week = useMemo(() => (goalsComplete(edited) ? PlanCalculator.training(edited) : null), [edited]);

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
      <GoalsForm value={edited} onChange={setEdited} showErrors firstIndex={0} />
      {after && week && (
        <>
          <Appear index={18}><CalorieCard targets={after} goal={edited.goal!} /></Appear>
          {after.calories !== before.calories && (
            <Appear><View><T color={palette.textMuted}>Before: {formatKcal(before.calories)} kcal a day</T></View></Appear>
          )}
          <Appear index={19}><WeekCard week={week} /></Appear>
        </>
      )}
    </OnboardingScaffold>
  );
}
