/** A small burst of tiny shapes flying outward (PRs, goal reached, likes). Nothing with reduce motion. */
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { nativeDriver, useReduceMotion } from '../motion';
import { shapePath } from '../shapes/polar';
import { shapes, ShapeName } from '../shapes/library';

const PIECES: ShapeName[] = ['cookie9', 'clover', 'softTriangle', 'flower', 'circle', 'gem'];

/** Changing `fireKey` (to anything but null) fires one burst. */
export function ShapeConfetti({ fireKey, colors, count = 12, distance = 70, pieceSize = 10, style }: {
  fireKey: string | number | null; colors: string[]; count?: number; distance?: number; pieceSize?: number; style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const p = useState(() => new Animated.Value(0))[0];
  const [run, setRun] = useState<string | number | null>(null);
  if (fireKey != null && fireKey !== run && !reduce) setRun(fireKey);
  // Fixed pseudo-random layout per burst, so pieces don't jump between renders.
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => {
    const seed = Math.sin((i + 1) * 999 + String(run).length * 31) * 10000;
    const jitter = seed - Math.floor(seed);
    return {
      angle: (2 * Math.PI * i) / count + jitter * 0.5,
      dist: distance * (0.6 + jitter * 0.6),
      shape: PIECES[i % PIECES.length],
      color: colors[i % colors.length],
      spin: (jitter - 0.5) * 540,
    };
  }), [count, distance, colors, run]);
  useEffect(() => {
    if (run == null) return;
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [run, p]);
  if (run == null || reduce) return null;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', left: '50%', top: '50%', width: 0, height: 0 }, style]}>
      {pieces.map((piece, i) => (
        <Animated.View key={i} style={{
          position: 'absolute', left: -pieceSize / 2, top: -pieceSize / 2,
          opacity: p.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [
            { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(piece.angle) * piece.dist] }) },
            { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(piece.angle) * piece.dist] }) },
            { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] }) },
            { scale: p.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1, 0.6] }) },
          ],
        }}>
          <Svg width={pieceSize} height={pieceSize}><Path d={shapePath(shapes[piece.shape], pieceSize)} fill={piece.color} /></Svg>
        </Animated.View>
      ))}
    </View>
  );
}
