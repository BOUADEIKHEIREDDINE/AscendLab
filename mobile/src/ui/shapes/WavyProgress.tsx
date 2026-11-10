/**
 * Material 3 Expressive-style wavy progress line: a lime sine wave for the done part, a
 * flat track for the rest, with a small gap between them. The wave drifts unless reduce
 * motion is on. Use it for ongoing progress (onboarding steps, long loading).
 */
import React, { useState } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { palette } from '../theme';
import { useLoop, useSpringNumber } from '../motion';

const WAVELENGTH = 18;

export function WavyProgress({ progress, color = palette.lime, track = palette.surfaceHigh, thickness = 4, amplitude = 3, label }: {
  progress: number; color?: string; track?: string; thickness?: number; amplitude?: number; label?: string;
}) {
  const [width, setWidth] = useState(0);
  const p = Math.min(Math.max(progress, 0), 1);
  const shown = useSpringNumber(p, { token: 'default', from: 0 });
  const drift = useLoop(1600);
  const height = thickness + amplitude * 2 + 2;
  const mid = height / 2;
  const done = width * shown;
  const gap = shown > 0.001 && shown < 0.999 ? 6 : 0;
  let d = `M0,${mid}`;
  for (let x = 0; x <= width + WAVELENGTH; x += 2) d += ` L${x},${(mid + amplitude * Math.sin((2 * Math.PI * x) / WAVELENGTH)).toFixed(2)}`;
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}
      accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(p * 100) }}>
      {width > 0 && (
        <>
          <Svg width={width} height={height} style={{ position: 'absolute' }}>
            {done + gap < width && (
              <Line x1={Math.min(done + gap, width)} x2={width - thickness / 2} y1={mid} y2={mid} stroke={track} strokeWidth={thickness} strokeLinecap="round" />
            )}
          </Svg>
          <View style={{ position: 'absolute', left: 0, top: 0, width: Math.max(done, 0), height, overflow: 'hidden' }}>
            <Animated.View style={{ transform: [{ translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -WAVELENGTH] }) }] }}>
              <Svg width={width + WAVELENGTH} height={height}>
                <Path d={d} stroke={color} strokeWidth={thickness} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Animated.View>
          </View>
        </>
      )}
    </View>
  );
}
