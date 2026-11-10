import React, { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, ScrollView, View } from 'react-native';
import { useNav } from '../../../navigation/types';
import { palette } from '../../theme';
import { Appear, Button, Icon, IconName, PrimaryButton, Screen, T } from '../../components/core';

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
          <Appear index={5}><Promise icon="fitness-center" title="A training plan" text="Made for your level, your days and your space" /></Appear>
          <Appear index={6}><Promise icon="restaurant" title="A calorie target" text="Know how much to eat to reach your goal" /></Appear>
          <Appear index={7}><Promise icon="trending-up" title="Steady progress" text="Small steps, every week, at your own pace" /></Appear>
        </View>
      </ScrollView>
      <Appear index={9} style={{ paddingBottom: 16, gap: 4 }}>
        <PrimaryButton label="Get started" onPress={() => nav.navigate('SignUp')} />
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

const STEP_HEIGHTS = [8, 14, 20];

function RisingSteps() {
  const heights = STEP_HEIGHTS;
  const [progress] = useState(() => STEP_HEIGHTS.map(() => new Animated.Value(0)));
  useEffect(() => {
    Animated.sequence([
      Animated.delay(500),
      Animated.stagger(160, progress.map((p) => Animated.spring(p, { toValue: 1, bounciness: 10, speed: 4, useNativeDriver: false }))),
    ]).start();
  }, [progress]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginBottom: 6, height: 20 }}>
      {heights.map((h, i) => (
        <Animated.View key={i} style={{ width: 7, borderRadius: 2, backgroundColor: palette.lime, height: progress[i].interpolate({ inputRange: [0, 2], outputRange: [0, h * 2], extrapolateLeft: 'clamp' }) }} />
      ))}
    </View>
  );
}

function Promise({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: palette.limeContainer, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} color={palette.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <T v="titleS">{title}</T>
        <T color={palette.textMuted}>{text}</T>
      </View>
    </View>
  );
}
