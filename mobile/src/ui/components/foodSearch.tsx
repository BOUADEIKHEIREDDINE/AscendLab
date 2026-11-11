/**
 * Search Open Food Facts and add foods to a meal. Each food gets an amount in grams; the
 * parent turns the list into the meal's calories and macros.
 */
import React, { useState } from 'react';
import { Image, TextInput, View } from 'react-native';
import { Food, itemTotals, MealItem, searchFoods } from '../../data/openFoodFacts';
import { Gutter, palette, radius, space, type } from '../theme';
import { haptics } from '../haptics';
import { digits, ErrorText, Icon, IconButton, ListGroup, ListRow, T } from './core';
import { ShapeLoader } from '../shapes/ShapeLoader';

const MAX_GRAMS = 2000;

/** `barcode`: the field takes a barcode number. `autoFocus`: the keyboard opens right away. */
export function FoodSearch({ items, onChange, autoFocus, barcode }: {
  items: MealItem[]; onChange: (items: MealItem[]) => void; autoFocus?: boolean; barcode?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim() || searching) return;
    setSearching(true);
    setError(null);
    const r = await searchFoods(query);
    setSearching(false);
    if ('error' in r) { setError(r.error); setResults(null); return; }
    setResults(r.foods);
    if (r.foods.length === 0) setError('No food found. Try another name, in French or English, or a barcode.');
  }

  function add(food: Food) {
    haptics.tick();
    onChange([...items, { food, grams: food.servingG ?? 100 }]);
    setResults(null);
    setQuery('');
  }

  const setGrams = (i: number, text: string) => {
    const grams = Math.min(parseInt(digits(text, 4), 10) || 0, MAX_GRAMS);
    onChange(items.map((it, j) => (j === i ? { ...it, grams } : it)));
  };

  return (
    <View style={{ paddingBottom: 6 }}>
      <View style={{ marginHorizontal: Gutter, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceHigh, borderRadius: radius.full, paddingLeft: 20, minHeight: 56,
          borderWidth: 2, borderColor: query ? palette.primary : 'transparent' }}>
          <Icon name={barcode ? 'mc:barcode-scan' : 'search'} color={palette.text} size={22} />
          <TextInput
            key={barcode ? 'barcode' : 'name'}
            autoFocus={autoFocus}
            keyboardType={barcode ? 'number-pad' : 'default'}
            value={query}
            onChangeText={(t) => { setQuery(t.slice(0, 80)); setError(null); }}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder={barcode ? 'Barcode number, under the bars' : 'Search a food: skyr, banana, Nutella…'}
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.primary}
            keyboardAppearance="dark"
            accessibilityLabel="Search Open Food Facts"
            style={[type.body, { fontSize: 16, flex: 1, color: palette.text, paddingHorizontal: 12, paddingVertical: 14 }]}
          />
          {searching
            ? <View style={{ marginHorizontal: 12 }}><ShapeLoader size={22} label="Searching" /></View>
            : <IconButton name="arrow-forward" label="Search" color={palette.primary} onPress={search} disabled={!query.trim()} />}
        </View>
        <ErrorText message={error} />
      </View>

      {results && results.length > 0 && (
        <ListGroup style={{ marginTop: 10 }}>
          {results.map((f, i) => (
            <ListRow
              key={`${f.code}-${i}`}
              leading={<FoodImage url={f.imageUrl} />}
              title={f.name}
              subtitle={[f.brand, `${Math.round(f.kcal100)} kcal / 100 g`, f.protein100 > 0 && `P ${f.protein100.toFixed(1)} g`].filter(Boolean).join(', ')}
              chevron={false}
              label={`Add ${f.name}`}
              onPress={() => add(f)}
            />
          ))}
        </ListGroup>
      )}

      {items.length > 0 && (
        <ListGroup style={{ marginTop: 10 }}>
          {items.map((it, i) => (
            <View key={`${it.food.code}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: space.tilePad, paddingRight: 6, paddingVertical: 10 }}>
              <FoodImage url={it.food.imageUrl} />
              <View style={{ flex: 1 }}>
                <T v="titleS" lines={1}>{it.food.name}</T>
                <T v="bodyS" color={palette.textMuted} lines={1}>
                  {[it.food.brand, `${Math.round(itemTotals(it).calories)} kcal`].filter(Boolean).join(', ')}
                </T>
              </View>
              <TextInput
                value={it.grams ? String(it.grams) : ''}
                onChangeText={(t) => setGrams(i, t)}
                placeholder="0"
                placeholderTextColor={palette.textMuted}
                keyboardType="number-pad"
                selectionColor={palette.primary}
                keyboardAppearance="dark"
                accessibilityLabel={`Grams of ${it.food.name}`}
                style={[type.displayS, { fontSize: 20, lineHeight: 24, color: palette.text, textAlign: 'right', width: 60, paddingVertical: 4 }]}
              />
              <T v="titleS" color={palette.textMuted}>g</T>
              <IconButton name="close" label={`Remove ${it.food.name}`} color={palette.textMuted} size={20}
                onPress={() => onChange(items.filter((_, j) => j !== i))} />
            </View>
          ))}
        </ListGroup>
      )}

      <T v="bodyS" color={palette.textMuted} style={{ marginHorizontal: Gutter, marginTop: 10 }}>
        {results && results.length > 0 ? 'Tap a food to add it. ' : ''}Nutrition data from Open Food Facts, the free food database.
      </T>
    </View>
  );
}

function FoodImage({ url }: { url: string | null }) {
  const size = 40;
  return url
    ? <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: radius.xs, backgroundColor: palette.photoMat }} />
    : (
      <View style={{ width: size, height: size, borderRadius: radius.xs, backgroundColor: palette.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="restaurant" color={palette.textMuted} size={20} />
      </View>
    );
}
