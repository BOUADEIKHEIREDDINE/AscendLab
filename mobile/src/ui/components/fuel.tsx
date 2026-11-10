/**
 * Food signature components (DESIGN_SYSTEM §6.1–6.3): the shape-morphing Fuel Bloom calorie
 * meter, the liquid macro columns and the meal tiles.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { formatKcal } from '../../data/profile';
import { MEAL, MealType } from '../../data/social';
import { data, palette, radius, space, tone, summitGlowOpacity } from '../theme';
import { haptics } from '../haptics';
import { nativeDriver, useReduceMotion, useSpringNumber } from '../motion';
import { ExpressiveShape, useMorphSpec, useShapeGeometry } from '../shapes/ExpressiveShape';
import { lerpSpec, pointAt, shapePath, ShapeSpec } from '../shapes/polar';
import { mealShape, shapes } from '../shapes/library';
import { WaveEdge } from '../shapes/WaveEdge';
import { CountingNumber, Icon, IconButton, IconName, PressableScale, T } from './core';
import { ShapeConfetti } from './confetti';

// ---------------------------------------------------------------- Fuel Bloom

export type FuelState = 'empty' | 'climbing' | 'summit' | 'over';

/** Within ±5% of the goal is the summit. */
export function fuelState(eaten: number, target: number): FuelState {
  if (target <= 0) return 'empty';
  const r = eaten / target;
  if (r > 1.05) return 'over';
  if (r >= 0.95) return 'summit';
  return 'climbing';
}

/** Lots remaining → spiky burst; closer to the goal → the lobes flatten; summit → circle; over → ember burst. */
export function fuelSpec(eaten: number, target: number): ShapeSpec {
  const state = fuelState(eaten, target);
  if (state === 'over') return shapes.emberBurst;
  if (state === 'summit' || state === 'empty') return state === 'empty' ? shapes.burst : shapes.circle;
  const closeness = Math.min(Math.max(eaten / (target * 0.95), 0), 1);
  return lerpSpec(shapes.burst, shapes.circle, Math.pow(closeness, 1.4));
}

export interface FuelMeal { type: MealType; calories: number }

const STROKE = 14;

/**
 * The Food tab's hero. The outline's spikiness shows how much is left to eat; the progress
 * stroke runs along that outline, split into one segment per meal; burned calories extend it
 * in ember. Reaching the goal makes it a circle with a Summit glow and a heavy haptic.
 */
