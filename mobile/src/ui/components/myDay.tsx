/**
 * "My day": meals, the workout and bedtime on one vertical timeline. Each step sits in its
 * own shape (the meal shapes, the ascent triangle for the workout), and a line marks the
 * current time, so what's next is always obvious.
 *
 * The planned dish of each meal is the same here and in the Food tab (`useMyDay`): change
 * or remove it in one place and the other follows.
 */
import React, { useEffect, useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { buildDay, clock, DayBlock, makePlan, nowIndex, settingsFromProfile } from '../../data/dayPlan';
import { Macros, nextIdeaIn, onTarget, PlanPrefs, portionLabel } from '../../data/mealPlanner';
import { chosenDays, formatKcal, Goal, hasEverythingForPlan, PlanCalculator, UserProfile } from '../../data/profile';
import { dayPlansStore, daySettingsStore, DaySettingsRepository, isPlan, MealPlanRepository } from '../../data/dayPlanRepo';
import { profileStore } from '../../data/profileRepo';
import { Days, isMeal } from '../../data/social';
import { feedLive, SocialRepository } from '../../data/socialRepo';
import { activeProgramOf, activeStore, historyLive, TrainRepository, trainLive } from '../../data/trainRepo';
import { useNow, useStore } from '../../lib/store';
import { useNav } from '../../navigation/types';
import { data, Gutter, palette, radius, tone } from '../theme';
import { formatDate } from '../format';
import { haptics } from '../haptics';
import { ExpressiveShape } from '../shapes/ExpressiveShape';
import { mealShape, ShapeName, workoutShape } from '../shapes/library';
import { Button, Icon, IconButton, IconName, PressableScale, ProgressBar, T } from './core';
import { mealIcon } from './fuel';

const TIME_COL = 50;
const RAIL_COL = 36;
const MARK = 32;

/** Today's timeline and meal plan, shared by Home, the Food tab and "Plan my day". */
export function useMyDay() {
  const now = new Date(useNow());
  const profile = useStore(profileStore);
  const saved = useStore(daySettingsStore);
  const plans = useStore(dayPlansStore);
  const feed = useStore(feedLive);
  const history = useStore(historyLive);
  const train = useStore(trainLive);
  const myUid = SocialRepository.uid;
  const today = Days.key(now);

  useEffect(() => { DaySettingsRepository.load(); MealPlanRepository.load(); }, [myUid]);

  const settings = saved ?? settingsFromProfile(profile ? chosenDays(profile) : null, profile?.daysPerWeek ?? null);
  const state = plans[today];
  const entry = isPlan(state) ? state : null;
  // Today's goal can differ from the profile's: the targets follow the goal picked for the plan.
  const goal = entry?.prefs.goal ?? profile?.goal ?? null;
  const base = useMemo(() => ({
    date: new Date(),
    settings,
    goal,
    meals: feed.posts.filter((p) => isMeal(p) && p.uid === myUid && p.dayKey === today),
    history: history ?? [],
    program: activeProgramOf(train),
  }), [today, settings, goal, feed.posts, myUid, history, train]);
  const targets = useMemo(() => targetsOf(profile, goal), [profile, goal]);
  const view = useMemo(() => buildDay({ ...base, targets, plan: entry }), [base, targets, entry]);

  return {
    now, today, blocks: view.blocks, plan: view.plan, goal, targets,
    /** True when the person asked for a plan today. */
    planned: entry != null,
    /** True when they said "Not today". */
    declined: state != null && !entry,
    prefs: entry?.prefs ?? null,
    /** Makes and saves a plan for today from these preferences. */
    makePlan(prefs: PlanPrefs) {
      const t = targetsOf(profile, prefs.goal ?? profile?.goal ?? null);
      MealPlanRepository.save(today, makePlan({ ...base, goal: prefs.goal ?? base.goal, targets: t }, prefs));
    },
  };
}

/** The day's targets for a goal (the profile's own goal by default). */
export function targetsOf(p: UserProfile | null, goal: Goal | null = p?.goal ?? null): Macros | null {
  const withGoal = p && goal ? { ...p, goal } : p;
  if (!hasEverythingForPlan(withGoal)) return null;
  const t = PlanCalculator.nutrition(withGoal);
  return { calories: t.calories, protein: t.proteinG, carbs: t.carbsG, fat: t.fatG };
}

/** "Another idea" and "Remove" for a meal's planned dish. The other meals' portions adjust. */
export function useMealPlanActions(today: string) {
  return {
    swap(b: DayBlock) {
      if (!b.mealType) return;
      const next = nextIdeaIn((b.ideas ?? []).filter((r) => r.id !== b.recipe?.id), null);
      if (next) MealPlanRepository.set(today, b.mealType, next.id);
    },
    remove(b: DayBlock) {
      if (!b.mealType) return;
      MealPlanRepository.set(today, b.mealType, null);
    },
  };
}

export function MyDay() {
  const nav = useNav();
  const day = useMyDay();
  const { now, today, blocks, plan: dayPlan, planned, declined } = day;
  const active = useStore(activeStore);
  const history = useStore(historyLive);
  const feed = useStore(feedLive);
  const plan = useMealPlanActions(today);
  const nowAt = nowIndex(blocks, now);
  const done = blocks.filter((b) => b.done).length;
  const goals = blocks.filter((b) => !b.restDay && b.key !== 'sleep').length;
  const minute = now.getHours() * 60 + now.getMinutes();
  const eaten = feed.posts.filter((p) => isMeal(p) && p.uid === SocialRepository.uid && p.dayKey === today)
    .reduce((a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein }), { calories: 0, protein: 0 });

  function startWorkout(b: DayBlock) {
    haptics.confirm();
    if (!active && b.routine) TrainRepository.start(b.routine, history ?? []);
    nav.navigate('WorkoutSession');
  }

  return (
    <View style={{ paddingTop: 8, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter - 8 }}>
        <View style={{ flex: 1 }}>
          <T v="title">{formatDate.longDay(now.getTime())}</T>
          <T v="bodyS" color={palette.textMuted}>{done === 0 ? 'Your day, step by step' : `${done} of ${goals} done today`}</T>
        </View>
        {planned
          ? <Button kind="text" label="Edit plan" icon="tune" onPress={() => nav.navigate('PlanDay')} />
          : declined ? <Button kind="text" label="Plan my day" icon="restaurant-menu" onPress={() => nav.navigate('PlanDay')} /> : null}
      </View>

      {dayPlan && dayPlan.target.calories > 0
        ? <DayBalance total={dayPlan.total} target={dayPlan.target} style={{ marginTop: 12 }} />
        : (
          <>
            <TodaySoFar eaten={eaten} targets={day.targets} workout={blocks.find((b) => b.key === 'workout')} style={{ marginTop: 12 }} />
            {!declined && day.targets && <PlanOffer kcal={day.targets.calories} today={today} style={{ marginTop: 10 }} />}
          </>
        )}

      <View style={{ marginTop: 16 }}>
        {blocks.map((b, i) => (
          <React.Fragment key={b.key}>
            {i === nowAt && <NowLine minute={minute} />}
            <Row
              block={b}
              past={i < nowAt}
              last={i === blocks.length - 1}
              active={active != null}
              planned={planned}
              onPress={() => {
                if (b.mealType && !b.done) nav.navigate('CreatePost', { type: b.mealType });
                else if (b.key === 'workout' && !b.restDay) nav.navigate('TrainingPlan');
                else nav.navigate('EditDay');
              }}
              onTime={() => nav.navigate('EditDay')}
              onRecipe={() => b.recipe && nav.navigate('RecipeDetail', { recipeId: b.recipe.id, planFor: b.mealType, portion: b.portion })}
              onPick={() => b.mealType && nav.navigate('Recipes', { planFor: b.mealType })}
              onSwap={() => plan.swap(b)}
              onRemove={() => plan.remove(b)}
              onStart={() => startWorkout(b)}
            />
          </React.Fragment>
        ))}
        {nowAt === blocks.length && <NowLine minute={minute} />}
      </View>
      <View style={{ paddingHorizontal: Gutter }}>
        <Button kind="text" label="Edit times" icon="schedule" onPress={() => nav.navigate('EditDay')} style={{ alignSelf: 'flex-start' }} />
      </View>
    </View>
  );
}

