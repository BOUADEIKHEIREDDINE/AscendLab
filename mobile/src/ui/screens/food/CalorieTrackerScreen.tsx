/**
 * Food diary for today: a gauge of calories left, macro bars, then each meal with its own
 * ring, the foods logged in it and a quick + to add more.
 */
import React, { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { formatKcal, hasEverythingForPlan, PlanCalculator, roundInt } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { Days, FeedPost, isMeal, MEAL, MEAL_TYPES, MealType } from '../../../data/social';
import { feedLive, SocialRepository } from '../../../data/socialRepo';
import { historyLive } from '../../../data/trainRepo';
import { useNow, useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { prepareFeed } from '../../../state/session';
import { c, colors, Gutter } from '../../theme';
import { haptics } from '../../haptics';
import { formatDate } from '../../format';
import { Button, CountingNumber, Hairline, Icon, IconButton, IconName, ProgressBar, Screen, SectionTitle, T, TabHeader } from '../../components/core';
import { Ring } from '../../components/charts';
import { MealPhoto } from '../../components/feed';

/** Strength training burns roughly 5 kcal per kg of body weight per hour (MET 5). */
const STRENGTH_MET = 5;

export const mealBudget = (target: number, type: MealType) => Math.trunc(Math.trunc(target * MEAL[type].share) / 10) * 10;

export function CalorieTrackerScreen() {
  const nav = useNav();
  const feed = useStore(feedLive);
  const profile = useStore(profileStore);
  const history = useStore(historyLive);
  const myUid = SocialRepository.uid;
  const now = useNow();
  const today = Days.key(new Date(now));

  useEffect(() => { prepareFeed(); }, []);

  const meals = feed.posts.filter((p) => isMeal(p) && p.uid === myUid && p.dayKey === today)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const targets = hasEverythingForPlan(profile) ? PlanCalculator.nutrition(profile) : null;
  const target = targets?.calories ?? 0;
  const eaten = meals.reduce((a, m) => a + m.calories, 0);
  const trainedSec = (history ?? []).filter((w) => Days.key(new Date(w.finishedAt)) === today).reduce((a, w) => a + w.durationSec, 0);
  const burned = roundInt((STRENGTH_MET * (profile?.weightKg ?? 70) * trainedSec) / 3600);
  const sum = (key: 'carbs' | 'protein' | 'fat') => meals.reduce((a, m) => a + m[key], 0);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <TabHeader title="Today" subtitle={formatDate.longDay(now)} />

        <SectionTitle text="Summary" trailing={<Button kind="text" label="Details" onPress={() => nav.navigate('NutritionPlanner')} />} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Gutter, paddingVertical: 8 }}>
          <SideNumber value={eaten} label="Eaten" />
          <CalorieGauge eaten={eaten} target={target} />
          <SideNumber value={burned} label="Burned" />
        </View>
        {targets && (
          <View style={{ flexDirection: 'row', paddingHorizontal: Gutter, paddingVertical: 12, gap: 20 }}>
            <MacroBar label="Carbs" grams={sum('carbs')} target={targets.carbsG} />
            <MacroBar label="Protein" grams={sum('protein')} target={targets.proteinG} />
            <MacroBar label="Fat" grams={sum('fat')} target={targets.fatG} />
          </View>
        )}

        <SectionTitle text="Meals" trailing={<Button kind="text" label="Planner" onPress={() => nav.navigate('NutritionPlanner')} />} />
        {MEAL_TYPES.map((type, i) => (
          <View key={type}>
            {i > 0 && <Hairline inset={Gutter} />}
            <MealSection type={type} items={meals.filter((m) => m.mealType === type)} budget={mealBudget(target, type)}
              onAdd={() => nav.navigate('CreatePost', { type })} />
          </View>
        ))}
        <Hairline />
      </ScrollView>
    </Screen>
  );
}

