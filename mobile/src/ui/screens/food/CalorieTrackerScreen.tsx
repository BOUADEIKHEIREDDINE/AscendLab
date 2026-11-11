/**
 * Food diary for today. A search bar sits at the top, so adding food is always one tap away.
 * Then the Fuel Bloom hero tile and liquid macro columns.
 *
 * Without a plan, the meals are a grid of tiles and the day offers to plan itself. With a plan,
 * the meals become the plan: each shows its dish, and tapping it opens the dish's macros and
 * recipe.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { formatKcal, roundInt } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import { Days, FeedPost, isMeal, MEAL, MEAL_TYPES, MealType, mealTypeForNow } from '../../../data/social';
import { feedLive, SocialRepository } from '../../../data/socialRepo';
import { historyLive } from '../../../data/trainRepo';
import { clock, DayBlock } from '../../../data/dayPlan';
import { portionLabel, roundMacros } from '../../../data/mealPlanner';
import { useNow, useStore } from '../../../lib/store';
import { useNav } from '../../../navigation/types';
import { prepareFeed } from '../../../state/session';
import { data, palette, radius, space, tone } from '../../theme';
import { formatDate } from '../../format';
import {
  Appear, Bento, Button, Icon, IconButton, PressableScale, PrimaryButton, SectionTitle, Screen, T, TabHeader, Tile, TileHeader, useBentoColumn,
} from '../../components/core';
import { BottomSheet } from '../../components/overlays';
import { FuelBloom, MacroColumns, mealIcon, MealTile } from '../../components/fuel';
import { MealPhoto } from '../../components/feed';
import { DayBalance, PlanOffer, useMealPlanActions, useMyDay } from '../../components/myDay';
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

  // Targets and planned dishes come from "My day", so Home and this tab always agree.
  const day = useMyDay();
  const plan = useMealPlanActions(day.today);
  const targets = day.targets;
  const target = targets?.calories ?? 0;
  const meals = feed.posts.filter((p) => isMeal(p) && p.uid === myUid && p.dayKey === today)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const eaten = meals.reduce((a, m) => a + m.calories, 0);
  const trainedSec = (history ?? []).filter((w) => Days.key(new Date(w.finishedAt)) === today).reduce((a, w) => a + w.durationSec, 0);
  const burned = roundInt((STRENGTH_MET * (profile?.weightKg ?? 70) * trainedSec) / 3600);
  const sum = (key: 'carbs' | 'protein' | 'fat') => meals.reduce((a, m) => a + m[key], 0);
  // One Fuel Bloom segment per meal type, in the day's order.
  const segments = MEAL_TYPES.map((type) => ({ type, calories: meals.filter((m) => m.mealType === type).reduce((a, m) => a + m.calories, 0) }));
  const itemsOf = (type: MealType) => meals.filter((m) => m.mealType === type);
  const blockOf = (type: MealType) => day.blocks.find((b) => b.mealType === type);
  // Open meals of a plan use its budget, which makes up for what the rest of the day already holds.
  const budgetOf = (type: MealType) => { const b = blockOf(type); return b && !b.done && b.budget ? b.budget : mealBudget(target, type); };
  const logFood = (type: MealType = mealTypeForNow(), start: 'search' | 'barcode' | 'photo' = 'search') => {
    setOpenMeal(null);
    nav.navigate('CreatePost', { type, start });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <TabHeader title="Today" subtitle={formatDate.longDay(now)}
          actions={<IconButton variant="tonal" name="tune" label="Nutrition planner" onPress={() => nav.navigate('NutritionPlanner')} />} />

        <FoodSearchBar onSearch={() => logFood()} onBarcode={() => logFood(undefined, 'barcode')} onPhoto={() => logFood(undefined, 'photo')} />

        <Bento style={{ marginTop: 14 }}>
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
                { key: 'protein', label: 'Protein', grams: sum('protein'), target: targets.protein },
                { key: 'carbs', label: 'Carbs', grams: sum('carbs'), target: targets.carbs },
                { key: 'fat', label: 'Fat', grams: sum('fat'), target: targets.fat },
              ]} />
            </Tile>
          )}
        </Bento>

        {day.planned && day.plan ? (
          <>
            <SectionTitle text="Your plan for today" trailing={<Button kind="text" label="Edit plan" icon="tune" onPress={() => nav.navigate('PlanDay')} />} />
            <DayBalance total={day.plan.total} target={day.plan.target} />
            <View style={{ paddingHorizontal: space.gutter, gap: space.tileGap, marginTop: space.tileGap }}>
              {MEAL_TYPES.map((type) => (
                <PlanMealCard key={type} type={type} block={blockOf(type)} items={itemsOf(type)} budget={budgetOf(type)} onOpen={() => setOpenMeal(type)} />
              ))}
            </View>
            <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: space.gutter, paddingTop: 10 }}>
              Tap a meal for its macros and recipe. Swap a dish and the other portions adjust to keep the day on target.
            </T>
          </>
        ) : (
          <>
            <SectionTitle text="Meals" trailing={<Button kind="text" label="Recipes" icon="menu-book" onPress={() => nav.navigate('Recipes')} />} />
            <Bento>
              {MEAL_TYPES.map((type, i) => (
                <MealGridItem key={type} index={i} type={type} items={itemsOf(type)} budget={budgetOf(type)}
                  onOpen={() => setOpenMeal(type)} onAdd={() => logFood(type)} />
              ))}
            </Bento>
            {targets && (day.declined
              ? <Button kind="tonal" label="Plan my day" icon="restaurant-menu" onPress={() => nav.navigate('PlanDay')} style={{ alignSelf: 'flex-start', marginLeft: space.gutter, marginTop: 14 }} />
              : <PlanOffer kcal={targets.calories} today={day.today} style={{ marginTop: space.tileGap }} />)}
          </>
        )}
      </ScrollView>

      <MealSheet
        type={openMeal}
        items={openMeal ? itemsOf(openMeal) : []}
        budget={openMeal ? budgetOf(openMeal) : 0}
        block={day.planned && openMeal ? blockOf(openMeal) : undefined}
        onDismiss={() => setOpenMeal(null)}
        onAdd={(type) => logFood(type)}
        onRecipe={(b) => { setOpenMeal(null); nav.navigate('RecipeDetail', { recipeId: b.recipe!.id, planFor: b.mealType, portion: b.portion }); }}
        onLogDish={(b) => {
          setOpenMeal(null);
          const n = roundMacros(b.dish!);
          nav.navigate('CreatePost', { type: b.mealType, prefill: { description: b.recipe!.name, calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat } });
        }}
        onPick={(b) => { setOpenMeal(null); nav.navigate('Recipes', { planFor: b.mealType }); }}
        onSwap={(b) => plan.swap(b)}
        onRemove={(b) => plan.remove(b)}
        onTime={() => { setOpenMeal(null); nav.navigate('EditDay'); }}
      />
    </Screen>
  );
}

/**
 * The way in for logging food: a big search field (the main action), with barcode and photo
 * beside it. The buttons sit next to the field, never inside its pressable.
 */
