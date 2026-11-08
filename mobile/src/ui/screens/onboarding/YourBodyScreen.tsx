import React, { useState } from 'react';
import { View } from 'react-native';
import { ACTIVITY, ACTIVITY_LEVELS, ActivityLevel, BodyChecks, Convert, formatNumber, roundInt, UNIT, Units } from '../../../data/profile';
import { useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { draftStore, Onboarding } from '../../../state/session';
import { c } from '../../theme';
import { Appear, digits, ErrorText, HelpNote, IconName, SectionLabel, Segmented, T, TextField } from '../../components/core';
import { ChoiceCard, OnboardingScaffold } from '../../components/onboarding';

const ACTIVITY_ICON: Record<ActivityLevel, IconName> = {
  SEDENTARY: 'chair', LIGHT: 'directions-walk', MODERATE: 'directions-bike', VERY: 'bolt',
};

export function YourBodyScreen() {
  const nav = useNav();
  const draft = useStore(draftStore);
  const units = draft.units;

  // What the person typed, kept as text so a half-typed number doesn't jump around.
  const [ageText, setAgeText] = useState(draft.age?.toString() ?? '');
  const [cmText, setCmText] = useState(draft.heightCm != null ? String(roundInt(draft.heightCm)) : '');
  const [ftText, setFtText] = useState(draft.heightCm != null ? String(Convert.cmToFeetInches(draft.heightCm)[0]) : '');
  const [inText, setInText] = useState(draft.heightCm != null ? String(Convert.cmToFeetInches(draft.heightCm)[1]) : '');
  const [weightText, setWeightText] = useState(draft.weightKg != null
    ? formatNumber(units === 'METRIC' ? draft.weightKg : Convert.kgToLb(draft.weightKg)) : '');
  // Errors stay hidden until the person tries to continue, so nobody is scolded mid-typing.
  const [showErrors, setShowErrors] = useState(false);

  const age = ageText ? parseInt(ageText, 10) : null;
  const heightCm = units === 'METRIC'
    ? (cmText ? parseFloat(cmText) : null)
    : (ftText ? Convert.feetInchesToCm(parseInt(ftText, 10), inText ? parseInt(inText, 10) : 0) : null);
  const typedWeight = weightText && !isNaN(parseFloat(weightText)) ? parseFloat(weightText) : null;
  const weightKg = typedWeight == null ? null : units === 'METRIC' ? typedWeight : Convert.lbToKg(typedWeight);

  const ageError = BodyChecks.age(age);
  const heightError = BodyChecks.height(heightCm, units);
  const weightError = BodyChecks.weight(weightKg, units);
  const comboError = heightError == null && weightError == null ? BodyChecks.combination(heightCm, weightKg) : null;
  const activityError = draft.activity == null ? 'Pick the option closest to your normal day.' : null;

  function switchUnits(to: Units) {
    if (to === units) return;
    // Convert what's already typed so switching never wipes an answer.
    if (heightCm != null) {
      setCmText(String(roundInt(heightCm)));
      const [ft, inch] = Convert.cmToFeetInches(heightCm);
      setFtText(String(ft));
      setInText(String(inch));
    }
    if (weightKg != null) setWeightText(formatNumber(to === 'METRIC' ? weightKg : Convert.kgToLb(weightKg)));
    Onboarding.update((p) => ({ ...p, units: to }));
  }

  return (
    <OnboardingScaffold
      step={2}
      title="About you"
      subtitle="We use this to work out how much energy your body needs each day."
      primaryLabel="Continue"
      onBack={() => nav.goBack()}
      onPrimary={() => {
        setShowErrors(true);
        if ([ageError, heightError, weightError, comboError, activityError].every((e) => e == null)) {
          Onboarding.update((p) => ({ ...p, age, heightCm, weightKg }));
          Onboarding.saveProgress();
          nav.navigate('YourGoals');
        }
      }}
    >
      <Appear index={1}>
        <View style={{ gap: 8 }}>
          <T v="labelLarge" color={c.onSurfaceVariant}>Units</T>
          <Segmented<Units>
            options={[{ key: 'METRIC', label: 'kg · cm' }, { key: 'IMPERIAL', label: 'lb · ft' }]}
            selected={units}
            onSelect={switchUnits}
          />
        </View>
      </Appear>

      <Appear index={2}>
        <TextField label="Age" value={ageText} onChangeText={(t) => setAgeText(digits(t, 3))} suffix="years" big
          keyboardType="number-pad" returnKeyType="next" error={showErrors ? ageError : null} />
      </Appear>

      <Appear index={3}>
        {units === 'METRIC' ? (
          <TextField label="Height" value={cmText} onChangeText={(t) => setCmText(digits(t, 3))} suffix="cm" big
            keyboardType="number-pad" error={showErrors ? heightError : null} />
        ) : (
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextField label="Height" value={ftText} onChangeText={(t) => setFtText(digits(t, 1))} suffix="ft" big style={{ flex: 1 }}
                keyboardType="number-pad" error={showErrors && heightError ? ' ' : null} />
              <TextField label=" " value={inText} big style={{ flex: 1 }} keyboardType="number-pad" suffix="in"
                onChangeText={(t) => { const v = digits(t, 2); setInText(v && parseInt(v, 10) > 11 ? '11' : v); }}
                error={showErrors && heightError ? ' ' : null} />
            </View>
            {showErrors && <ErrorText message={heightError} />}
          </View>
        )}
      </Appear>

      <Appear index={4}>
        <TextField label="Weight" value={weightText} onChangeText={(t) => setWeightText(digits(t, 5, true))} suffix={UNIT[units].weightUnit} big
          keyboardType="decimal-pad" returnKeyType="done" error={showErrors ? weightError : null} />
      </Appear>

      {/* Shown as soon as both values are typed: an obvious mix-up is worth flagging early. */}
      <ErrorText message={comboError} />

      <Appear index={5}><HelpNote text="Your details stay private to your account. You can change them later in Settings." /></Appear>

      <Appear index={6}><SectionLabel text="How active is your normal day?" /></Appear>
      <Appear index={7}><T color={c.onSurfaceVariant}>Don't count workouts here, just your usual day.</T></Appear>
      {ACTIVITY_LEVELS.map((level, i) => (
        <Appear key={level} index={8 + i}>
          <ChoiceCard
            selected={draft.activity === level}
            onPress={() => Onboarding.update((p) => ({ ...p, activity: level }))}
            title={ACTIVITY[level].label}
            description={ACTIVITY[level].description}
            detail={`e.g. ${ACTIVITY[level].example}`}
            icon={ACTIVITY_ICON[level]}
          />
        </Appear>
      ))}
      {showErrors && <ErrorText message={activityError} />}
    </OnboardingScaffold>
  );
}
