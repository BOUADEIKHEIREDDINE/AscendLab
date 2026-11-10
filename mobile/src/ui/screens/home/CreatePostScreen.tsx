/** Log a meal: it counts toward today's total and is shared with friends in the feed. */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View } from 'react-native';
import { MealPhotos, PhotoResult } from '../../../data/mealPhotos';
import { MEAL, MEAL_TYPES, MealType, mealTypeForNow, plural } from '../../../data/social';
import { meStore, SocialRepository } from '../../../data/socialRepo';
import { useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { palette, Gutter, type } from '../../theme';
import { haptics } from '../../haptics';
import { Chip, digits, Hairline, Icon, IconButton, IconName, PageHeader, PressableScale, PrimaryButton, Screen, T } from '../../components/core';
import { MealPhoto } from '../../components/feed';

const MAX_MEAL_KCAL = 5000;
const MAX_MEAL_PROTEIN = 400;

export function CreatePostScreen() {
  const nav = useNav();
  const params = useParams<'CreatePost'>();
  const me = useStore(meStore);
  const [mealType, setMealType] = useState<MealType>(params.type ?? mealTypeForNow());
  const [description, setDescription] = useState('');
  const [caloriesText, setCaloriesText] = useState('');
  const [proteinText, setProteinText] = useState('');
  const [carbsText, setCarbsText] = useState('');
  const [fatText, setFatText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { SocialRepository.ensureMe().catch(() => null); }, []);

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

  return (
    <Screen keyboard>
      <PageHeader title="Log a meal" onBack={() => goBack(nav)} />
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Photo first, edge to edge, like a photo app's composer. */}
        <View style={{ width: '100%', aspectRatio: 4 / 3, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' }}>
          {photo ? (
            <>
              <MealPhoto photo={photo} style={{ width: '100%', height: '100%' }} />
              <View style={{ position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(16,24,32,0.7)', borderRadius: 22 }}>
                <IconButton name="close" label="Remove photo" onPress={() => { haptics.tick(); setPhoto(null); }} />
              </View>
            </>
          ) : processingPhoto ? <ActivityIndicator color={palette.lime} /> : (
            <View style={{ flexDirection: 'row', gap: 40 }}>
              <PhotoSource icon="photo-camera" label="Take photo" onPress={() => attachPhoto(MealPhotos.take)} />
              <PhotoSource icon="photo-library" label="Choose photo" onPress={() => attachPhoto(MealPhotos.pick)} />
            </View>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Gutter, paddingVertical: 14, gap: 8 }}>
          {MEAL_TYPES.map((t) => <Chip key={t} label={MEAL[t].label} selected={mealType === t} onPress={() => setMealType(t)} />)}
        </ScrollView>
        <Hairline />

        <TextInput
          value={description}
          onChangeText={(t) => setDescription(t.slice(0, 200))}
          placeholder="What did you eat?"
          placeholderTextColor={palette.textMuted}
          multiline
          autoCapitalize="sentences"
          selectionColor={palette.lime}
          keyboardAppearance="dark"
          accessibilityLabel="What did you eat?"
          style={[type.body, { color: palette.text, minHeight: 72, paddingHorizontal: Gutter, paddingVertical: 16, textAlignVertical: 'top' }]}
        />
        <Hairline />
        <NumberRow label="Calories" value={caloriesText} onChange={(v) => { setCaloriesText(digits(v, 5)); setError(null); }} suffix="kcal" error={caloriesError} />
        <Hairline />
        <NumberRow label="Protein (optional)" value={proteinText} onChange={(v) => { setProteinText(digits(v, 3)); setError(null); }} suffix="g" error={proteinError} />
        <Hairline />
        <NumberRow label="Carbs (optional)" value={carbsText} onChange={(v) => { setCarbsText(digits(v, 3)); setError(null); }} suffix="g" />
        <Hairline />
        <NumberRow label="Fat (optional)" value={fatText} onChange={(v) => { setFatText(digits(v, 3)); setError(null); }} suffix="g" error={macroError} />
        <Hairline />
        <T v="bodyS" color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 12 }}>
          Tip: a full plate is often 500 to 800 kcal, and a palm-sized portion of meat or fish is about 25 g of protein.
        </T>
        {error && <T color={palette.error} style={{ paddingHorizontal: Gutter }}>{error}</T>}
      </ScrollView>

      <View style={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 8 }}>
        <T v="bodyS" color={palette.textMuted} center>
          {friends === 0 ? 'Only you will see this until you add friends.' : `Shared with your ${friends} ${plural(friends, 'friend')}.`}
        </T>
        <PrimaryButton label="Post meal" enabled={canPost} loading={busy} onPress={post} />
      </View>
    </Screen>
  );
}

function PhotoSource({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} label={label} style={{ alignItems: 'center', padding: 12 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={palette.lime} />
      </View>
      <T v="label" style={{ marginTop: 8 }}>{label}</T>
    </PressableScale>
  );
}

/** "Calories ........ 650 kcal": label on the left, a right-aligned number on the right. */
function NumberRow({ label, value, onChange, suffix, error }: { label: string; value: string; onChange: (v: string) => void; suffix: string; error?: string | null }) {
  return (
    <View style={{ paddingHorizontal: Gutter, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <T v="body" style={{ flex: 1 }}>{label}</T>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="0"
          placeholderTextColor={palette.textMuted}
          keyboardType="number-pad"
          selectionColor={palette.lime}
          keyboardAppearance="dark"
          accessibilityLabel={label}
          style={[type.titleS, { color: palette.text, textAlign: 'right', width: 120, paddingVertical: 4 }]}
        />
        <T v="titleS" color={palette.textMuted}> {suffix}</T>
      </View>
      {error ? <T v="bodyS" color={palette.error} style={{ marginTop: 4 }}>{error}</T> : null}
    </View>
  );
}
