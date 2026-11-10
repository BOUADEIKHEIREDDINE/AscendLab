/** Frame and controls shared by the onboarding pages and Edit goals. */
import React, { ReactNode, useEffect, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, ScrollView, View } from 'react-native';
import { palette, radius, tone } from '../theme';
import { haptics } from '../haptics';
import { Appear, Icon, IconButton, IconName, PrimaryButton, Screen, T } from './core';
import { WavyProgress } from '../shapes/WavyProgress';
import { ExpressiveShape } from '../shapes/ExpressiveShape';
import { springTo } from '../motion';

/** Number of question pages in onboarding (Choose version, Your body, Your goals). */
export const ONBOARDING_STEPS = 3;

/**
 * Frame shared by every onboarding question page: a back arrow and animated progress
 * bar on top, a title and a one-line explanation, scrolling content, and a single
 * primary button pinned to the bottom (the brand asks for one clear action per screen).
 */
export function OnboardingScaffold({
  step, title, subtitle, primaryLabel, onPrimary, onBack, primaryEnabled = true, loading = false, centered = false, children,
}: {
  step: number | null; title: string; subtitle: string; primaryLabel: string; onPrimary: () => void;
  onBack?: () => void; primaryEnabled?: boolean; loading?: boolean; centered?: boolean; children?: ReactNode;
}) {
  // Closing the keyboard first means any error message below is visible.
  const guarded = (action: () => void) => () => { Keyboard.dismiss(); action(); };
  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 24, paddingTop: 8, minHeight: 52 }}>
        {onBack ? <IconButton variant="tonal" name={Platform.OS === 'ios' ? 'arrow-back-ios-new' : 'arrow-back'} size={Platform.OS === 'ios' ? 18 : 22} onPress={guarded(onBack)} label="Back" />
          : <View style={{ width: 12 }} />}
        {step != null && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 8 }}>
            <View style={{ flex: 1 }}><WavyProgress progress={step / ONBOARDING_STEPS} label={`Step ${step} of ${ONBOARDING_STEPS}`} /></View>
            <T v="label" color={palette.textMuted}>Step {step} of {ONBOARDING_STEPS}</T>
          </View>
        )}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 16 }, centered && { flexGrow: 1, justifyContent: 'center' }]}
      >
        <Appear index={0}>
          <View style={{ gap: 8 }}>
            <T v="headline" center={centered}>{title}</T>
            <T v="body" color={palette.textMuted} center={centered}>{subtitle}</T>
          </View>
        </Appear>
        {children}
      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingVertical: 16 }}>
        <PrimaryButton label={primaryLabel} onPress={guarded(onPrimary)} enabled={primaryEnabled} loading={loading} />
      </View>
    </Screen>
  );
}

/**
 * A large tappable choice. When picked it lifts its border and background to mint,
 * shows a check mark, and gives a small springy bounce.
 */
export function ChoiceCard({ selected, onPress, title, description, detail, icon, tall, style }: {
  selected: boolean; onPress: () => void; title: string; description?: string; detail?: string; icon?: IconName; tall?: boolean;
  style?: object;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  const native = Platform.OS !== 'web';
  useEffect(() => {
    if (selected) Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: native }),
      springTo(scale, 1, 'bouncy'),
    ]).start();
  }, [selected, scale, native]);
  const tint = selected ? palette.primary : palette.textMuted;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={() => { haptics.tick(); onPress(); }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={title}
        style={{
          borderRadius: radius.lg, borderWidth: 2, borderColor: selected ? palette.primary : 'transparent',
          backgroundColor: selected ? palette.primaryContainer : palette.surface, padding: 16, flexGrow: 1,
        }}
      >
        {tall ? (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            {icon && (
              <ExpressiveShape shape={selected ? 'cookie9' : 'circle'} size={84} fill={selected ? palette.primary : tone(palette.primary, 0.08)} token="bouncy">
                <Icon name={icon} size={40} color={selected ? palette.onPrimary : tint} />
              </ExpressiveShape>
            )}
            <T v="title" center>{title}</T>
            {description ? <T color={palette.textMuted} center>{description}</T> : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {icon && (
              <ExpressiveShape shape={selected ? 'cookie9' : 'circle'} size={50} fill={selected ? palette.primary : palette.surfaceHigh} token="bouncy" style={{ marginRight: 16 }}>
                <Icon name={icon} size={24} color={selected ? palette.onPrimary : tint} />
              </ExpressiveShape>
            )}
            <View style={{ flex: 1, gap: 2, paddingRight: 28 }}>
              <T v="titleS" color={selected ? palette.onPrimaryContainer : palette.text}>{title}</T>
              {description ? <T color={palette.textMuted}>{description}</T> : null}
              {detail ? <T v="bodyS" color={palette.textMuted} style={{ opacity: 0.8 }}>{detail}</T> : null}
            </View>
          </View>
        )}
        {/* The check mark shows "selected" without relying on colour alone. */}
        {selected && <View style={{ position: 'absolute', top: 10, right: 10 }}><Icon name="check-circle" size={22} color={palette.primary} label="Selected" /></View>}
      </Pressable>
    </Animated.View>
  );
}
