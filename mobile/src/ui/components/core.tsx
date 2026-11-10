/**
 * Building blocks shared by every screen. Layout rule for the whole app: content sits
 * directly on the background, edge to edge, separated by hairlines and space, never
 * boxed in cards. One clear primary action per screen.
 */
import React, { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleProp, Switch as RNSwitch,
  Text, TextInput, TextInputProps, TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { avatarColor, palette, Gutter, radius, resolveWeight, type, TypeVariant } from '../theme';
import { haptics } from '../haptics';
import { formatKcal } from '../../data/profile';

// ---------------------------------------------------------------- Text and icons

export function T({ v = 'body', color = palette.text, style, children, lines, center, ...rest }: {
  v?: TypeVariant; color?: string; style?: StyleProp<TextStyle>; children?: ReactNode; lines?: number; center?: boolean;
  accessibilityLabel?: string; onPress?: () => void;
}) {
  return (
    <Text
      {...rest}
      numberOfLines={lines}
      ellipsizeMode="tail"
      // Custom fonts have one file per weight: a fontWeight override becomes the matching family.
      style={resolveWeight([type[v], { color }, center && { textAlign: 'center' as const }, style])}
    >
      {children}
    </Text>
  );
}

type MaterialName = React.ComponentProps<typeof MaterialIcons>['name'];
type CommunityName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
/** Material icons, the same set the Android app used. Prefix "mc:" for Material Community icons. */
export type IconName = MaterialName | `mc:${CommunityName}`;

export function Icon({ name, size = 24, color = palette.text, label }: { name: IconName; size?: number; color?: string; label?: string }) {
  if (name.startsWith('mc:')) {
    return <MaterialCommunityIcons name={name.slice(3) as CommunityName} size={size} color={color} accessibilityLabel={label} />;
  }
  return <MaterialIcons name={name as MaterialName} size={size} color={color} accessibilityLabel={label} />;
}

// ---------------------------------------------------------------- Pressables

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Makes anything tappable shrink slightly while pressed and spring back, with a light tick. */
export function PressableScale({ onPress, onLongPress, disabled, style, children, label, noHaptic, role = 'button', selected }: {
  onPress?: () => void; onLongPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; children?: ReactNode;
  label?: string; noHaptic?: boolean; role?: 'button' | 'radio' | 'link'; selected?: boolean;
}) {
  const scale = useState(() => new Animated.Value(1))[0];
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 8 }).start();
  return (
    // The pressable itself is animated, so layout styles like flex apply to the element in the row.
    <AnimatedPressable
      onPress={onPress && (() => { if (!noHaptic) haptics.tick(); onPress(); })}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function IconButton({ name, onPress, label, color = palette.text, size = 24, disabled, style }: {
  name: IconName; onPress: () => void; label: string; color?: string; size?: number; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, opacity: disabled ? 0.38 : 1 },
        pressed && { backgroundColor: palette.surface }, style]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, enabled = true, loading = false, style, icon }: {
  label: string; onPress: () => void; enabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName;
}) {
  const disabled = !enabled || loading;
  return (
    <PressableScale onPress={onPress} disabled={disabled} label={label} noHaptic
      style={[{
        height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        backgroundColor: disabled && !loading ? palette.surfaceHigh : palette.lime,
      }, style]}>
      {loading ? <ActivityIndicator color={palette.onLime} /> : (
        <>
          {icon && <Icon name={icon} color={disabled ? palette.textMuted : palette.onLime} size={20} />}
          <T v="titleS" color={disabled ? palette.textMuted : palette.onLime}>{label}</T>
        </>
      )}
    </PressableScale>
  );
}

/** Secondary actions: outlined (default), tonal (mint tint) or plain text. */
export function Button({ label, onPress, kind = 'outline', icon, color, enabled = true, loading, style, compact }: {
  label: string; onPress: () => void; kind?: 'outline' | 'tonal' | 'text' | 'filled'; icon?: IconName; color?: string;
  enabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; compact?: boolean;
}) {
  const fg = color ?? (kind === 'text' ? palette.lime : kind === 'filled' ? palette.onLime : kind === 'tonal' ? palette.lime : palette.text);
  const bg = kind === 'tonal' ? palette.limeContainer : kind === 'filled' ? palette.lime : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{
        minHeight: compact ? 36 : kind === 'text' ? 40 : 48, paddingHorizontal: kind === 'text' ? 12 : 18, borderRadius: 24,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: bg,
        borderWidth: kind === 'outline' ? 1 : 0, borderColor: palette.outline, opacity: enabled ? (pressed ? 0.7 : 1) : 0.38,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : (
        <>
          {icon && <Icon name={icon} color={fg} size={18} />}
          <T v="label" color={fg}>{label}</T>
        </>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Layout

/** Safe-area page with the app background. `keyboard` lifts content above the iOS keyboard. */
export function Screen({ children, edges = ['top'], keyboard, style, background = palette.ink }: {
  children: ReactNode; edges?: Edge[]; keyboard?: boolean; style?: StyleProp<ViewStyle>; background?: string;
}) {
  const content = <View style={[{ flex: 1 }, style]}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: background }}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>{content}</KeyboardAvoidingView>
      ) : content}
    </SafeAreaView>
  );
}

