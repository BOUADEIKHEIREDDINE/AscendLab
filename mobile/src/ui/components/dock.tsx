/**
 * Navigation chrome: the floating tab dock with its sliding iris indicator, and the
 * minimized-workout mini player that sits above it on every tab.
 *
 * The dock is laid out in flow under the tab pages (not absolutely positioned over them), so
 * no page needs extra bottom padding to clear it: it floats visually on the ink background.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { activeStore } from '../../data/trainRepo';
import { clock, doneSets } from '../../data/training';
import { useStore } from '../../lib/store';
import { palette, radius, space, withAlpha } from '../theme';
import { haptics } from '../haptics';
import { springTo, useReduceMotion } from '../motion';
import { Icon, IconName, T } from './core';
import { ExpressiveShape } from '../shapes/ExpressiveShape';

export interface DockTab { name: string; label: string; icon: IconName }

const DOCK_HEIGHT = 64;
const ACTIVE_WEIGHT = 1.8;

export function TabDock({ state, navigation, tabs }: BottomTabBarProps & { tabs: DockTab[] }) {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [width, setWidth] = useState(0);
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ios') return; // iOS keyboards cover the dock anyway
    const a = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const index = state.index;
  const inner = Math.max(width - 12, 0);
  const total = tabs.length - 1 + ACTIVE_WEIGHT;
  const slot = (i: number, active: number) => (i === active ? ACTIVE_WEIGHT : 1) * inner / total;
  const leftOf = (active: number) => tabs.slice(0, active).reduce((x, _, i) => x + slot(i, active), 0);

  // The indicator's two edges spring separately: the leading edge is quicker, so the pill
  // stretches toward the new tab like a liquid blob, then the trailing edge catches up.
  const left = useState(() => new Animated.Value(0))[0];
  const right = useState(() => new Animated.Value(0))[0];
  const weights = useState(() => tabs.map((_, i) => new Animated.Value(i === index ? ACTIVE_WEIGHT : 1)))[0];
  const prev = useRef(index);
  useEffect(() => {
    if (inner <= 0) return;
    const l = leftOf(index), r = l + slot(index, index);
    const forward = index >= prev.current;
    prev.current = index;
    if (reduce) {
      left.setValue(l); right.setValue(r);
      weights.forEach((w, i) => w.setValue(i === index ? ACTIVE_WEIGHT : 1));
      return;
    }
    Animated.parallel([
      springTo(left, l, forward ? 'default' : 'fast', false),
      springTo(right, r, forward ? 'fast' : 'default', false),
      ...weights.map((w, i) => springTo(w, i === index ? ACTIVE_WEIGHT : 1, 'default', false)),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, inner, reduce]);

  if (keyboard) return null;
  return (
    <View style={{ backgroundColor: palette.ink, paddingHorizontal: space.gutter, paddingBottom: insets.bottom + 12, paddingTop: 6, gap: 8 }}>
      <MiniPlayer onOpen={() => navigation.navigate('WorkoutSession' as never)} />
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
        style={{ height: DOCK_HEIGHT, borderRadius: radius.full, backgroundColor: withAlpha(palette.surfaceHighest, 0.92), borderWidth: 1,
          borderColor: palette.hairline, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 }}
      >
        {inner > 0 && (
          <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 6, bottom: 6, left: Animated.add(left, 5), width: Animated.subtract(right, left),
            borderRadius: radius.full, backgroundColor: palette.primary }} />
        )}
        {tabs.map((tab, i) => {
          const route = state.routes[i];
          const focused = index === i;
          return (
            <Animated.View key={tab.name} style={{ flex: weights[i], height: '100%' }}>
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: focused }}
                onPress={() => {
                  haptics.tick();
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Icon name={tab.icon} color={focused ? palette.onPrimary : palette.textMuted} />
                {focused && <T v="label" color={palette.onPrimary} lines={1}>{tab.label}</T>}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

/** A floating pill above the dock while a workout runs: live timer, current exercise, expand chevron. */
function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const active = useStore(activeStore);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!active) return null;
  const current = active.exercises.find((x) => x.sets.some((s) => !s.done)) ?? active.exercises[active.exercises.length - 1];
  const resting = active.restEndsAt != null && active.restEndsAt > now;
  return (
    <Pressable onPress={() => { haptics.tick(); onOpen(); }} accessibilityRole="button" accessibilityLabel={`Workout in progress: ${active.title}. Open`}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, height: 56, paddingLeft: 8, paddingRight: 14, borderRadius: radius.full,
        backgroundColor: pressed ? palette.surfaceHigh : palette.surface, borderWidth: 1, borderColor: palette.hairline })}>
      <ExpressiveShape shape="softTriangle" size={40} fill={palette.primaryContainer}>
        <Icon name="fitness-center" size={18} color={palette.primary} />
      </ExpressiveShape>
      <View style={{ flex: 1 }}>
        <T v="titleS" lines={1}>{current?.name ?? active.title}</T>
        <T v="bodyS" color={palette.textMuted} lines={1}>
          {resting ? `Rest · ${clock(Math.ceil((active.restEndsAt! - now) / 1000))}` : `${doneSets(active)} sets done`}
        </T>
      </View>
      <T v="mono" color={palette.primary} style={{ letterSpacing: 0 }}>{clock(Math.trunc((now - active.startedAt) / 1000))}</T>
      <Icon name="keyboard-arrow-up" color={palette.textMuted} />
    </Pressable>
  );
}
