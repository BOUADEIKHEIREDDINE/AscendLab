/** The recipe library: filter by goal, meal, time, budget and diet, then plan or log a dish in one tap. */
import React, { useMemo, useState } from 'react';
import { StackActions } from '@react-navigation/native';
import { ScrollView, TextInput, View } from 'react-native';
import { GOAL, Goal, GOALS } from '../../../data/profile';
import { profileStore } from '../../../data/profileRepo';
import {
  costPerServing, goalsFor, ingredientLine, IngredientId, isVegan, isVegetarian, perServing, PRICE_HINT, PRICE_LABEL, priceTier,
  PriceTier, Recipe, recipeById, RECIPES, totalMinutes,
} from '../../../data/recipes';
import { Days, MEAL, MealType, mealTypeForNow } from '../../../data/social';
import { dayPlansStore, isPlan, MealPlanRepository } from '../../../data/dayPlanRepo';
import { macrosFor, portionLabel, roundMacros } from '../../../data/mealPlanner';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { data, Gutter, palette, space, tone, type } from '../../theme';
import {
  Bento, Button, Chip, EmptyState, Icon, ListGroup, ListRow, PageHeader, PrimaryButton, Screen, SectionTitle, T, Tile, TileHeader, TileNumber,
} from '../../components/core';
import { mealIcon } from '../../components/fuel';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { mealShape } from '../../shapes/library';
import { haptics } from '../../haptics';

type MealFilter = 'ALL' | 'BREAKFAST' | 'MAIN' | 'SNACK';
const MEAL_FILTERS: { key: MealFilter; label: string }[] = [
  { key: 'ALL', label: 'All meals' }, { key: 'BREAKFAST', label: 'Breakfast' }, { key: 'MAIN', label: 'Lunch & dinner' }, { key: 'SNACK', label: 'Snacks & desserts' },
];
const TIME_FILTERS = [{ max: 0, label: 'Any time' }, { max: 15, label: '15 min or less' }, { max: 30, label: '30 min or less' }];
type Diet = 'ANY' | 'VEGETARIAN' | 'VEGAN';

const matchesMeal = (r: Recipe, f: MealFilter) =>
  f === 'ALL' || (f === 'MAIN' ? r.meals.includes('LUNCH') || r.meals.includes('DINNER') : r.meals.includes(f));

/** Kitchen-friendly amounts: whole grams when small, steps of 5 g above 20 g. */
const scaleGrams = (g: number) => (g < 20 ? Math.max(1, Math.round(g)) : Math.round(g / 5) * 5);

const filterFor = (m: MealType): MealFilter => (m === 'LUNCH' || m === 'DINNER' ? 'MAIN' : m);

const dietLabel = (r: Recipe) => (isVegan(r) ? 'Vegan' : isVegetarian(r) ? 'Vegetarian' : null);

/** The meal a recipe's shape and icon come from: the planned meal, else its first meal. */
const shapeMeal = (r: Recipe, planFor?: MealType): MealType => (planFor && r.meals.includes(planFor) ? planFor : r.meals[0]);

function MealMark({ meal, size = 40 }: { meal: MealType; size?: number }) {
  return (
    <ExpressiveShape shape={mealShape[meal]} size={size} fill={tone(palette.primary, 0.14)}>
      <Icon name={mealIcon(meal)} size={size * 0.45} color={palette.primary} />
    </ExpressiveShape>
  );
}

