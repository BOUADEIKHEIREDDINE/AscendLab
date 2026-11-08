import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { hasEverythingForPlan, PlanCalculator } from '../../../data/profile';
import { useStore } from '../../../lib/store';
import { finishOnboarding, useNav } from '../../../navigation/types';
import { draftStore, Onboarding } from '../../../state/session';
import { c, colors } from '../../theme';
import { Appear, Icon, Screen, T } from '../../components/core';
import { OnboardingScaffold } from '../../components/onboarding';
import { CalorieCard, MacroCard, WeekCard } from '../../components/plan';

const BUILD_STEPS = [
  'Working out your daily energy needs',
  'Setting your calorie and macro targets',
  'Choosing the right training split',
  'Spreading your sessions across the week',
];

// The short build sequence plays once per app session; coming back shows the result directly.
let builtOnce = false;

export function PlanReadyScreen() {
  const nav = useNav();
  const draft = useStore(draftStore);
  const [built, setBuilt] = useState(builtOnce);
  const ready = hasEverythingForPlan(draft);

  useEffect(() => {
    // Can only happen if the page is opened out of order; send the person back to fill the gaps.
    if (!ready) nav.goBack();
  }, [ready, nav]);
  if (!ready) return null;

  return built ? <PlanResult /> : <BuildingPlan onDone={() => { builtOnce = true; setBuilt(true); }} />;
}

/** A short "we're building your plan" moment: each step ticks off in turn. */
function BuildingPlan({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(0);
  const finish = useRef(onDone);
  useEffect(() => { finish.current = onDone; });
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BUILD_STEPS.forEach((_, i) => timers.push(setTimeout(() => setDone(i + 1), 300 + 650 * (i + 1))));
    timers.push(setTimeout(() => finish.current(), 300 + 650 * BUILD_STEPS.length + 450));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Screen edges={['top', 'bottom']} style={{ paddingHorizontal: 32, justifyContent: 'center' }}>
      <T v="headlineMedium">Building your plan</T>
      <View style={{ height: 28 }} />
      {BUILD_STEPS.map((label, i) => (
        <Appear key={label} index={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 16 }}>
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              {i < done ? (
                <Appear>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={18} color={c.onPrimary} />
                  </View>
                </Appear>
              ) : i === done ? <ActivityIndicator color={c.primary} />
                : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.outlineVariant }} />}
            </View>
            <T v="bodyLarge" color={i <= done ? c.onSurface : c.onSurfaceVariant} style={{ flex: 1 }}>{label}</T>
          </View>
        </Appear>
      ))}
    </Screen>
  );
}

function PlanResult() {
  const nav = useNav();
  const draft = useStore(draftStore);
  const targets = useMemo(() => PlanCalculator.nutrition(draft), [draft]);
  const week = useMemo(() => PlanCalculator.training(draft), [draft]);
  const [saving, setSaving] = useState(false);

  return (
    <OnboardingScaffold
      step={null}
      title="Your plan is ready"
      subtitle="Here's what we built for you. Start whenever you're ready: small steps, every week."
      primaryLabel="Let's start"
      loading={saving}
      onBack={() => nav.goBack()}
      onPrimary={async () => {
        setSaving(true);
        await Onboarding.finish();
        finishOnboarding(nav);
      }}
    >
      {/* Apricot is the brand's milestone accent: used here to celebrate the finished setup. */}
      <Appear index={1}>
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: colors.apricot, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}>
          <Icon name="emoji-events" size={18} color={colors.midnightBlue} />
          <T v="labelLarge" color={colors.midnightBlue}>Setup complete</T>
        </View>
      </Appear>
      <Appear index={2}><CalorieCard targets={targets} goal={draft.goal!} /></Appear>
      <Appear index={3}><MacroCard targets={targets} /></Appear>
      <Appear index={4}><WeekCard week={week} /></Appear>
    </OnboardingScaffold>
  );
}
