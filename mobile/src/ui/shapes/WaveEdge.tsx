/**
 * A liquid fill with a soft sine top edge (amplitude 6, wavelength 48) that slowly drifts
 * sideways (8 s loop). Changing `sloshKey` makes the surface slosh: the amplitude spikes,
 * then settles with a bouncy spring. No drift or slosh with reduce motion.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { springTo, useLoop, useReduceMotion } from '../motion';

export function wavePath(width: number, height: number, amplitude: number, wavelength: number, top: number): string {
  const step = 4;
  let d = `M0,${height} L0,${top}`;
  for (let x = 0; x <= width; x += step) {
    d += ` L${x},${(top + amplitude * Math.sin((2 * Math.PI * x) / wavelength)).toFixed(2)}`;
  }
  return d + ` L${width},${height} Z`;
}

export function WaveEdge({ width, height, level, color, amplitude = 6, wavelength = 48, sloshKey, style }: {
  width: number; height: number; level: number; color: string; amplitude?: number; wavelength?: number;
  sloshKey?: string | number; style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const drift = useLoop(8000);
  const clamped = Math.min(Math.max(level, 0), 1);
  const levelAnim = useRef(new Animated.Value(clamped)).current;
  useEffect(() => {
    if (reduce) { levelAnim.setValue(clamped); return; }
    springTo(levelAnim, clamped, 'slow').start();
  }, [clamped, reduce, levelAnim]);

  // Slosh: the amplitude jumps, then settles back with a bouncy spring.
  const amp = useRef(new Animated.Value(amplitude)).current;
  const [shownAmp, setShownAmp] = useState(amplitude);
  const first = useRef(true);
  useEffect(() => {
    const id = amp.addListener(({ value }) => setShownAmp(value));
    return () => amp.removeListener(id);
  }, [amp]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (reduce) return;
    amp.setValue(amplitude * 2.6);
    springTo(amp, amplitude, 'bouncy', false).start();
  }, [sloshKey, amplitude, reduce, amp]);

  const pad = amplitude * 3; // room for the crest above the level line
  const d = useMemo(() => wavePath(width + wavelength, height + pad, shownAmp, wavelength, pad), [width, height, shownAmp, wavelength, pad]);
  if (width <= 0 || height <= 0) return null;
  // The liquid is drawn full height and slid down: at level 0 its crest sits below the bottom edge.
  const translateY = levelAnim.interpolate({ inputRange: [0, 1], outputRange: [height + amplitude, -pad] });
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -wavelength] });
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden' }, style]}>
      <Animated.View style={{ position: 'absolute', left: 0, top: 0, transform: [{ translateY }, { translateX }] }}>
        <Svg width={width + wavelength} height={height + pad}>
          <Path d={d} fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}
