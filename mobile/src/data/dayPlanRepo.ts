/** Saves each person's "My day" times and training days on the device. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { currentUid } from '../lib/firebase';
import { createStore } from '../lib/store';
import { DayPlanEntry, DaySettings, parseSettings } from './dayPlan';
import { MealType } from './social';

/** The signed-in person's settings, or null until they have saved some (defaults apply). */
export const daySettingsStore = createStore<DaySettings | null>(null);
const storageKey = (uid: string) => `day:${uid}`;

export const DaySettingsRepository = {
  async load(): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    try { daySettingsStore.set(parseSettings(await AsyncStorage.getItem(storageKey(uid)))); } catch { /* keep defaults */ }
  },
  async save(s: DaySettings): Promise<void> {
    daySettingsStore.set(s);
    const uid = currentUid();
    if (!uid) return;
    try { await AsyncStorage.setItem(storageKey(uid), JSON.stringify(s)); } catch { /* device storage full: keep in memory */ }
  },
};

// ---------------------------------------------------------------- Meal plan

/**
 * A day's meal plan, by day ("2026-11-10"): the plan the person asked for, or `declined` when
 * they said "Not today". Days without an entry show the offer to plan. Two weeks are kept.
 */
export type DayPlanState = DayPlanEntry | { declined: true };
export const dayPlansStore = createStore<Record<string, DayPlanState>>({});
const plansKey = (uid: string) => `plans:${uid}`;
const KEEP_DAYS = 14;

export const isPlan = (s: DayPlanState | undefined): s is DayPlanEntry => s != null && 'prefs' in s;

async function persist() {
  const uid = currentUid();
  if (!uid) return;
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
  const kept = Object.fromEntries(Object.entries(dayPlansStore.get()).filter(([day]) => day >= cutoff));
  try { await AsyncStorage.setItem(plansKey(uid), JSON.stringify(kept)); } catch { /* keep in memory */ }
}

function put(dayKey: string, state: DayPlanState | null) {
  const all = { ...dayPlansStore.get() };
  if (state) all[dayKey] = state; else delete all[dayKey];
  dayPlansStore.set(all);
  persist();
}

export const MealPlanRepository = {
  async load(): Promise<void> {
    const uid = currentUid();
    if (!uid) return;
    try {
      const json = await AsyncStorage.getItem(plansKey(uid));
      const data = json ? JSON.parse(json) : {};
      dayPlansStore.set(data && typeof data === 'object' ? data : {});
    } catch { /* start empty */ }
  },
  /** Saves a new plan for the day (replacing any earlier one). */
  save(dayKey: string, plan: DayPlanEntry): void { put(dayKey, plan); },
  /** "Not today": no plan, and the offer folds away for the day. */
  decline(dayKey: string): void { put(dayKey, { declined: true }); },
  /** Back to no plan, with the offer shown again. */
  clear(dayKey: string): void { put(dayKey, null); },
  /** Puts a recipe in the plan for a meal (an id), or leaves the meal without a dish (null). */
  set(dayKey: string, meal: MealType, recipeId: string | null): void {
    const current = dayPlansStore.get()[dayKey];
    if (!isPlan(current)) return;
    const meals = current.prefs.meals.includes(meal) ? current.prefs.meals : [...current.prefs.meals, meal];
    put(dayKey, { prefs: { ...current.prefs, meals }, choices: { ...current.choices, [meal]: recipeId } });
  },
};