/**
 * The offer to plan the day's meals, shown until the person accepts or says "Not today".
 * Nothing is suggested before they ask.
 */
export function PlanOffer({ kcal, today, style }: { kcal: number; today: string; style?: StyleProp<ViewStyle> }) {
  const nav = useNav();
  return (
    <View style={[{ marginHorizontal: Gutter, borderRadius: radius.lg, backgroundColor: palette.surface, padding: 18, gap: 14 }, style]}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <ExpressiveShape shape="cookie9" size={52} fill={tone(palette.primary, 0.16)}>
          <Icon name="restaurant-menu" color={palette.primary} />
        </ExpressiveShape>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="titleS">Want a meal plan for today?</T>
          <T v="bodyS" color={palette.textMuted}>
            Tell us your goal and what you like. We pick dishes and portions that add up to your {formatKcal(kcal)} kcal, protein, carbs and fat.
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button kind="filled" label="Plan my day" icon="restaurant-menu" onPress={() => nav.navigate('PlanDay')} style={{ flex: 1 }} />
        <Button kind="text" label="Not today" onPress={() => MealPlanRepository.decline(today)} />
      </View>
    </View>
  );
}

/** Without a plan: how the day is going so far, so Home is never empty. */
function TodaySoFar({ eaten, targets, workout, style }: {
  eaten: { calories: number; protein: number }; targets: Macros | null; workout: DayBlock | undefined; style?: StyleProp<ViewStyle>;
}) {
  const kcalLeft = targets ? targets.calories - eaten.calories : 0;
  return (
    <View style={[{ flexDirection: 'row', gap: 10, marginHorizontal: Gutter }, style]}>
      <MiniTile icon="local-fire-department" label="Eaten" value={formatKcal(eaten.calories)}
        caption={targets ? (kcalLeft >= 0 ? `${formatKcal(kcalLeft)} kcal left` : `${formatKcal(-kcalLeft)} kcal over`) : 'kcal'}
        progress={targets ? eaten.calories / targets.calories : undefined} color={kcalLeft < 0 ? palette.ember : palette.text} />
      <MiniTile icon="egg" label="Protein" value={`${Math.round(eaten.protein)} g`} caption={targets ? `of ${targets.protein} g` : 'today'}
        progress={targets ? eaten.protein / targets.protein : undefined} color={data.protein} />
      <MiniTile icon={workout?.restDay ? 'self-improvement' : 'fitness-center'} label="Training"
        value={workout?.done ? 'Done' : workout?.restDay ? 'Rest' : 'Today'} caption={workout?.done ? workout.title : workout?.restDay ? 'Recover well' : workout?.title ?? ''}
        color={workout?.done ? palette.primary : palette.text} />
    </View>
  );
}