export function FuelBloom({ eaten, target, burned, meals, size = 240, preview }: {
  eaten: number; target: number; burned: number; meals: FuelMeal[]; size?: number;
  /** Static preview (Plan ready): no haptics or glow celebration. */
  preview?: boolean;
}) {
  const reduce = useReduceMotion();
  const state = fuelState(eaten, target);
  const spec = useMorphSpec(fuelSpec(eaten, target), { token: 'slow', from: shapes.circle });
  const inset = STROKE / 2 + 2;
  const geo = useShapeGeometry(spec, size, inset);
  const draw = useSpringNumber(1, { from: 0, duration: 900 });
  const glow = useSpringNumber(state === 'summit' && !preview ? 1 : 0, { duration: 600 });

  // Heavy haptic and a little confetti when the summit is reached (not on first render).
  const [summitKey, setSummitKey] = useState<number | null>(null);
  const [prevState, setPrevState] = useState(state);
  if (prevState !== state) {
    setPrevState(state);
    if (state === 'summit' && !preview) setSummitKey((k) => (k ?? 0) + 1);
  }
  useEffect(() => { if (summitKey != null) haptics.heavy(); }, [summitKey]);

  // Meal segments along the outline, with gaps; burned calories as an ember extension.
  const L = geo.length;
  const gap = 4 + STROKE;
  const color = state === 'over' ? palette.ember : palette.primary;
  const segments = useMemo(() => {
    const out: { from: number; to: number; type: MealType }[] = [];
    if (target <= 0) return out;
    let at = 0;
    for (const m of meals) {
      if (m.calories <= 0 || at >= 1) continue;
      const to = Math.min(at + m.calories / target, 1);
      out.push({ from: at, to, type: m.type });
      at = to;
    }
    return out;
  }, [meals, target]);
  const eatenFrac = target > 0 ? Math.min(eaten / target, 1) : 0;
  const burnedFrac = target > 0 ? Math.min(burned / target, Math.max(1 - eatenFrac, 0)) : 0;
  const visible = draw; // 0..1 of the drawn length

  const dash = (from: number, to: number) => {
    const start = from * L * visible, end = to * L * visible;
    const len = Math.max(end - start - (to < 1 || from > 0 ? gap : 0), 0.01);
    return { strokeDasharray: `${len} ${L}`, strokeDashoffset: -(start + (from > 0 ? gap / 2 : 0)) };
  };

  const over = Math.max(eaten - target, 0);
  const left = Math.max(target - eaten, 0);
  const caption = state === 'summit' ? 'Summit reached' : state === 'over' ? 'over' : 'left';
  const a11y = target <= 0 ? 'No calorie target yet'
    : state === 'over' ? `${formatKcal(over)} kilocalories over your goal` : state === 'summit' ? `Summit reached: ${formatKcal(eaten)} of ${formatKcal(target)} kilocalories`
      : `${formatKcal(left)} kilocalories left of ${formatKcal(target)}`;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={a11y}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="summit" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={palette.primary} stopOpacity={summitGlowOpacity} />
            <Stop offset="1" stopColor={palette.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {glow > 0.01 && <Rect x={0} y={0} width={size} height={size} fill="url(#summit)" opacity={glow} />}
        <Path d={geo.d} fill="none" stroke={palette.surfaceHigh} strokeWidth={STROKE} />
        {segments.length === 0 && eatenFrac > 0 && (
          <Path d={geo.d} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" {...dash(0, eatenFrac)} />
        )}
        {segments.map((s, i) => (
          <Path key={i} d={geo.d} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" {...dash(s.from, s.to)} />
        ))}
        {burnedFrac > 0.005 && (
          <Path d={geo.d} fill="none" stroke={palette.ember} strokeWidth={STROKE} strokeLinecap="round" strokeOpacity={0.85} {...dash(eatenFrac, eatenFrac + burnedFrac)} />
        )}
        {/* A tiny meal-shape marker at the end of each meal's segment. */}
        {visible > 0.98 && segments.map((s, i) => {
          const [x, y] = pointAt(geo.points, s.to);
          const m = 12;
          return (
            <G key={`m${i}`} transform={`translate(${x - m / 2},${y - m / 2})`}>
              <Path d={shapePath(shapes[mealShape[s.type]], m)} fill={palette.ink} stroke={color} strokeWidth={1.5} />
            </G>
          );
        })}
      </Svg>
      <Breathing size={size * 0.62} still={reduce} />
      <View style={{ alignItems: 'center' }}>
        <CountingNumber value={state === 'over' ? over : left} v="hero" color={state === 'over' ? palette.ember : palette.text} />
        <T v="label" color={state === 'summit' ? palette.primary : palette.textMuted}>{caption}</T>
        <T v="bodyS" color={palette.textMuted} style={{ marginTop: 4 }}>
          {formatKcal(eaten)} eaten · <T v="bodyS" color={burned > 0 ? palette.ember : palette.textMuted}>{formatKcal(burned)} burned</T>
        </T>
      </View>
      <ShapeConfetti fireKey={summitKey} colors={[palette.primary, palette.onPrimaryContainer, palette.gold]} distance={size * 0.55} />
    </View>
  );
}

