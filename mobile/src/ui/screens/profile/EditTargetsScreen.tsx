/**
 * Daily targets: keep the recommended ones, type your own calories, or type every macro.
 * Typed numbers under the safety rules are kept, with a warning (decision 2026-11-12).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { CUSTOM_WARNING, formatKcal, hasEverythingForPlan, PlanCalculator, UserProfile } from '../../../data/profile';
import { ProfileRepository, profileStore } from '../../../data/profileRepo';
import { customTargetsError, type CustomTargets } from '../../../lib/goal-engine/custom';
import { useStore } from '../../../lib/store';
import { goBack, useNav } from '../../../navigation/types';
import { Gutter, palette } from '../../theme';
import { digits, HelpNote, Notice, PageHeader, PrimaryButton, Screen, Segmented, T, TextField, Tile, TileHeader } from '../../components/core';
import { ShapeLoader } from '../../shapes/ShapeLoader';

type Mode = 'recommended' | 'calories' | 'macros';

export function EditTargetsScreen() {
  const saved = useStore(profileStore);
  useEffect(() => { if (!profileStore.get()) ProfileRepository.load(); }, []);
  if (!hasEverythingForPlan(saved)) {
    return <Screen style={{ alignItems: 'center', justifyContent: 'center' }}><ShapeLoader size={28} /></Screen>;
  }
  return <EditTargetsContent original={saved} />;
}

const text = (n: number | null | undefined) => (n == null ? '' : String(n));
const parse = (s: string): number | null => (s.trim() === '' ? null : Number(s));

function EditTargetsContent({ original }: { original: UserProfile }) {
  const nav = useNav();
  const current = original.customTargets;
  const rec = useMemo(() => PlanCalculator.nutrition({ ...original, customTargets: null }).recommended, [original]);
  const [mode, setMode] = useState<Mode>(current?.mode ?? 'recommended');
  const [calories, setCalories] = useState(text(current?.mode === 'calories' ? current.calories : rec.calories));
  const [protein, setProtein] = useState(text(current?.mode === 'calories' ? current.proteinG : null));
  const [mProtein, setMProtein] = useState(text(current?.mode === 'macros' ? current.proteinG : rec.proteinG));
  const [carbs, setCarbs] = useState(text(current?.mode === 'macros' ? current.carbsG : rec.carbsG));
  const [fat, setFat] = useState(text(current?.mode === 'macros' ? current.fatG : rec.fatG));
  const [saving, setSaving] = useState(false);

  // What the form says, or undefined while a needed field is empty.
  const custom: CustomTargets | null | undefined = useMemo(() => {
    if (mode === 'recommended') return null;
    if (mode === 'calories') {
      const c = parse(calories);
      return c == null ? undefined : { mode: 'calories', calories: c, proteinG: parse(protein) };
    }
    const [p, c, f] = [parse(mProtein), parse(carbs), parse(fat)];
    return p == null || c == null || f == null ? undefined : { mode: 'macros', proteinG: p, carbsG: c, fatG: f };
  }, [mode, calories, protein, mProtein, carbs, fat]);

  const error = custom ? customTargetsError(custom) : null;
  const preview = custom !== undefined && !error ? PlanCalculator.nutrition({ ...original, customTargets: custom }) : null;
  const changed = custom !== undefined && JSON.stringify(custom) !== JSON.stringify(current);

  return (
    <Screen keyboard>
      <PageHeader title="Daily targets" onBack={() => goBack(nav)} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: Gutter, paddingTop: 8, paddingBottom: 32, gap: 16 }} keyboardShouldPersistTaps="handled">
        <T color={palette.textMuted}>
          We recommend {formatKcal(rec.calories)} kcal, {rec.proteinG} g protein, {rec.carbsG} g carbs and {rec.fatG} g fat a day for your goal. Use your own numbers if you prefer.
        </T>
        <Segmented<Mode>
          options={[{ key: 'recommended', label: 'Recommended' }, { key: 'calories', label: 'Calories' }, { key: 'macros', label: 'Macros' }]}
          selected={mode}
          onSelect={setMode}
        />

        {mode === 'calories' && (
          <View style={{ gap: 12 }}>
            <TextField label="Calories" suffix="kcal a day" keyboardType="number-pad" value={calories} onChangeText={(t) => setCalories(digits(t, 5))} />
            <TextField label="Protein (optional)" suffix="g" keyboardType="number-pad" value={protein} onChangeText={(t) => setProtein(digits(t, 4))}
              placeholder={`${rec.proteinG} (recommended)`} hint="Carbs and fat are worked out from your calories." />
          </View>
        )}
        {mode === 'macros' && (
          <View style={{ gap: 12 }}>
            <TextField label="Protein" suffix="g" keyboardType="number-pad" value={mProtein} onChangeText={(t) => setMProtein(digits(t, 4))} />
            <TextField label="Carbs" suffix="g" keyboardType="number-pad" value={carbs} onChangeText={(t) => setCarbs(digits(t, 4))} />
            <TextField label="Fat" suffix="g" keyboardType="number-pad" value={fat} onChangeText={(t) => setFat(digits(t, 4))}
              hint="Your calories are the sum: 4 kcal per gram of protein and carbs, 9 per gram of fat." />
          </View>
        )}
        {error ? <T v="bodyS" color={palette.ember}>{error}</T> : null}

        {preview && (
          <Tile span="2x1" style={{ gap: 6 }}>
            <TileHeader icon="local-fire-department" text={preview.custom ? 'Your targets' : 'Recommended targets'} />
            <T v="displayS">{formatKcal(preview.calories)} kcal</T>
            <T color={palette.textMuted}>{preview.proteinG} g protein · {preview.carbsG} g carbs · {preview.fatG} g fat</T>
          </Tile>
        )}
        {preview && preview.warnings.length > 0 && (
          <Notice title="Please read before you save" lines={preview.warnings.map((w) => CUSTOM_WARNING[w])} />
        )}
        {mode !== 'recommended' && (
          <HelpNote text="Your targets stay as you set them. Changing your goal or weight won't change them; pick Recommended to go back." />
        )}

        <PrimaryButton
          label={changed ? 'Save targets' : 'No changes yet'}
          enabled={changed && !error}
          loading={saving}
          onPress={async () => {
            if (custom === undefined) return;
            setSaving(true);
            await ProfileRepository.save({ ...original, customTargets: custom });
            goBack(nav);
          }}
        />
      </ScrollView>
    </Screen>
  );
}