function MiniTile({ icon, label, value, caption, progress, color }: {
  icon: IconName; label: string; value: string; caption: string; progress?: number; color: string;
}) {
  return (
    <View style={{ flex: 1, borderRadius: radius.lg, backgroundColor: palette.surface, padding: 14, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Icon name={icon} size={14} color={palette.textMuted} />
        <T v="overline" color={palette.textMuted} lines={1}>{label}</T>
      </View>
      <T v="displayS" color={color} style={{ fontSize: 22, lineHeight: 26 }} lines={1}>{value}</T>
      <T v="bodyS" color={palette.textMuted} lines={1}>{caption}</T>
      {progress != null && <View style={{ marginTop: 4 }}><ProgressBar progress={Math.min(progress, 1)} height={6} color={color === palette.text ? palette.primary : color} /></View>}
    </View>
  );
}

/** The shape and icon of a step: the meal's own shape, the ascent triangle, or the moon. */
function markOf(b: DayBlock): { shape: ShapeName; icon: IconName } {
  if (b.mealType) return { shape: mealShape[b.mealType], icon: mealIcon(b.mealType) };
  if (b.key === 'workout') return { shape: b.restDay ? 'pebble' : workoutShape, icon: b.restDay ? 'self-improvement' : 'fitness-center' };
  return { shape: 'circle', icon: 'bedtime' };
}

function Row({ block: b, past, last, active, planned, onPress, onTime, onRecipe, onPick, onSwap, onRemove, onStart }: {
  block: DayBlock; past: boolean; last: boolean; active: boolean; planned: boolean;
  onPress: () => void; onTime: () => void; onRecipe: () => void; onPick: () => void; onSwap: () => void; onRemove: () => void; onStart: () => void;
}) {
  // Missed steps (past and not done) fade back; done ones get a check.
  const dim = past && !b.done;
  const showStart = b.key === 'workout' && !b.done && !b.restDay && b.routine != null;
  // Dishes only show once the person asked for a plan.
  const openMeal = planned && b.mealType != null && !b.done && !past;
  const mark = markOf(b);
  return (
    <View style={{ flexDirection: 'row', paddingLeft: Gutter, paddingRight: Gutter }}>
      <PressableScale onPress={onTime} noHaptic label={`Change the time of ${b.title}, now ${clock(b.minute)}`} style={{ width: TIME_COL, paddingTop: 7 }}>
        <T v="label" color={dim ? palette.textFaint : palette.textMuted}>{clock(b.minute)}</T>
      </PressableScale>

      {/* The rail: each step's shape, joined by a hairline. */}
      <View style={{ width: RAIL_COL, alignItems: 'center' }}>
        <ExpressiveShape shape={b.done ? 'circle' : mark.shape} size={MARK}
          fill={b.done ? palette.primaryContainer : dim ? palette.surfaceHigh : tone(palette.primary, 0.14, palette.ink)}>
          <Icon name={b.done ? 'check' : mark.icon} size={16} color={b.done ? palette.onPrimaryContainer : dim ? palette.textFaint : palette.primary} />
        </ExpressiveShape>
        {!last && <View style={{ flex: 1, width: 2, borderRadius: 1, backgroundColor: palette.hairline, marginVertical: 4 }} />}
      </View>

      <View style={{ flex: 1, paddingLeft: 10, paddingBottom: last ? 4 : 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: MARK }}>
          {/* Only the text is the tap target, so the buttons beside and below it stay separate. */}
          <PressableScale onPress={onPress} noHaptic label={`${clock(b.minute)}, ${b.title}, ${b.detail}`} style={{ flex: 1 }}>
            <T v="titleS" color={dim ? palette.textMuted : palette.text}>{b.title}</T>
            <T v="bodyS" color={palette.textMuted}>{b.detail}</T>
          </PressableScale>
          {showStart && <Button kind="filled" compact label={active ? 'Resume' : 'Start'} icon="play-arrow" onPress={onStart} />}
        </View>
        {openMeal && (b.recipe
          ? <PlannedDish block={b} onOpen={onRecipe} onSwap={onSwap} onRemove={onRemove} />
          : <Button kind="tonal" compact icon="add" label="Plan a dish" onPress={onPick} style={{ alignSelf: 'flex-start', marginTop: 8 }} />)}
      </View>
    </View>
  );
}

/** The dish planned for a meal, with its two actions: another idea, or no dish. */
export function PlannedDish({ block, onOpen, onSwap, onRemove, background = palette.surface }: {
  block: DayBlock; onOpen: () => void; onSwap: () => void; onRemove: () => void; background?: string;
}) {
  const r = block.recipe!;
  const chosen = !!block.chosen;
  const kcal = Math.round(block.dish?.calories ?? 0);
  const protein = Math.round(block.dish?.protein ?? 0);
  return (
    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: background, borderRadius: radius.md, paddingLeft: 14, paddingRight: 2 }}>
      <PressableScale onPress={onOpen} label={`${chosen ? 'Planned' : 'Idea'}: ${r.name}, ${portionLabel(block.portion ?? 1)}, ${kcal} kcal`}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
        <Icon name="menu-book" size={18} color={palette.textMuted} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="overline" color={chosen ? palette.onPrimaryContainer : palette.textMuted}>{chosen ? 'Planned' : 'Idea'}</T>
          <T v="label" lines={2}>{r.name}</T>
          <T v="bodyS" color={palette.textMuted}>
            {portionLabel(block.portion ?? 1)}, {kcal} kcal, <T v="bodyS" color={data.protein}>{protein} g protein</T>
          </T>
        </View>
      </PressableScale>
      <IconButton name="refresh" label="Another idea" size={20} color={palette.text} onPress={onSwap} />
      <IconButton name="close" label="Remove this dish" size={20} color={palette.textMuted} onPress={onRemove} />
    </View>
  );
}

