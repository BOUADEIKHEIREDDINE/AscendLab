import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, ScrollView, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useNav } from '../../../navigation/types';
import { palette, tone } from '../../theme';
import { springTo, useReduceMotion } from '../../motion';
import { ExpressiveShape } from '../../shapes/ExpressiveShape';
import { ShapeName } from '../../shapes/library';
import { Appear, Button, HeroButton, Icon, IconName, Screen, T } from '../../components/core';

const native = Platform.OS !== 'web';

export function WelcomeScreen() {
  const nav = useNav();
  return (
    <Screen edges={['top', 'bottom']} style={{ paddingHorizontal: 24 }}>
      {/* Centered on tall screens, scrollable on short ones. */}
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', gap: 28, paddingVertical: 24 }} showsVerticalScrollIndicator={false}>
        <AnimatedLogo />
        <Appear index={3}>
          <T v="body" color={palette.textMuted}>
            Your personal training and nutrition plan, built around you. No experience needed.
          </T>
        </Appear>
        <View style={{ gap: 14 }}>
          <Appear index={5}><Promise shape="softTriangle" icon="fitness-center" title="A training plan" text="Made for your level, your days and your space" /></Appear>
          <Appear index={6}><Promise shape="flower" icon="restaurant" title="A calorie target" text="Know how much to eat to reach your goal" /></Appear>
          <Appear index={7}><Promise shape="cookie9" icon="trending-up" title="Steady progress" text="Small steps, every week, at your own pace" /></Appear>
        </View>
      </ScrollView>
      <Appear index={9} style={{ paddingBottom: 16, gap: 4 }}>
        <HeroButton label="Get started" onPress={() => nav.navigate('SignUp')} />
        <Button kind="text" label="I already have an account" onPress={() => nav.navigate('SignUp', { logIn: true })} />
      </Appear>
    </Screen>
  );
}

/** The logo fades and grows into place, then three mint steps rise under the tagline. */
function AnimatedLogo() {
  const logo = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(logo, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: native }).start();
  }, [logo]);
  return (
    <View style={{ gap: 16 }}>
      {/* Summit glow: lime at 18% fading out, behind the logo. */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: -70, width: 300, height: 220 }}>
        <Svg width={300} height={220}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={palette.lime} stopOpacity={0.18} />
              <Stop offset="1" stopColor={palette.lime} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x={0} y={0} width={300} height={220} fill="url(#glow)" />
        </Svg>
      </View>
      <Animated.View style={{ opacity: logo, transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], transformOrigin: 'left center' } as object}>
        {/* Width cap keeps clear space around the logo, as the brand guide asks. */}
        <Image source={require('../../../../assets/logo.png')} style={{ width: '72%', height: undefined, aspectRatio: 1200 / 219 }} resizeMode="contain" accessibilityLabel="AscendLab" />
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <Animated.View style={{ opacity: logo }}><T v="title" color={palette.lime}>Training made simple.</T></Animated.View>
        <RisingSteps />
      </View>
    </View>
  );
}

/** Three shapes (cookie, clover, ascent triangle) rise in turn and stack like steps. */
const STEPS: { shape: ShapeName; size: number }[] = [{ shape: 'cookie9', size: 14 }, { shape: 'clover', size: 20 }, { shape: 'softTriangle', size: 28 }];

function RisingSteps() {
  const reduce = useReduceMotion();
  const [progress] = useState(() => STEPS.map(() => new Animated.Value(reduce ? 1 : 0)));
  useEffect(() => {
    if (reduce) return;
    Animated.sequence([
      Animated.delay(500),
      Animated.stagger(160, progress.map((p) => springTo(p, 1, 'bouncy'))),
    ]).start();
  }, [progress, reduce]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 2 }}>
      {STEPS.map((step, i) => (
        <Animated.View key={step.shape} style={{ marginBottom: i * 4, opacity: progress[i],
          transform: [{ translateY: progress[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: progress[i] }] }}>
          <ExpressiveShape shape={step.shape} size={step.size} fill={palette.lime} />
        </Animated.View>
      ))}
    </View>
  );
}

function Promise({ icon, title, text, shape }: { icon: IconName; title: string; text: string; shape: ShapeName }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <ExpressiveShape shape={shape} size={48} fill={tone(palette.lime, 0.16, palette.ink)}>
        <Icon name={icon} size={22} color={palette.lime} />
      </ExpressiveShape>
      <View style={{ flex: 1 }}>
        <T v="titleS">{title}</T>
        <T color={palette.textMuted}>{text}</T>
      </View>
    </View>
  );
}