function FoodSearchBar({ onSearch, onBarcode, onPhoto }: { onSearch: () => void; onBarcode: () => void; onPhoto: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: space.gutter, marginTop: 4, height: 56, borderRadius: radius.full, backgroundColor: palette.surfaceHigh, paddingRight: 6 }}>
      <PressableScale onPress={onSearch} label="Search a food to log" style={{ flex: 1, height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20 }}>
        <Icon name="search" color={palette.text} />
        <T color={palette.textMuted} lines={1} style={{ flex: 1 }}>Search a food to log</T>
      </PressableScale>
      <IconButton name="mc:barcode-scan" label="Log by barcode" color={palette.text} onPress={onBarcode} />
      <IconButton name="photo-camera" label="Log with a photo" color={palette.text} onPress={onPhoto} />
    </View>
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

/** One meal of the plan: its shape (traced with what's eaten), time, and dish or what was logged. */
function PlanMealCard({ type, block: b, items, budget, onOpen }: {
  type: MealType; block: DayBlock | undefined; items: FeedPost[]; budget: number; onOpen: () => void;
}) {
  const eaten = items.reduce((a, m) => a + m.calories, 0);
  const over = budget > 0 && eaten > budget * 1.15;
  const dish = items.length === 0 && b?.recipe ? b : null;
  const n = dish?.dish ? roundMacros(dish.dish) : null;
  const title = items.length > 0
    ? items.map((m) => m.description.trim() || MEAL[m.mealType].label).join(', ')
    : dish ? dish.recipe!.name : 'No dish planned';
  return (
    <PressableScale onPress={onOpen} label={`${MEAL[type].label}: ${title}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg, backgroundColor: palette.surface }}>
      <ExpressiveShape shape={mealShape[type]} size={52} fill={tone(over ? palette.ember : palette.primary, 0.12)}
        progress={budget > 0 ? eaten / budget : 0} progressColor={over ? palette.ember : palette.primary} trackColor={palette.surfaceHigh} progressWidth={4}>
        <Icon name={items.length > 0 ? 'check' : mealIcon(type)} size={22} color={over ? palette.ember : palette.primary} />
      </ExpressiveShape>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="overline" color={palette.textMuted}>{MEAL[type].label}{b ? `, ${clock(b.minute)}` : ''}</T>
        <T v="titleS" lines={2} color={dish || items.length > 0 ? palette.text : palette.textMuted}>{title}</T>
        {items.length > 0 ? (
          <T v="bodyS" color={palette.textMuted}>Logged, {formatKcal(eaten)} kcal</T>
        ) : n ? (
          <T v="bodyS" color={palette.textMuted}>
            {portionLabel(dish!.portion ?? 1)}, {formatKcal(n.calories)} kcal{'  '}
            <T v="bodyS" color={data.protein}>P {n.protein}</T>{'  '}
            <T v="bodyS" color={data.carbs}>C {n.carbs}</T>{'  '}
            <T v="bodyS" color={data.fat}>F {n.fat}</T>
          </T>
        ) : (
          <T v="bodyS" color={palette.textMuted}>About {formatKcal(budget)} kcal of your own</T>
        )}
      </View>
      <Icon name="chevron-right" color={palette.textMuted} />
    </PressableScale>
  );
}

/** A meal's foods, and with a plan its dish: macros, recipe, log it, or change it. */
function MealSheet({ type, items, budget, block, onDismiss, onAdd, onRecipe, onLogDish, onPick, onSwap, onRemove, onTime }: {
  type: MealType | null; items: FeedPost[]; budget: number; block: DayBlock | undefined;
  onDismiss: () => void; onAdd: (type: MealType) => void; onRecipe: (b: DayBlock) => void; onLogDish: (b: DayBlock) => void;
  onPick: (b: DayBlock) => void; onSwap: (b: DayBlock) => void; onRemove: (b: DayBlock) => void; onTime: () => void;
}) {
  const [shown, setShown] = useState<MealType | null>(type);
  if (type && type !== shown) setShown(type);
  const t = type ?? shown;
  const eaten = items.reduce((a, m) => a + m.calories, 0);
  const dish = block && items.length === 0 && block.recipe ? block : null;
  const n = dish?.dish ? roundMacros(dish.dish) : null;
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
            {block && <Button kind="tonal" compact icon="schedule" label={clock(block.minute)} onPress={onTime} />}
          </View>

          {dish && n && (
            <View style={{ borderRadius: radius.lg, backgroundColor: palette.surfaceHigh, padding: 16, gap: 12 }}>
              <View style={{ gap: 2 }}>
                <T v="overline" color={palette.textMuted}>{`Planned, ${portionLabel(dish.portion ?? 1)}`}</T>
                <T v="titleS">{dish.recipe!.name}</T>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <SheetStat value={formatKcal(n.calories)} label="kcal" color={palette.text} />
                <SheetStat value={`${n.protein} g`} label="Protein" color={data.protein} />
                <SheetStat value={`${n.carbs} g`} label="Carbs" color={data.carbs} />
                <SheetStat value={`${n.fat} g`} label="Fat" color={data.fat} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button kind="tonal" icon="menu-book" label="See the recipe" onPress={() => onRecipe(dish)} style={{ flex: 1 }} />
                <IconButton variant="tonal" name="refresh" label="Another idea" onPress={() => onSwap(dish)} />
                <IconButton variant="tonal" name="search" label="Choose another recipe" onPress={() => onPick(dish)} />
                <IconButton variant="tonal" name="close" label="No dish for this meal" onPress={() => onRemove(dish)} />
              </View>
            </View>
          )}
          {block && items.length === 0 && !block.recipe && (
            <Button kind="tonal" icon="add" label="Plan a dish" onPress={() => onPick(block)} style={{ alignSelf: 'flex-start' }} />
          )}

          {items.length === 0 ? (
            !dish && <T color={palette.textMuted}>Nothing logged yet.</T>
          ) : (
            <View style={{ borderRadius: radius.lg, backgroundColor: palette.surfaceHigh, paddingVertical: 4 }}>
              {items.map((meal) => <FoodLine key={meal.id} meal={meal} />)}
            </View>
          )}
          {dish
            ? (
              <View style={{ gap: 8 }}>
                <PrimaryButton label={`Log this dish, ${portionLabel(dish.portion ?? 1)}`} icon="check" onPress={() => onLogDish(dish)} />
                <Button kind="text" label="I ate something else" onPress={() => onAdd(t)} />
              </View>
            )
            : <PrimaryButton label={`Add to ${MEAL[t].label.toLowerCase()}`} icon="add" onPress={() => onAdd(t)} />}
        </View>
      )}
    </BottomSheet>
  );
}

function SheetStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T v="displayS" color={color} style={{ fontSize: 20, lineHeight: 24 }}>{value}</T>
      <T v="bodyS" color={palette.textMuted}>{label}</T>
    </View>
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