/** Full-width hairline between items and sections. */
export function Hairline({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 0.5, backgroundColor: palette.outline, marginLeft: inset }, style]} />;
}

export function Avatar({ name, seed, size = 40 }: { name: string; seed: string; size?: number }) {
  const v: TypeVariant = size >= 64 ? 'title' : size >= 40 ? 'titleS' : 'label';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(seed), alignItems: 'center', justifyContent: 'center' }}>
      <T v={v} color="#101820" style={{ fontWeight: '700' }}>{name.trim().charAt(0).toUpperCase() || '?'}</T>
    </View>
  );
}

/** Large title for a tab's root page, with optional actions on the right. */
export function TabHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 8, paddingTop: 12, paddingBottom: 8 }}>
      <View style={{ flex: 1 }}>
        <T v="headline" lines={1}>{title}</T>
        {subtitle ? <T color={palette.textMuted}>{subtitle}</T> : null}
      </View>
      {actions}
    </View>
  );
}

/** Back arrow and title for pages below a tab, with optional actions on the right. */
export function PageHeader({ title, onBack, actions }: { title: string; onBack: () => void; actions?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 4, paddingRight: 8, paddingTop: 8, paddingBottom: 4 }}>
      <IconButton name={Platform.OS === 'ios' ? 'arrow-back-ios-new' : 'arrow-back'} onPress={onBack} label="Back" size={Platform.OS === 'ios' ? 20 : 24} />
      <T v="title" lines={1} style={{ flex: 1, marginLeft: 4 }}>{title}</T>
      {actions}
    </View>
  );
}

/** Small section label above a group of content. */
export function SectionTitle({ text, trailing }: { text: string; trailing?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: 8, paddingTop: 20, paddingBottom: 4, minHeight: 32 }}>
      <T v="titleS" style={{ flex: 1 }}>{text}</T>
      {trailing}
    </View>
  );
}

export function SectionLabel({ text }: { text: string }) {
  return <T v="titleS" style={{ marginTop: 8 }}>{text}</T>;
}

/** A short, friendly explanation of why a question is asked or what a word means. */
export function HelpNote({ text, background = palette.surface }: { text: string; background?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.sm, backgroundColor: background }}>
      <Icon name="info-outline" size={18} color={palette.lime} />
      <T color={palette.textMuted} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

export function ErrorText({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
      <Icon name="error-outline" size={20} color={palette.error} />
      <T color={palette.error} style={{ flex: 1 }}>{message}</T>
    </View>
  );
}

// ---------------------------------------------------------------- Motion

const nativeDriver = Platform.OS !== 'web';

/**
 * Fades and slides its content up when the page opens. `index` staggers items so a
 * page builds itself from top to bottom instead of appearing all at once.
 */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const progress = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 420, delay: 60 * index, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [index, progress]);
  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Animates from its previous value to `value` (0..1 fractions, sizes...). */
export function useAnimatedNumber(value: number, duration = 700, from?: number): Animated.Value {
  const anim = useState(() => new Animated.Value(from ?? value))[0];
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, duration, anim]);
  return anim;
}

/** A number that counts up from `from` to `value` (or from its previous value when it changes). */
export function CountingNumber({ value, from = 0, v = 'displayM', color = palette.text }: { value: number; from?: number; v?: TypeVariant; color?: string }) {
  const anim = useAnimatedNumber(value, 1200, from);
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const id = anim.addListener(({ value: x }) => setShown(Math.trunc(x)));
    return () => anim.removeListener(id);
  }, [anim]);
  return <T v={v} color={color} accessibilityLabel={formatKcal(value)}>{formatKcal(shown)}</T>;
}

