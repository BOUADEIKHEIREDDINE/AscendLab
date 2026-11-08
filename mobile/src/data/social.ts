/** Feed posts, comments, friends and the daily race. Ported from Social.kt. */
import { Timestamp } from 'firebase/firestore';
import { WorkoutInfo } from './training';

/** `share` is the usual slice of the day's calories for that meal (Breakfast 25%, etc.). */
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export const MEAL_TYPES: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
export const MEAL: Record<MealType, { label: string; share: number }> = {
  BREAKFAST: { label: 'Breakfast', share: 0.25 },
  LUNCH: { label: 'Lunch', share: 0.35 },
  DINNER: { label: 'Dinner', share: 0.3 },
  SNACK: { label: 'Snacks', share: 0.1 },
};

/** A sensible default from the time of day. */
export function mealTypeForNow(): MealType {
  const h = new Date().getHours();
  if (h >= 4 && h <= 10) return 'BREAKFAST';
  if (h >= 11 && h <= 14) return 'LUNCH';
  if (h >= 18 && h <= 22) return 'DINNER';
  return 'SNACK';
}

/**
 * One post in the friends' feed: a logged meal, or a finished workout when `workout`
 * is set. Logging a meal is posting it: it counts toward the author's day. `target` is
 * the author's calorie goal when they posted, so standings never read private profiles.
 */
export interface FeedPost {
  id: string;
  uid: string;
  authorName: string;
  dayKey: string;
  mealType: MealType;
  description: string;
  calories: number;
  target: number;
  /** Grams of protein; 0 when the author didn't enter it. */
  protein: number;
  proteinTarget: number;
  carbs: number;
  fat: number;
  /** Small JPEG, base64-encoded, or null when the meal has no photo. */
  photo: string | null;
  likes: string[];
  createdAt: Date;
  workout: WorkoutInfo | null;
  commentCount: number;
}

export const isMeal = (p: FeedPost) => p.workout == null;

const int = (v: unknown, fallback = 0) => (typeof v === 'number' ? Math.trunc(v) : fallback);

export function postFromMap(id: string, m: Record<string, unknown>): FeedPost | null {
  try {
    const workout: WorkoutInfo | null = m.kind === 'workout' ? {
      title: typeof m.title === 'string' ? m.title : 'Workout',
      durationSec: int(m.durationSec),
      volumeKg: int(m.volumeKg),
      sets: int(m.sets),
      records: int(m.records),
      exercises: (Array.isArray(m.exercises) ? m.exercises : []).filter((x) => x && typeof x === 'object').map((x) => {
        const e = x as Record<string, unknown>;
        return { name: typeof e.name === 'string' ? e.name : '', sets: int(e.sets), best: typeof e.best === 'string' ? e.best : '' };
      }),
    } : null;
    if (typeof m.uid !== 'string' || typeof m.dayKey !== 'string') return null;
    if (workout == null && typeof m.calories !== 'number') return null;
    const created = m.createdAt;
    // A post written while offline has no server time yet; it's "now" until confirmed.
    const createdAt = created instanceof Timestamp ? created.toDate() : new Date();
    return {
      id,
      uid: m.uid,
      authorName: typeof m.authorName === 'string' ? m.authorName : 'Someone',
      dayKey: m.dayKey,
      mealType: MEAL_TYPES.includes(m.mealType as MealType) ? (m.mealType as MealType) : 'SNACK',
      description: typeof m.description === 'string' ? m.description : '',
      calories: int(m.calories),
      target: int(m.target),
      protein: int(m.protein),
      proteinTarget: int(m.proteinTarget),
      carbs: int(m.carbs),
      fat: int(m.fat),
      photo: typeof m.photo === 'string' ? m.photo : null,
      likes: Array.isArray(m.likes) ? (m.likes.filter((x) => typeof x === 'string') as string[]) : [],
      createdAt,
      workout,
      commentCount: int(m.commentCount),
    };
  } catch {
    return null;
  }
}

/** A comment under a post: text, a photo, or both. */
export interface Comment { id: string; uid: string; authorName: string; text: string; photo: string | null; createdAt: Date }

/** What other people can see about someone: their name, friend code and friends. */
export interface PublicProfile { uid: string; name: string; code: string; friends: string[] }

/** One person's day in the friends' race to land closest to their calorie goal. */
export interface Standing { uid: string; name: string; eaten: number; target: number; meals: number }
/** Calories over (+) or under (-) the goal. */
export const gapOf = (s: Standing) => s.eaten - s.target;

const pad = (n: number) => String(n).padStart(2, '0');

export const Days = {
  /** Local calendar day as "yyyy-MM-dd", the key every meal and weigh-in is filed under. */
  key(date: Date = new Date()): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  },
  yesterday(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return Days.key(d);
  },
  /** Start of a "yyyy-MM-dd" day in local time (ms), or null when the key is malformed. */
  parse(key: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  },
  /** Ranks everyone who logged at least one meal on `dayKey`, closest to their goal first. */
  standings(posts: FeedPost[], dayKey: string): Standing[] {
    const groups = new Map<string, FeedPost[]>();
    posts.filter((p) => isMeal(p) && p.dayKey === dayKey && p.target > 0).forEach((p) => {
      groups.set(p.uid, [...(groups.get(p.uid) ?? []), p]);
    });
    return [...groups.entries()].map(([uid, meals]) => {
      const latest = meals.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
      return { uid, name: latest.authorName, eaten: meals.reduce((a, m) => a + m.calories, 0), target: latest.target, meals: meals.length };
    }).sort((a, b) => Math.abs(gapOf(a)) - Math.abs(gapOf(b)) || b.meals - a.meals);
  },
};

const ON_TARGET = 50;
export const isOnTarget = (gap: number) => Math.abs(gap) <= ON_TARGET;

export function gapLabel(gap: number): string {
  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (Math.abs(gap) <= ON_TARGET) return 'on target';
  return gap < 0 ? `${fmt(-gap)} under` : `${fmt(gap)} over`;
}

export const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);