/**
 * The day's balance: what's logged plus what's planned, against each target. A check means
 * within 10%, close enough for real-life eating; otherwise an ember arrow says which way.
 */
export function DayBalance({ total, target, style }: { total: Macros; target: Macros; style?: StyleProp<ViewStyle> }) {
  const items: { label: string; got: number; want: number; unit: string; color: string }[] = [
    { label: 'Kcal', got: total.calories, want: target.calories, unit: '', color: palette.text },
    { label: 'Protein', got: total.protein, want: target.protein, unit: ' g', color: data.protein },
    { label: 'Carbs', got: total.carbs, want: target.carbs, unit: ' g', color: data.carbs },
    { label: 'Fat', got: total.fat, want: target.fat, unit: ' g', color: data.fat },
  ];
  return (
    <View style={[{ flexDirection: 'row', marginHorizontal: Gutter, paddingVertical: 14, paddingHorizontal: 6, borderRadius: radius.lg, backgroundColor: palette.surface }, style]}
      accessibilityLabel={`Planned day: ${items.map((i) => `${i.label} ${i.got} of ${i.want}${i.unit}`).join(', ')}`}>
      {items.map((i) => {
        const ok = onTarget(i.got, i.want);
        return (
          <View key={i.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <T v="overline" color={palette.textMuted}>{i.label}</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <T v="displayS" color={i.color} style={{ fontSize: 22, lineHeight: 26 }}>{Math.round(i.got)}</T>
              <Icon name={ok ? 'check' : i.got < i.want ? 'arrow-downward' : 'arrow-upward'} size={14} color={ok ? palette.textMuted : palette.ember} />
            </View>
            <T v="bodyS" color={palette.textMuted}>of {i.want}{i.unit}</T>
          </View>
        );
      })}
    </View>
  );
}

/** The current time, drawn across the rail. */
function NowLine({ minute }: { minute: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter, marginTop: -6, marginBottom: 12 }}
      accessibilityLabel={`Now, ${clock(minute)}`}>
      <T v="label" style={{ width: TIME_COL }}>{clock(minute)}</T>
      <View style={{ width: RAIL_COL, alignItems: 'center' }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: palette.text }} />
      </View>
      <View style={{ flex: 1, height: 2, borderRadius: 1, backgroundColor: palette.text, marginLeft: 10 }} />
      <T v="label" style={{ marginLeft: 8 }}>Now</T>
    </View>
  );
}
