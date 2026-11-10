/** Daily targets, and a per-meal budget filled in by what's been logged today. */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { formatKcal, hasEverythingForPlan, PlanCalculator } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { Days, isMeal, MEAL, MEAL_TYPES } from '../../../data/social';
import { feedLive, SocialRepository } from '../../../data/socialRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { palette, Gutter } from '../../theme';
import { Hairline, PageHeader, ProgressBar, Screen, SectionTitle, T } from '../../components/core';
import { MacroCard } from '../../components/plan';
import { mealBudget } from './CalorieTrackerScreen';

export function NutritionPlannerScreen() {
  const nav = useNav();
  const profile = useStore(profileStore);
  const feed = useStore(feedLive);
  const myUid = SocialRepository.uid;
  const today = Days.key();
  const meals = feed.posts.filter((p) => isMeal(p) && p.uid === myUid && p.dayKey === today);
  const targets = hasEverythingForPlan(profile) ? PlanCalculator.nutrition(profile) : null;

  return (
    <Screen>
      <PageHeader title="Nutrition planner" onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingVertical: 8, gap: 12 }}>
        {targets == null ? (
          <T color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>Finish setting up your goals to see your plan.</T>
        ) : (
          <>
            <SectionTitle text="Today, meal by meal" />
            <View style={{ paddingVertical: 4 }}>
              {MEAL_TYPES.map((type, i) => {
                const budget = mealBudget(targets.calories, type);
                const eaten = meals.filter((m) => m.mealType === type).reduce((a, m) => a + m.calories, 0);
                return (
                  <View key={type}>
                    {i > 0 && <Hairline inset={Gutter} />}
                    <View style={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <T v="titleS" style={{ flex: 1 }}>{MEAL[type].label}</T>
                        <T color={palette.textMuted}>{eaten === 0 ? `about ${formatKcal(budget)} kcal` : `${formatKcal(eaten)} / ${formatKcal(budget)} kcal`}</T>
                      </View>
                      <ProgressBar progress={budget > 0 ? eaten / budget : 0} color={eaten > budget * 1.15 ? palette.ember : palette.lime} />
                    </View>
                  </View>
                );
              })}
            </View>
            <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>
              A guide, not a rule: move calories between meals as you like. What matters is the daily total.
            </T>
            <SectionTitle text="Daily targets" />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Gutter, paddingVertical: 8 }}>
              <T v="headline">{formatKcal(targets.calories)}</T>
              <T v="body" color={palette.textMuted} style={{ marginBottom: 4 }}>  kcal a day</T>
            </View>
            <View style={{ paddingHorizontal: Gutter }}><MacroCard targets={targets} /></View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
