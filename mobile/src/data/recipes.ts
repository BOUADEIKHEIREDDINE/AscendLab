/**
 * The recipe library: 70 recipes for every goal, budget, schedule and taste.
 *
 * Nutrition is never typed in by hand. Each ingredient carries its values per 100 g from the
 * Ciqual table (Anses, the French food composition reference, https://ciqual.anses.fr), and a
 * recipe's calories and macros are added up from its grams. Prices are average French
 * supermarket prices per kilo (estimates, 2026) and give a cost per serving.
 *
 * Goals are not hand-picked either: they follow fixed rules on each serving's numbers (see
 * `goalsFor`), so a "Lose fat" recipe always means the same thing.
 */
import { Goal } from './profile';
import { MealType } from './social';

type Kind = 'meat' | 'fish' | 'egg' | 'dairy' | 'honey' | 'plant';

export type Ingredient = {
  name: string;
  /** Per 100 g, in the state the recipe uses it (dry pasta, raw chicken, drained beans). */
  kcal: number; protein: number; carbs: number; fat: number;
  /** Average supermarket price, € per kilo. */
  pricePerKg: number;
  kind: Kind;
  /** Ciqual food code, for checking the numbers. 0 = Open Food Facts average. */
  ciqual: number;
  /** For things counted by the piece: "2 eggs" reads better than "120 g of egg". */
  unit?: { grams: number; one: string; many: string };
};

const i = (name: string, kcal: number, protein: number, carbs: number, fat: number, pricePerKg: number, kind: Kind, ciqual: number, unit?: Ingredient['unit']): Ingredient =>
  ({ name, kcal, protein, carbs, fat, pricePerKg, kind, ciqual, unit });

export const INGREDIENTS = {
  // Grains and starches (dry or raw weight)
  oats: i('Rolled oats', 367, 14.2, 57.9, 6.5, 1.8, 'plant', 9311),
  basmati: i('Basmati rice (dry)', 353, 8.1, 77.8, 0.8, 3, 'plant', 9119),
  brownRice: i('Brown rice (dry)', 350, 7.4, 71.4, 2.8, 3, 'plant', 9102),
  pasta: i('Pasta (dry)', 336, 12.6, 65.8, 1.8, 1.6, 'plant', 9810),
  wholePasta: i('Wholewheat pasta (dry)', 353, 12.6, 67.6, 2.2, 2.4, 'plant', 9870),
  quinoa: i('Quinoa (dry)', 358, 14.1, 58.1, 6.1, 7, 'plant', 9340),
  couscous: i('Couscous (dry)', 365, 13.2, 72.7, 1.4, 2.2, 'plant', 9681),
  bulgur: i('Bulgur (dry)', 351, 12.4, 66.8, 1.7, 3, 'plant', 9690),
  eggNoodles: i('Egg noodles (dry)', 371, 13, 71, 3, 4, 'egg', 9863),
  riceNoodles: i('Rice noodles (dry)', 365, 7.8, 80.5, 1, 5, 'plant', 9900),
  potato: i('Potatoes', 80.5, 2.2, 16.2, 0.2, 1.5, 'plant', 4008),
  sweetPotato: i('Sweet potatoes', 86.3, 1.5, 18.3, 0.1, 3, 'plant', 4101),
  wholemealBread: i('Wholemeal bread', 244, 9.2, 44.3, 1.8, 4, 'plant', 7110, { grams: 40, one: 'slice of wholemeal bread', many: 'slices of wholemeal bread' }),
  baguette: i('Baguette', 287, 9.1, 58.3, 1.4, 4, 'plant', 7001),
  tortilla: i('Wheat tortillas', 327, 9.2, 52.1, 8.2, 6, 'plant', 7815, { grams: 60, one: 'wheat tortilla', many: 'wheat tortillas' }),
  pita: i('Pita bread', 259, 8.3, 53, 0.9, 5, 'plant', 7180, { grams: 80, one: 'pita', many: 'pitas' }),
  // Meat, fish, eggs, plant proteins
  chickenBreast: i('Chicken breast', 110, 23.4, 0, 1.5, 13, 'meat', 36017),
  chickenThigh: i('Boneless chicken thighs', 116, 19.7, 0, 4.1, 9, 'meat', 36019),
  turkey: i('Turkey (cutlets or mince)', 109, 24.1, 0.5, 1.2, 12, 'meat', 36304),
  beefMince: i('Lean beef mince (5% fat)', 130, 21.9, 0.3, 4.6, 13, 'meat', 6250),
  steak: i('Beef rump steak', 114, 22.5, 0.4, 2.5, 25, 'meat', 6206),
  pork: i('Pork tenderloin', 123, 21.2, 0.4, 4.1, 14, 'meat', 28204),
  ham: i('Cooked ham', 125, 20.8, 0.8, 4.3, 15, 'meat', 28900),
  salmon: i('Salmon fillet', 194, 20.5, 0, 12.4, 25, 'fish', 26036),
  tuna: i('Canned tuna in water (drained)', 111, 26.8, 0, 0.4, 14, 'fish', 26039),
  cod: i('Cod fillet', 77.6, 18.1, 0, 0.6, 20, 'fish', 26043),
  shrimp: i('Raw peeled prawns', 105, 23.4, 0.7, 0.9, 20, 'fish', 10038),
  sardines: i('Sardines in olive oil (drained)', 202, 24.3, 1.1, 11.2, 15, 'fish', 26040),
  egg: i('Eggs', 140, 12.7, 0.3, 9.8, 5, 'egg', 22000, { grams: 60, one: 'egg', many: 'eggs' }),
  tofu: i('Firm tofu', 148, 14.7, 2.9, 8.5, 9, 'plant', 20904),
  smokedTofu: i('Smoked tofu', 164, 16.4, 2.9, 9.5, 10, 'plant', 20912),
  redLentils: i('Red lentils (dry)', 328.4, 27.7, 44.9, 0.8, 4, 'plant', 20535),
  greenLentils: i('Green lentils (dry)', 327.4, 25.1, 44.5, 1.8, 4, 'plant', 20585),
  chickpeas: i('Canned chickpeas (drained)', 122, 6.7, 15, 2.7, 3, 'plant', 20532),
  kidneyBeans: i('Canned kidney beans (drained)', 108, 8.3, 13, 1, 3, 'plant', 20524),
  // Dairy
  milk: i('Semi-skimmed milk', 47, 3.3, 4.8, 1.6, 1.1, 'dairy', 19041),
  fromageBlanc: i('Fromage blanc 0%', 49.4, 7.8, 3.9, 0, 2.8, 'dairy', 19644),
  skyr: i('Plain skyr', 57, 9.7, 3.8, 0.3, 4.5, 'dairy', 0),
  greekYogurt: i('Greek yogurt', 112.8, 3.2, 4.2, 9.2, 5, 'dairy', 19860),
  feta: i('Feta', 285, 14.8, 0.7, 24.3, 12, 'dairy', 12066),
  mozzarella: i('Mozzarella', 227, 16.1, 0.8, 17.7, 9, 'dairy', 19590),
  parmesan: i('Parmesan', 406, 30.5, 0, 31, 25, 'dairy', 12120),
  emmental: i('Grated emmental', 367, 27.5, 0, 28.6, 10, 'dairy', 12118),
  goatCheese: i('Goat cheese log', 285, 18.4, 0, 23.3, 12, 'dairy', 12812),
  butter: i('Butter', 753, 0.7, 0.9, 82.9, 10, 'dairy', 16400),
  // Fats, nuts, seeds
  oliveOil: i('Olive oil', 900, 0, 0, 99.9, 10, 'plant', 17270),
  coconutMilk: i('Coconut milk', 188, 1.8, 3.4, 18.4, 5, 'plant', 18041),
  peanutButter: i('Peanut butter', 648.5, 25.4, 16.1, 52.5, 9, 'plant', 15202),
  almonds: i('Almonds', 615.1, 22.6, 9.5, 51.3, 15, 'plant', 15000),
  walnuts: i('Walnuts', 709.4, 15.7, 6.9, 67.3, 18, 'plant', 15005),
  chia: i('Chia seeds', 454, 19.5, 7.7, 30.7, 12, 'plant', 15047),
  sesame: i('Sesame seeds', 599.7, 20.8, 9.8, 49.7, 10, 'plant', 15010),
  avocado: i('Avocado (flesh)', 205, 1.6, 0.8, 20.6, 6, 'plant', 13004),
  // Vegetables
  onion: i('Onion', 38.4, 1.1, 6.2, 0.6, 2, 'plant', 20034),
  redOnion: i('Red onion', 36.3, 1.3, 5.6, 0.4, 3, 'plant', 20238),
  garlic: i('Garlic', 111, 5.3, 18.6, 0, 8, 'plant', 11000, { grams: 4, one: 'garlic clove', many: 'garlic cloves' }),
  carrot: i('Carrots', 40.2, 0.6, 7.6, 0, 1.5, 'plant', 20009),
  zucchini: i('Zucchini', 16.5, 1.2, 1.8, 0.3, 3, 'plant', 20020),
  bellPepper: i('Bell peppers', 36.6, 1.1, 6, 0, 4.5, 'plant', 20087),
  tomato: i('Tomatoes', 19.3, 0.9, 2.5, 0.3, 3.5, 'plant', 20047),
  cannedTomatoes: i('Canned tomatoes', 18.3, 1.1, 1.9, 0.3, 2.5, 'plant', 20048),
  passata: i('Tomato passata', 47.1, 1.4, 7.5, 0.4, 2.5, 'plant', 20170),
  broccoli: i('Broccoli', 32.7, 4, 1.7, 0.5, 3.5, 'plant', 20057),
  spinach: i('Baby spinach', 28.7, 2.6, 2.2, 0.5, 6, 'plant', 20059),
  greenBeans: i('Green beans', 34, 2, 4.3, 0.2, 3, 'plant', 20070),
  mushrooms: i('Mushrooms', 28, 2.6, 3.1, 0.4, 5, 'plant', 20056),
  cucumber: i('Cucumber', 15.6, 0.6, 2.5, 0.1, 2.5, 'plant', 20019),
  lettuce: i('Romaine lettuce', 16.7, 1.2, 1.2, 0.3, 5, 'plant', 20171),
  redCabbage: i('Red cabbage', 30, 1.1, 4.3, 0, 2, 'plant', 20014),
  peas: i('Frozen peas', 75.4, 5.9, 8.8, 0.4, 3, 'plant', 20084),
  corn: i('Canned sweetcorn (drained)', 106, 2.8, 18.4, 1.7, 4, 'plant', 20066),
  eggplant: i('Eggplant', 20.7, 1.1, 2.4, 0.1, 3.5, 'plant', 20053),
  cauliflower: i('Cauliflower', 26.2, 1.8, 2.1, 0.7, 3, 'plant', 20016),
  leek: i('Leeks', 32.3, 1.5, 4.9, 0.2, 3, 'plant', 20039),
  butternut: i('Butternut squash', 30.5, 1, 5.4, 0.1, 2.5, 'plant', 20138),
  // Fruit
  banana: i('Bananas', 90.5, 1.1, 19.7, 0, 2, 'plant', 13005, { grams: 120, one: 'banana', many: 'bananas' }),
  apple: i('Apples', 47.6, 0.3, 10.7, 0.1, 2.5, 'plant', 13050, { grams: 180, one: 'apple', many: 'apples' }),
  raspberries: i('Raspberries (frozen)', 49.7, 1.2, 6.4, 0.8, 9, 'plant', 13136),
  blueberries: i('Blueberries (frozen)', 47.8, 0.7, 8.9, 0.4, 10, 'plant', 13132),
  mango: i('Mango', 73.9, 0.6, 14.3, 0, 5, 'plant', 13025),
  lemonJuice: i('Lemon or lime juice', 14.4, 0.5, 2.4, 0.2, 4, 'plant', 2007),
  dates: i('Dates', 282.9, 1.8, 64.7, 0.2, 8, 'plant', 13011),
  // Sweet things and sauces
  honey: i('Honey', 329, 0.6, 81.7, 0, 12, 'honey', 31008),
  mapleSyrup: i('Maple syrup', 269.1, 0, 67.1, 0.1, 25, 'plant', 31034),
  sugar: i('Sugar', 399.2, 0, 99.8, 0, 1.2, 'plant', 31016),
  darkChocolate: i('Dark chocolate', 526.3, 6.6, 42.9, 33.8, 12, 'plant', 31005),
  cocoa: i('Unsweetened cocoa powder', 387, 22.4, 11.6, 20.6, 15, 'plant', 18100),
  soySauce: i('Soy sauce', 45.5, 7.1, 3.6, 0.1, 6, 'plant', 11104),
  pesto: i('Basil pesto', 370, 3.9, 6.6, 35.4, 12, 'dairy', 11179),
  hummus: i('Hummus', 288.3, 8.2, 7.1, 23.9, 10, 'plant', 25621),
} satisfies Record<string, Ingredient>;

