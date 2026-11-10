/**
 * Replaces spinners: a shape that morphs cookie9 → clover → softTriangle → burst → circle
 * while rotating. With reduce motion it's a still cookie that gently fades.
 */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { palette } from '../theme';
import { nativeDriver, useReduceMotion } from '../motion';
import { lerpSpec, shapePath } from './polar';
import { shapes, ShapeName } from './library';

const SEQUENCE: ShapeName[] = ['cookie9', 'clover', 'softTriangle', 'burst', 'circle'];
const STEP_MS = 650;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function ShapeLoader({ size = 40, color = palette.lime, label = 'Loading' }: { size?: number; color?: string; label?: string }) {
  const reduce = useReduceMotion();
  const phase = useState(() => new Animated.Value(0))[0];
  const spin = useState(() => new Animated.Value(0))[0];
  const [t, setT] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = phase.addListener(({ value }) => setT(value));
    const morph = Animated.loop(Animated.timing(phase, { toValue: SEQUENCE.length, duration: STEP_MS * SEQUENCE.length, easing: Easing.linear, useNativeDriver: false }));
    const rotate = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: nativeDriver }));
    morph.start(); rotate.start();
    return () => { morph.stop(); rotate.stop(); phase.removeListener(id); };
  }, [reduce, phase, spin]);
  const i = Math.floor(t) % SEQUENCE.length;
  const next = (i + 1) % SEQUENCE.length;
  const spec = reduce ? shapes.cookie9 : lerpSpec(shapes[SEQUENCE[i]], shapes[SEQUENCE[next]], ease(t - Math.floor(t)));
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ width: size, height: size }}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={size} height={size}><Path d={shapePath(spec, size, 1)} fill={color} /></Svg>
      </Animated.View>
    </View>
  );
}
