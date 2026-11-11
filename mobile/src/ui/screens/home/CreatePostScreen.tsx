/**
 * Log a meal: it counts toward today's total and is shared with friends in the feed.
 *
 * Laid out like a food diary app: the meal on top, a row of ways to add food (barcode,
 * photo, quick add, recipes), and the search field below it as the main element. Foods found
 * fill in the numbers; "Quick add" types them by hand.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { MealPhotos, PhotoResult } from '../../../data/mealPhotos';
import { describeItems, MealItem, mealTotals } from '../../../data/openFoodFacts';
import { MEAL, MEAL_TYPES, MealType, mealTypeForNow, plural } from '../../../data/social';
import { meStore, SocialRepository } from '../../../data/socialRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { data, Gutter, palette, radius, space, type, withAlpha } from '../../theme';
import { haptics } from '../../haptics';
import { Chip, digits, ErrorText, Icon, IconButton, IconName, ListGroup, PageHeader, PressableScale, PrimaryButton, Screen, SectionTitle, T } from '../../components/core';
import { ActionMenu } from '../../components/overlays';
import { ShapeLoader } from '../../shapes/ShapeLoader';
import { MealPhoto } from '../../components/feed';
import { FoodSearch } from '../../components/foodSearch';

const MAX_MEAL_KCAL = 5000;
const MAX_MEAL_PROTEIN = 400;

type Mode = 'search' | 'barcode' | 'quick';

export function CreatePostScreen() {
  const nav = useNav();
  const params = useParams<'CreatePost'>() ?? {};
  const me = useStore(meStore);
  const [mealType, setMealType] = useState<MealType>(params.type ?? mealTypeForNow());
  // A recipe opens this page with its numbers already filled in, ready to post.
  const prefill = params.prefill;
  const start = (n: number | undefined) => (n ? String(n) : '');
  const [mode, setMode] = useState<Mode>(prefill ? 'quick' : params.start === 'barcode' ? 'barcode' : 'search');
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [caloriesText, setCaloriesText] = useState(start(prefill?.calories));
  const [proteinText, setProteinText] = useState(start(prefill?.protein));
  const [carbsText, setCarbsText] = useState(start(prefill?.carbs));
  const [fatText, setFatText] = useState(start(prefill?.fat));
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoMenu, setPhotoMenu] = useState(params.start === 'photo');
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);

  useEffect(() => { SocialRepository.ensureMe().catch(() => null); }, []);

  /** Foods from Open Food Facts fill in the numbers; they can still be edited with "Quick add". */
  function changeItems(next: MealItem[]) {
    const previousAuto = describeItems(items);
    setItems(next);
    setError(null);
    const t = mealTotals(next);
    const show = (n: number) => (next.length > 0 && n > 0 ? String(n) : '');
    setCaloriesText(show(t.calories));
    setProteinText(show(t.protein));
    setCarbsText(show(t.carbs));
    setFatText(show(t.fat));
    // Only replace the description if the user hasn't written their own.
    if (!description.trim() || description === previousAuto) setDescription(describeItems(next));
  }

  async function attachPhoto(source: () => Promise<PhotoResult>) {
    setProcessingPhoto(true);
    const result = await source();
    setProcessingPhoto(false);
    if (!result) return;
    if ('photo' in result) setPhoto(result.photo);
    else setError(result.error);
  }

  const calories = caloriesText ? parseInt(caloriesText, 10) : null;
  const caloriesError = !caloriesText ? null
    : calories == null || calories <= 0 ? 'Enter a number of calories.'
      : calories > MAX_MEAL_KCAL ? "That's a lot for one meal. Check the number." : null;
  const protein = parseInt(proteinText, 10) || 0;
  const proteinError = protein > MAX_MEAL_PROTEIN ? "That's more than any meal holds. Check the number." : null;
  const carbs = parseInt(carbsText, 10) || 0;
  const fat = parseInt(fatText, 10) || 0;
  const macroError = carbs > 600 || fat > 300 ? "That's more than any meal holds. Check the number." : null;
  const canPost = calories != null && !caloriesError && !proteinError && !macroError && !busy && !processingPhoto;
  const friends = me?.friends.length ?? 0;

  async function post() {
    if (calories == null) return;
    setBusy(true);
    const failure = await SocialRepository.logMeal(mealType, description, calories, protein, carbs, fat, photo);
    setBusy(false);
    if (failure == null) { haptics.confirm(); goBack(nav); } else { haptics.reject(); setError(failure); }
  }

  const options: { key: string; icon: IconName; label: string; selected: boolean; onPress: () => void }[] = [
    { key: 'barcode', icon: 'mc:barcode-scan', label: 'Barcode', selected: mode === 'barcode', onPress: () => setMode(mode === 'barcode' ? 'search' : 'barcode') },
    { key: 'photo', icon: 'photo-camera', label: 'Photo', selected: photo != null, onPress: () => setPhotoMenu(true) },
    { key: 'quick', icon: 'edit', label: 'Quick add', selected: mode === 'quick', onPress: () => setMode(mode === 'quick' ? 'search' : 'quick') },
    { key: 'recipes', icon: 'menu-book', label: 'Recipes', selected: false, onPress: () => nav.navigate('Recipes', { planFor: mealType }) },
  ];

  return (
    <Screen keyboard>
      <PageHeader title="Log a meal" onBack={() => goBack(nav)} />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingBottom: 12, gap: 8 }}>
          {MEAL_TYPES.map((t) => <Chip key={t} label={MEAL[t].label} selected={mealType === t} onPress={() => setMealType(t)} />)}
        </ScrollView>

        {/* The ways to add food, then the search field as the main element. */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: Gutter, paddingBottom: 12 }}>
          {options.map(({ key, ...o }) => <OptionButton key={key} {...o} />)}
        </View>

        {mode === 'quick' ? (
          <QuickAdd
            description={description} onDescription={setDescription}
            values={{ caloriesText, proteinText, carbsText, fatText }}
            onCalories={(v) => { setCaloriesText(digits(v, 5)); setError(null); }}
            onProtein={(v) => { setProteinText(digits(v, 3)); setError(null); }}
            onCarbs={(v) => { setCarbsText(digits(v, 3)); setError(null); }}
            onFat={(v) => { setFatText(digits(v, 3)); setError(null); }}
            errors={{ caloriesError, proteinError, macroError }}
          />
        ) : (
          <>
            <FoodSearch items={items} onChange={changeItems} autoFocus={!prefill} barcode={mode === 'barcode'} />
            {items.length > 0 && calories != null && (
              <Total calories={calories} protein={protein} carbs={carbs} fat={fat} description={description} onDescription={setDescription}
                onEdit={() => setMode('quick')} />
            )}
          </>
        )}

        {(photo || processingPhoto) && (
          <View style={{ marginHorizontal: Gutter, marginTop: 14, aspectRatio: 4 / 3, borderRadius: 24, overflow: 'hidden', backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' }}>
            {photo ? (
              <>
                <MealPhoto photo={photo} style={{ width: '100%', height: '100%' }} />
                <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: withAlpha(palette.ink, 0.7), borderRadius: 22 }}>
                  <IconButton name="close" label="Remove photo" onPress={() => setPhoto(null)} />
                </View>
              </>
            ) : <ShapeLoader size={28} />}
          </View>
        )}
        {error && <View style={{ paddingHorizontal: Gutter, paddingTop: 12 }}><ErrorText message={error} /></View>}
      </ScrollView>

      <View style={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
        <T v="bodyS" color={palette.textMuted} center>
          {calories == null ? 'Add a food, or use Quick add to type the calories.'
            : friends === 0 ? 'Only you will see this until you add friends.' : `Shared with your ${friends} ${plural(friends, 'friend')}.`}
        </T>
        <PrimaryButton label={calories != null ? `Log ${calories} kcal as ${MEAL[mealType].label.toLowerCase()}` : 'Log meal'} enabled={canPost} loading={busy} onPress={post} />
      </View>

      <ActionMenu visible={photoMenu} onDismiss={() => setPhotoMenu(false)} title="Add a photo of your meal" items={[
        { label: 'Take a photo', icon: 'photo-camera', onPress: () => attachPhoto(MealPhotos.take) },
        { label: 'Choose a photo', icon: 'photo-library', onPress: () => attachPhoto(MealPhotos.pick) },
      ]} />
    </Screen>
  );
}

