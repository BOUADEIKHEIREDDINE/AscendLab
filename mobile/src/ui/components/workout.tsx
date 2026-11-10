/** Live workout signature pieces (DESIGN_SYSTEM §6.7–6.8). */
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import type { SetType } from '../../data/training';
import { palette, radius, space, tone } from '../theme';
import { haptics } from '../haptics';
import { fadeTo, springTo, useReduceMotion, useSpringNumber } from '../motion';
import { ExpressiveShape } from '../shapes/ExpressiveShape';
import { markStatic, ShapeSpec } from '../shapes/polar';
import { ShapeName } from '../shapes/library';
import { Icon, T } from './core';
import { ShapeConfetti } from './confetti';

/** A rounded square in the polar family, so it can morph into a cookie. */
const squircle: ShapeSpec = { lobes: 4, depth: 0.09, sharpness: 1, rotation: -Math.PI / 2 + Math.PI / 4, wobble: 0 };
markStatic([squircle]);

/** The set-done check: a rounded square that morphs into a lime cookie12 with a check. */
export function SetCheck({ done, onPress, label }: { done: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={() => { if (done) haptics.tick(); else haptics.confirm(); onPress(); }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={label}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <ExpressiveShape shape={done ? 'cookie12' : squircle} size={done ? 34 : 30} fill={done ? palette.lime : palette.surfaceHighest} token="bouncy">
        <Icon name="check" size={20} color={done ? palette.onLime : palette.textMuted} />
      </ExpressiveShape>
    </Pressable>
  );
}

/** "1", "2"… for normal sets; W = gold soft circle, F = ember burst, D = lime clover. */
export function SetBadge({ type, normalIndex, width }: { type: SetType; normalIndex: number; width?: number }) {
  if (type === 'NORMAL') {
    return <T v="displayS" style={[{ fontSize: 17, lineHeight: 22, textAlign: 'center' }, width != null && { width }]}>{normalIndex}</T>;
  }
  const look: Record<Exclude<SetType, 'NORMAL'>, { letter: string; shape: ShapeName; color: string }> = {
    WARMUP: { letter: 'W', shape: 'circle', color: palette.gold },
    FAILURE: { letter: 'F', shape: 'burst', color: palette.ember },
    DROP: { letter: 'D', shape: 'clover', color: palette.lime },
  };
  const { letter, shape, color } = look[type as Exclude<SetType, 'NORMAL'>];
  return (
    <View style={[{ alignItems: 'center' }, width != null && { width }]}>
      <ExpressiveShape shape={shape} size={26} fill={tone(color, 0.22)}>
        <T v="label" color={color} style={{ fontWeight: '700' }}>{letter}</T>
      </ExpressiveShape>
    </View>
  );
}

const clockText = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

/**
 * The rest timer: a floating 72-high pill whose lime liquid drains right to left as time passes,
 * the time in Space Grotesk, and −15 / +15 / Skip. Flashes lime when it reaches zero.
 */
export function RestTimerPill({ secondsLeft, total, onShift, onSkip }: { secondsLeft: number; total: number; onShift: (sec: number) => void; onSkip: () => void }) {
  const [width, setWidth] = useState(0);
  const frac = Math.min(Math.max(secondsLeft / Math.max(total, 1), 0), 1);
  const shown = useSpringNumber(frac, { duration: 950 });
  const fill = width * shown;
  const time = (color: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 72, paddingLeft: 24, width }}>
      <View style={{ flex: 1 }}>
        <T v="overline" color={color}>Rest</T>
        <T v="displayM" color={color}>{clockText(secondsLeft)}</T>
      </View>
    </View>
  );
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible accessibilityLabel={`Rest · ${clockText(secondsLeft)}`}
      style={{ height: 72, borderRadius: radius.full, backgroundColor: palette.surfaceHighest, overflow: 'hidden', borderWidth: 1, borderColor: palette.hairline }}>
      {width > 0 && (
        <>
          {time(palette.text)}
          {/* The liquid, with the same text in ink on top of it: the time stays readable on both. */}
          <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fill, backgroundColor: palette.lime, overflow: 'hidden' }}>
            {time(palette.onLime)}
          </View>
        </>
      )}
      <View style={{ position: 'absolute', right: 10, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TimerButton label="−15" a11y="15 seconds less" onPress={() => onShift(-15)} />
        <TimerButton label="+15" a11y="15 seconds more" onPress={() => onShift(15)} />
        <TimerButton label="Skip" a11y="Skip rest" onPress={onSkip} />
      </View>
    </View>
  );
}

function TimerButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { haptics.tick(); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4}
      style={({ pressed }) => ({ minWidth: 48, height: 44, borderRadius: 22, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center',
        backgroundColor: pressed ? palette.surfaceHigh : palette.surface })}>
      <T v="label">{label}</T>
    </Pressable>
  );
}

/** A full-screen lime flash when the rest timer hits zero. Changing `flashKey` fires it. */
export function RestFlash({ flashKey }: { flashKey: number | null }) {
  const o = useState(() => new Animated.Value(0))[0];
  const reduce = useReduceMotion();
  useEffect(() => {
    if (flashKey == null) return;
    o.setValue(reduce ? 0.12 : 0.28);
    fadeTo(o, 0, undefined, 700).start();
  }, [flashKey, o, reduce]);
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: palette.lime, opacity: o }} />;
}

/** A gold burst "New PR" badge that springs in, with a puff of gold confetti. */
export function PrBadge({ fireKey }: { fireKey: number }) {
  const s = useState(() => new Animated.Value(0))[0];
  useEffect(() => { s.setValue(0); springTo(s, 1, 'bouncy').start(); }, [fireKey, s]);
  return (
    <Animated.View pointerEvents="none" style={{ transform: [{ scale: s }] }}>
      <ExpressiveShape shape="burst" size={52} fill={palette.gold}>
        <T v="label" color={palette.onLime} style={{ fontSize: 11, lineHeight: 12, fontWeight: '700' }} center>{'New\nPR'}</T>
      </ExpressiveShape>
      <ShapeConfetti fireKey={fireKey} colors={[palette.gold, palette.goldContainer, palette.text]} count={10} distance={56} pieceSize={8} />
    </Animated.View>
  );
}

/** The goldContainer banner that slides down from the top for a new PR. */
export function PrBanner({ text, progress }: { text: string; progress: Animated.Value }) {
  return (
    <Animated.View pointerEvents="none" style={{
      position: 'absolute', top: 8, left: space.gutter, right: space.gutter, backgroundColor: palette.goldContainer, borderRadius: radius.lg,
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 12, opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] }) }],
    }}>
      <ExpressiveShape shape="burst" size={36} fill={tone(palette.gold, 0.3, palette.goldContainer)}>
        <Icon name="emoji-events" size={18} color={palette.gold} />
      </ExpressiveShape>
      <View style={{ flex: 1 }}>
        <T v="overline" color={palette.gold}>New PR</T>
        <T v="titleS" lines={2}>{text}</T>
      </View>
    </Animated.View>
  );
}

/** A small stat tile for the workout strip and the finish summary. */
export function StatTile({ label, value, color = palette.text, background = palette.surface }: { label: string; value: string; color?: string; background?: string }) {
  return (
    <View style={{ flex: 1, borderRadius: radius.md, backgroundColor: background, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }}
      accessible accessibilityLabel={`${label}: ${value}`}>
      <T v="overline" color={palette.textMuted}>{label}</T>
      <T v="displayS" color={color} lines={1} style={{ fontSize: 22, lineHeight: 26 }}>{value}</T>
    </View>
  );
}

/** The finish celebration's hero: a giant lime-tone ascent triangle rising from the bottom. */
export function AscentHero({ size = 220 }: { size?: number }) {
  const reduce = useReduceMotion();
  const rise = useState(() => new Animated.Value(reduce ? 1 : 0))[0];
  useEffect(() => { if (!reduce) springTo(rise, 1, 'slow').start(); }, [rise, reduce]);
  return (
    <Animated.View pointerEvents="none" style={{ alignItems: 'center', opacity: rise,
      transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [size * 0.6, 0] }) }] }}>
      <ExpressiveShape shape="softTriangle" size={size} fill={tone(palette.lime, 0.16, palette.ink)} from="circle" />
    </Animated.View>
  );
}
