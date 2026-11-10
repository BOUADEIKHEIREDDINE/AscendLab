/** Progress signature components (DESIGN_SYSTEM §6.4–6.6): ridge week, streak tile, story ring. */
import React, { ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { palette, tone } from '../theme';
import { nativeDriver, springTo, useReduceMotion, useSpringNumber } from '../motion';
import { ExpressiveShape } from '../shapes/ExpressiveShape';
import { smoothPath } from '../shapes/polar';
import { T, TileHeader } from './core';
import { ShapeConfetti } from './confetti';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const easeOutBack = (t: number) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/**
 * The week as a mountain ridge: training days are peaks, rest days valleys. Completed peaks
 * are lime with a flag, today's peak pulses, missed ones are faint. Peaks rise in turn on mount.
 */
export function RidgeWeek({ training, completed, today, height = 96 }: {
  /** Training days, 0 = Monday. */
  training: number[];
  /** Training days already done this week. */
  completed?: number[];
  /** Today's index (0 = Monday), to pulse its peak and fade missed ones. Omit for a plan preview. */
  today?: number;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const rise = useSpringNumber(1, { from: 0, duration: 1400 });
  const reduce = useReduceMotion();
  const pulse = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduce || today == null) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: nativeDriver }),
      Animated.delay(500),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, today, pulse]);

  const on = new Set(training), done = new Set(completed ?? []);
  const top = 22, valley = height - 26;
  const slot = width / 7;
  const peakY = (i: number) => {
    const t = Math.min(Math.max(rise * 7 * 0.45 - i * 0.45, 0) / 1.2, 1);
    return valley - (valley - top) * (on.has(i) ? easeOutBack(t) : 0.12 * t);
  };
  const pts: [number, number][] = [[0, valley + 4]];
  for (let i = 0; i < 7; i++) pts.push([slot * (i + 0.5), peakY(i)]);
  pts.push([width, valley + 4]);
  const ridge = width > 0 ? smoothPath(pts, false) : '';
  const area = ridge ? `${ridge} L${width},${height - 18} L0,${height - 18} Z` : '';

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessible
      accessibilityLabel={'Training on ' + training.map((d) => DAY_NAMES[d]).join(', ') + (completed?.length ? `. ${completed.length} done` : '')}>
      {width > 0 && (
        <Svg width={width} height={height - 16}>
          <Defs>
            <LinearGradient id="ridge" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.lime} stopOpacity={0.22} />
              <Stop offset="1" stopColor={palette.lime} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#ridge)" />
          <Path d={ridge} fill="none" stroke={palette.lime} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {DAY_LETTERS.map((_, i) => {
            if (!on.has(i)) return null;
            const x = slot * (i + 0.5), y = peakY(i);
            const missed = today != null && i < today && !done.has(i);
            if (done.has(i)) {
              return (
                <React.Fragment key={i}>
                  <Circle cx={x} cy={y} r={6} fill={palette.lime} />
                  <Path d={`M${x},${y - 6} L${x},${y - 20} L${x + 10},${y - 16} L${x},${y - 12}`} stroke={palette.lime} strokeWidth={1.5} fill={palette.lime} />
                </React.Fragment>
              );
            }
            return <Circle key={i} cx={x} cy={y} r={5} fill={palette.ink} stroke={missed ? palette.textFaint : palette.lime} strokeWidth={2} />;
          })}
        </Svg>
      )}
      {/* Today's peak pulses: a ring that grows and fades. */}
      {width > 0 && today != null && on.has(today) && !done.has(today) && (
        <Animated.View pointerEvents="none" style={{
          position: 'absolute', left: slot * (today + 0.5) - 12, top: peakY(today) - 12, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: palette.lime,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.6] }) }],
        }} />
      )}
      <View style={{ flexDirection: 'row' }}>
        {DAY_LETTERS.map((l, i) => (
          <T key={i} v="label" center style={{ flex: 1 }} color={today === i ? palette.lime : on.has(i) ? palette.text : palette.textFaint}>{l}</T>
        ))}
      </View>
    </View>
  );
}

/**
 * The week streak in a gold-tone cookie. When the streak grows, the cookie spins 1/9 of a turn
 * with a spring and throws a gold sparkle of tiny shapes.
 */
export function StreakTile({ streak, size = 132 }: { streak: number | null; size?: number }) {
  const spin = useState(() => new Animated.Value(0))[0];
  const [turns, setTurns] = useState(0);
  const [prev, setPrev] = useState(streak);
  const [spark, setSpark] = useState<number | null>(null);
  if (prev !== streak) {
    setPrev(streak);
    if (prev != null && streak != null && streak > prev) { setTurns((t) => t + 1); setSpark((k) => (k ?? 0) + 1); }
  }
  useEffect(() => { springTo(spin, turns, 'bouncy').start(); }, [turns, spin]);
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <TileHeader icon="local-fire-department" text="Week streak" color={palette.gold} center />
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) }] }}>
          <ExpressiveShape shape="cookie9" size={size} fill={tone(palette.gold, 0.18)} />
        </Animated.View>
        <T v="displayM" color={palette.gold}>{streak ?? '–'}</T>
        <ShapeConfetti fireKey={spark} colors={[palette.gold, palette.goldContainer, palette.text]} distance={size * 0.6} count={10} />
      </View>
    </View>
  );
}

/**
 * A story ring: a cookie12 outline (3px) with today's calorie progress traced around the
 * scallops. Seen stories turn faint. It slowly rotates while there's something unseen.
 */
export function StoryRing({ size, progress, color, seen, children }: { size: number; progress: number; color: string; seen: boolean; children: ReactNode }) {
  const reduce = useReduceMotion();
  const spin = useState(() => new Animated.Value(0))[0];
  const turning = !seen && progress > 0 && !reduce;
  useEffect(() => {
    if (!turning) { spin.stopAnimation(); return; }
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: nativeDriver }));
    loop.start();
    return () => loop.stop();
  }, [turning, spin]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <ExpressiveShape shape="cookie12" size={size} progress={seen ? 1 : progress} progressColor={seen ? palette.textFaint : color}
          trackColor={palette.surfaceHighest} progressWidth={3} />
      </Animated.View>
      {children}
    </View>
  );
}
