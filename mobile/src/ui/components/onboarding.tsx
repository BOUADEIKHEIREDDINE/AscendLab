/** Frame and controls shared by the onboarding pages and Edit goals. */
import React, { ReactNode, useEffect, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, ScrollView, View } from 'react-native';
import { c, radius } from '../theme';
import { haptics } from '../haptics';
import { Appear, Icon, IconButton, IconName, PrimaryButton, ProgressBar, Screen, T } from './core';

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
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 24, paddingTop: 8, minHeight: 52 }}>
        {onBack ? <IconButton name={Platform.OS === 'ios' ? 'arrow-back-ios-new' : 'arrow-back'} size={Platform.OS === 'ios' ? 20 : 24} onPress={guarded(onBack)} label="Back" />
          : <View style={{ width: 20 }} />}
        {step != null && (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 8 }}>
            <View style={{ flex: 1 }}><ProgressBar progress={step / ONBOARDING_STEPS} height={8} track={c.surfaceContainer} /></View>
            <T v="labelMedium" color={c.onSurfaceVariant}>Step {step} of {ONBOARDING_STEPS}</T>
          </View>
        )}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 16 }, centered && { flexGrow: 1, justifyContent: 'center' }]}
      >
        <Appear index={0}>
          <View style={{ gap: 8 }}>
            <T v="headlineMedium" center={centered}>{title}</T>
            <T v="bodyLarge" color={c.onSurfaceVariant} center={centered}>{subtitle}</T>
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
      Animated.spring(scale, { toValue: 1, bounciness: 12, useNativeDriver: native }),
    ]).start();
  }, [selected, scale, native]);
  const tint = selected ? c.primary : c.onSurfaceVariant;
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={() => { haptics.tick(); onPress(); }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={title}
        style={{
          borderRadius: radius.md, borderWidth: selected ? 2 : 1, borderColor: selected ? c.primary : c.outlineVariant,
          backgroundColor: selected ? c.primaryContainer : c.surfaceContainer, padding: selected ? 15 : 16, flexGrow: 1,
        }}
      >
        {tall ? (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            {icon && <Icon name={icon} size={56} color={tint} />}
            <T v="titleLarge" center>{title}</T>
            {description ? <T color={c.onSurfaceVariant} center>{description}</T> : null}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {icon && (
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.surfaceContainerHigh, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Icon name={icon} size={26} color={tint} />
              </View>
            )}
            <View style={{ flex: 1, gap: 2, paddingRight: 28 }}>
              <T v="titleMedium">{title}</T>
              {description ? <T color={c.onSurfaceVariant}>{description}</T> : null}
              {detail ? <T v="bodySmall" color={c.onSurfaceVariant} style={{ opacity: 0.8 }}>{detail}</T> : null}
            </View>
          </View>
        )}
        {/* The check mark shows "selected" without relying on colour alone. */}
        {selected && <View style={{ position: 'absolute', top: 10, right: 10 }}><Icon name="check-circle" size={22} color={c.primary} label="Selected" /></View>}
      </Pressable>
    </Animated.View>
  );
}