export function RecipesScreen() {
  const nav = useNav();
  // Opened from a meal's "Plan a dish": show dishes for that meal, and plan the one picked.
  const { planFor } = useParams<'Recipes'>() ?? {};
  const profile = useStore(profileStore);
  const [goal, setGoal] = useState<Goal | null>(profile?.goal ?? null);
  const [meal, setMeal] = useState<MealFilter>(planFor ? filterFor(planFor) : 'ALL');
  const [maxMin, setMaxMin] = useState(0);
  const [price, setPrice] = useState<PriceTier | null>(null);
  const [diet, setDiet] = useState<Diet>('ANY');
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RECIPES.filter((r) =>
      (goal == null || goalsFor(r).includes(goal))
      && matchesMeal(r, meal)
      && (maxMin === 0 || totalMinutes(r) <= maxMin)
      && (price == null || priceTier(r) === price)
      && (diet === 'ANY' || (diet === 'VEGAN' ? isVegan(r) : isVegetarian(r)))
      && (!q || `${r.name} ${r.cuisine} ${r.flavors.join(' ')}`.toLowerCase().includes(q)));
  }, [goal, meal, maxMin, price, diet, query]);

  const reset = () => { setGoal(null); setMeal('ALL'); setMaxMin(0); setPrice(null); setDiet('ANY'); setQuery(''); };

  return (
    <Screen>
      <PageHeader title={planFor ? `A dish for ${MEAL[planFor].label.toLowerCase()}` : 'Recipes'} onBack={() => goBack(nav)} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ marginHorizontal: Gutter, marginTop: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceHigh, borderRadius: 16, paddingLeft: 14, minHeight: 52 }}>
          <Icon name="search" color={palette.textMuted} size={20} />
          <TextInput
            value={query}
            onChangeText={(t) => setQuery(t.slice(0, 60))}
            placeholder="Curry, pasta, Mexican, spicy…"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.primary}
            keyboardAppearance="dark"
            accessibilityLabel="Search recipes"
            style={[type.body, { flex: 1, color: palette.text, paddingHorizontal: 10, paddingVertical: 12 }]}
          />
        </View>

        <ChipRow>
          <Chip label="Any goal" selected={goal == null} onPress={() => setGoal(null)} />
          {GOALS.map((g) => <Chip key={g} label={GOAL[g].label} selected={goal === g} onPress={() => setGoal(g)} />)}
        </ChipRow>
        <ChipRow>
          {MEAL_FILTERS.map((f) => <Chip key={f.key} label={f.label} selected={meal === f.key} onPress={() => setMeal(f.key)} />)}
        </ChipRow>
        <ChipRow>
          {TIME_FILTERS.map((f) => <Chip key={f.max} label={f.label} selected={maxMin === f.max} onPress={() => setMaxMin(f.max)} />)}
        </ChipRow>
        <ChipRow>
          <Chip label="Any budget" selected={price == null} onPress={() => setPrice(null)} />
          {([1, 2, 3] as PriceTier[]).map((t) => <Chip key={t} label={`${PRICE_LABEL[t]}  ${PRICE_HINT[t]}`} selected={price === t} onPress={() => setPrice(t)} />)}
        </ChipRow>
        <ChipRow>
          <Chip label="Everything" selected={diet === 'ANY'} onPress={() => setDiet('ANY')} />
          <Chip label="Vegetarian" selected={diet === 'VEGETARIAN'} onPress={() => setDiet('VEGETARIAN')} />
          <Chip label="Vegan" selected={diet === 'VEGAN'} onPress={() => setDiet('VEGAN')} />
        </ChipRow>

        <SectionTitle text={`${results.length} ${results.length === 1 ? 'recipe' : 'recipes'}`} />
        {results.length === 0 ? (
          <EmptyState icon="menu-book" title="No recipe matches" hint="Loosen a filter or two to see more dishes."
            action={<Button kind="tonal" label="Clear filters" onPress={reset} />} />
        ) : (
          <ListGroup>
            {results.map((r) => {
              const n = perServing(r);
              return (
                <ListRow
                  key={r.id}
                  leading={<MealMark meal={shapeMeal(r, planFor)} />}
                  title={r.name}
                  subtitle={[`${totalMinutes(r)} min`, `€${costPerServing(r).toFixed(2)}`, `${n.protein} g protein`, dietLabel(r)].filter(Boolean).join(', ')}
                  trailing={(
                    <View style={{ alignItems: 'flex-end' }}>
                      <T v="displayS" style={{ fontSize: 20, lineHeight: 24 }}>{n.calories}</T>
                      <T v="bodyS" color={palette.textMuted}>kcal</T>
                    </View>
                  )}
                  label={`${r.name}, ${n.calories} kcal`}
                  onPress={() => nav.navigate('RecipeDetail', { recipeId: r.id, planFor, fromPicker: planFor != null })}
                />
              );
            })}
          </ListGroup>
        )}
      </ScrollView>
    </Screen>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingTop: 10, gap: 8 }}>
      {children}
    </ScrollView>
  );
}

