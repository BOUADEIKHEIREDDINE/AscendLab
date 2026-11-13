import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { hasEverythingForPlan, PlanCalculator, splitChoice } from '../../../data/profile';
import { useStore } from '../../../lib/store';
import { finishOnboarding, useNav } from '../../../navigation/types';
import { draftStore, Onboarding } from '../../../state/session';
import { palette } from '../../theme';
import { Appear, Button, Icon, Screen, T } from '../../components/core';
import { toast } from '../../components/overlays';
import { SplitSheet } from '../train/TrainComponents';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { ShapeLoader } from '../../shapes/ShapeLoader';
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
      <View style={{ alignItems: 'center', marginBottom: 28 }}><ShapeLoader size={96} label="Building your plan" /></View>
      <T v="headline" center>Building your plan</T>
      <View style={{ height: 24 }} />
      {BUILD_STEPS.map((label, i) => (
        <Appear key={label} index={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 16 }}>
            <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
              {i < done ? (
                <Appear>
                  <ExpressiveShape shape="cookie9" size={28} fill={palette.primary}>
                    <Icon name="check" size={18} color={palette.onPrimary} />
                  </ExpressiveShape>
                </Appear>
              ) : i === done ? <ShapeLoader size={22} />
                : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.hairline }} />}
            </View>
            <T v="body" color={i <= done ? palette.text : palette.textMuted} style={{ flex: 1 }}>{label}</T>
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
  const [splitMenu, setSplitMenu] = useState(false);
  // Another split only when the days allow more than one (5–6); none for home plans.
  const choice = useMemo(() => splitChoice(draft), [draft]);
  const canChangeSplit = choice != null && choice.options.length > 1;

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
        <View style={{ flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 8, backgroundColor: palette.goldContainer, borderRadius: 999, paddingLeft: 6, paddingRight: 14, paddingVertical: 6 }}>
          <ExpressiveShape shape="burst" size={26} fill={palette.gold}><Icon name="emoji-events" size={14} color={palette.onPrimary} /></ExpressiveShape>
          <T v="label" color={palette.gold}>Setup complete</T>
        </View>
      </Appear>
      <View style={{ gap: 10 }}>
        <Appear index={2}><CalorieCard targets={targets} goal={draft.goal!} /></Appear>
        <Appear index={3}><MacroCard targets={targets} /></Appear>
        <Appear index={4}>
          <WeekCard
            week={week}
            onOpenDay={(day) => nav.navigate('PlanRoutine', { name: day.title })}
            actions={(
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginLeft: -12 }}>
                {canChangeSplit && <Button kind="text" label="Change split" icon="swap-horiz" onPress={() => setSplitMenu(true)} compact />}
                <Button kind="text" label="Change days" icon="calendar-month" onPress={() => nav.popTo('YourGoals')} compact />
              </View>
            )}
          />
        </Appear>
      </View>
      {choice && canChangeSplit && (
        <SplitSheet
          visible={splitMenu}
          onDismiss={() => setSplitMenu(false)}
          options={choice.options}
          current={choice.current}
          // Nothing is saved yet, so no confirm step: the draft changes and the week updates.
          onPick={(o) => { draftStore.update((p) => ({ ...p, split: o.split })); toast(`Switched to ${o.label}`); }}
        />
      )}
    </OnboardingScaffold>
  );
}
