/**
 * "Plan my day": the person says what they want from today's meals (which meals, time, budget,
 * diet; the goal is the one set in onboarding) and the planner picks dishes and portions that meet the day's targets.
 * Opened again, it changes the plan or removes it.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { defaultPrefs, Diet, PlanPrefs } from '../../../data/mealPlanner';
import { formatKcal, GOAL } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { MealPlanRepository } from '../../../data/dayPlanRepo';
import { PRICE_HINT, PRICE_LABEL, PriceTier } from '../../../data/recipes';
import { MEAL, MEAL_TYPES, MealType } from '../../../data/social';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { data, Gutter, palette } from '../../theme';
import { haptics } from '../../haptics';
import { Bento, Button, Chip, HelpNote, PageHeader, PrimaryButton, Screen, SectionTitle, T, Tile, TileHeader, TileNumber } from '../../components/core';
import { targetsOf, useMyDay } from '../../components/myDay';

const TIMES = [{ max: 0, label: 'Any time' }, { max: 30, label: '30 min or less' }, { max: 20, label: '20 min or less' }];
const DIETS: { key: Diet; label: string }[] = [{ key: 'ANY', label: 'Everything' }, { key: 'VEGETARIAN', label: 'Vegetarian' }, { key: 'VEGAN', label: 'Vegan' }];

export function PlanDayScreen() {
  const nav = useNav();
  const profile = useStore(profileStore);
  const day = useMyDay();
  // The goal was set in onboarding (and can be changed in the profile): the plan always follows it.
  const [prefs, setPrefs] = useState<PlanPrefs>(() => ({ ...(day.prefs ?? defaultPrefs(null)), goal: null }));
  const set = (patch: Partial<PlanPrefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const toggleMeal = (m: MealType) => set({
    meals: prefs.meals.includes(m) ? prefs.meals.filter((x) => x !== m) : MEAL_TYPES.filter((x) => x === m || prefs.meals.includes(x)),
  });
  const targets = targetsOf(profile);
  const goal = profile?.goal ?? null;
  const loggedMeals = day.blocks.filter((b) => b.mealType && b.done).map((b) => b.mealType!);

  function make() {
    haptics.confirm();
    day.makePlan(prefs);
    goBack(nav);
  }

  return (
    <Screen>
      <PageHeader title={day.planned ? "Today's plan" : 'Plan my day'} onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingBottom: 14 }}>
          Tell us what you want from today. We pick dishes and set each portion so the day adds up to your targets.
        </T>

        {targets ? (
          <Bento>
            <Tile span="2x1">
              <TileHeader icon="flag" text={`Today's targets, ${goal ? GOAL[goal].label.toLowerCase() : 'your goal'}`} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
                <View style={{ flex: 1 }}><TileNumber value={formatKcal(targets.calories)} caption="kcal" /></View>
                <Target label="Protein" grams={targets.protein} color={data.protein} />
                <Target label="Carbs" grams={targets.carbs} color={data.carbs} />
                <Target label="Fat" grams={targets.fat} color={data.fat} />
              </View>
            </Tile>
          </Bento>
        ) : (
          <View style={{ paddingHorizontal: Gutter }}>
            <HelpNote text="Finish your profile (age, height, weight, activity) to get calorie and macro targets." />
          </View>
        )}

        <SectionTitle text="Meals to plan" />
        <ChipWrap>
          {MEAL_TYPES.map((m) => <Chip key={m} label={MEAL[m].label} selected={prefs.meals.includes(m)} onPress={() => toggleMeal(m)} />)}
        </ChipWrap>
        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingTop: 8 }}>
          {prefs.meals.length < MEAL_TYPES.length
            ? 'Meals left out keep their usual share of your targets, for whatever you eat there.'
            : loggedMeals.length > 0 ? `${listOf(loggedMeals.map((m) => MEAL[m].label.toLowerCase()))} already logged: the plan counts ${loggedMeals.length > 1 ? 'them' : 'it'}.` : 'A dish for each meal of the day.'}
        </T>

        <SectionTitle text="Cooking time" />
        <ChipWrap>
          {TIMES.map((t) => <Chip key={t.max} label={t.label} selected={prefs.maxMinutes === t.max} onPress={() => set({ maxMinutes: t.max })} />)}
        </ChipWrap>

        <SectionTitle text="Budget per serving" />
        <ChipWrap>
          <Chip label="Any budget" selected={prefs.maxPrice == null} onPress={() => set({ maxPrice: null })} />
          {([1, 2] as PriceTier[]).map((t) => (
            <Chip key={t} label={`Up to ${PRICE_LABEL[t]}, ${PRICE_HINT[t].toLowerCase()}`} selected={prefs.maxPrice === t} onPress={() => set({ maxPrice: t })} />
          ))}
        </ChipWrap>

        <SectionTitle text="Diet" />
        <ChipWrap>
          {DIETS.map((d) => <Chip key={d.key} label={d.label} selected={prefs.diet === d.key} onPress={() => set({ diet: d.key })} />)}
        </ChipWrap>

        <View style={{ paddingHorizontal: Gutter, paddingTop: 20 }}>
          <HelpNote text="You can swap any dish afterwards: the other portions adjust so the day stays on target. If too few recipes fit your time or budget, we loosen those first, never your diet." />
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
        <PrimaryButton label={day.planned ? 'Make a new plan' : 'Make my plan'} icon="restaurant-menu"
          enabled={targets != null && prefs.meals.length > 0} onPress={make} />
        {day.planned && (
          <Button kind="text" label="Remove today's plan" color={palette.ember}
            onPress={() => { haptics.tick(); MealPlanRepository.decline(day.today); goBack(nav); }} />
        )}
      </View>
    </Screen>
  );
}

function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Gutter }}>{children}</View>;
}

function Target({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={{ alignItems: 'flex-end', marginLeft: 14 }}>
      <T v="displayS" color={color} style={{ fontSize: 22, lineHeight: 26 }}>{grams} g</T>
      <T v="bodyS" color={palette.textMuted}>{label}</T>
    </View>
  );
}

/** "breakfast, lunch and snacks", capitalised. */
function listOf(words: string[]): string {
  const text = words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
