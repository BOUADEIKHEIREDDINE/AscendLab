/** The plan as shown on Plan ready, Edit goals and the Nutrition planner: tiles, not boxes of text. */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { calorieReason, Goal, NutritionTargets, TrainingWeek } from '../../data/profile';
import { data, palette } from '../theme';
import { HelpNote, ProgressBar, T, Tile, TileHeader } from './core';
import { FuelBloom } from './fuel';
import { RidgeWeek } from './progress';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Daily calories: a static Fuel Bloom preview with the target, and a plain-language reason. */
export function CalorieCard({ targets, goal }: { targets: NutritionTargets; goal: Goal }) {
  return (
    <Tile span="2x2" style={{ alignItems: 'center', gap: 10 }} label={`Daily calorie target: ${targets.calories} kilocalories`}>
      <View style={{ alignSelf: 'stretch' }}><TileHeader icon="local-fire-department" text="Daily calorie target" /></View>
      <FuelBloom eaten={0} target={targets.calories} burned={0} meals={[]} size={210} preview />
      <T color={palette.textMuted} center>{calorieReason(targets, goal)}</T>
    </Tile>
  );
}

/** Protein, carbs and fat in grams, each with a bar in its data colour that fills in turn, and one line on what it does. */
export function MacroCard({ targets }: { targets: NutritionTargets }) {
  const macros = [
    { name: 'Protein', grams: targets.proteinG, purpose: 'Builds and repairs muscle', kcal: targets.proteinG * 4, color: data.protein },
    { name: 'Carbs', grams: targets.carbsG, purpose: 'Your main fuel for training', kcal: targets.carbsG * 4, color: data.carbs },
    { name: 'Fat', grams: targets.fatG, purpose: 'Keeps hormones and energy steady', kcal: targets.fatG * 9, color: data.fat },
  ];
  const total = Math.max(macros.reduce((a, m) => a + m.kcal, 0), 1);
  return (
    <Tile span="2x1" style={{ gap: 14 }}>
      <TileHeader icon="pie-chart-outline" text="Your daily macros" />
      {macros.map((m, i) => (
        <View key={m.name} style={{ gap: 6 }} accessible accessibilityLabel={`${m.name}: ${m.grams} grams a day. ${m.purpose}.`}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <T v="titleS" style={{ flex: 1 }}>{m.name}</T>
            <T v="displayS" color={m.color} style={{ fontSize: 22, lineHeight: 26 }}>{m.grams}<T v="bodyS" color={palette.textMuted}> g</T></T>
          </View>
          <DelayedBar progress={m.kcal / total} color={m.color} delay={250 * i} />
          <T v="bodyS" color={palette.textMuted}>{m.purpose}</T>
        </View>
      ))}
    </Tile>
  );
}

function DelayedBar({ progress, color, delay }: { progress: number; color: string; delay: number }) {
  const [shown, setShown] = React.useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(progress), delay);
    return () => clearTimeout(t);
  }, [progress, delay]);
  return <ProgressBar progress={shown} color={color} duration={900} />;
}

/** The week as a ridge (training days are peaks), then each session in words. */
export function WeekCard({ week }: { week: TrainingWeek }) {
  return (
    <Tile span="2x1" style={{ gap: 12 }}>
      <TileHeader icon="terrain" text="Your training week" />
      <RidgeWeek training={week.days.map((d) => d.dayIndex)} />
      <T v="bodyS" color={palette.textMuted}>
        {week.days.length} sessions · about {week.minutesPerSession} min each · rest on the other days
      </T>
      <View style={{ gap: 2, marginTop: 4 }}>
        <T v="titleS">{week.splitName}</T>
        <T color={palette.textMuted}>{week.splitExplanation}</T>
      </View>
      <View style={{ borderRadius: 20, backgroundColor: palette.surfaceHigh, paddingVertical: 6 }}>
        {week.days.map((day, i) => (
          <View key={day.dayIndex} style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: palette.hairline }}>
            <T v="label" color={palette.lime} style={{ width: 44, marginTop: 2 }}>{DAY_NAMES[day.dayIndex].slice(0, 3)}</T>
            <View style={{ flex: 1 }}>
              <T v="titleS">{day.title}</T>
              <T v="bodyS" color={palette.textMuted}>{day.focus}</T>
            </View>
          </View>
        ))}
      </View>
      <HelpNote text={`Each exercise: ${week.setsAndReps}.`} background={palette.surfaceHigh} />
      {week.extras.map((line) => <T key={line} v="bodyS" color={palette.textMuted}>{line}</T>)}
    </Tile>
  );
}
