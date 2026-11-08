/** Dialogs, menus, bottom sheets and toasts, styled like the Android app's. */
import React, { ReactNode, useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore, useStore } from '../../lib/store';
import { c, Gutter, radius } from '../theme';
import { Button, Icon, IconName, T } from './core';
import { haptics } from '../haptics';

export interface DialogAction { label: string; onPress: () => void; danger?: boolean; enabled?: boolean; loading?: boolean }

/** A centred dialog: optional icon, title, content, then actions on the right. */
export function Dialog({ visible, onDismiss, title, icon, children, confirm, dismiss }: {
  visible: boolean; onDismiss: () => void; title: string; icon?: IconName; children?: ReactNode;
  confirm?: DialogAction; dismiss?: DialogAction;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onDismiss} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }} accessibilityLabel="Close dialog">
          <Pressable onPress={() => undefined} style={{ backgroundColor: c.surfaceContainerHigh, borderRadius: 28, padding: 24, gap: 16, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
            {icon && <View style={{ alignItems: 'center' }}><Icon name={icon} color={confirm?.danger ? c.error : c.primary} /></View>}
            <T v="headlineSmall" center={!!icon}>{title}</T>
            {children}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4, flexWrap: 'wrap' }}>
              {dismiss && <Button kind="text" label={dismiss.label} onPress={dismiss.onPress} enabled={dismiss.enabled ?? true} />}
              {confirm && (
                <Button kind="text" label={confirm.label} onPress={confirm.onPress} enabled={confirm.enabled ?? true}
                  loading={confirm.loading} color={confirm.danger ? c.error : undefined} />
              )}
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Slides up from the bottom of the screen; tap outside or swipe the handle down to close. */
export function BottomSheet({ visible, onDismiss, children }: { visible: boolean; onDismiss: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss} statusBarTranslucent>
      <Pressable onPress={onDismiss} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} accessibilityLabel="Close" />
      <View style={{ backgroundColor: c.surfaceContainer, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: insets.bottom + 8, maxHeight: '80%' }}>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 32, height: 4, borderRadius: 2, backgroundColor: c.outline }} />
        </View>
        <ScrollView>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export interface MenuItem { label: string; onPress: () => void; danger?: boolean; icon?: IconName; leading?: ReactNode; checked?: boolean }

/** A list of actions in a bottom sheet (the "⋮" menus of the Android app). */
export function ActionMenu({ visible, onDismiss, items, title }: { visible: boolean; onDismiss: () => void; items: MenuItem[]; title?: string }) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      {title ? <T v="titleSmall" color={c.onSurfaceVariant} style={{ paddingHorizontal: Gutter, paddingBottom: 8 }}>{title}</T> : null}
      {items.map((item, i) => (
        <Pressable
          key={`${item.label}-${i}`}
          onPress={() => { haptics.tick(); onDismiss(); setTimeout(item.onPress, Platform.OS === 'ios' ? 350 : 0); }}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: Gutter, minHeight: 52, backgroundColor: pressed ? c.surfaceContainerHigh : 'transparent' })}
        >
          {item.leading ?? (item.icon ? <Icon name={item.icon} color={item.danger ? c.error : c.onSurfaceVariant} /> : item.checked !== undefined
            ? <View style={{ width: 24 }}>{item.checked && <Icon name="check" color={c.primary} />}</View> : null)}
          <T v="bodyLarge" color={item.danger ? c.error : c.onSurface} style={{ flex: 1 }}>{item.label}</T>
        </Pressable>
      ))}
    </BottomSheet>
  );
}

// ---------------------------------------------------------------- Toast

const toastStore = createStore<{ text: string; id: number } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** A short message at the bottom of the screen (Android's Toast, on every platform). */
export function toast(text: string): void {
  toastStore.set({ text, id: Date.now() });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastStore.set(null), 2500);
}

export function ToastHost() {
  const current = useStore(toastStore);
  const insets = useSafeAreaInsets();
  const opacity = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(opacity, { toValue: current ? 1 : 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [current, opacity]);
  if (!current) return null;
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 90, alignItems: 'center', opacity }}>
      <View accessibilityLiveRegion="polite" style={{ backgroundColor: c.onSurface, borderRadius: radius.lg, paddingHorizontal: 18, paddingVertical: 10, maxWidth: '85%' }}>
        <T color={c.background}>{current.text}</T>
      </View>
    </Animated.View>
  );
}
