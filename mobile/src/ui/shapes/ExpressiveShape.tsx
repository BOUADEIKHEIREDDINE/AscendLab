/**
 * Renders one shape of the polar family: a fill, an optional outline, and an optional
 * progress stroke traced along the outline. Changing `shape` morphs to it with a spring by
 * interpolating the spec numbers and regenerating the path each frame.
 */
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SpringToken } from '../theme';
import { springTo, useReduceMotion, useSpringNumber } from '../motion';
import { lerpSpec, pathLength, samplePoints, ShapeSpec, smoothPath, specKey } from './polar';
import { ShapeName, toSpec } from './library';

/** The current spec, springing to `target` whenever it changes (instant with reduce motion). */
export function useMorphSpec(target: ShapeSpec, { token = 'slow', from }: { token?: SpringToken; from?: ShapeSpec } = {}): ShapeSpec {
  const reduce = useReduceMotion();
  const [spec, setSpec] = useState<ShapeSpec>(from ?? target);
  const current = useRef(spec);
  useEffect(() => { current.current = spec; });
  const anim = useState(() => new Animated.Value(1))[0];
  const key = specKey(target);
  useEffect(() => {
    const start = current.current;
    if (reduce || specKey(start) === key) return;
    anim.setValue(0);
    const id = anim.addListener(({ value }) => setSpec(lerpSpec(start, target, value)));
    const a = springTo(anim, 1, token, false);
    a.start(({ finished }) => { if (finished) setSpec(target); });
    return () => { a.stop(); anim.removeListener(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduce, token]);
  return reduce ? target : spec;
}

export interface ShapeGeometry { d: string; length: number; points: [number, number][] }

/** Path, outline length and sample points for a spec in a `size` box, inset by `inset`. */
export function useShapeGeometry(spec: ShapeSpec, size: number, inset: number): ShapeGeometry {
  return useMemo(() => {
    const points = samplePoints(spec, size / 2 - inset, size / 2, size / 2);
    return { d: smoothPath(points), length: pathLength(points), points };
  }, [spec, size, inset]);
}

export function ExpressiveShape({
  shape, size, fill = 'none', stroke, strokeWidth = 0, progress, progressColor, trackColor, progressWidth = 6,
  token = 'slow', from, children, style, label, progressDuration = 900,
}: {
  shape: ShapeName | ShapeSpec;
  size: number;
  fill?: string;
  /** Plain outline. */
  stroke?: string;
  strokeWidth?: number;
  /** 0..1: a stroke traced along the outline from 12 o'clock, clockwise. */
  progress?: number;
  progressColor?: string;
  trackColor?: string;
  progressWidth?: number;
  token?: SpringToken;
  /** Shape to morph from on mount. */
  from?: ShapeName | ShapeSpec;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  label?: string;
  progressDuration?: number;
}) {
  const spec = useMorphSpec(toSpec(shape), { token, from: from ? toSpec(from) : undefined });
  const inset = Math.max(strokeWidth, progress != null ? progressWidth : 0) / 2 + 0.5;
  const geo = useShapeGeometry(spec, size, inset);
  const shown = useSpringNumber(Math.min(Math.max(progress ?? 0, 0), 1), { duration: progressDuration, from: 0 });
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessible={!!label} accessibilityLabel={label}>
      <Svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Path d={geo.d} fill={fill} stroke={stroke ?? 'none'} strokeWidth={strokeWidth} />
        {progress != null && trackColor && (
          <Path d={geo.d} fill="none" stroke={trackColor} strokeWidth={progressWidth} />
        )}
        {progress != null && shown > 0.001 && (
          <Path d={geo.d} fill="none" stroke={progressColor} strokeWidth={progressWidth} strokeLinecap="round"
            strokeDasharray={`${geo.length * shown} ${geo.length}`} />
        )}
      </Svg>
      {children}
    </View>
  );
}
