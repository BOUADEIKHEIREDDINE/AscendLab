import { describeItems, foodFromProduct, mealTotals, rankByName } from '../openFoodFacts';

const skyr = {
  code: '123', product_name: 'Skyr', brands: 'Yoplait, General Mills', serving_quantity: '150',
  nutriments: { 'energy-kcal_100g': 56, proteins_100g: 10, carbohydrates_100g: 3.6, fat_100g: 0.2 },
};

describe('Open Food Facts', () => {
  test('reads a product', () => {
    expect(foodFromProduct(skyr)).toEqual({
      code: '123', name: 'Skyr', brand: 'Yoplait', kcal100: 56, protein100: 10, carbs100: 3.6, fat100: 0.2, servingG: 150, imageUrl: null,
    });
  });

  test('falls back to kJ, and prefers the French name', () => {
    const f = foodFromProduct({ product_name: 'Banana', product_name_fr: 'Banane', nutriments: { 'energy-kj_100g': 418.4 } });
    expect(f?.name).toBe('Banane');
    expect(f?.kcal100).toBeCloseTo(100);
    expect(f?.protein100).toBe(0);
  });

  test('skips products without a name or usable calories', () => {
    expect(foodFromProduct({ product_name: 'X', nutriments: {} })).toBeNull();
    expect(foodFromProduct({ nutriments: { 'energy-kcal_100g': 50 } })).toBeNull();
    expect(foodFromProduct({ product_name: 'Typo', nutriments: { 'energy-kcal_100g': 5000 } })).toBeNull();
    expect(foodFromProduct(null)).toBeNull();
  });

  test('adds up a meal by grams', () => {
    const food = foodFromProduct(skyr)!;
    const items = [{ food, grams: 150 }, { food, grams: 50 }];
    expect(mealTotals(items)).toEqual({ calories: 112, protein: 20, carbs: 7, fat: 0 });
    expect(describeItems(items)).toBe('Skyr, Yoplait 150 g + Skyr, Yoplait 50 g');
  });
});

describe('rankByName', () => {
  const food = (name: string, brand = '') => foodFromProduct({ product_name: name, brands: brand, nutriments: { 'energy-kcal_100g': 50 } })!;
  test('puts names holding the searched words first, accents ignored', () => {
    const list = [food('Fromage blanc'), food('Crème brûlée'), food('Skyr nature', 'Yoplait')];
    expect(rankByName(list, 'skyr').map((f) => f.name)).toEqual(['Skyr nature', 'Fromage blanc', 'Crème brûlée']);
    expect(rankByName(list, 'creme brulee')[0].name).toBe('Crème brûlée');
  });
  test('skips names without Latin letters', () => {
    expect(foodFromProduct({ product_name: 'بيرلي', nutriments: { 'energy-kcal_100g': 50 } })).toBeNull();
  });
});