function SideNumber({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <CountingNumber value={value} v="titleLarge" />
      <T color={c.onSurfaceVariant}>{label}</T>
    </View>
  );
}

/** A 270° arc that fills as you eat, with what's left (or how much over) in the middle. */
function CalorieGauge({ eaten, target }: { eaten: number; target: number }) {
  const over = target > 0 && eaten > target;
  const size = 168;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible accessibilityLabel={over ? `${eaten - target} kilocalories over your goal` : `${target - eaten} kilocalories remaining`}>
      <Ring size={size} stroke={12} start={135} sweep={270} progress={target > 0 ? eaten / target : 0} color={over ? colors.apricot : c.primary} />
      <CountingNumber value={over ? eaten - target : Math.max(target - eaten, 0)} v="displaySmall" />
      <T color={c.onSurfaceVariant}>{over ? 'Over' : 'Remaining'}</T>
    </View>
  );
}

function MacroBar({ label, grams, target }: { label: string; grams: number; target: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
      <T color={c.onSurfaceVariant}>{label}</T>
      <View style={{ alignSelf: 'stretch' }}><ProgressBar progress={grams / Math.max(target, 1)} duration={800} /></View>
      <T v="labelLarge">{grams} / {target} g</T>
    </View>
  );
}

const MEAL_ICON: Record<MealType, IconName> = { BREAKFAST: 'free-breakfast', LUNCH: 'lunch-dining', DINNER: 'dinner-dining', SNACK: 'cookie' };

/** One meal: a ring around its icon showing calories against that meal's budget, then its foods. */
function MealSection({ type, items, budget, onAdd }: { type: MealType; items: FeedPost[]; budget: number; onAdd: () => void }) {
  const eaten = items.reduce((a, m) => a + m.calories, 0);
  const fill = budget > 0 && eaten > budget * 1.15 ? colors.apricot : c.primary;
  return (
    <View>
      <Pressable onPress={() => { haptics.tick(); onAdd(); }} accessibilityRole="button" accessibilityLabel={`Add to ${MEAL[type].label}`}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 12, paddingVertical: 14, backgroundColor: pressed ? c.surfaceContainer : 'transparent' })}>
        <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Ring size={56} stroke={5} progress={budget > 0 ? eaten / budget : 0} color={fill} duration={800} />
          <Icon name={MEAL_ICON[type]} size={24} color={c.onSurfaceVariant} />
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <T v="titleMedium">{MEAL[type].label}</T>
          <T color={c.onSurfaceVariant}>{budget > 0 ? `${formatKcal(eaten)} / ${formatKcal(budget)} kcal` : `${formatKcal(eaten)} kcal`}</T>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="add" color={c.onPrimary} />
        </View>
      </Pressable>
      {items.map((meal) => <FoodLine key={meal.id} meal={meal} />)}
      {items.length > 0 && <View style={{ height: 8 }} />}
    </View>
  );
}

function FoodLine({ meal }: { meal: FeedPost }) {
  const macros = [meal.protein > 0 && `P ${meal.protein} g`, meal.carbs > 0 && `C ${meal.carbs} g`, meal.fat > 0 && `F ${meal.fat} g`]
    .filter(Boolean).join('  ');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter + 72, paddingRight: 4 }}>
      {meal.photo && <MealPhoto photo={meal.photo} style={{ width: 32, height: 32, borderRadius: 12, marginRight: 10 }} />}
      <View style={{ flex: 1 }}>
        <T lines={1}>{meal.description.trim() || MEAL[meal.mealType].label}</T>
        {macros ? <T v="bodySmall" color={c.onSurfaceVariant}>{macros}</T> : null}
      </View>
      <T v="labelLarge">{formatKcal(meal.calories)} kcal</T>
      <IconButton name="close" size={18} color={c.onSurfaceVariant} label={`Remove ${meal.description}`} onPress={() => SocialRepository.deletePost(meal)} />
    </View>
  );
}