export function RecipeDetailScreen() {
  const nav = useNav();
  const { recipeId, planFor, fromPicker, portion: plannedPortion } = useParams<'RecipeDetail'>();
  const [wholeRecipe, setWholeRecipe] = useState(false);
  const plans = useStore(dayPlansStore);
  const r = recipeById(recipeId);
  if (!r) {
    return (
      <Screen>
        <PageHeader title="Recipe" onBack={() => goBack(nav)} />
        <EmptyState icon="menu-book" title="Recipe not found" hint="This recipe is no longer available." />
      </Screen>
    );
  }
  // From the plan, the dish comes at the portion that balances the day; otherwise one serving.
  const portion = plannedPortion ?? 1;
  const n = roundMacros(macrosFor(r, portion));
  const goals = goalsFor(r);
  const now = mealTypeForNow();
  const logAs: MealType = planFor ?? (r.meals.includes(now) ? now : r.meals[0]);
  const today = Days.key();
  const todayPlan = plans[today];
  const hasPlan = isPlan(todayPlan);
  const planned = isPlan(todayPlan) && todayPlan.choices[logAs] === r.id;
  const mealName = MEAL[logAs].label.toLowerCase();
  const diet = dietLabel(r);

  return (
    <Screen>
      <PageHeader title="Recipe" onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: Gutter, paddingTop: 4, paddingBottom: 16 }}>
          <MealMark meal={shapeMeal(r, planFor)} size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="headline">{r.name}</T>
            <T color={palette.textMuted}>{[r.cuisine, ...r.flavors].join(', ')}</T>
          </View>
        </View>

        <Bento>
          <Tile span="2x1">
            <TileHeader icon="local-fire-department" text={portion === 1 ? 'One serving' : `Your portion, ${portionLabel(portion)}`} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
              <View style={{ flex: 1 }}><TileNumber value={`${n.calories}`} caption="kcal" /></View>
              <Macro label="Protein" grams={n.protein} color={data.protein} />
              <Macro label="Carbs" grams={n.carbs} color={data.carbs} />
              <Macro label="Fat" grams={n.fat} color={data.fat} />
            </View>
          </Tile>
          <Tile style={{ minHeight: 0 }}>
            <TileHeader icon="schedule" text="Time" />
            <View style={{ height: 8 }} />
            <TileNumber v="displayS" value={`${totalMinutes(r)} min`} caption={`${r.prepMin} prep, ${r.cookMin} cook`} />
          </Tile>
          <Tile style={{ minHeight: 0 }}>
            <TileHeader icon="euro" text={`Cost, ${PRICE_LABEL[priceTier(r)]}`} />
            <View style={{ height: 8 }} />
            <TileNumber v="displayS" value={`€${(costPerServing(r) * portion).toFixed(2)}`} caption={portion === 1 ? 'Per serving' : 'For your portion'} />
          </Tile>
        </Bento>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: Gutter, paddingTop: 14 }}>
          {goals.map((g) => <Tag key={g} text={GOAL[g].label} />)}
          {diet && <Tag text={diet} />}
        </View>
        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingTop: 12 }}>
          {portion === 1 ? 'Numbers per serving.' : `Your portion is sized so your day meets its targets.`}
          {' '}The recipe makes {r.servings} {r.servings === 1 ? 'serving' : 'servings'}.{r.restNote ? ` Plus: ${r.restNote.toLowerCase()}.` : ''}
        </T>

        <SectionTitle text="Ingredients" />
        {r.servings !== portion && (
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Gutter, paddingBottom: 10 }}>
            <Chip label={portion === 1 ? '1 serving' : 'Your portion'} selected={!wholeRecipe} onPress={() => setWholeRecipe(false)} />
            <Chip label={`Whole recipe (${r.servings})`} selected={wholeRecipe} onPress={() => setWholeRecipe(true)} />
          </View>
        )}
        <ListGroup>
          {(Object.entries(r.ingredients) as [IngredientId, number][]).map(([id, grams]) => (
            <View key={id} style={{ paddingHorizontal: space.tilePad, paddingVertical: 12 }}>
              <T>{ingredientLine(id, wholeRecipe ? grams : scaleGrams(grams * portion / r.servings))}</T>
            </View>
          ))}
        </ListGroup>

        <SectionTitle text="Seasoning" />
        <T color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>{r.seasoning.join(', ')}</T>

        <SectionTitle text="Steps" />
        <View style={{ paddingHorizontal: Gutter, gap: 14 }}>
          {r.steps.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
              <ExpressiveShape shape="cookie9" size={30} fill={palette.surfaceHigh}>
                <T v="label">{i + 1}</T>
              </ExpressiveShape>
              <T style={{ flex: 1, paddingTop: 4 }}>{s}</T>
            </View>
          ))}
        </View>

        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingTop: 24 }}>
          Nutrition from the Ciqual table (Anses). Prices are average French supermarket prices and may vary.
        </T>
      </ScrollView>
      <View style={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
        {/* With a plan for today: put this dish in it. The other portions adjust to keep the day on target. */}
        {hasPlan && (
          <Button
            kind="tonal"
            icon={planned ? 'check' : 'swap-horiz'}
            label={planned ? `In today's plan for ${mealName}` : `Use for today's ${mealName}`}
            enabled={!planned}
            onPress={() => {
              haptics.confirm();
              MealPlanRepository.set(today, logAs, r.id);
              // Back to where the meal was planned from: Home or the Food tab.
              if (planFor) nav.dispatch(StackActions.pop(fromPicker ? 2 : 1));
            }}
          />
        )}
        <PrimaryButton
          label={`Log ${portionLabel(portion)} as ${mealName}`}
          icon="add"
          onPress={() => nav.navigate('CreatePost', {
            type: logAs,
            prefill: { description: r.name, calories: n.calories, protein: n.protein, carbs: n.carbs, fat: n.fat },
          })}
        />
      </View>
    </Screen>
  );
}

function Macro({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <View style={{ alignItems: 'flex-end', marginLeft: 14 }}>
      <T v="displayS" color={color} style={{ fontSize: 22, lineHeight: 26 }}>{grams} g</T>
      <T v="bodyS" color={palette.textMuted}>{label}</T>
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: palette.surfaceHighest, justifyContent: 'center' }}>
      <T v="label">{text}</T>
    </View>
  );
}
