/** Charts and progress rings, drawn with react-native-svg. Tap a chart to read a value. */
import React, { useEffect, useState } from 'react';
import { Animated, Easing, GestureResponderEvent, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { palette } from '../theme';
import { useReduceMotion } from '../motion';
import { shapePath, smoothPath } from '../shapes/polar';
import { shapes } from '../shapes/library';
import { haptics } from '../haptics';
import { T } from './core';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Animates 0 → 1 each time `deps` change (chart grow / reveal). */
function useReveal(deps: unknown, duration = 800): number {
  const reduce = useReduceMotion();
  const anim = useState(() => new Animated.Value(0))[0];
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setValue(v));
    anim.setValue(reduce ? 1 : 0);
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
export function Ring({ size, stroke, progress, color, track = palette.surfaceHigh, start = -90, sweep = 360, round = true, duration = 900 }: {
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

/**
 * Column chart for a handful of values (e.g. workouts per week): full-pill bars, the current
 * (last) one lime and past ones surfaceHighest, an optional dashed goal line. Tap a bar to read it:
 * it turns lime and shows a value bubble.
 */
export function BarChart({ values, labels, valueLabel, goal }: { values: number[]; labels: string[]; valueLabel: (i: number, v: number) => string; goal?: number }) {
  const [picked, setSelected] = useState<number | null>(null);
  const selected = picked != null && picked < values.length ? picked : values.length - 1;
  const [width, onLayout] = useWidth();
  const grow = useReveal(values.join(','), 700);
  const height = 132, top = 26;
  const max = Math.max(...values, goal ?? 0, 1);
  const slot = width / Math.max(values.length, 1);
  const barWidth = Math.min(22, slot * 0.55);
  const baseline = height - 1;
  const yOf = (v: number) => baseline - (v / max) * (height - top);
  return (
    <View>
      <T v="bodyS" color={palette.textMuted}>{selected >= 0 && selected < values.length ? valueLabel(selected, values[selected]) : ''}</T>
      <Pressable
        onLayout={onLayout}
        accessibilityLabel={labels.map((l, i) => `${l}: ${values[i]}`).join(', ')}
        onPress={(e) => {
          const i = Math.min(Math.max(Math.floor(xOf(e) / slot), 0), values.length - 1);
          if (i !== selected) haptics.tick();
          setSelected(i);
        }}
        style={{ height, marginTop: 6 }}
      >
        {width > 0 && (
          <Svg width={width} height={height}>
            {values.map((v, i) => {
              const h = Math.max((v / max) * (height - top) * grow, v > 0 ? barWidth : 0);
              const left = slot * i + (slot - barWidth) / 2;
              const current = i === values.length - 1;
              const lit = i === selected || current;
              return (
                <G key={i}>
                  {/* An empty week still shows a faint stub, so the rhythm reads. */}
                  {h <= 0 ? <Rect x={left} y={baseline - 6} width={barWidth} height={6} rx={3} fill={palette.surfaceHigh} />
                    : <Rect x={left} y={baseline - h} width={barWidth} height={h} rx={barWidth / 2} fill={lit ? palette.lime : palette.surfaceHighest} fillOpacity={current && i !== selected && picked != null ? 0.55 : 1} />}
                </G>
              );
            })}
            {goal != null && goal > 0 && (
              <Line x1={0} x2={width} y1={yOf(goal)} y2={yOf(goal)} stroke={palette.gold} strokeWidth={1.5} strokeDasharray="5 5" />
            )}
            {values[selected] != null && (() => {
              const cx = slot * selected + slot / 2;
              const h = Math.max((values[selected] / max) * (height - top) * grow, values[selected] > 0 ? barWidth : 6);
              const label = String(values[selected]);
              const w = 14 + label.length * 9;
              return (
                <G>
                  <Rect x={Math.min(Math.max(cx - w / 2, 0), width - w)} y={Math.max(baseline - h - 26, 0)} width={w} height={22} rx={11} fill={palette.lime} />
                </G>
              );
            })()}
          </Svg>
        )}
        {width > 0 && values[selected] != null && (() => {
          const cx = slot * selected + slot / 2;
          const h = Math.max((values[selected] / max) * (height - top) * grow, values[selected] > 0 ? barWidth : 6);
          const label = String(values[selected]);
          const w = 14 + label.length * 9;
          return (
            <View pointerEvents="none" style={{ position: 'absolute', left: Math.min(Math.max(cx - w / 2, 0), width - w), top: Math.max(baseline - h - 26, 0), width: w, height: 22, alignItems: 'center', justifyContent: 'center' }}>
              <T v="label" color={palette.onLime} style={{ fontSize: 12, lineHeight: 14 }}>{label}</T>
            </View>
          );
        })()}
      </Pressable>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {labels.map((l, i) => <T key={i} v="bodyS" color={i === selected ? palette.text : palette.textFaint} center style={{ flex: 1, fontSize: 11 }}>{l}</T>)}
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

/**
 * Line chart for a value over time (e.g. body weight): a smooth curve with a lime-to-transparent
 * area, the latest point as a lime cookie, and an optional dashed gold goal line with a flag.
 * Tap anywhere to read the nearest point.
 */
export function LineChart({ points, pointLabel, goal }: { points: [number, number][]; pointLabel: (p: [number, number]) => string; goal?: number | null }) {
  const [picked, setSelected] = useState<number | null>(null);
  const selected = picked != null && picked < points.length ? picked : points.length - 1;
  const [width, onLayout] = useWidth();
  const reveal = useReveal(points.map((p) => p.join(':')).join(','), 900);
  const height = 128, pad = 14;
  const values = points.map((p) => p[1]);
  const withGoal = goal != null ? [...values, goal] : values;
  const minV = Math.min(...withGoal), maxV = Math.max(...withGoal);
  const span = maxV - minV > 0.5 ? maxV - minV : 1;
  const xs = width > 0 && points.length > 0 ? xPositions(points, width) : [];
  const y = (v: number) => pad + (1 - (v - minV) / span) * (height - 2 * pad);
  const pts = points.map((p, i) => [xs[i], y(p[1])] as [number, number]);
  const d = pts.length > 1 ? smoothPath(pts, false) : '';
  const area = pts.length > 1 ? `${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z` : '';
  const sel = points[selected];
  const last = pts[pts.length - 1];
  return (
    <View>
      <T v="bodyS" color={palette.textMuted}>{sel ? pointLabel(sel) : ''}</T>
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
        style={{ height, marginTop: 6 }}
      >
        {width > 0 && points.length > 0 && (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={palette.lime} stopOpacity={0.28} />
                <Stop offset="1" stopColor={palette.lime} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {goal != null && (
              <>
                <Line x1={0} x2={width} y1={y(goal)} y2={y(goal)} stroke={palette.gold} strokeWidth={1.5} strokeDasharray="5 5" />
                <Path d={`M${width - 14},${y(goal)} L${width - 14},${y(goal) - 14} L${width - 4},${y(goal) - 10} L${width - 14},${y(goal) - 6}`} stroke={palette.gold} strokeWidth={1.5} fill={palette.gold} />
              </>
            )}
            {area ? <Path d={area} fill="url(#area)" /> : null}
            {d ? <Path d={d} stroke={palette.lime} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            {/* Left-to-right reveal: a background-coloured cover that slides away. */}
            <Rect x={width * reveal} y={0} width={width * (1 - reveal)} height={height} fill={palette.surface} />
            {sel && xs[selected] != null && selected !== points.length - 1 && (
              <>
                <Line x1={xs[selected]} x2={xs[selected]} y1={0} y2={height} stroke={palette.outline} strokeWidth={1} />
                <Circle cx={xs[selected]} cy={y(sel[1])} r={5} fill={palette.surface} stroke={palette.lime} strokeWidth={2} />
              </>
            )}
            {last && reveal > 0.95 && (
              <G transform={`translate(${last[0] - 9},${last[1] - 9})`}>
                <Path d={shapePath(shapes.cookie9, 18)} fill={palette.lime} stroke={palette.surface} strokeWidth={2} />
              </G>
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

  const latest = (s: ChartSeries) => (s.points.length ? [...s.points].sort((a, b) => b[0] - a[0])[0][1] : -Infinity);
  const leader = series.length > 1 ? series.reduce((a, b) => (latest(b) > latest(a) ? b : a)).name : null;

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
        <T v="bodyS" color={palette.textMuted} style={{ flex: 1 }}>{valueLabel(maxV)}</T>
        {selectedDay != null && <T v="label">{dayLabel(selectedDay * DAY_MS)}</T>}
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
            {[0, 0.5, 1].map((f) => <Line key={f} x1={0} x2={width} y1={pad + f * (height - 2 * pad)} y2={pad + f * (height - 2 * pad)} stroke={palette.hairline} strokeWidth={1} />)}
            {zeroLine && minV < 0 && maxV > 0 && <Line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke={palette.textMuted} strokeWidth={1} />}
            {selectedDay != null && <Line x1={x(selectedDay * DAY_MS + DAY_MS / 2)} x2={x(selectedDay * DAY_MS + DAY_MS / 2)} y1={0} y2={height} stroke={palette.textMuted} strokeWidth={1} />}
            {/* The leader (best latest value) is drawn last, on top, and slightly thicker. */}
            {[...series].sort((a, b) => (a.name === leader ? 1 : 0) - (b.name === leader ? 1 : 0)).map((s) => {
              const pts = [...s.points].sort((a, b) => a[0] - b[0]);
              if (pts.length === 1) return <Circle key={s.name} cx={x(pts[0][0])} cy={y(pts[0][1])} r={4} fill={s.color} />;
              if (pts.length < 2) return null;
              const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p[0])},${y(p[1])}`).join(' ');
              return <Path key={s.name} d={d} stroke={s.color} strokeWidth={s.name === leader ? 3.5 : 2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
            })}
            <Rect x={width * reveal} y={0} width={width * (1 - reveal)} height={height} fill={palette.surface} />
            {/* Markers on the selected day, ringed with the background so overlaps stay readable. */}
            {selectedDay != null && series.map((s) => {
              const p = s.points.find((q) => dayOf(q[0]) === selectedDay);
              if (!p) return null;
              return (
                <React.Fragment key={s.name}>
                  <Circle cx={x(p[0])} cy={y(p[1])} r={6} fill={palette.surface} />
                  <Circle cx={x(p[0])} cy={y(p[1])} r={4} fill={s.color} />
                </React.Fragment>
              );
            })}
          </Svg>
        )}
      </Pressable>
      <T v="bodyS" color={palette.textMuted}>{valueLabel(minV)}</T>
      <View style={{ marginTop: 8, gap: 6 }}>
        {series.map((s) => {
          const v = selectedDay == null ? null : valueOn(s, selectedDay);
          return (
            <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
              <T style={{ flex: 1, marginLeft: 10 }}>{s.name}</T>
              <T v="label">{selectedDay == null ? '' : v == null ? '–' : valueLabel(v)}</T>
            </View>
          );
        })}
      </View>
    </View>
  );
}