function OptionButton({ icon, label, selected, onPress }: { icon: IconName; label: string; selected: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} label={label} selected={selected}
      style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md, backgroundColor: selected ? palette.primaryContainer : palette.surface }}>
      <Icon name={icon} size={22} color={selected ? palette.onPrimaryContainer : palette.text} />
      <T v="label" color={selected ? palette.onPrimaryContainer : palette.textMuted} lines={1}>{label}</T>
    </PressableScale>
  );
}

/** What the foods add up to, with a name for the meal. */
function Total({ calories, protein, carbs, fat, description, onDescription, onEdit }: {
  calories: number; protein: number; carbs: number; fat: number; description: string; onDescription: (t: string) => void; onEdit: () => void;
}) {
  return (
    <View style={{ marginHorizontal: Gutter, marginTop: 14, borderRadius: radius.lg, backgroundColor: palette.surface, padding: space.tilePad, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T v="overline" color={palette.textMuted} style={{ flex: 1 }}>This meal</T>
        <PressableScale onPress={onEdit} label="Edit the numbers"><T v="label" color={palette.primary}>Edit numbers</T></PressableScale>
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Stat value={String(calories)} label="kcal" color={palette.text} />
        <Stat value={`${protein} g`} label="Protein" color={data.protein} />
        <Stat value={`${carbs} g`} label="Carbs" color={data.carbs} />
        <Stat value={`${fat} g`} label="Fat" color={data.fat} />
      </View>
      <TextInput
        value={description}
        onChangeText={(t) => onDescription(t.slice(0, 200))}
        placeholder="Name this meal (optional)"
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.primary}
        keyboardAppearance="dark"
        accessibilityLabel="Name this meal"
        style={[type.body, { color: palette.text, backgroundColor: palette.surfaceHigh, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }]}
      />
    </View>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T v="displayS" color={color} style={{ fontSize: 22, lineHeight: 26 }}>{value}</T>
      <T v="bodyS" color={palette.textMuted}>{label}</T>
    </View>
  );
}

/** Typing the numbers by hand, for a meal no database knows. */
function QuickAdd({ description, onDescription, values, onCalories, onProtein, onCarbs, onFat, errors }: {
  description: string; onDescription: (t: string) => void;
  values: { caloriesText: string; proteinText: string; carbsText: string; fatText: string };
  onCalories: (v: string) => void; onProtein: (v: string) => void; onCarbs: (v: string) => void; onFat: (v: string) => void;
  errors: { caloriesError: string | null; proteinError: string | null; macroError: string | null };
}) {
  return (
    <>
      <ListGroup>
        <TextInput
          value={description}
          onChangeText={(t) => onDescription(t.slice(0, 200))}
          placeholder="What did you eat?"
          placeholderTextColor={palette.textMuted}
          multiline
          autoCapitalize="sentences"
          selectionColor={palette.primary}
          keyboardAppearance="dark"
          accessibilityLabel="What did you eat?"
          style={[type.body, { color: palette.text, minHeight: 72, paddingHorizontal: 18, paddingVertical: 16, textAlignVertical: 'top' }]}
        />
        <NumberRow label="Calories" value={values.caloriesText} onChange={onCalories} suffix="kcal" error={errors.caloriesError} />
        <NumberRow label="Protein (optional)" value={values.proteinText} onChange={onProtein} suffix="g" error={errors.proteinError} />
        <NumberRow label="Carbs (optional)" value={values.carbsText} onChange={onCarbs} suffix="g" />
        <NumberRow label="Fat (optional)" value={values.fatText} onChange={onFat} suffix="g" error={errors.macroError} />
      </ListGroup>
      <SectionTitle text="Not sure of the numbers?" />
      <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter }}>
        A full plate is often 500 to 800 kcal, and a palm-sized portion of meat or fish is about 25 g of protein.
      </T>
    </>
  );
}

/** "Calories ........ 650 kcal": label on the left, a right-aligned number on the right. */
function NumberRow({ label, value, onChange, suffix, error }: { label: string; value: string; onChange: (v: string) => void; suffix: string; error?: string | null }) {
  return (
    <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T v="body" style={{ flex: 1 }}>{label}</T>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          selectionColor={palette.primary}
          keyboardAppearance="dark"
          accessibilityLabel={label}
          style={[type.displayS, { fontSize: 18, lineHeight: 24, letterSpacing: 0, color: palette.text, textAlign: 'right', width: 120, paddingVertical: 4 }]}
        />
        <T v="titleS" color={palette.textMuted}> {suffix}</T>
      </View>
      {error ? <T v="bodyS" color={palette.error} style={{ marginTop: 4 }}>{error}</T> : null}
    </View>
  );
}