export type IngredientId = keyof typeof INGREDIENTS;

export type Cuisine = 'French' | 'Italian' | 'Mediterranean' | 'Middle Eastern' | 'Indian' | 'Asian' | 'Mexican' | 'American';
export type Flavor = 'Savory' | 'Sweet' | 'Spicy' | 'Fresh' | 'Comforting' | 'Tangy';

export type Recipe = {
  id: string;
  name: string;
  /** Which meals it suits. */
  meals: MealType[];
  dessert?: boolean;
  servings: number;
  prepMin: number;
  cookMin: number;
  /** Time that needs no attention: overnight soaking, chilling. Not counted in the total. */
  restNote?: string;
  cuisine: Cuisine;
  flavors: Flavor[];
  /** Grams for the whole recipe. */
  ingredients: Partial<Record<IngredientId, number>>;
  /** Spices, herbs and condiments: they matter for taste, not for the numbers. */
  seasoning: string[];
  steps: string[];
};

const MAIN: MealType[] = ['LUNCH', 'DINNER'];

export const RECIPES: Recipe[] = [
  // ───────────── Breakfast ─────────────
  {
    id: 'berry-overnight-oats', name: 'Berry overnight oats', meals: ['BREAKFAST'], servings: 1, prepMin: 5, cookMin: 0,
    restNote: 'Overnight in the fridge', cuisine: 'American', flavors: ['Sweet', 'Fresh'],
    ingredients: { oats: 60, milk: 150, skyr: 100, raspberries: 80, chia: 10, honey: 10 },
    seasoning: ['1/2 tsp vanilla extract', 'Pinch of cinnamon'],
    steps: [
      'In a jar, mix the oats, chia seeds, milk, skyr, vanilla and cinnamon.',
      'Add the raspberries on top, close the jar and leave in the fridge overnight.',
      'In the morning, stir, drizzle with honey and eat cold.',
    ],
  },
  {
    id: 'peanut-banana-porridge', name: 'Peanut butter banana porridge', meals: ['BREAKFAST'], servings: 1, prepMin: 2, cookMin: 6,
    cuisine: 'American', flavors: ['Sweet', 'Comforting'],
    ingredients: { oats: 70, milk: 250, banana: 120, peanutButter: 15 },
    seasoning: ['Pinch of salt', '1/2 tsp cinnamon'],
    steps: [
      'Bring the milk to a simmer with the oats, salt and cinnamon.',
      'Cook 4 to 5 minutes, stirring, until creamy.',
      'Mash half the banana into the porridge, slice the rest on top and finish with the peanut butter.',
    ],
  },
  {
    id: 'spinach-feta-eggs-toast', name: 'Spinach and feta eggs on toast', meals: ['BREAKFAST'], servings: 1, prepMin: 3, cookMin: 6,
    cuisine: 'Mediterranean', flavors: ['Savory', 'Tangy'],
    ingredients: { egg: 120, spinach: 60, wholemealBread: 80, feta: 20, oliveOil: 5 },
    seasoning: ['Chili flakes', 'Black pepper'],
    steps: [
      'Toast the bread.',
      'Wilt the spinach in the olive oil for 1 minute, then add the beaten eggs.',
      'Stir gently over low heat until just set, crumble in the feta and pile onto the toast with chili flakes.',
    ],
  },
  {
    id: 'shakshuka', name: 'Shakshuka', meals: ['BREAKFAST', 'LUNCH', 'DINNER'], servings: 2, prepMin: 10, cookMin: 20,
    cuisine: 'Middle Eastern', flavors: ['Spicy', 'Savory'],
    ingredients: { egg: 240, cannedTomatoes: 400, bellPepper: 150, onion: 100, garlic: 8, oliveOil: 10, baguette: 100 },
    seasoning: ['1 tsp cumin', '1 tsp smoked paprika', 'Chili flakes', 'Fresh coriander or parsley'],
    steps: [
      'Soften the sliced onion and pepper in the olive oil for 8 minutes, then add the garlic and spices for 1 minute.',
      'Pour in the tomatoes and simmer 8 minutes until thick. Season well.',
      'Make 4 wells, crack in the eggs, cover and cook 5 to 6 minutes until the whites are set.',
      'Scatter herbs and serve with the bread to dip.',
    ],
  },
  {
    id: 'protein-blueberry-pancakes', name: 'Protein blueberry pancakes', meals: ['BREAKFAST'], servings: 2, prepMin: 10, cookMin: 10,
    cuisine: 'American', flavors: ['Sweet', 'Comforting'],
    ingredients: { oats: 80, egg: 120, fromageBlanc: 150, banana: 120, blueberries: 100, mapleSyrup: 20, butter: 5 },
    seasoning: ['1 tsp baking powder', '1/2 tsp vanilla extract'],
    steps: [
      'Blend the oats into a flour, then blend in the eggs, fromage blanc, banana, baking powder and vanilla.',
      'Fold in half the blueberries.',
      'Cook small pancakes in a lightly buttered pan, 2 minutes per side.',
      'Serve with the rest of the blueberries and the maple syrup.',
    ],
  },
  {
    id: 'mango-skyr-bowl', name: 'Mango skyr bowl with toasted oats', meals: ['BREAKFAST', 'SNACK'], servings: 1, prepMin: 5, cookMin: 3,
    cuisine: 'American', flavors: ['Fresh', 'Sweet'],
    ingredients: { skyr: 200, mango: 100, almonds: 15, oats: 20, honey: 10 },
    seasoning: ['Lime zest'],
    steps: [
      'Toast the oats and chopped almonds in a dry pan for 2 to 3 minutes, until golden.',
      'Spoon the skyr into a bowl, top with the diced mango and the toasted crunch.',
      'Finish with honey and lime zest.',
    ],
  },
  {
    id: 'avocado-egg-toast', name: 'Avocado toast with soft eggs', meals: ['BREAKFAST'], servings: 1, prepMin: 5, cookMin: 7,
    cuisine: 'American', flavors: ['Fresh', 'Savory'],
    ingredients: { wholemealBread: 70, avocado: 50, egg: 120, lemonJuice: 5, tomato: 60 },
    seasoning: ['Chili flakes', 'Salt and pepper'],
    steps: [
      'Boil the eggs for 6 and a half minutes, then cool them in cold water and peel.',
      'Mash the avocado with the lemon juice, salt and pepper.',
      'Spread on the toast, add the sliced tomato, the halved eggs and chili flakes.',
    ],
  },
  {
    id: 'breakfast-burrito', name: 'Breakfast burrito', meals: ['BREAKFAST', 'LUNCH'], servings: 2, prepMin: 10, cookMin: 10,
    cuisine: 'Mexican', flavors: ['Spicy', 'Savory'],
    ingredients: { tortilla: 120, egg: 240, kidneyBeans: 120, bellPepper: 100, emmental: 30, tomato: 100 },
    seasoning: ['1 tsp cumin', 'Hot sauce', 'Fresh coriander'],
    steps: [
      'Soften the diced pepper in a pan, add the beans and cumin and warm through.',
      'Add the beaten eggs and scramble gently.',
      'Fill the warm tortillas with the eggs, cheese, diced tomato, coriander and hot sauce, then roll up.',
    ],
  },
  {
    id: 'mango-coconut-chia-pudding', name: 'Mango coconut chia pudding', meals: ['BREAKFAST', 'SNACK'], servings: 2, prepMin: 5, cookMin: 0,
    restNote: 'At least 4 hours in the fridge', cuisine: 'Asian', flavors: ['Sweet', 'Fresh'],
    ingredients: { chia: 40, coconutMilk: 60, milk: 150, skyr: 200, mango: 150, mapleSyrup: 15 },
    seasoning: ['Lime zest', '1/2 tsp vanilla extract'],
    steps: [
      'Whisk the chia seeds with the coconut milk, milk, skyr, maple syrup and vanilla.',
      'Stir again after 10 minutes so no lumps form, then chill at least 4 hours.',
      'Serve topped with diced mango and lime zest.',
    ],
  },
  {
    id: 'french-toast-berries', name: 'French toast with berries', meals: ['BREAKFAST'], servings: 2, prepMin: 5, cookMin: 10,
    cuisine: 'French', flavors: ['Sweet', 'Comforting'],
    ingredients: { wholemealBread: 160, egg: 120, milk: 100, raspberries: 120, fromageBlanc: 150, butter: 10, mapleSyrup: 20 },
    seasoning: ['1 tsp cinnamon', '1/2 tsp vanilla extract'],
    steps: [
      'Whisk the eggs, milk, cinnamon and vanilla in a shallow dish.',
      'Soak each slice of bread for 20 seconds per side.',
      'Cook in the butter over medium heat, 2 to 3 minutes per side, until golden.',
      'Serve with fromage blanc, raspberries and maple syrup.',
    ],
  },
  {
    id: 'ham-mushroom-omelette', name: 'Ham and mushroom omelette with toast', meals: ['BREAKFAST', 'DINNER'], servings: 1, prepMin: 5, cookMin: 8,
    cuisine: 'French', flavors: ['Savory'],
    ingredients: { egg: 180, ham: 50, emmental: 20, mushrooms: 80, butter: 5, wholemealBread: 80 },
    seasoning: ['Chives', 'Black pepper'],
    steps: [
      'Fry the sliced mushrooms in the butter until golden, about 4 minutes.',
      'Pour in the beaten eggs with pepper and chives, and pull the edges in as they set.',
      'Add the ham and cheese on one half, fold and slide onto a plate. Serve with the toasted bread.',
    ],
  },
  {
    id: 'banana-blueberry-oat-muffins', name: 'Banana blueberry oat muffins', meals: ['SNACK'], servings: 6, prepMin: 10, cookMin: 20,
    cuisine: 'American', flavors: ['Sweet'],
    ingredients: { oats: 240, banana: 360, egg: 120, milk: 150, blueberries: 100, honey: 30 },
    seasoning: ['2 tsp baking powder', '1 tsp cinnamon', 'Pinch of salt'],
    steps: [
      'Heat the oven to 180 °C. Blend the oats into a coarse flour.',
      'Mash the bananas and mix with the eggs, milk and honey, then stir in the oat flour, baking powder, cinnamon and salt.',
      'Fold in the blueberries, divide into 12 muffin cups and bake 20 minutes. Keeps 4 days in a box.',
    ],
  },
  {
    id: 'turmeric-tofu-scramble', name: 'Turmeric tofu scramble', meals: ['BREAKFAST'], servings: 1, prepMin: 5, cookMin: 8,
    cuisine: 'American', flavors: ['Savory', 'Spicy'],
    ingredients: { tofu: 150, spinach: 60, tomato: 80, onion: 40, wholemealBread: 80, oliveOil: 5 },
    seasoning: ['1/2 tsp turmeric', '1/2 tsp cumin', 'Black pepper', 'Pinch of chili'],
    steps: [
      'Soften the chopped onion in the olive oil for 3 minutes.',
      'Crumble in the tofu with the turmeric, cumin and pepper and cook 3 minutes.',
      'Add the diced tomato and spinach until wilted. Serve on toast.',
    ],
  },
  {
    id: 'apple-cinnamon-baked-oats', name: 'Apple cinnamon baked oats', meals: ['BREAKFAST'], servings: 2, prepMin: 10, cookMin: 25,
    cuisine: 'French', flavors: ['Sweet', 'Comforting'],
    ingredients: { oats: 100, apple: 180, egg: 60, milk: 200, almonds: 20, honey: 15 },
    seasoning: ['1 tsp cinnamon', '1 tsp baking powder'],
    steps: [
      'Heat the oven to 180 °C.',
      'Mix the oats, egg, milk, honey, cinnamon and baking powder, then stir in half the diced apple.',
      'Pour into a small dish, top with the rest of the apple and the chopped almonds, and bake 25 minutes.',
    ],
  },

  // ───────────── Lunch and dinner ─────────────
  {
    id: 'chicken-teriyaki-bowl', name: 'Chicken teriyaki rice bowl', meals: MAIN, servings: 2, prepMin: 10, cookMin: 20,
    cuisine: 'Asian', flavors: ['Sweet', 'Savory'],
    ingredients: { chickenBreast: 300, basmati: 140, broccoli: 250, soySauce: 40, honey: 20, sesame: 6, garlic: 8 },
    seasoning: ['1 tsp grated ginger', '1 tbsp rice vinegar', 'Spring onions'],
    steps: [
      'Cook the rice. Steam the broccoli for 5 minutes.',
      'Mix the soy sauce, honey, garlic, ginger and vinegar.',
      'Brown the diced chicken in a hot pan for 6 minutes, pour in the sauce and let it bubble until sticky.',
      'Serve over rice with broccoli, sesame seeds and spring onions.',
    ],
  },
  {
    id: 'chicken-tikka-masala', name: 'Light chicken tikka masala', meals: MAIN, servings: 4, prepMin: 20, cookMin: 30,
    cuisine: 'Indian', flavors: ['Spicy', 'Comforting'],
    ingredients: { chickenBreast: 600, cannedTomatoes: 400, fromageBlanc: 200, onion: 150, garlic: 12, basmati: 280, butter: 15 },
    seasoning: ['2 tsp garam masala', '1 tsp cumin', '1 tsp smoked paprika', '1 tsp grated ginger', 'Chili to taste', 'Fresh coriander'],
    steps: [
      'Coat the diced chicken with half the fromage blanc and half the spices. Leave 15 minutes.',
      'Cook the rice. Soften the onion in the butter, then add the garlic, ginger and the rest of the spices.',
      'Add the tomatoes and simmer 10 minutes, then add the chicken and cook 10 minutes more.',
      'Off the heat, stir in the rest of the fromage blanc. Serve with rice and coriander.',
    ],
  },
  {
    id: 'red-lentil-dal', name: 'Red lentil and spinach dal', meals: MAIN, servings: 4, prepMin: 10, cookMin: 25,
    cuisine: 'Indian', flavors: ['Spicy', 'Comforting'],
    ingredients: { redLentils: 250, coconutMilk: 200, cannedTomatoes: 400, onion: 150, garlic: 12, spinach: 150, basmati: 240, oliveOil: 15 },
    seasoning: ['1 tsp turmeric', '1 tsp cumin seeds', '1 tsp garam masala', '1 tsp grated ginger', 'Lemon wedge'],
    steps: [
      'Soften the onion in the oil with the cumin seeds, then add the garlic, ginger and spices.',
      'Add the rinsed lentils, tomatoes, coconut milk and 500 ml of water. Simmer 20 minutes until soft.',
      'Stir in the spinach until wilted. Serve with rice and a squeeze of lemon.',
    ],
  },
  {
    id: 'chili-con-carne', name: 'Chili con carne', meals: MAIN, servings: 4, prepMin: 15, cookMin: 40,
    cuisine: 'Mexican', flavors: ['Spicy', 'Comforting'],
    ingredients: { beefMince: 500, kidneyBeans: 400, cannedTomatoes: 800, onion: 150, bellPepper: 200, brownRice: 280, corn: 140, garlic: 12, oliveOil: 10 },
    seasoning: ['2 tsp cumin', '2 tsp smoked paprika', '1 tsp oregano', 'Chili powder to taste', 'Lime wedges'],
    steps: [
      'Start cooking the brown rice (about 30 minutes).',
      'Brown the beef in the oil, then add the onion, pepper, garlic and spices for 5 minutes.',
      'Add the tomatoes, beans and corn and simmer 30 minutes, stirring now and then.',
      'Serve with rice and lime. Even better the next day.',
    ],
  },
  {
    id: 'chili-sin-carne', name: 'Chili sin carne', meals: MAIN, servings: 4, prepMin: 15, cookMin: 40,
    cuisine: 'Mexican', flavors: ['Spicy', 'Comforting'],
    ingredients: { kidneyBeans: 500, redLentils: 120, cannedTomatoes: 800, onion: 150, bellPepper: 200, corn: 140, brownRice: 280, oliveOil: 15, darkChocolate: 10 },
    seasoning: ['2 tsp cumin', '2 tsp smoked paprika', '1 tsp oregano', 'Chili powder to taste', 'Fresh coriander'],
    steps: [
      'Start cooking the brown rice.',
      'Soften the onion and pepper in the oil, then add the spices for 1 minute.',
      'Add the lentils, tomatoes, beans, corn and 300 ml of water. Simmer 30 minutes.',
      'Melt in the chocolate for depth, season and serve with rice and coriander.',
    ],
  },
  {
    id: 'salmon-sweet-potato', name: 'Lemon salmon, sweet potato and green beans', meals: MAIN, servings: 2, prepMin: 10, cookMin: 30,
    cuisine: 'Mediterranean', flavors: ['Fresh', 'Savory'],
    ingredients: { salmon: 260, sweetPotato: 700, greenBeans: 300, lemonJuice: 20, oliveOil: 10 },
    seasoning: ['1 tsp smoked paprika', 'Fresh dill', 'Lemon zest', 'Salt and pepper'],
    steps: [
      'Heat the oven to 200 °C. Toss the sweet potato wedges with the oil and paprika and roast 30 minutes.',
      'After 15 minutes, add the salmon to the tray with lemon zest and juice.',
      'Boil the green beans for 6 minutes. Serve everything with dill.',
    ],
  },
  {
    id: 'tuna-tomato-pasta', name: 'Tuna and tomato pasta', meals: MAIN, servings: 2, prepMin: 5, cookMin: 15,
    cuisine: 'Italian', flavors: ['Savory', 'Tangy'],
    ingredients: { pasta: 180, tuna: 160, passata: 300, onion: 80, garlic: 8, oliveOil: 10, parmesan: 20 },
    seasoning: ['1 tbsp capers', 'Chili flakes', 'Fresh basil', 'Lemon zest'],
    steps: [
      'Cook the pasta.',
      'Soften the onion and garlic in the oil, add the passata, capers and chili and simmer 8 minutes.',
      'Flake in the tuna, toss with the pasta and a splash of pasta water.',
      'Finish with parmesan, basil and lemon zest.',
    ],
  },
  {
    id: 'pesto-chicken-pasta', name: 'Pesto chicken pasta', meals: MAIN, servings: 2, prepMin: 10, cookMin: 15,
    cuisine: 'Italian', flavors: ['Savory', 'Fresh'],
    ingredients: { wholePasta: 180, chickenBreast: 250, pesto: 50, tomato: 200, spinach: 80, parmesan: 15 },
    seasoning: ['Black pepper', 'Fresh basil'],
    steps: [
      'Cook the pasta. Pan-fry the sliced chicken for 6 minutes until golden.',
      'Add the halved tomatoes and spinach for 2 minutes.',
      'Toss everything with the pesto and a splash of pasta water. Top with parmesan and basil.',
    ],
  },
  {
    id: 'spaghetti-bolognese', name: 'Spaghetti bolognese', meals: MAIN, servings: 4, prepMin: 15, cookMin: 40,
    cuisine: 'Italian', flavors: ['Savory', 'Comforting'],
    ingredients: { pasta: 360, beefMince: 500, passata: 500, carrot: 150, onion: 150, garlic: 12, oliveOil: 15, parmesan: 30 },
    seasoning: ['1 tsp oregano', '1 bay leaf', 'Fresh basil'],
    steps: [
      'Soften the finely diced onion and carrot in the oil for 8 minutes, then add the garlic.',
      'Brown the beef, then add the passata, oregano and bay leaf. Simmer 30 minutes.',
      'Cook the spaghetti and serve with the sauce, parmesan and basil.',
    ],
  },
  {
    id: 'lentil-mushroom-bolognese', name: 'Lentil and mushroom bolognese', meals: MAIN, servings: 4, prepMin: 15, cookMin: 35,
    cuisine: 'Italian', flavors: ['Savory', 'Comforting'],
    ingredients: { pasta: 360, greenLentils: 200, passata: 700, carrot: 150, onion: 150, garlic: 12, oliveOil: 20, mushrooms: 250 },
    seasoning: ['1 tsp oregano', '1 tbsp soy sauce for depth', '1 bay leaf', 'Fresh basil'],
    steps: [
      'Soften the onion and carrot in the oil, then brown the chopped mushrooms well.',
      'Add the garlic, rinsed lentils, passata, 400 ml of water, oregano, bay leaf and soy sauce.',
      'Simmer 30 minutes until the lentils are tender. Serve on the spaghetti with basil.',
    ],
  },
  {
    id: 'chicken-fajitas', name: 'Chicken fajitas', meals: MAIN, servings: 2, prepMin: 15, cookMin: 15,
    cuisine: 'Mexican', flavors: ['Spicy', 'Fresh'],
    ingredients: { chickenBreast: 300, tortilla: 240, bellPepper: 300, redOnion: 120, avocado: 100, fromageBlanc: 100, lemonJuice: 20, oliveOil: 10 },
    seasoning: ['1 tsp cumin', '1 tsp smoked paprika', '1/2 tsp chili powder', '1/2 tsp garlic powder', 'Fresh coriander'],
    steps: [
      'Toss the sliced chicken with the spices, half the lime juice and the oil.',
      'Cook in a very hot pan for 5 minutes, add the sliced peppers and onion and cook 5 minutes more.',
      'Mash the avocado with the rest of the lime. Fill the warm tortillas with everything and a spoon of fromage blanc.',
    ],
  },
  {
    id: 'beef-broccoli-noodles', name: 'Beef and broccoli noodles', meals: MAIN, servings: 2, prepMin: 15, cookMin: 10,
    cuisine: 'Asian', flavors: ['Savory', 'Sweet'],
    ingredients: { steak: 250, eggNoodles: 150, broccoli: 200, bellPepper: 150, carrot: 100, soySauce: 40, honey: 10, garlic: 8, sesame: 5, oliveOil: 10 },
    seasoning: ['1 tsp grated ginger', '1 tsp chili oil', 'Spring onions'],
    steps: [
      'Cook the noodles and rinse them. Slice the steak thinly against the grain.',
      'Sear the beef in a very hot pan for 1 to 2 minutes and set aside.',
      'Stir-fry the vegetables 4 minutes, add the garlic, ginger, soy sauce and honey.',
      'Toss in the noodles and beef, finish with sesame, spring onions and chili oil.',
    ],
  },
  {
    id: 'shrimp-pad-thai', name: 'Prawn pad thai', meals: MAIN, servings: 2, prepMin: 15, cookMin: 10,
    cuisine: 'Asian', flavors: ['Tangy', 'Sweet', 'Spicy'],
    ingredients: { riceNoodles: 150, shrimp: 250, egg: 120, carrot: 100, peanutButter: 20, soySauce: 30, lemonJuice: 20, sugar: 10, oliveOil: 10 },
    seasoning: ['1 tbsp fish sauce (optional)', 'Chili flakes', 'Spring onions', 'Fresh coriander', 'Bean sprouts'],
    steps: [
      'Soak the rice noodles in hot water as the pack says. Mix the soy sauce, lime juice, sugar and peanut butter.',
      'Stir-fry the prawns in the oil for 2 minutes, push aside and scramble the eggs.',
      'Add the grated carrot, drained noodles and sauce and toss 2 minutes.',
      'Serve with spring onions, coriander, sprouts and chili.',
    ],
  },
  {
    id: 'greek-chicken-bowl', name: 'Greek chicken bowl with tzatziki', meals: MAIN, servings: 2, prepMin: 15, cookMin: 15,
    cuisine: 'Mediterranean', flavors: ['Fresh', 'Tangy'],
    ingredients: { chickenBreast: 300, bulgur: 200, cucumber: 200, tomato: 200, redOnion: 60, feta: 60, fromageBlanc: 120, lemonJuice: 20, oliveOil: 15 },
    seasoning: ['1 tsp oregano', '1 garlic clove (tzatziki)', 'Fresh mint or dill'],
    steps: [
      'Cook the bulgur. Rub the chicken with oregano, lemon and half the oil and grill 6 minutes per side.',
      'Grate a third of the cucumber into the fromage blanc with garlic and mint for the tzatziki.',
      'Dice the rest of the cucumber, tomato and onion.',
      'Build bowls with bulgur, sliced chicken, salad, feta and tzatziki.',
    ],
  },
  {
    id: 'spiced-chickpea-pita', name: 'Spiced chickpea pita', meals: MAIN, servings: 2, prepMin: 10, cookMin: 10,
    cuisine: 'Middle Eastern', flavors: ['Spicy', 'Fresh'],
    ingredients: { chickpeas: 400, pita: 160, hummus: 60, tomato: 150, cucumber: 150, lettuce: 60, redOnion: 40, oliveOil: 10 },
    seasoning: ['1 tsp cumin', '1 tsp smoked paprika', '1/2 tsp chili', 'Lemon wedge', 'Fresh parsley'],
    steps: [
      'Fry the drained chickpeas in the oil with the spices for 8 minutes until crisp.',
      'Warm the pitas and spread with hummus.',
      'Fill with lettuce, tomato, cucumber, onion and the hot chickpeas. Squeeze over lemon.',
    ],
  },
  {
    id: 'tofu-green-curry', name: 'Tofu and vegetable green curry', meals: MAIN, servings: 3, prepMin: 15, cookMin: 20,
    cuisine: 'Asian', flavors: ['Spicy', 'Comforting'],
    ingredients: { tofu: 400, coconutMilk: 200, zucchini: 250, bellPepper: 200, basmati: 210, soySauce: 15 },
    seasoning: ['2 tbsp green curry paste', 'Lime juice', 'Thai basil or coriander'],
    steps: [
      'Cook the rice. Brown the cubed tofu in a non-stick pan and set aside.',
      'Fry the curry paste for 1 minute, add the coconut milk and 150 ml of water.',
      'Add the vegetables and simmer 8 minutes, then the tofu and soy sauce.',
      'Finish with lime and herbs. Serve with rice.',
    ],
  },
  {
    id: 'cod-papillote', name: 'Cod en papillote with potatoes', meals: MAIN, servings: 2, prepMin: 10, cookMin: 20,
    cuisine: 'French', flavors: ['Fresh', 'Savory'],
    ingredients: { cod: 300, zucchini: 250, tomato: 200, lemonJuice: 20, oliveOil: 10, potato: 400 },
    seasoning: ['Thyme', 'Lemon slices', 'Black olives (optional)', 'Salt and pepper'],
    steps: [
      'Heat the oven to 200 °C. Boil the potatoes for 15 to 20 minutes.',
      'On baking paper, layer thin zucchini and tomato slices, the cod, lemon, thyme and oil. Seal the parcels.',
      'Bake 15 minutes. Open at the table and serve with the potatoes.',
    ],
  },
  {
    id: 'turkey-meatballs', name: 'Turkey meatballs in tomato sauce', meals: MAIN, servings: 4, prepMin: 20, cookMin: 25,
    cuisine: 'Italian', flavors: ['Savory', 'Comforting'],
    ingredients: { turkey: 500, egg: 60, oats: 40, passata: 500, onion: 100, garlic: 12, wholePasta: 320, parmesan: 30, oliveOil: 10 },
    seasoning: ['1 tsp oregano', 'Fresh parsley', 'Chili flakes'],
    steps: [
      'Mix the turkey mince, egg, oats, half the garlic, parsley and half the parmesan. Roll into 20 balls.',
      'Brown the meatballs in the oil, then set aside.',
      'Soften the onion and the rest of the garlic, add the passata and oregano, return the meatballs and simmer 15 minutes.',
      'Serve over the pasta with the rest of the parmesan.',
    ],
  },
  {
    id: 'quinoa-buddha-bowl', name: 'Quinoa buddha bowl with tahini', meals: MAIN, servings: 2, prepMin: 15, cookMin: 25,
    cuisine: 'Middle Eastern', flavors: ['Fresh', 'Savory'],
    ingredients: { quinoa: 140, chickpeas: 240, sweetPotato: 300, redCabbage: 150, avocado: 100, sesame: 15, lemonJuice: 20, oliveOil: 10 },
    seasoning: ['1 tsp cumin', '1 tsp smoked paprika', 'Garlic', 'Salt'],
    steps: [
      'Heat the oven to 200 °C. Roast the sweet potato cubes and chickpeas with oil and spices for 25 minutes.',
      'Cook the quinoa. Finely shred the cabbage.',
      'Blend the sesame seeds with lemon, garlic and water into a quick tahini dressing.',
      'Build the bowls and drizzle with the dressing.',
    ],
  },
  {
    id: 'egg-fried-rice', name: 'Egg fried rice with peas', meals: MAIN, servings: 2, prepMin: 10, cookMin: 15,
    cuisine: 'Asian', flavors: ['Savory'],
    ingredients: { basmati: 160, egg: 180, peas: 150, carrot: 100, onion: 60, soySauce: 30, oliveOil: 15 },
    seasoning: ['1 tsp grated ginger', '1 garlic clove', 'Spring onions', 'Chili oil'],
    steps: [
      'Cook the rice (or use yesterday\'s cold rice, it fries better).',
      'Scramble the eggs in half the oil and set aside.',
      'Stir-fry the onion, carrot, peas, ginger and garlic 4 minutes, add the rice and soy sauce and fry 3 minutes.',
      'Fold in the eggs and spring onions. Serve with chili oil.',
    ],
  },
  {
    id: 'leek-potato-soup', name: 'Leek and potato soup with cheese toast', meals: MAIN, servings: 4, prepMin: 15, cookMin: 30,
    cuisine: 'French', flavors: ['Comforting', 'Savory'],
    ingredients: { potato: 600, leek: 500, onion: 100, milk: 300, butter: 20, wholemealBread: 200, emmental: 40 },
    seasoning: ['1 vegetable stock cube', 'Nutmeg', 'Chives'],
    steps: [
      'Soften the sliced leeks and onion in the butter for 8 minutes.',
      'Add the diced potatoes, stock cube and 800 ml of water and simmer 20 minutes.',
      'Add the milk and blend until smooth. Season with nutmeg.',
      'Grill the bread with the cheese and serve on the side.',
    ],
  },
  {
    id: 'butternut-lentil-soup', name: 'Spiced butternut and lentil soup', meals: MAIN, servings: 4, prepMin: 15, cookMin: 30,
    cuisine: 'Indian', flavors: ['Comforting', 'Spicy'],
    ingredients: { butternut: 1000, carrot: 200, onion: 150, coconutMilk: 150, redLentils: 100, oliveOil: 15, baguette: 200 },
    seasoning: ['2 tsp curry powder', '1 tsp grated ginger', '1 vegetable stock cube', 'Chili flakes'],
    steps: [
      'Soften the onion in the oil with the curry powder and ginger.',
      'Add the diced squash, carrots, rinsed lentils, stock cube and 1 litre of water. Simmer 25 minutes.',
      'Blend with the coconut milk until velvety. Serve with chili flakes and bread.',
    ],
  },
  {
    id: 'ratatouille-quinoa', name: 'Ratatouille with quinoa and goat cheese', meals: MAIN, servings: 4, prepMin: 20, cookMin: 40,
    cuisine: 'French', flavors: ['Savory', 'Fresh'],
    ingredients: { eggplant: 400, zucchini: 400, bellPepper: 300, tomato: 500, onion: 150, garlic: 12, oliveOil: 30, quinoa: 240, goatCheese: 100 },
    seasoning: ['Herbes de Provence', 'Fresh basil', '1 bay leaf'],
    steps: [
      'Brown the diced eggplant in half the oil, then set aside.',
      'Soften the onion, peppers and zucchini in the rest of the oil, add the garlic, tomatoes, herbs and eggplant.',
      'Cover and simmer 30 minutes. Meanwhile cook the quinoa.',
      'Serve with crumbled goat cheese and basil.',
    ],
  },
  {
    id: 'steak-potatoes-salad', name: 'Steak, roast potatoes and green salad', meals: MAIN, servings: 2, prepMin: 10, cookMin: 35,
    cuisine: 'French', flavors: ['Savory'],
    ingredients: { steak: 300, potato: 700, lettuce: 120, oliveOil: 20, butter: 10 },
    seasoning: ['1 tsp Dijon mustard', '1 tbsp red wine vinegar', 'Thyme', 'Garlic', 'Flaky salt'],
    steps: [
      'Heat the oven to 210 °C. Roast the potato wedges with half the oil, thyme and garlic for 35 minutes.',
      'Take the steaks out of the fridge 20 minutes before. Sear in the butter 2 to 3 minutes per side and rest 5 minutes.',
      'Whisk the mustard, vinegar and remaining oil, and toss with the lettuce.',
    ],
  },
  {
    id: 'honey-mustard-pork', name: 'Honey mustard pork tenderloin', meals: MAIN, servings: 4, prepMin: 15, cookMin: 30,
    cuisine: 'French', flavors: ['Sweet', 'Tangy'],
    ingredients: { pork: 600, potato: 800, greenBeans: 400, honey: 30, oliveOil: 15 },
    seasoning: ['2 tbsp wholegrain mustard', 'Rosemary', 'Garlic'],
    steps: [
      'Heat the oven to 200 °C. Roast the potato chunks with the oil and rosemary for 30 minutes.',
      'Brown the pork on all sides, brush with the honey and mustard, and roast 20 minutes on the potato tray.',
      'Rest the pork 5 minutes. Boil the green beans for 6 minutes. Slice and serve.',
    ],
  },
  {
    id: 'sardine-tomato-pasta', name: 'Sardine, tomato and lemon pasta', meals: MAIN, servings: 2, prepMin: 5, cookMin: 15,
    cuisine: 'Mediterranean', flavors: ['Tangy', 'Savory'],
    ingredients: { pasta: 180, sardines: 180, cannedTomatoes: 400, garlic: 8, lemonJuice: 10, oliveOil: 5 },
    seasoning: ['Chili flakes', 'Lemon zest', 'Fresh parsley', 'Toasted breadcrumbs (optional)'],
    steps: [
      'Cook the pasta.',
      'Fry the garlic and chili in the oil, add the tomatoes and simmer 8 minutes.',
      'Add the sardines in chunks, lemon zest and juice. Toss with the pasta and parsley.',
    ],
  },
  {
    id: 'moroccan-chicken-couscous', name: 'Moroccan chicken couscous', meals: MAIN, servings: 4, prepMin: 20, cookMin: 40,
    cuisine: 'Middle Eastern', flavors: ['Spicy', 'Comforting'],
    ingredients: { chickenThigh: 600, couscous: 280, carrot: 300, zucchini: 300, chickpeas: 240, onion: 150, cannedTomatoes: 400, oliveOil: 15 },
    seasoning: ['2 tsp ras el hanout', '1 tsp cumin', '1 cinnamon stick', 'Harissa to taste', 'Fresh coriander'],
    steps: [
      'Brown the chicken pieces in the oil with the onion and spices.',
      'Add the tomatoes, carrots and 500 ml of water and simmer 20 minutes.',
      'Add the zucchini and chickpeas and cook 15 minutes more.',
      'Pour boiling water over the couscous, cover 5 minutes and fluff. Serve with the stew, harissa and coriander.',
    ],
  },
  {
    id: 'garlic-prawn-linguine', name: 'Garlic prawn linguine', meals: MAIN, servings: 2, prepMin: 10, cookMin: 15,
    cuisine: 'Italian', flavors: ['Savory', 'Spicy'],
    ingredients: { pasta: 180, shrimp: 250, garlic: 12, lemonJuice: 20, oliveOil: 20, spinach: 100, parmesan: 15 },
    seasoning: ['Chili flakes', 'Lemon zest', 'Fresh parsley'],
    steps: [
      'Cook the linguine.',
      'Gently fry the sliced garlic and chili in the oil, add the prawns and cook 2 to 3 minutes until pink.',
      'Add the spinach, lemon zest and juice, then the pasta and a splash of its water. Toss with parmesan and parsley.',
    ],
  },
  {
    id: 'salmon-poke-bowl', name: 'Salmon poke bowl', meals: MAIN, servings: 2, prepMin: 20, cookMin: 15,
    cuisine: 'Asian', flavors: ['Fresh', 'Sweet'],
    ingredients: { salmon: 250, basmati: 150, avocado: 100, cucumber: 150, mango: 120, soySauce: 30, sesame: 6, carrot: 80 },
    seasoning: ['1 tbsp rice vinegar', '1 tsp sriracha', 'Spring onions', 'Nori strips (optional)'],
    steps: [
      'Cook the rice and season with the vinegar. Let it cool.',
      'Dice the very fresh salmon (or sear it 1 minute per side) and marinate in the soy sauce and sriracha.',
      'Slice the avocado, cucumber, mango and carrot.',
      'Arrange everything on the rice and top with sesame and spring onions.',
    ],
  },
  {
    id: 'burger-bowl', name: 'Burger bowl with oven fries', meals: MAIN, servings: 2, prepMin: 15, cookMin: 30,
    cuisine: 'American', flavors: ['Savory', 'Comforting'],
    ingredients: { beefMince: 300, potato: 700, lettuce: 120, tomato: 150, redOnion: 50, emmental: 40, cucumber: 100, fromageBlanc: 80, oliveOil: 10 },
    seasoning: ['1 tsp smoked paprika', '1 tbsp mustard', '1 tbsp ketchup', 'Pickles'],
    steps: [
      'Heat the oven to 220 °C. Roast the potato fries with the oil and paprika for 30 minutes.',
      'Brown the beef, breaking it up, and season well.',
      'Mix the fromage blanc, mustard and ketchup into a burger sauce.',
      'Fill bowls with lettuce, tomato, onion, cucumber, pickles, beef, cheese and fries. Add the sauce.',
    ],
  },
  {
    id: 'light-chicken-caesar', name: 'Light chicken caesar salad', meals: MAIN, servings: 2, prepMin: 15, cookMin: 15,
    cuisine: 'American', flavors: ['Fresh', 'Savory'],
    ingredients: { chickenBreast: 300, lettuce: 250, baguette: 160, parmesan: 30, fromageBlanc: 100, lemonJuice: 15, oliveOil: 10, egg: 60 },
    seasoning: ['1 tsp Dijon mustard', '1 garlic clove', '2 anchovies (optional)', 'Black pepper'],
    steps: [
      'Grill the chicken 6 minutes per side. Boil the egg 9 minutes.',
      'Toast half the bread, cubed, with the oil until crisp.',
      'Blend the fromage blanc, lemon, mustard, garlic, half the parmesan and anchovies into a dressing.',
      'Toss the lettuce with the dressing and top with chicken, croutons, egg and parmesan. Serve the rest of the bread on the side.',
    ],
  },
  {
    id: 'nicoise-salad', name: 'Salade niçoise', meals: MAIN, servings: 2, prepMin: 15, cookMin: 15,
    cuisine: 'French', flavors: ['Fresh', 'Tangy'],
    ingredients: { tuna: 160, egg: 120, potato: 500, greenBeans: 200, tomato: 200, lettuce: 100, oliveOil: 15, lemonJuice: 10 },
    seasoning: ['Black olives', '1 tsp Dijon mustard', '1 tbsp red wine vinegar', 'Anchovies (optional)'],
    steps: [
      'Boil the potatoes 15 minutes, adding the green beans for the last 5. Boil the eggs 9 minutes.',
      'Whisk the oil, lemon, vinegar and mustard.',
      'Arrange the lettuce, potatoes, beans, tomatoes, tuna, halved eggs and olives. Drizzle with the dressing.',
    ],
  },
  {
    id: 'lentil-feta-salad', name: 'Warm lentil salad with feta', meals: MAIN, servings: 2, prepMin: 10, cookMin: 25,
    cuisine: 'French', flavors: ['Tangy', 'Fresh'],
    ingredients: { greenLentils: 150, carrot: 150, redOnion: 50, feta: 80, spinach: 60, oliveOil: 15, lemonJuice: 15, baguette: 120 },
    seasoning: ['1 tsp Dijon mustard', '1 bay leaf', 'Fresh parsley', 'Cumin'],
    steps: [
      'Simmer the lentils with the bay leaf for 20 to 25 minutes, until tender but not mushy.',
      'Whisk the oil, lemon and mustard. Toss with the warm lentils so they soak it up.',
      'Add the grated carrot, sliced onion, spinach, parsley and crumbled feta. Serve with crusty bread.',
    ],
  },
  {
    id: 'bean-cheese-quesadillas', name: 'Bean and cheese quesadillas', meals: MAIN, servings: 2, prepMin: 10, cookMin: 10,
    cuisine: 'Mexican', flavors: ['Spicy', 'Comforting'],
    ingredients: { tortilla: 240, kidneyBeans: 240, emmental: 80, bellPepper: 150, corn: 100, redOnion: 50, oliveOil: 5 },
    seasoning: ['1 tsp cumin', '1 tsp smoked paprika', 'Hot sauce', 'Salsa to serve'],
    steps: [
      'Roughly mash the beans with the spices.',
      'Spread on 2 tortillas, add the diced pepper, corn, onion and cheese, and cover with the others.',
      'Cook in a lightly oiled pan for 3 minutes per side until crisp and melted. Cut into wedges.',
    ],
  },
  {
    id: 'creamy-mushroom-pasta', name: 'Creamy mushroom and spinach pasta', meals: MAIN, servings: 2, prepMin: 5, cookMin: 15,
    cuisine: 'Italian', flavors: ['Comforting', 'Savory'],
    ingredients: { wholePasta: 180, mushrooms: 300, spinach: 100, fromageBlanc: 150, parmesan: 30, garlic: 8, oliveOil: 10 },
    seasoning: ['Thyme', 'Nutmeg', 'Black pepper'],
    steps: [
      'Cook the pasta.',
      'Brown the mushrooms in the hot oil without stirring too much, then add the garlic and thyme.',
      'Add the spinach, then off the heat stir in the fromage blanc, parmesan and a splash of pasta water.',
      'Toss with the pasta and plenty of pepper.',
    ],
  },
  {
    id: 'chicken-sweet-potato-traybake', name: 'Smoky chicken and sweet potato traybake', meals: MAIN, servings: 3, prepMin: 15, cookMin: 35,
    cuisine: 'American', flavors: ['Spicy', 'Sweet'],
    ingredients: { chickenThigh: 500, sweetPotato: 600, redOnion: 150, bellPepper: 200, oliveOil: 20, honey: 10 },
    seasoning: ['2 tsp smoked paprika', '1 tsp garlic powder', '1/2 tsp chili', 'Lime wedges'],
    steps: [
      'Heat the oven to 200 °C.',
      'Toss everything except the honey with the oil and spices on a tray.',
      'Roast 35 minutes, drizzling the honey over the chicken for the last 10.',
      'Serve with lime.',
    ],
  },
  {
    id: 'sesame-tofu-noodles', name: 'Sesame peanut tofu noodles', meals: MAIN, servings: 2, prepMin: 15, cookMin: 10,
    cuisine: 'Asian', flavors: ['Savory', 'Spicy'],
    ingredients: { smokedTofu: 250, riceNoodles: 150, broccoli: 200, carrot: 100, peanutButter: 30, soySauce: 30, lemonJuice: 15, mapleSyrup: 10 },
    seasoning: ['1 tsp grated ginger', '1 garlic clove', 'Chili oil', 'Spring onions'],
    steps: [
      'Soak or cook the noodles. Steam the broccoli 4 minutes.',
      'Whisk the peanut butter, soy sauce, lime, maple syrup, ginger, garlic and a little hot water.',
      'Fry the cubed tofu until crisp, then toss with the noodles, vegetables and sauce.',
      'Finish with chili oil and spring onions.',
    ],
  },
  {
    id: 'chana-masala', name: 'Chana masala', meals: MAIN, servings: 4, prepMin: 10, cookMin: 25,
    cuisine: 'Indian', flavors: ['Spicy', 'Tangy'],
    ingredients: { chickpeas: 800, cannedTomatoes: 400, onion: 200, garlic: 12, spinach: 200, basmati: 280, oliveOil: 20 },
    seasoning: ['2 tsp garam masala', '1 tsp cumin seeds', '1 tsp turmeric', '1 tsp grated ginger', 'Green chili', 'Lemon juice'],
    steps: [
      'Cook the rice. Fry the cumin seeds in the oil, then the onion until golden, about 10 minutes.',
      'Add the garlic, ginger, chili and spices for 1 minute, then the tomatoes.',
      'Add the chickpeas and simmer 15 minutes, then the spinach until wilted. Finish with lemon.',
    ],
  },
  {
    id: 'spanish-tortilla', name: 'Spanish potato tortilla with bread', meals: MAIN, servings: 4, prepMin: 15, cookMin: 30,
    cuisine: 'Mediterranean', flavors: ['Savory', 'Comforting'],
    ingredients: { egg: 480, potato: 800, onion: 150, oliveOil: 30, lettuce: 150, baguette: 200 },
    seasoning: ['Salt', 'Smoked paprika', 'Sherry vinegar for the salad'],
    steps: [
      'Slice the potatoes and onion thinly and cook gently in the oil with a lid for 20 minutes, until tender.',
      'Beat the eggs with salt, stir in the potatoes and pour back into the pan.',
      'Cook 5 minutes on low heat, flip with a plate and cook 3 minutes more. Serve warm or cold with salad and bread.',
    ],
  },
  {
    id: 'roast-cauliflower-chickpeas', name: 'Roast cauliflower and chickpeas with yogurt', meals: MAIN, servings: 2, prepMin: 10, cookMin: 30,
    cuisine: 'Middle Eastern', flavors: ['Spicy', 'Tangy'],
    ingredients: { cauliflower: 600, chickpeas: 240, greekYogurt: 120, lemonJuice: 15, oliveOil: 15, pita: 160 },
    seasoning: ['2 tsp cumin', '1 tsp smoked paprika', '1 tsp turmeric', 'Garlic', 'Fresh mint'],
    steps: [
      'Heat the oven to 220 °C. Toss the cauliflower florets and chickpeas with the oil and spices.',
      'Roast 30 minutes until charred at the edges.',
      'Mix the yogurt with lemon, garlic and mint. Serve with the warm pitas.',
    ],
  },
  {
    id: 'korean-beef-bowl', name: 'Korean-style beef rice bowl', meals: MAIN, servings: 2, prepMin: 15, cookMin: 15,
    cuisine: 'Asian', flavors: ['Sweet', 'Spicy'],
    ingredients: { steak: 250, basmati: 150, carrot: 100, cucumber: 150, egg: 120, soySauce: 40, honey: 15, sesame: 6, garlic: 8 },
    seasoning: ['1 tbsp gochujang or sriracha', '1 tsp grated ginger', '1 tbsp rice vinegar', 'Spring onions'],
    steps: [
      'Cook the rice. Marinate the thinly sliced beef in the soy sauce, honey, garlic, ginger and gochujang.',
      'Quick-pickle the sliced cucumber in the vinegar. Grate the carrot.',
      'Sear the beef in a very hot pan 2 to 3 minutes. Fry the eggs.',
      'Top the rice with beef, vegetables, a fried egg, sesame and spring onions.',
    ],
  },
  {
    id: 'thai-chicken-coconut-soup', name: 'Thai chicken coconut soup', meals: MAIN, servings: 2, prepMin: 10, cookMin: 20,
    cuisine: 'Asian', flavors: ['Tangy', 'Spicy'],
    ingredients: { chickenBreast: 250, coconutMilk: 150, mushrooms: 200, riceNoodles: 160, lemonJuice: 20, soySauce: 20 },
    seasoning: ['1 lemongrass stalk', '1 tsp grated ginger', '1 red chili', '1 chicken stock cube', 'Fresh coriander'],
    steps: [
      'Simmer 700 ml of water with the stock cube, bruised lemongrass, ginger and chili for 5 minutes.',
      'Add the thinly sliced chicken and mushrooms and cook 8 minutes.',
      'Add the coconut milk and noodles and cook 4 minutes. Finish with lime, soy sauce and coriander.',
    ],
  },
  {
    id: 'pizza-wrap', name: 'Ham and mushroom pizza wrap', meals: MAIN, servings: 1, prepMin: 5, cookMin: 10,
    cuisine: 'Italian', flavors: ['Savory', 'Comforting'],
    ingredients: { tortilla: 60, passata: 60, mozzarella: 60, ham: 40, mushrooms: 50 },
    seasoning: ['Oregano', 'Chili oil (optional)'],
    steps: [
      'Heat the oven to 220 °C.',
      'Spread the passata on the tortilla, add the ham, sliced mushrooms, torn mozzarella and oregano.',
      'Bake 8 to 10 minutes until crisp and bubbling.',
    ],
  },
  {
    id: 'stuffed-peppers', name: 'Beef and rice stuffed peppers', meals: MAIN, servings: 4, prepMin: 20, cookMin: 40,
    cuisine: 'Mediterranean', flavors: ['Savory', 'Comforting'],
    ingredients: { bellPepper: 800, beefMince: 400, basmati: 120, cannedTomatoes: 400, onion: 100, emmental: 60 },
    seasoning: ['1 tsp cumin', '1 tsp oregano', 'Garlic', 'Fresh parsley'],
    steps: [
      'Heat the oven to 190 °C. Cut the tops off the peppers and scoop out the seeds.',
      'Brown the beef with the onion and spices, then add the uncooked rice and half the tomatoes.',
      'Fill the peppers, stand them in a dish with the rest of the tomatoes and 100 ml of water.',
      'Cover and bake 35 minutes, then add the cheese and bake 5 minutes uncovered.',
    ],
  },
  {
    id: 'pork-green-bean-stir-fry', name: 'Garlic pork and green bean stir-fry', meals: MAIN, servings: 2, prepMin: 10, cookMin: 15,
    cuisine: 'Asian', flavors: ['Savory', 'Spicy'],
    ingredients: { pork: 300, greenBeans: 300, basmati: 150, soySauce: 30, garlic: 12, honey: 10, oliveOil: 10 },
    seasoning: ['1 tsp grated ginger', 'Chili flakes', '1 tbsp rice vinegar'],
    steps: [
      'Cook the rice. Blanch the green beans 3 minutes.',
      'Stir-fry the sliced pork in the hot oil for 4 minutes.',
      'Add the beans, garlic, ginger and chili for 2 minutes, then the soy sauce, honey and vinegar until glossy.',
    ],
  },
  {
    id: 'minestrone', name: 'Minestrone', meals: MAIN, servings: 4, prepMin: 15, cookMin: 30,
    cuisine: 'Italian', flavors: ['Comforting', 'Fresh'],
    ingredients: { cannedTomatoes: 400, kidneyBeans: 400, pasta: 160, carrot: 150, zucchini: 200, leek: 150, greenBeans: 150, oliveOil: 15, parmesan: 30 },
    seasoning: ['1 vegetable stock cube', 'Garlic', 'Rosemary', 'Fresh basil'],
    steps: [
      'Soften the leek, carrot and garlic in the oil for 5 minutes.',
      'Add the tomatoes, stock cube, rosemary and 1.2 litres of water and simmer 10 minutes.',
      'Add the zucchini, green beans, beans and small pasta and cook 12 minutes.',
      'Serve with parmesan and basil.',
    ],
  },
  {
    id: 'creamy-salmon-pasta', name: 'Creamy lemon salmon pasta', meals: MAIN, servings: 2, prepMin: 10, cookMin: 15,
    cuisine: 'Italian', flavors: ['Fresh', 'Comforting'],
    ingredients: { pasta: 180, salmon: 200, spinach: 100, fromageBlanc: 120, lemonJuice: 15, garlic: 4 },
    seasoning: ['Lemon zest', 'Fresh dill', 'Black pepper'],
    steps: [
      'Cook the pasta.',
      'Pan-fry the salmon 3 minutes per side, then flake it.',
      'Wilt the spinach with the garlic, then off the heat add the fromage blanc, lemon and a splash of pasta water.',
      'Toss with the pasta and salmon, and finish with dill and zest.',
    ],
  },
  {
    id: 'chicken-shawarma-bowl', name: 'Chicken shawarma bowl', meals: MAIN, servings: 2, prepMin: 15, cookMin: 20,
    cuisine: 'Middle Eastern', flavors: ['Spicy', 'Fresh'],
    ingredients: { chickenThigh: 300, bulgur: 140, redCabbage: 150, tomato: 150, cucumber: 150, greekYogurt: 100, garlic: 4, lemonJuice: 15, oliveOil: 10 },
    seasoning: ['1 tsp cumin', '1 tsp paprika', '1/2 tsp cinnamon', '1/2 tsp turmeric', 'Fresh parsley'],
    steps: [
      'Marinate the chicken in the oil, lemon and spices (10 minutes or overnight).',
      'Cook the bulgur. Pan-fry or grill the chicken 6 to 7 minutes per side, then slice.',
      'Mix the yogurt with the garlic. Build bowls with bulgur, salad, chicken and garlic yogurt.',
    ],
  },

  // ───────────── Snacks and desserts ─────────────
  {
    id: 'date-almond-energy-balls', name: 'Date, almond and cocoa energy balls', meals: ['SNACK'], servings: 6, prepMin: 15, cookMin: 0,
    cuisine: 'Middle Eastern', flavors: ['Sweet'],
    ingredients: { dates: 200, almonds: 100, oats: 60, cocoa: 15 },
    seasoning: ['Pinch of salt', 'Orange zest'],
    steps: [
      'Blend the almonds and oats into crumbs.',
      'Add the pitted dates, cocoa, salt and zest and blend until it sticks together.',
      'Roll into 12 balls. Keeps a week in the fridge.',
    ],
  },
  {
    id: 'hummus-veggie-sticks', name: 'Hummus, warm pita and veggie sticks', meals: ['SNACK'], servings: 2, prepMin: 10, cookMin: 0,
    cuisine: 'Middle Eastern', flavors: ['Fresh', 'Savory'],
    ingredients: { hummus: 80, carrot: 200, cucumber: 200, bellPepper: 150, pita: 80 },
    seasoning: ['Smoked paprika', 'Drizzle of lemon'],
    steps: [
      'Cut the vegetables into sticks and warm the pita, cut into triangles.',
      'Spoon the hummus into a bowl, dust with paprika and add a squeeze of lemon. Dip away.',
    ],
  },
  {
    id: 'chocolate-skyr-mousse', name: 'Chocolate skyr mousse', meals: ['SNACK'], dessert: true, servings: 2, prepMin: 5, cookMin: 0,
    cuisine: 'French', flavors: ['Sweet'],
    ingredients: { skyr: 300, cocoa: 15, honey: 20, raspberries: 80 },
    seasoning: ['1/2 tsp vanilla extract', 'Pinch of salt'],
    steps: [
      'Whisk the skyr with the cocoa, honey, vanilla and salt until smooth and glossy.',
      'Spoon into glasses, top with raspberries and chill 10 minutes if you can wait.',
    ],
  },
  {
    id: 'apple-peanut-butter', name: 'Apple slices with cinnamon peanut butter', meals: ['SNACK'], servings: 1, prepMin: 3, cookMin: 0,
    cuisine: 'American', flavors: ['Sweet', 'Fresh'],
    ingredients: { apple: 180, peanutButter: 20 },
    seasoning: ['Cinnamon', 'Pinch of flaky salt'],
    steps: ['Slice the apple, dust with cinnamon and dip into the peanut butter with a pinch of salt.'],
  },
  {
    id: 'banana-nice-cream', name: 'Chocolate peanut banana nice cream', meals: ['SNACK'], dessert: true, servings: 2, prepMin: 5, cookMin: 0,
    restNote: 'Freeze the banana slices the day before', cuisine: 'American', flavors: ['Sweet'],
    ingredients: { banana: 300, peanutButter: 20, cocoa: 10, milk: 50 },
    seasoning: ['1/2 tsp vanilla extract'],
    steps: [
      'Blend the frozen banana slices with the milk, scraping down the sides, until it looks like soft-serve.',
      'Blend in the cocoa, peanut butter and vanilla. Eat right away, or freeze 30 minutes for scoops.',
    ],
  },
  {
    id: 'baked-cinnamon-apples', name: 'Baked cinnamon apples with oat crumble', meals: ['SNACK'], dessert: true, servings: 2, prepMin: 10, cookMin: 25,
    cuisine: 'French', flavors: ['Sweet', 'Comforting'],
    ingredients: { apple: 360, oats: 40, almonds: 20, butter: 10, honey: 15 },
    seasoning: ['1 tsp cinnamon', 'Pinch of salt'],
    steps: [
      'Heat the oven to 180 °C. Halve and core the apples and put them in a dish.',
      'Rub the butter into the oats, chopped almonds, honey, cinnamon and salt.',
      'Pile the crumble on the apples and bake 25 minutes until soft and golden.',
    ],
  },
  {
    id: 'dark-chocolate-mousse', name: 'Dark chocolate mousse', meals: ['SNACK'], dessert: true, servings: 4, prepMin: 20, cookMin: 0,
    restNote: '3 hours in the fridge', cuisine: 'French', flavors: ['Sweet'],
    ingredients: { darkChocolate: 100, egg: 240, sugar: 10 },
    seasoning: ['Pinch of salt', 'Espresso or orange zest (optional)'],
    steps: [
      'Melt the chocolate gently and let it cool a little. Separate the eggs.',
      'Stir the yolks into the chocolate.',
      'Whisk the whites with the salt to soft peaks, add the sugar and whisk until firm.',
      'Fold the whites into the chocolate in three goes. Chill 3 hours.',
    ],
  },
  {
    id: 'crispy-spiced-chickpeas', name: 'Crispy spiced chickpeas', meals: ['SNACK'], servings: 3, prepMin: 5, cookMin: 30,
    cuisine: 'Indian', flavors: ['Spicy', 'Savory'],
    ingredients: { chickpeas: 400, oliveOil: 15 },
    seasoning: ['1 tsp smoked paprika', '1 tsp cumin', '1/2 tsp garlic powder', 'Salt', 'Pinch of cayenne'],
    steps: [
      'Heat the oven to 200 °C. Dry the drained chickpeas very well on a towel.',
      'Toss with the oil and spread on a tray. Roast 25 to 30 minutes, shaking halfway, until crunchy.',
      'Toss with the spices and salt while hot. Keeps 3 days in a jar.',
    ],
  },
];