/** A slim rounded bar that glides to `progress` (0..1). */
export function ProgressBar({ progress, color = palette.lime, track = palette.surfaceHigh, height = 6, duration = 700 }: {
  progress: number; color?: string; track?: string; height?: number; duration?: number;
}) {
  const anim = useAnimatedNumber(Math.min(Math.max(progress, 0), 1), duration, 0);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** A grey block that pulses while content loads, in the shape of what's coming. */
export function Skeleton({ width = '100%', height = 16, radius: r = 8, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const pulse = useState(() => new Animated.Value(0.5))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: nativeDriver }),
      Animated.timing(pulse, { toValue: 0.5, duration: 600, useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: palette.surfaceHigh, opacity: pulse }, style]} />;
}

/** Placeholder for a feed or list item while it loads. */
export function SkeletonCard() {
  return (
    <View style={{ paddingHorizontal: Gutter, paddingVertical: 12, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ gap: 6 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80} height={12} />
        </View>
      </View>
      <Skeleton height={120} radius={12} />
      <Skeleton width={160} height={14} />
    </View>
  );
}

// ---------------------------------------------------------------- Inputs

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { haptics.tick(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        height: 34, paddingHorizontal: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: selected ? palette.limeContainer : 'transparent', borderWidth: 1, borderColor: selected ? palette.limeContainer : palette.outline,
      }}
    >
      {selected && <Icon name="check" size={16} color={palette.lime} />}
      <T v="label" color={selected ? palette.lime : palette.text}>{label}</T>
    </Pressable>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <RNSwitch
      value={value}
      onValueChange={(v) => { haptics.tick(); onChange(v); }}
      accessibilityLabel={label}
      trackColor={{ false: palette.surfaceHigh, true: palette.lime }}
      thumbColor={Platform.OS === 'android' ? (value ? palette.onLime : palette.textMuted) : undefined}
      ios_backgroundColor={palette.surfaceHigh}
    />
  );
}

/** Two or more joined options, one selected (units, etc.). */
export function Segmented<K extends string>({ options, selected, onSelect, disabled }: {
  options: { key: K; label: string }[]; selected: K; onSelect: (k: K) => void; disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: palette.outline, borderRadius: 24, overflow: 'hidden', opacity: disabled ? 0.5 : 1 }}>
      {options.map((o, i) => {
        const on = o.key === selected;
        return (
          <Pressable
            key={o.key}
            disabled={disabled}
            onPress={() => { haptics.tick(); onSelect(o.key); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
              backgroundColor: on ? palette.limeContainer : 'transparent', borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: palette.outline,
            }}
          >
            {on && <Icon name="check" size={16} color={palette.lime} />}
            <T v="label" color={on ? palette.lime : palette.text}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Outlined text field with a floating label, an optional suffix and an error or hint under it. */
export function TextField({ label, value, onChangeText, suffix, error, hint, big, style, right, ...rest }: {
  label?: string; value: string; onChangeText: (t: string) => void; suffix?: string; error?: string | null; hint?: string;
  big?: boolean; style?: StyleProp<ViewStyle>; right?: ReactNode;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'style'>) {
  const [focused, setFocused] = useState(false);
  const border = error ? palette.error : focused ? palette.lime : palette.outline;
  return (
    <View style={style}>
      {label ? <T v="label" color={error ? palette.error : focused ? palette.lime : palette.textMuted} style={{ marginBottom: 6 }}>{label}</T> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: focused || error ? 2 : 1, borderColor: border, borderRadius: 8, paddingHorizontal: focused || error ? 13 : 14, minHeight: 56 }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.lime}
          cursorColor={palette.lime}
          keyboardAppearance="dark"
          accessibilityLabel={label}
          {...rest}
          style={[big ? type.title : type.body, { flex: 1, color: palette.text, paddingVertical: 12 },
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
        />
        {suffix ? <T v="body" color={palette.textMuted} style={{ marginLeft: 6 }}>{suffix}</T> : null}
        {right}
      </View>
      {error ? <T v="bodyS" color={palette.error} style={{ marginTop: 4, marginLeft: 4 }}>{error}</T>
        : hint ? <T v="bodyS" color={palette.textMuted} style={{ marginTop: 4, marginLeft: 4 }}>{hint}</T> : null}
    </View>
  );
}

/** Keeps digits only (plus one decimal point when `decimal`), up to `max` characters. */
export function digits(text: string, max: number, decimal = false): string {
  let clean = text.replace(',', '.').replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
  if (decimal) {
    const first = clean.indexOf('.');
    if (first >= 0) clean = clean.slice(0, first + 1) + clean.slice(first + 1).replace(/\./g, '');
  }
  return clean.slice(0, max);
}
