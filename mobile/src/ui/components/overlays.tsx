/** Dialogs, menus, bottom sheets and toasts (DESIGN_SYSTEM §5, overlays and feedback). */
import React, { ReactNode, useEffect, useState } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore, useStore } from '../../lib/store';
import { palette, radius, space, tone, withAlpha } from '../theme';
import { fadeTo, springTo, useReduceMotion } from '../motion';
import { ExpressiveShape } from '../shapes/ExpressiveShape';
import { Button, Icon, IconName, PrimaryButton, T } from './core';
import { haptics } from '../haptics';

export interface DialogAction { label: string; onPress: () => void; danger?: boolean; enabled?: boolean; loading?: boolean }

const scrim = withAlpha(palette.overlayBackground, 0.6);

/**
 * Keeps an overlay mounted while it animates out: `shown` follows `visible` after the exit
 * animation, and `progress` runs 0 → 1 on enter and back to 0 on exit.
 */
function usePresence(visible: boolean, token: 'default' | 'slow' = 'default') {
  const reduce = useReduceMotion();
  const [exiting, setExiting] = useState(false);
  const [wasVisible, setWasVisible] = useState(visible);
  // Adjust state when the prop changes (during render, not in an effect).
  if (wasVisible !== visible) {
    setWasVisible(visible);
    setExiting(!visible);
  }
  const progress = useState(() => new Animated.Value(visible ? 1 : 0))[0];
  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      (reduce ? fadeTo(progress, 1) : springTo(progress, 1, token)).start();
    } else {
      fadeTo(progress, 0).start(() => setExiting(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  return { shown: visible || exiting, progress, reduce };
}

/** A centred dialog: tonal shape with the icon, centred title, content, then full-width stacked buttons. */
export function Dialog({ visible, onDismiss, title, icon, children, confirm, dismiss }: {
  visible: boolean; onDismiss: () => void; title: string; icon?: IconName; children?: ReactNode;
  confirm?: DialogAction; dismiss?: DialogAction;
}) {
  const { shown, progress, reduce } = usePresence(visible);
  const accent = confirm?.danger ? palette.ember : palette.lime;
  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Animated.View style={{ flex: 1, backgroundColor: scrim, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
          <Pressable onPress={onDismiss} style={{ flex: 1, justifyContent: 'center', padding: 24 }} accessibilityLabel="Close dialog">
            <Animated.View style={{ maxWidth: 420, width: '100%', alignSelf: 'center',
              transform: [{ scale: reduce ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
              <Pressable onPress={() => undefined} style={{ backgroundColor: palette.surfaceHigh, borderRadius: radius.xl, padding: 24, gap: 16 }}>
                {icon && (
                  <View style={{ alignItems: 'center' }}>
                    <ExpressiveShape shape={confirm?.danger ? 'burst' : 'cookie9'} size={56} fill={tone(accent, 0.2, palette.surfaceHigh)}>
                      <Icon name={icon} color={accent} size={26} />
                    </ExpressiveShape>
                  </View>
                )}
                <T v="title" center>{title}</T>
                {children}
                <View style={{ gap: 8, marginTop: 4 }}>
                  {confirm && (confirm.danger ? (
                    <Button kind="danger" label={confirm.label} onPress={confirm.onPress} enabled={confirm.enabled ?? true} loading={confirm.loading} style={{ height: 56 }} />
                  ) : (
                    <PrimaryButton label={confirm.label} onPress={confirm.onPress} enabled={confirm.enabled ?? true} loading={confirm.loading} />
                  ))}
                  {dismiss && <Button kind="text" label={dismiss.label} onPress={dismiss.onPress} enabled={dismiss.enabled ?? true} color={palette.text} />}
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Slides up from the bottom with a slight overshoot; tap outside to close. */
export function BottomSheet({ visible, onDismiss, children }: { visible: boolean; onDismiss: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { shown, progress, reduce } = usePresence(visible, 'slow');
  return (
    <Modal visible={shown} transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: scrim, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }}>
        <Pressable onPress={onDismiss} style={{ flex: 1 }} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: palette.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
        paddingBottom: insets.bottom + 12, maxHeight: '85%',
        transform: [{ translateY: reduce ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [height * 0.6, 0] }) }],
      }}>
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: palette.outline }} />
        </View>
        <ScrollView>{children}</ScrollView>
      </Animated.View>
    </Modal>
  );
}

export interface MenuItem { label: string; onPress: () => void; danger?: boolean; icon?: IconName; leading?: ReactNode; checked?: boolean }

function MenuRows({ items, onDismiss }: { items: MenuItem[]; onDismiss: () => void }) {
  return (
    <>
      {items.map((item, i) => (
        <Pressable
          key={`${item.label}-${i}`}
          onPress={() => { haptics.tick(); onDismiss(); setTimeout(item.onPress, Platform.OS === 'ios' ? 350 : 0); }}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: space.tilePad + 4, minHeight: 54, backgroundColor: pressed ? palette.surfaceHigh : 'transparent' })}
        >
          {item.leading ?? (item.icon ? <Icon name={item.icon} color={item.danger ? palette.ember : palette.textMuted} /> : item.checked !== undefined
            ? <View style={{ width: 24 }}>{item.checked && <Icon name="check" color={palette.lime} />}</View> : null)}
          <T v="body" color={item.danger ? palette.ember : palette.text} style={{ flex: 1 }}>{item.label}</T>
        </Pressable>
      ))}
    </>
  );
}