// ───────────── Numbers ─────────────

export type Nutrition = { calories: number; protein: number; carbs: number; fat: number };

/** Calories and macros for one serving, from the ingredients' Ciqual values. */
export function perServing(r: Recipe): Nutrition {
  let calories = 0, protein = 0, carbs = 0, fat = 0;
  for (const [id, grams] of Object.entries(r.ingredients) as [IngredientId, number][]) {
    const ing = INGREDIENTS[id];
    const k = grams / 100 / r.servings;
    calories += ing.kcal * k; protein += ing.protein * k; carbs += ing.carbs * k; fat += ing.fat * k;
  }
  return { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}

/** Cost of one serving in euros (spices and condiments not counted). */
export function costPerServing(r: Recipe): number {
  const total = (Object.entries(r.ingredients) as [IngredientId, number][])
    .reduce((sum, [id, grams]) => sum + (INGREDIENTS[id].pricePerKg * grams) / 1000, 0);
  return Math.round((total / r.servings) * 100) / 100;
}

export type PriceTier = 1 | 2 | 3;
export const PRICE_LABEL: Record<PriceTier, string> = { 1: '€', 2: '€€', 3: '€€€' };
export const PRICE_HINT: Record<PriceTier, string> = { 1: 'Under €2', 2: '€2 to €4', 3: 'Over €4' };
export const priceTier = (r: Recipe): PriceTier => { const c = costPerServing(r); return c < 2 ? 1 : c <= 4 ? 2 : 3; };

export const totalMinutes = (r: Recipe) => r.prepMin + r.cookMin;

export const isVegan = (r: Recipe) => Object.keys(r.ingredients).every((id) => INGREDIENTS[id as IngredientId].kind === 'plant');
export const isVegetarian = (r: Recipe) => Object.keys(r.ingredients).every((id) => !['meat', 'fish'].includes(INGREDIENTS[id as IngredientId].kind));

/**
 * Which goals a recipe fits, from one serving's numbers:
 * - Lose weight: filling but light, at least 20% of calories from protein and not too many calories.
 * - Build muscle: plenty of protein, with enough calories to grow on.
 * - Gain weight: a generous plate, rich in calories, with some protein.
 * - Recomposition: lean and protein-rich, at least 25% of calories from protein, moderate calories.
 * - Maintain: a balanced plate, moderate calories, some protein, fat under 40% of calories.
 */
export function goalsFor(r: Recipe): Goal[] {
  const n = perServing(r);
  const proteinShare = (n.protein * 4) / Math.max(n.calories, 1);
  const fatShare = (n.fat * 9) / Math.max(n.calories, 1);
  const snack = !r.meals.some((m) => m !== 'SNACK');
  const goals: Goal[] = [];
  if (snack) {
    if (n.calories <= 220 && (proteinShare >= 0.15 || fatShare < 0.35)) goals.push('LOSE_FAT');
    if (n.protein >= 12) goals.push('BUILD_MUSCLE');
    if (n.calories >= 250) goals.push('GAIN_WEIGHT');
    if (n.calories <= 300 && n.protein >= 10) goals.push('RECOMPOSITION');
    if (n.calories <= 320) goals.push('MAINTAIN');
  } else {
    if (n.calories <= 560 && proteinShare >= 0.2) goals.push('LOSE_FAT');
    if (n.protein >= 30 && n.calories >= 450) goals.push('BUILD_MUSCLE');
    if (n.calories >= 600 && n.protein >= 20) goals.push('GAIN_WEIGHT');
    if (n.calories <= 700 && n.protein >= 25 && proteinShare >= 0.25) goals.push('RECOMPOSITION');
    if (n.calories >= 300 && n.calories <= 750 && n.protein >= 15 && fatShare <= 0.4) goals.push('MAINTAIN');
  }
  return goals;
}

/** "2 eggs (120 g)" or "Basmati rice (dry) 140 g". */
export function ingredientLine(id: IngredientId, grams: number): string {
  const ing = INGREDIENTS[id];
  if (ing.unit) {
    const count = Math.round((grams / ing.unit.grams) * 2) / 2;
    if (count >= 0.5) return `${count} ${count > 1 ? ing.unit.many : ing.unit.one} (${grams} g)`;
  }
  return `${ing.name}, ${grams} g`;
}

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id) ?? null;
