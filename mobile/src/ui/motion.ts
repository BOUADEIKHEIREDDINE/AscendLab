/**
 * Motion helpers: reduce-motion state, spring tokens for Animated, and a few hooks that
 * drive SVG (which needs JS-side numbers, not native-driven values).
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';
import { createStore, useStore } from '../lib/store';
import { fadeMs, spring, SpringToken } from './theme';

export const nativeDriver = Platform.OS !== 'web';

const reduceStore = createStore(false);
AccessibilityInfo.isReduceMotionEnabled?.().then((v) => reduceStore.set(!!v)).catch(() => undefined);
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v) => reduceStore.set(!!v));

/** True when the person asked the system to reduce motion. */
export const useReduceMotion = () => useStore(reduceStore);
export const isReduceMotion = () => reduceStore.get();

/** Animated.spring with one of the design system's spring tokens. */
export function springTo(value: Animated.Value, toValue: number, token: SpringToken = 'default', useNativeDriver = nativeDriver) {
  return Animated.spring(value, { toValue, ...spring[token], useNativeDriver });
}

/** Plain timing for opacity and colour (200 ms, ease-out). */
export function fadeTo(value: Animated.Value, toValue: number, useNativeDriver = nativeDriver, duration = fadeMs) {
  return Animated.timing(value, { toValue, duration, easing: Easing.out(Easing.cubic), useNativeDriver });
}

/**
 * A number that springs (or times, with `duration`) to `target`, returned as React state so
 * SVG geometry can be recomputed from it. Instant with reduce motion on.
 */
export function useSpringNumber(target: number, opts: { token?: SpringToken; from?: number; duration?: number; delay?: number } = {}): number {
  const { token = 'slow', from, duration, delay = 0 } = opts;
  const reduce = useReduceMotion();
  const anim = useState(() => new Animated.Value(from ?? target))[0];
  const [value, setValue] = useState(from ?? target);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setValue(v));
    return () => anim.removeListener(id);
  }, [anim]);
  useEffect(() => {
    if (reduce) { anim.stopAnimation(); anim.setValue(target); return; }
    const a = duration != null
      ? Animated.timing(anim, { toValue: target, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false })
      : Animated.sequence([Animated.delay(delay), springTo(anim, target, token, false)]);
    a.start();
    return () => a.stop();
  }, [target, token, duration, delay, reduce, anim]);
  return reduce ? target : value;
}

/** A 0 → 1 phase that loops every `periodMs` (wave drift, breathing). Stays at 0 with reduce motion. */
export function useLoop(periodMs: number, nativeOnly = true): Animated.Value {
  const reduce = useReduceMotion();
  const anim = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduce) { anim.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(anim, { toValue: 1, duration: periodMs, easing: Easing.linear, useNativeDriver: nativeOnly && nativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [periodMs, reduce, anim, nativeOnly]);
  return anim;
}