/** A list of actions: a bottom sheet on phones, a floating rounded menu on wide screens (tablets, web). */
export function ActionMenu({ visible, onDismiss, items, title }: { visible: boolean; onDismiss: () => void; items: MenuItem[]; title?: string }) {
  const { width } = useWindowDimensions();
  const { shown, progress, reduce } = usePresence(visible && width >= 600);
  if (width >= 600) {
    return (
      <Modal visible={shown} transparent animationType="none" onRequestClose={onDismiss}>
        <Pressable onPress={onDismiss} style={{ flex: 1, backgroundColor: withAlpha(palette.overlayBackground, 0.3), alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={{ width: 320, borderRadius: radius.lg, backgroundColor: palette.surfaceHigh, paddingVertical: 8, overflow: 'hidden', opacity: progress,
            transform: [{ scale: reduce ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
            {title ? <T v="label" color={palette.textMuted} style={{ paddingHorizontal: space.tilePad + 4, paddingVertical: 8 }}>{title}</T> : null}
            <MenuRows items={items} onDismiss={onDismiss} />
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      {title ? <T v="label" color={palette.textMuted} style={{ paddingHorizontal: space.tilePad + 4, paddingBottom: 8 }}>{title}</T> : null}
      <MenuRows items={items} onDismiss={onDismiss} />
    </BottomSheet>
  );
}

// ---------------------------------------------------------------- Toast

export type ToastKind = 'success' | 'error' | 'info';

const toastStore = createStore<{ text: string; id: number; kind: ToastKind } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;

/** A short message in a floating pill above the dock. */
export function toast(text: string, kind: ToastKind = 'success'): void {
  toastStore.set({ text, id: Date.now(), kind });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastStore.set(null), 2500);
}

export function ToastHost() {
  const current = useStore(toastStore);
  const insets = useSafeAreaInsets();
  const opacity = useState(() => new Animated.Value(0))[0];
  const [last, setLast] = useState(current);
  // Keep the last message while the toast fades out.
  if (current && current !== last) setLast(current);
  useEffect(() => {
    fadeTo(opacity, current ? 1 : 0).start(() => { if (!current) setLast(null); });
  }, [current, opacity]);
  const shownToast = current ?? last;
  if (!shownToast) return null;
  const look = { success: { shape: 'cookie9', color: palette.lime }, error: { shape: 'emberBurst', color: palette.ember }, info: { shape: 'pebble', color: palette.textMuted } } as const;
  const { shape, color } = look[shownToast.kind];
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + space.dock, alignItems: 'center', opacity }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.surfaceHighest,
        borderRadius: radius.full, paddingLeft: 10, paddingRight: 18, paddingVertical: 10, maxWidth: '88%', borderWidth: 1, borderColor: palette.hairline }}>
        <ExpressiveShape shape={shape} size={22} fill={color} />
        <T style={{ flexShrink: 1 }}>{shownToast.text}</T>
      </View>
    </Animated.View>
  );
}
