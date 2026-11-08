/** The plan as shown on Plan ready, Edit goals and the Nutrition planner. */
import React, { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';
import { calorieReason, Goal, NutritionTargets, TrainingWeek } from '../../data/profile';
import { c, colors } from '../theme';
import { CountingNumber, Hairline, HelpNote, ProgressBar, T } from './core';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Flat section with a hairline on top: content sits on the page, not in a box. */
function PlanCard({ children }: { children: React.ReactNode }) {
  return (
    <View>
      <Hairline />
      <View style={{ paddingVertical: 20, gap: 12 }}>{children}</View>
    </View>
  );
}

/** Daily calories in big counting numbers, with a plain-language reason for that number. */
export function CalorieCard({ targets, goal }: { targets: NutritionTargets; goal: Goal }) {
  return (
    <PlanCard>
      <T v="labelLarge" color={c.onSurfaceVariant}>Daily calorie target</T>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <CountingNumber value={targets.calories} v="displayMedium" color={c.primary} />
        <T v="titleMedium" style={{ marginBottom: 8 }}>kcal a day</T>
      </View>
      <T color={c.onSurfaceVariant}>{calorieReason(targets, goal)}</T>
    </PlanCard>
  );
}

/** Protein, carbs and fat in grams, each with a bar that fills in turn and one line on what it does. */
export function MacroCard({ targets }: { targets: NutritionTargets }) {
  const macros = [
    { name: 'Protein', grams: targets.proteinG, purpose: 'Builds and repairs muscle', kcal: targets.proteinG * 4, color: colors.mintGreen },
    { name: 'Carbs', grams: targets.carbsG, purpose: 'Your main fuel for training', kcal: targets.carbsG * 4, color: colors.apricot },
    { name: 'Fat', grams: targets.fatG, purpose: 'Keeps hormones and energy steady', kcal: targets.fatG * 9, color: colors.lightGray },
  ];
  const total = Math.max(macros.reduce((a, m) => a + m.kcal, 0), 1);
  return (
    <PlanCard>
      <T v="labelLarge" color={c.onSurfaceVariant}>Your daily macros</T>
      {macros.map((m, i) => (
        <View key={m.name} style={{ gap: 6 }} accessible accessibilityLabel={`${m.name}: ${m.grams} grams a day. ${m.purpose}.`}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <T v="titleMedium" style={{ flex: 1 }}>{m.name}</T>
            <T v="titleMedium">{m.grams} g</T>
          </View>
          <DelayedBar progress={m.kcal / total} color={m.color} delay={250 * i} />
          <T v="bodySmall" color={c.onSurfaceVariant}>{m.purpose}</T>
        </View>
      ))}
    </PlanCard>
  );
}

function DelayedBar({ progress, color, delay }: { progress: number; color: string; delay: number }) {
  const [shown, setShown] = React.useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(progress), delay);
    return () => clearTimeout(t);
  }, [progress, delay]);
  return <ProgressBar progress={shown} color={color} height={8} duration={900} />;
}

/** The week at a glance (training days pop in one by one), then each session in words. */
export function WeekCard({ week }: { week: TrainingWeek }) {
  const training = new Set(week.days.map((d) => d.dayIndex));
  return (
    <PlanCard>
      <T v="labelLarge" color={c.onSurfaceVariant}>Your training week</T>
      <View style={{ flexDirection: 'row', gap: 6 }} accessible accessibilityLabel={'Training on ' + week.days.map((d) => DAY_NAMES[d.dayIndex]).join(', ')}>
        {DAY_LETTERS.map((letter, i) => <DayDot key={i} letter={letter} on={training.has(i)} index={i} />)}
      </View>
      <T v="bodySmall" color={c.onSurfaceVariant}>
        {week.days.length} sessions · about {week.minutesPerSession} min each · rest on the other days
      </T>
      <View style={{ height: 4 }} />
      <T v="titleMedium">{week.splitName}</T>
      <T color={c.onSurfaceVariant}>{week.splitExplanation}</T>
      {week.days.map((day) => (
        <View key={day.dayIndex} style={{ flexDirection: 'row' }}>
          <T v="labelLarge" color={c.primary} style={{ width: 44 }}>{DAY_NAMES[day.dayIndex].slice(0, 3)}</T>
          <View style={{ flex: 1 }}>
            <T v="bodyLarge">{day.title}</T>
            <T v="bodySmall" color={c.onSurfaceVariant}>{day.focus}</T>
          </View>
        </View>
      ))}
      <HelpNote text={`Each exercise: ${week.setsAndReps}.`} background={c.surfaceContainerHigh} />
    </PlanCard>
  );
}

function DayDot({ letter, on, index }: { letter: string; on: boolean; index: number }) {
  const pop = useState(() => new Animated.Value(on ? 0 : 1))[0];
  useEffect(() => {
    if (!on) { pop.setValue(1); return; }
    pop.setValue(0);
    Animated.sequence([
      Animated.delay(120 * index),
      Animated.spring(pop, { toValue: 1, bounciness: 14, speed: 8, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [on, index, pop]);
  return (
    <Animated.View style={{
      flex: 1, aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
      backgroundColor: on ? c.primary : 'transparent', borderWidth: on ? 0 : 1, borderColor: c.outlineVariant,
      transform: [{ scale: pop }],
    }}>
      <T v="labelLarge" color={on ? c.onPrimary : c.onSurfaceVariant}>{letter}</T>
    </Animated.View>
  );
}
