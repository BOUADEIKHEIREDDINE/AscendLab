/** Charts and progress rings, drawn with react-native-svg. Tap a chart to read a value. */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, GestureResponderEvent, Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { c } from '../theme';
import { haptics } from '../haptics';
import { T } from './core';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Animates 0 → 1 each time `deps` change (chart grow / reveal). */
function useReveal(deps: unknown, duration = 800): number {
  const anim = useState(() => new Animated.Value(0))[0];
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setValue(v));
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => anim.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deps]);
  return value;
}

function useWidth(): [number, (e: { nativeEvent: { layout: { width: number } } }) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

const xOf = (e: GestureResponderEvent) => e.nativeEvent.locationX;

// ---------------------------------------------------------------- Rings

/**
 * A ring (or an arc of `sweep` degrees starting at `start`, 0 = 3 o'clock) that fills to
 * `progress` (0..1) with a smooth animation.
 */
export function Ring({ size, stroke, progress, color, track = c.surfaceContainerHigh, start = -90, sweep = 360, round = true, duration = 900 }: {
  size: number; stroke: number; progress: number; color: string; track?: string; start?: number; sweep?: number; round?: boolean; duration?: number;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const arc = (circumference * sweep) / 360;
  const anim = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(anim, { toValue: Math.min(Math.max(progress, 0), 1), duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [progress, duration, anim]);
  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [arc, 0] });
  return (
    <Svg width={size} height={size} style={{ position: 'absolute' }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none"
        strokeDasharray={`${arc} ${circumference}`} strokeLinecap={round && sweep < 360 ? 'round' : 'butt'}
        transform={`rotate(${start} ${size / 2} ${size / 2})`} />
      {progress > 0 && (
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${arc} ${circumference}`} strokeDashoffset={offset} strokeLinecap={round ? 'round' : 'butt'}
          transform={`rotate(${start} ${size / 2} ${size / 2})`} />
      )}
    </Svg>
  );
}

// ---------------------------------------------------------------- Bar chart

/** Column chart for a handful of values (e.g. workouts per week). Tap a bar to read it. */
export function BarChart({ values, labels, valueLabel }: { values: number[]; labels: string[]; valueLabel: (i: number, v: number) => string }) {
  const [picked, setSelected] = useState<number | null>(null);
  const selected = picked != null && picked < values.length ? picked : values.length - 1;
  const [width, onLayout] = useWidth();
  const grow = useReveal(values.join(','), 700);
  const height = 120;
  const max = Math.max(...values, 1);
  const slot = width / Math.max(values.length, 1);
  const barWidth = Math.min(24, slot * 0.6);
  const baseline = height - 1;
  return (
    <View>
      <T>{selected >= 0 && selected < values.length ? valueLabel(selected, values[selected]) : ''}</T>
      <Pressable
        onLayout={onLayout}
        accessibilityLabel={labels.map((l, i) => `${l}: ${values[i]}`).join(', ')}
        onPress={(e) => {
          const i = Math.min(Math.max(Math.floor(xOf(e) / slot), 0), values.length - 1);
          if (i !== selected) haptics.tick();
          setSelected(i);
        }}
        style={{ height, marginTop: 4 }}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            <Line x1={0} y1={baseline} x2={width} y2={baseline} stroke={c.outlineVariant} strokeWidth={1} />
            {values.map((v, i) => {
              const h = (v / max) * (height - 8) * grow;
              if (h <= 0) return null;
              const left = slot * i + (slot - barWidth) / 2;
              const r = Math.min(4, h);
              // Rounded data end, square at the baseline.
              const d = `M${left},${baseline} L${left},${baseline - h + r} Q${left},${baseline - h} ${left + r},${baseline - h} ` +
                `L${left + barWidth - r},${baseline - h} Q${left + barWidth},${baseline - h} ${left + barWidth},${baseline - h + r} L${left + barWidth},${baseline} Z`;
              return <Path key={i} d={d} fill={c.primary} fillOpacity={i === selected ? 1 : 0.45} />;
            })}
          </Svg>
        )}
      </Pressable>
      <View style={{ flexDirection: 'row' }}>
        {labels.map((l, i) => <T key={i} v="labelSmall" color={c.onSurfaceVariant} center style={{ flex: 1 }}>{l}</T>)}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------- Line chart

function xPositions(points: [number, number][], width: number): number[] {
  if (points.length === 1) return [width / 2];
  const pad = 8;
  const first = points[0][0];
  const span = Math.max(points[points.length - 1][0] - first, 1);
  return points.map((p) => pad + ((p[0] - first) / span) * (width - 2 * pad));
}

/** Line chart for a value over time (e.g. body weight). Tap anywhere to read the nearest point. */
export function LineChart({ points, pointLabel }: { points: [number, number][]; pointLabel: (p: [number, number]) => string }) {
  const [picked, setSelected] = useState<number | null>(null);
  const selected = picked != null && picked < points.length ? picked : points.length - 1;
  const [width, onLayout] = useWidth();
  const reveal = useReveal(points.map((p) => p.join(':')).join(','), 900);
  const height = 110, pad = 6;
  const values = points.map((p) => p[1]);
  const minV = Math.min(...values), maxV = Math.max(...values);
  const span = maxV - minV > 0.5 ? maxV - minV : 1;
  const xs = width > 0 && points.length > 0 ? xPositions(points, width) : [];
  const y = (v: number) => pad + (1 - (v - minV) / span) * (height - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xs[i]},${y(p[1])}`).join(' ');
  const sel = points[selected];
  return (
    <View>
      <T>{sel ? pointLabel(sel) : ''}</T>
      <Pressable
        onLayout={onLayout}
        accessibilityLabel={`Chart with ${points.length} entries`}
        onPress={(e) => {
          if (!xs.length) return;
          const x = xOf(e);
          const i = xs.reduce((best, xi, idx) => (Math.abs(xi - x) < Math.abs(xs[best] - x) ? idx : best), 0);
          if (i !== selected) haptics.tick();
          setSelected(i);
        }}
        style={{ height, marginTop: 4 }}
      >
        {width > 0 && points.length > 0 && (
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((f) => <Line key={f} x1={0} x2={width} y1={pad + f * (height - 2 * pad)} y2={pad + f * (height - 2 * pad)} stroke={c.outlineVariant} strokeWidth={1} />)}
            <Path d={d} stroke={c.primary} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {/* Left-to-right reveal: a background-coloured cover that slides away. */}
            <Rect x={width * reveal} y={0} width={width * (1 - reveal)} height={height} fill={c.background} />
            {sel && xs[selected] != null && (
              <>
                <Circle cx={xs[selected]} cy={y(sel[1])} r={6} fill={c.surfaceContainer} />
                <Circle cx={xs[selected]} cy={y(sel[1])} r={4} fill={c.primary} />
              </>
            )}
          </Svg>
        )}
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------- Multi-line chart

/** One line in a MultiLineChart: whose it is, its colour, and [time, value] points. */
export interface ChartSeries { name: string; color: string; points: [number, number][] }

const DAY_MS = 24 * 3600 * 1000;

/**
 * Several people's lines on one chart (e.g. you and your friends). Tap anywhere to put a
 * crosshair on the nearest day: the legend underneath shows each person's value there.
 */
export function MultiLineChart({ series, startMs, endMs, valueLabel, dayLabel, zeroLine, carryForward }: {
  series: ChartSeries[]; startMs: number; endMs: number; valueLabel: (v: number) => string; dayLabel: (t: number) => string;
  zeroLine?: boolean; carryForward?: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [width, onLayout] = useWidth();
  const reveal = useReveal(series.map((s) => s.points.length).join(','), 900);
  const height = 170, pad = 6;
  const all = series.flatMap((s) => s.points.map((p) => p[1]));
  let minV = all.length ? Math.min(...all) : 0;
  let maxV = all.length ? Math.max(...all) : 1;
  if (zeroLine) { minV = Math.min(minV, 0); maxV = Math.max(maxV, 0); }
  const span = maxV - minV > 0.0001 ? maxV - minV : 1;
  const dayOf = (t: number) => Math.floor(t / DAY_MS);
  const x = (t: number) => ((t - startMs) / Math.max(endMs - startMs, 1)) * width;
  const y = (v: number) => pad + (1 - (v - minV) / span) * (height - 2 * pad);

  const valueOn = (s: ChartSeries, d: number): number | null => {
    const exact = s.points.find((p) => dayOf(p[0]) === d);
    if (exact) return exact[1];
    if (!carryForward) return null;
    const earlier = s.points.filter((p) => dayOf(p[0]) <= d).sort((a, b) => b[0] - a[0])[0];
    return earlier ? earlier[1] : null;
  };

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <T v="labelSmall" color={c.onSurfaceVariant} style={{ flex: 1 }}>{valueLabel(maxV)}</T>
        {selectedDay != null && <T v="labelMedium">{dayLabel(selectedDay * DAY_MS)}</T>}
      </View>
      <Pressable
        onLayout={onLayout}
        accessibilityLabel={series.map((s) => `${s.name}: ${s.points.length} days`).join(', ')}
        onPress={(e) => {
          const frac = Math.min(Math.max(xOf(e) / width, 0), 1);
          const d = dayOf(startMs + (endMs - startMs) * frac);
          if (d !== selectedDay) haptics.tick();
          setSelectedDay(d);
        }}
        style={{ height }}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0, 0.5, 1].map((f) => <Line key={f} x1={0} x2={width} y1={pad + f * (height - 2 * pad)} y2={pad + f * (height - 2 * pad)} stroke={c.outlineVariant} strokeWidth={1} />)}
            {zeroLine && minV < 0 && maxV > 0 && <Line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke={c.onSurfaceVariant} strokeWidth={1} />}
            {selectedDay != null && <Line x1={x(selectedDay * DAY_MS + DAY_MS / 2)} x2={x(selectedDay * DAY_MS + DAY_MS / 2)} y1={0} y2={height} stroke={c.onSurfaceVariant} strokeWidth={1} />}
            {series.map((s) => {
              const pts = [...s.points].sort((a, b) => a[0] - b[0]);
              if (pts.length === 1) return <Circle key={s.name} cx={x(pts[0][0])} cy={y(pts[0][1])} r={4} fill={s.color} />;
              if (pts.length < 2) return null;
              const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p[0])},${y(p[1])}`).join(' ');
              return <Path key={s.name} d={d} stroke={s.color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
            })}
            <Rect x={width * reveal} y={0} width={width * (1 - reveal)} height={height} fill={c.background} />
            {/* Markers on the selected day, ringed with the background so overlaps stay readable. */}
            {selectedDay != null && series.map((s) => {
              const p = s.points.find((q) => dayOf(q[0]) === selectedDay);
              if (!p) return null;
              return (
                <React.Fragment key={s.name}>
                  <Circle cx={x(p[0])} cy={y(p[1])} r={6} fill={c.background} />
                  <Circle cx={x(p[0])} cy={y(p[1])} r={4} fill={s.color} />
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </Pressable>
      <T v="labelSmall" color={c.onSurfaceVariant}>{valueLabel(minV)}</T>
      <View style={{ marginTop: 8, gap: 6 }}>
        {series.map((s) => {
          const v = selectedDay == null ? null : valueOn(s, selectedDay);
          return (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <T style={{ flex: 1, marginLeft: 10 }}>{s.name}</T>
              <T v="labelLarge">{selectedDay == null ? '' : v == null ? '–' : valueLabel(v)}</T>
            </View>
          );
        })}
      </View>
    </View>
  );
}
