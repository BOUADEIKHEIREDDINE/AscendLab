import { GOALS } from '../profile';
import {
  costPerServing, goalsFor, ingredientLine, INGREDIENTS, IngredientId, isVegan, isVegetarian, perServing, priceTier, RECIPES, totalMinutes,
} from '../recipes';

describe('recipe library', () => {
  test('has about 70 recipes with unique ids', () => {
    expect(RECIPES.length).toBe(70);
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(RECIPES.length);
  });

  test('every recipe is complete', () => {
    for (const r of RECIPES) {
      expect(r.steps.length).toBeGreaterThan(0);
      expect(r.seasoning.length).toBeGreaterThan(0); // never bland
      expect(r.servings).toBeGreaterThan(0);
      for (const [id, grams] of Object.entries(r.ingredients)) {
        expect(INGREDIENTS[id as IngredientId]).toBeDefined();
        expect(grams).toBeGreaterThan(0);
      }
    }
  });

  test('every recipe fits at least one goal, and every goal has plenty of choice', () => {
    for (const r of RECIPES) expect({ id: r.id, goals: goalsFor(r).length > 0 }).toEqual({ id: r.id, goals: true });
    for (const g of GOALS) expect(RECIPES.filter((r) => goalsFor(r).includes(g)).length).toBeGreaterThanOrEqual(20);
  });

  test('covers every budget, schedule, meal and diet', () => {
    for (const tier of [1, 2, 3] as const) expect(RECIPES.filter((r) => priceTier(r) === tier).length).toBeGreaterThanOrEqual(5);
    expect(RECIPES.filter((r) => totalMinutes(r) <= 15).length).toBeGreaterThanOrEqual(10);
    expect(RECIPES.filter((r) => totalMinutes(r) > 30).length).toBeGreaterThanOrEqual(10);
    for (const m of ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const) expect(RECIPES.filter((r) => r.meals.includes(m)).length).toBeGreaterThanOrEqual(10);
    expect(RECIPES.filter(isVegan).length).toBeGreaterThanOrEqual(10);
    expect(RECIPES.filter(isVegetarian).length).toBeGreaterThanOrEqual(25);
    expect(new Set(RECIPES.map((r) => r.cuisine)).size).toBeGreaterThanOrEqual(7);
  });

  test('numbers add up from Ciqual values', () => {
    const omelette = RECIPES.find((r) => r.id === 'ham-mushroom-omelette')!;
    // 180 g egg (252) + 50 g ham (62.5) + 20 g emmental (73.4) + 80 g mushrooms (22.4) + 5 g butter (37.65)
    // + 80 g wholemeal bread (195.2) = 643.15
    expect(perServing(omelette).calories).toBe(643);
    // 0.9 + 0.75 + 0.2 + 0.4 + 0.05 + 0.32 = 2.62 €
    expect(costPerServing(omelette)).toBe(2.62);
    // Every serving is a believable meal size.
    for (const r of RECIPES) {
      const kcal = perServing(r).calories;
      expect(kcal).toBeGreaterThan(100);
      expect(kcal).toBeLessThan(900);
    }
  });

  test('diet flags', () => {
    expect(isVegan(RECIPES.find((r) => r.id === 'chana-masala')!)).toBe(true);
    expect(isVegan(RECIPES.find((r) => r.id === 'chocolate-skyr-mousse')!)).toBe(false);
    expect(isVegetarian(RECIPES.find((r) => r.id === 'chocolate-skyr-mousse')!)).toBe(true);
    expect(isVegetarian(RECIPES.find((r) => r.id === 'nicoise-salad')!)).toBe(false);
  });

  test('ingredient lines count pieces', () => {
    expect(ingredientLine('egg', 120)).toBe('2 eggs (120 g)');
    expect(ingredientLine('egg', 60)).toBe('1 egg (60 g)');
    expect(ingredientLine('garlic', 12)).toBe('3 garlic cloves (12 g)');
    expect(ingredientLine('basmati', 140)).toBe('Basmati rice (dry), 140 g');
  });
});
