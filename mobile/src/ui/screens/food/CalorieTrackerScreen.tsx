/**
 * Food diary for today: the Fuel Bloom hero tile, liquid macro columns, then a grid of meal
 * tiles. Tapping a meal opens its foods in a sheet; its + logs more.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { formatKcal, hasEverythingForPlan, PlanCalculator, roundInt } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { Days, FeedPost, isMeal, MEAL, MEAL_TYPES, MealType } from '../../../data/social';
import { feedLive, SocialRepository } from '../../../data/socialRepo';
import { historyLive } from '../../../data/trainRepo';
import { useNow, useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { prepareFeed } from '../../../state/session';
import { palette, radius, space, tone } from '../../theme';
import { formatDate } from '../../format';
import {
  Appear, Bento, Button, Icon, IconButton, PrimaryButton, SectionTitle, Screen, T, TabHeader, Tile, TileHeader, useBentoColumn,
} from '../../components/core';
import { BottomSheet } from '../../components/overlays';
import { FuelBloom, MacroColumns, mealIcon, MealTile } from '../../components/fuel';
import { MealPhoto } from '../../components/feed';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { mealShape } from '../../shapes/library';

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
  const [openMeal, setOpenMeal] = useState<MealType | null>(null);

  useEffect(() => { prepareFeed(); }, []);

  const meals = feed.posts.filter((p) => isMeal(p) && p.uid === myUid && p.dayKey === today)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const targets = hasEverythingForPlan(profile) ? PlanCalculator.nutrition(profile) : null;
  const target = targets?.calories ?? 0;
  const eaten = meals.reduce((a, m) => a + m.calories, 0);
  const trainedSec = (history ?? []).filter((w) => Days.key(new Date(w.finishedAt)) === today).reduce((a, w) => a + w.durationSec, 0);
  const burned = roundInt((STRENGTH_MET * (profile?.weightKg ?? 70) * trainedSec) / 3600);
  const sum = (key: 'carbs' | 'protein' | 'fat') => meals.reduce((a, m) => a + m[key], 0);
  // One Fuel Bloom segment per meal type, in the day's order.
  const segments = MEAL_TYPES.map((type) => ({ type, calories: meals.filter((m) => m.mealType === type).reduce((a, m) => a + m.calories, 0) }));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <TabHeader title="Today" subtitle={formatDate.longDay(now)}
          actions={<IconButton variant="tonal" name="tune" label="Nutrition planner" onPress={() => nav.navigate('NutritionPlanner')} />} />

        <Bento style={{ marginTop: 8 }}>
          <Tile span="2x2" center label={undefined}>
            <View style={{ alignSelf: 'stretch' }}>
              <TileHeader icon="local-fire-department" text="Fuel" trailing={
                <Button kind="text" compact label="Details" onPress={() => nav.navigate('NutritionPlanner')} />} />
            </View>
            <FuelBloom eaten={eaten} target={target} burned={burned} meals={segments} />
            {burned > 0 && <T v="bodyS" color={palette.ember}>You earned {formatKcal(burned)} more</T>}
          </Tile>
          {targets && (
            <Tile span="2x1">
              <MacroColumns macros={[
                { key: 'protein', label: 'Protein', grams: sum('protein'), target: targets.proteinG },
                { key: 'carbs', label: 'Carbs', grams: sum('carbs'), target: targets.carbsG },
                { key: 'fat', label: 'Fat', grams: sum('fat'), target: targets.fatG },
              ]} />
            </Tile>
          )}
        </Bento>

        <SectionTitle text="Meals" trailing={<Button kind="text" label="Planner" onPress={() => nav.navigate('NutritionPlanner')} />} />
        <Bento>
          {MEAL_TYPES.map((type, i) => (
            <MealGridItem key={type} index={i} type={type} items={meals.filter((m) => m.mealType === type)} budget={mealBudget(target, type)}
              onOpen={() => setOpenMeal(type)} onAdd={() => nav.navigate('CreatePost', { type })} />
          ))}
        </Bento>
      </ScrollView>

      <MealSheet type={openMeal} items={openMeal ? meals.filter((m) => m.mealType === openMeal) : []} budget={openMeal ? mealBudget(target, openMeal) : 0}
        onDismiss={() => setOpenMeal(null)} onAdd={(type) => { setOpenMeal(null); nav.navigate('CreatePost', { type }); }} />
    </Screen>
  );
}

function MealGridItem({ type, items, budget, onOpen, onAdd, index }: {
  type: MealType; items: FeedPost[]; budget: number; onOpen: () => void; onAdd: () => void; index: number;
}) {
  const col = useBentoColumn();
  if (col <= 0) return null;
  return (
    <Appear index={index}>
      <MealTile type={type} eaten={items.reduce((a, m) => a + m.calories, 0)} budget={budget} onOpen={onOpen} onAdd={onAdd} width={col} />
    </Appear>
  );
}

/** A meal's foods, with a remove button each and a way to add more. */
function MealSheet({ type, items, budget, onDismiss, onAdd }: {
  type: MealType | null; items: FeedPost[]; budget: number; onDismiss: () => void; onAdd: (type: MealType) => void;
}) {
  const [shown, setShown] = useState<MealType | null>(type);
  if (type && type !== shown) setShown(type);
  const t = type ?? shown;
  const eaten = items.reduce((a, m) => a + m.calories, 0);
  return (
    <BottomSheet visible={type != null} onDismiss={onDismiss}>
      {t && (
        <View style={{ paddingHorizontal: space.gutter, paddingBottom: 8, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <ExpressiveShape shape={mealShape[t]} size={52} fill={tone(palette.primary, 0.16)}>
              <Icon name={mealIcon(t)} color={palette.primary} />
            </ExpressiveShape>
            <View style={{ flex: 1 }}>
              <T v="title">{MEAL[t].label}</T>
              <T v="bodyS" color={palette.textMuted}>{budget > 0 ? `${formatKcal(eaten)} / ${formatKcal(budget)} kcal` : `${formatKcal(eaten)} kcal`}</T>
            </View>
          </View>
          {items.length === 0 ? (
            <T color={palette.textMuted}>Nothing logged yet.</T>
          ) : (
            <View style={{ borderRadius: radius.lg, backgroundColor: palette.surfaceHigh, paddingVertical: 4 }}>
              {items.map((meal) => <FoodLine key={meal.id} meal={meal} />)}
            </View>
          )}
          <PrimaryButton label={`Add to ${MEAL[t].label.toLowerCase()}`} icon="add" onPress={() => onAdd(t)} />
        </View>
      )}
    </BottomSheet>
  );
}

function FoodLine({ meal }: { meal: FeedPost }) {
  const macros = [meal.protein > 0 && `P ${meal.protein} g`, meal.carbs > 0 && `C ${meal.carbs} g`, meal.fat > 0 && `F ${meal.fat} g`]
    .filter(Boolean).join('  ');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: space.tilePad, paddingRight: 4, minHeight: 56 }}>
      {meal.photo && <MealPhoto photo={meal.photo} style={{ width: 36, height: 36, borderRadius: 12, marginRight: 12 }} />}
      <View style={{ flex: 1 }}>
        <T lines={1}>{meal.description.trim() || MEAL[meal.mealType].label}</T>
        {macros ? <T v="bodyS" color={palette.textMuted}>{macros}</T> : null}
      </View>
      <T v="label">{formatKcal(meal.calories)} kcal</T>
      <IconButton name="close" size={18} color={palette.textMuted} label={`Remove ${meal.description}`} onPress={() => SocialRepository.deletePost(meal)} />
    </View>
  );
}