/** A soft tonal pebble that breathes (0.98 ↔ 1, 4 s) behind the numbers. */
function Breathing({ size, still }: { size: number; still: boolean }) {
  const s = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (still) { s.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(s, { toValue: 0.98, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      Animated.timing(s, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [still, s]);
  return (
    <Animated.View style={{ position: 'absolute', transform: [{ scale: s }] }}>
      <ExpressiveShape shape="pebble" size={size} fill={tone(palette.primary, 0.06, palette.surface)} />
    </Animated.View>
  );
}

// ---------------------------------------------------------------- Macro columns

export interface MacroValue { key: 'protein' | 'carbs' | 'fat'; label: string; grams: number; target: number }

/** Three liquid glasses: the level is progress, the surface sloshes when food is logged, the rim turns ember when over. */
export function MacroColumns({ macros, height = 120 }: { macros: MacroValue[]; height?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {macros.map((m) => <MacroColumn key={m.key} macro={m} height={height} />)}
    </View>
  );
}

function MacroColumn({ macro, height }: { macro: MacroValue; height: number }) {
  const [width, setWidth] = useState(0);
  const over = macro.target > 0 && macro.grams > macro.target;
  const level = macro.target > 0 ? Math.min(macro.grams / macro.target, 1) : 0;
  return (
    <View style={{ flex: 1, gap: 8 }} accessible accessibilityLabel={`${macro.label}: ${macro.grams} of ${macro.target} grams`}>
      <T v="overline" color={palette.textMuted} center>{macro.label}</T>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height, borderRadius: radius.md, backgroundColor: palette.surfaceHigh, overflow: 'hidden', borderWidth: 2, borderColor: over ? palette.ember : palette.surfaceHigh }}>
        {width > 0 && <WaveEdge width={width - 4} height={height - 4} level={level} color={data[macro.key]} sloshKey={macro.grams} />}
      </View>
      <View style={{ alignItems: 'center' }}>
        <T v="displayS" color={over ? palette.ember : palette.text}>{macro.grams}</T>
        <T v="bodyS" color={palette.textMuted}>/ {macro.target} g</T>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Meal tiles

const MEAL_ICON: Record<MealType, IconName> = { BREAKFAST: 'free-breakfast', LUNCH: 'lunch-dining', DINNER: 'dinner-dining', SNACK: 'cookie' };
export const mealIcon = (t: MealType) => MEAL_ICON[t];

/** A meal's own shape with its icon and the progress traced around it, its name and "420 / 600 kcal", plus a quick +. */
export function MealTile({ type, eaten, budget, onOpen, onAdd, width }: {
  type: MealType; eaten: number; budget: number; onOpen: () => void; onAdd: () => void; width: number;
}) {
  const over = budget > 0 && eaten > budget * 1.15;
  const shapeSize = Math.min(width * 0.5, 84);
  return (
    <View style={{ width }}>
    <PressableScale onPress={onOpen} label={`${MEAL[type].label}: ${formatKcal(eaten)} of ${formatKcal(budget)} kilocalories`}
      style={{ width, minHeight: width, borderRadius: radius.lg, backgroundColor: palette.surface, padding: space.tilePad, justifyContent: 'space-between' }}>
      <ExpressiveShape shape={mealShape[type]} size={shapeSize} fill={tone(over ? palette.ember : palette.primary, 0.12)}
        progress={budget > 0 ? eaten / budget : 0} progressColor={over ? palette.ember : palette.primary} trackColor={palette.surfaceHigh} progressWidth={5}>
        <Icon name={MEAL_ICON[type]} size={24} color={over ? palette.ember : palette.primary} />
      </ExpressiveShape>
      <View style={{ marginTop: 10 }}>
        <T v="titleS">{MEAL[type].label}</T>
        <T v="bodyS" color={palette.textMuted}>{budget > 0 ? `${formatKcal(eaten)} / ${formatKcal(budget)} kcal` : `${formatKcal(eaten)} kcal`}</T>
      </View>
    </PressableScale>
    {/* A sibling of the tile, not nested in it: one pressable never contains another. */}
    <View style={{ position: 'absolute', top: 10, right: 10 }}>
      <IconButton variant="filled" name="add" label={`Add to ${MEAL[type].label}`} onPress={onAdd} size={20} />
    </View>
    </View>
  );
}
