/**
 * Open Food Facts: the free, open database of packaged foods (https://openfoodfacts.org).
 * Used to fill in a meal's calories and macros from a product name or barcode.
 *
 * Search uses the classic API because it allows calls from a browser (CORS), unlike the newer
 * search.openfoodfacts.org. It is limited to about 10 searches a minute per user, so the app
 * only searches when the user submits, never on every keystroke.
 */
import { Platform } from 'react-native';

const BASE = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_fr,product_name_en,brands,nutriments,serving_quantity,image_small_url';
// Open Food Facts asks apps to identify themselves. Browsers don't allow setting User-Agent.
const HEADERS: Record<string, string> = Platform.OS === 'web' ? {} : { 'User-Agent': 'AscendLab/0.1 (student project)' };
const TIMEOUT_MS = 15000;

/** A product, with its nutrition per 100 g (or 100 ml). */
export type Food = {
  code: string;
  name: string;
  brand: string;
  kcal100: number;
  protein100: number;
  carbs100: number;
  fat100: number;
  /** Grams in one serving when the product says so, else null. */
  servingG: number | null;
  imageUrl: string | null;
};

/** A food added to a meal, with the amount eaten. */
export type MealItem = { food: Food; grams: number };

export type Totals = { calories: number; protein: number; carbs: number; fat: number };

export type SearchResult = { foods: Food[] } | { error: string };

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

/** Turns a raw Open Food Facts product into a Food, or null when it has no usable calories. */
export function foodFromProduct(p: unknown): Food | null {
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>;
  const n = (o.nutriments ?? {}) as Record<string, unknown>;
  // Some products only give kJ: 1 kcal = 4.184 kJ.
  const kj = num(n['energy-kj_100g']) ?? num(n.energy_100g);
  const kcal = num(n['energy-kcal_100g']) ?? (kj != null ? kj / 4.184 : null);
  // The app is used in French and English: prefer those names, and skip names in other scripts.
  const name = [o.product_name_fr, o.product_name_en, o.product_name]
    .find((s) => typeof s === 'string' && /[a-zà-ÿ]/i.test(s)) as string | undefined;
  if (kcal == null || !name || kcal > 900) return null; // 900 kcal/100 g is pure fat: anything above is a typo
  const brands = typeof o.brands === 'string' ? o.brands : Array.isArray(o.brands) ? o.brands.join(', ') : '';
  const serving = num(o.serving_quantity);
  return {
    code: String(o.code ?? ''),
    name: name.trim(),
    brand: brands.split(',')[0]?.trim() ?? '',
    kcal100: kcal,
    protein100: num(n.proteins_100g) ?? 0,
    carbs100: num(n.carbohydrates_100g) ?? 0,
    fat100: num(n.fat_100g) ?? 0,
    servingG: serving != null && serving > 0 && serving <= 2000 ? serving : null,
    imageUrl: typeof o.image_small_url === 'string' ? o.image_small_url : null,
  };
}

/** Calories and macros for an amount of a food, rounded like the meal form expects. */
export function itemTotals({ food, grams }: MealItem): Totals {
  const k = grams / 100;
  return { calories: food.kcal100 * k, protein: food.protein100 * k, carbs: food.carbs100 * k, fat: food.fat100 * k };
}

export function mealTotals(items: MealItem[]): Totals {
  const sum = items.map(itemTotals).reduce(
    (a, t) => ({ calories: a.calories + t.calories, protein: a.protein + t.protein, carbs: a.carbs + t.carbs, fat: a.fat + t.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return { calories: Math.round(sum.calories), protein: Math.round(sum.protein), carbs: Math.round(sum.carbs), fat: Math.round(sum.fat) };
}

/** "Skyr, Yoplait 150 g + Banana 120 g": the meal description built from its foods. */
export const describeItems = (items: MealItem[]) =>
  items.map((i) => `${i.food.name}${i.food.brand ? `, ${i.food.brand}` : ''} ${i.grams} g`).join(' + ').slice(0, 200);

/**
 * The search server is often busy (503, which the browser reports as a network error since
 * that answer has no CORS header). Two more tries, a moment apart, get through most of the time.
 */
async function getJson(url: string, tries = 3): Promise<unknown> {
  for (let i = 1; ; i++) {
    try {
      return await getJsonOnce(url);
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      if (i >= tries || aborted || (e instanceof Error && e.message === 'http')) throw e;
      await new Promise((r) => setTimeout(r, 1200 * i));
    }
  }
}

async function getJsonOnce(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (res.status === 429 || res.status === 503) throw new Error('rate');
    if (!res.ok) throw new Error('http');
    // When busy, the server sometimes answers with an HTML page instead of JSON.
    return await res.json().catch(() => { throw new Error('rate'); });
  } finally {
    clearTimeout(timer);
  }
}

function failure(e: unknown): { error: string } {
  if (e instanceof Error && e.message === 'rate') return { error: 'Open Food Facts is busy. Wait a minute and try again.' };
  if (e instanceof Error && e.name === 'AbortError') return { error: 'Open Food Facts is taking too long. Check your connection and try again.' };
  return { error: "Couldn't reach Open Food Facts. Check your connection and try again." };
}

const words = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean);

/** Foods whose name holds every searched word first, then some of them, keeping the API's order otherwise. */
export function rankByName(foods: Food[], query: string): Food[] {
  const q = words(query);
  const score = (f: Food) => {
    const name = words(`${f.name} ${f.brand}`).join(' ');
    return q.filter((w) => name.includes(w)).length;
  };
  return foods.map((f, i) => ({ f, i, s: score(f) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.f);
}

/** Searches by name, or looks up a product when the query is a barcode (8 to 14 digits). */
export async function searchFoods(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { foods: [] };
  try {
    if (/^\d{8,14}$/.test(q)) {
      const data = (await getJson(`${BASE}/api/v2/product/${q}.json?fields=${FIELDS}`)) as { product?: unknown };
      const food = foodFromProduct(data.product);
      return { foods: food ? [food] : [] };
    }
    const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=24&fields=${FIELDS}`;
    const data = (await getJson(url)) as { products?: unknown[] };
    const seen = new Set<string>();
    const foods = (data.products ?? []).map(foodFromProduct).filter((f): f is Food => {
      if (!f) return false;
      const key = `${f.name}|${f.brand}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { foods: rankByName(foods, q) };
  } catch (e) {
    return failure(e);
  }
}
