/**
 * Building blocks shared by every screen ("Ascent Expressive", docs/DESIGN_SYSTEM.md §5).
 *
 * Layout rules: tiles for numbers, rows for lists. Dashboards are a <Bento> of <Tile>s;
 * long lists sit in a <ListGroup> of <ListRow>s. One lime thing per screen is the hero.
 */
import React, { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, KeyboardAvoidingView, Platform, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle,
  View, ViewStyle,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { avatarColor, palette, radius, resolveWeight, space, tone, type, TypeVariant, withAlpha } from '../theme';
import { haptics } from '../haptics';
import { fadeTo, nativeDriver, springTo, useLoop, useReduceMotion } from '../motion';
import { formatKcal } from '../../data/profile';
import { ExpressiveShape } from '../shapes/ExpressiveShape';
import { ShapeLoader } from '../shapes/ShapeLoader';
import { ShapeName } from '../shapes/library';

const Gutter = space.gutter;

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
/** Material icons. Prefix "mc:" for Material Community icons. */
export type IconName = MaterialName | `mc:${CommunityName}`;

export function Icon({ name, size = 22, color = palette.text, label }: { name: IconName; size?: number; color?: string; label?: string }) {
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
  return (
    <AnimatedPressable
      onPress={onPress && (() => { if (!noHaptic) haptics.tick(); onPress(); })}
      onLongPress={onLongPress}
      disabled={disabled}
      onPressIn={() => springTo(scale, 0.97, 'fast').start()}
      onPressOut={() => springTo(scale, 1, 'fast').start()}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * The Material 3 Expressive "shape morph" press: a full pill at rest that morphs to radius 16
 * and scales to 0.98 while pressed. Returns handlers and the animated style.
 */
function useMorphPress(height: number) {
  const pressed = useState(() => new Animated.Value(0))[0];
  const reduce = useReduceMotion();
  const to = (v: number) => (reduce ? pressed.setValue(v) : springTo(pressed, v, 'fast', false).start());
  const style = {
    borderRadius: pressed.interpolate({ inputRange: [0, 1], outputRange: [height / 2, 16] }),
    transform: [{ scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }],
  };
  return { style, onPressIn: () => to(1), onPressOut: () => to(0) };
}

export type IconButtonVariant = 'standard' | 'tonal' | 'filled';

/** 44 circle. Press squishes it into a cookie for a moment, then back. */
export function IconButton({ name, onPress, label, color, size = 22, disabled, style, variant = 'standard' }: {
  name: IconName; onPress: () => void; label: string; color?: string; size?: number; disabled?: boolean; style?: StyleProp<ViewStyle>;
  variant?: IconButtonVariant;
}) {
  const [squish, setSquish] = useState(false);
  const since = useRef(0);
  const bg = variant === 'filled' ? palette.lime : variant === 'tonal' ? palette.surfaceHigh : squish ? palette.surfaceHigh : 'transparent';
  const fg = color ?? (variant === 'filled' ? palette.onLime : palette.text);
  return (
    <Pressable
      onPress={() => { haptics.tick(); onPress(); }}
      onPressIn={() => { since.current = Date.now(); setSquish(true); }}
      onPressOut={() => { const left = 120 - (Date.now() - since.current); setTimeout(() => setSquish(false), Math.max(left, 0)); }}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.38 : 1 }, style]}
    >
      <ExpressiveShape shape={squish ? 'cookie9' : 'circle'} size={44} fill={bg} token="fast" style={{ position: 'absolute' }} />
      <Icon name={name} size={size} color={fg} />
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, enabled = true, loading = false, style, icon }: {
  label: string; onPress: () => void; enabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName;
}) {
  const disabled = !enabled || loading;
  const morph = useMorphPress(56);
  const fg = disabled && !loading ? palette.textFaint : palette.onLime;
  return (
    <AnimatedPressable
      onPress={() => { haptics.tick(); onPress(); }}
      onPressIn={morph.onPressIn}
      onPressOut={morph.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      style={[{ height: 56, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 24,
        backgroundColor: disabled && !loading ? palette.surfaceHigh : palette.lime }, morph.style, style]}>
      {loading ? <ShapeLoader size={26} color={palette.onLime} /> : (
        <>
          {icon && <Icon name={icon} color={fg} size={20} />}
          <T v="titleS" color={fg}>{label}</T>
        </>
      )}
    </AnimatedPressable>
  );
}

/** XL 72 lime button, only for "Start workout" and "Finish workout". */
export function HeroButton({ label, onPress, enabled = true, loading = false, style, icon }: {
  label: string; onPress: () => void; enabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; icon?: IconName;
}) {
  const disabled = !enabled || loading;
  const morph = useMorphPress(72);
  const fg = disabled && !loading ? palette.textFaint : palette.onLime;
  return (
    <AnimatedPressable
      onPress={() => { haptics.confirm(); onPress(); }}
      onPressIn={morph.onPressIn}
      onPressOut={morph.onPressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{ height: 72, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 28,
        backgroundColor: disabled && !loading ? palette.surfaceHigh : palette.lime }, morph.style, style]}>
      {loading ? <ShapeLoader size={30} color={palette.onLime} /> : (
        <>
          {icon && <Icon name={icon} color={fg} size={26} />}
          <T v="displayS" color={fg} style={{ fontSize: 20, lineHeight: 24, letterSpacing: -0.2 }}>{label}</T>
        </>
      )}
    </AnimatedPressable>
  );
}

export type ButtonKind = 'tonal' | 'outline' | 'text' | 'filled' | 'danger';

/** Secondary actions: tonal (default look for secondary), outline, text, filled (lime) or danger (ember). */
export function Button({ label, onPress, kind = 'outline', icon, color, enabled = true, loading, style, compact }: {
  label: string; onPress: () => void; kind?: ButtonKind; icon?: IconName; color?: string;
  enabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>; compact?: boolean;
}) {
  const height = compact ? 40 : 48;
  const morph = useMorphPress(height);
  const fg = color ?? ({ text: palette.lime, filled: palette.onLime, tonal: palette.onLimeContainer, danger: palette.ember, outline: palette.text } as const)[kind];
  const bg = ({ tonal: palette.limeContainer, filled: palette.lime, danger: palette.emberContainer, text: 'transparent', outline: 'transparent' } as const)[kind];
  return (
    <AnimatedPressable
      onPress={() => { haptics.tick(); onPress(); }}
      onPressIn={morph.onPressIn}
      onPressOut={morph.onPressOut}
      disabled={!enabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[{
        minHeight: height, paddingHorizontal: kind === 'text' ? 12 : 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: bg, borderWidth: kind === 'outline' ? 1 : 0, borderColor: palette.outline, opacity: enabled ? 1 : 0.38,
      }, morph.style, style]}
    >
      {loading ? <ShapeLoader size={20} color={fg} /> : (
        <>
          {icon && <Icon name={icon} color={fg} size={18} />}
          <T v="label" color={fg}>{label}</T>
        </>
      )}
    </AnimatedPressable>
  );
}

/** A main action plus a menu half ("Start ▾"): two joined pills. */
export function SplitButton({ label, onPress, onMenu, kind = 'filled', enabled = true, menuLabel = 'More options', compact = true }: {
  label: string; onPress: () => void; onMenu: () => void; kind?: 'filled' | 'tonal'; enabled?: boolean; menuLabel?: string; compact?: boolean;
}) {
  const height = compact ? 40 : 48;
  const bg = kind === 'filled' ? palette.lime : palette.limeContainer;
  const fg = kind === 'filled' ? palette.onLime : palette.onLimeContainer;
  const side = (left: boolean) => ({
    height, backgroundColor: bg, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: enabled ? 1 : 0.38,
    borderTopLeftRadius: left ? height / 2 : 6, borderBottomLeftRadius: left ? height / 2 : 6,
    borderTopRightRadius: left ? 6 : height / 2, borderBottomRightRadius: left ? 6 : height / 2,
  });
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      <PressableScale onPress={onPress} disabled={!enabled} label={label} style={[side(true), { paddingLeft: 16, paddingRight: 12 }]}>
        <T v="label" color={fg}>{label}</T>
      </PressableScale>
      <PressableScale onPress={onMenu} label={menuLabel} style={[side(false), { width: 34 }]}>
        <Icon name="arrow-drop-down" color={fg} size={20} />
      </PressableScale>
    </View>
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

/** 1px divider (inside grouped lists, inset by the tile padding). */
export function Hairline({ inset = 0, style }: { inset?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: palette.hairline, marginLeft: inset }, style]} />;
}

export function Avatar({ name, seed, size = 40 }: { name: string; seed: string; size?: number }) {
  const v: TypeVariant = size >= 64 ? 'displayS' : size >= 40 ? 'titleS' : 'label';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: avatarColor(seed), alignItems: 'center', justifyContent: 'center' }}>
      <T v={v} color={palette.ink} style={{ fontWeight: '700' }}>{name.trim().charAt(0).toUpperCase() || '?'}</T>
    </View>
  );
}

/** Large title for a tab's root page, with optional actions (tonal icon buttons) on the right. */
export function TabHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter - 4, paddingTop: 12, paddingBottom: 8, gap: 8 }}>
      <View style={{ flex: 1 }}>
        <T v="headline" lines={1}>{title}</T>
        {subtitle ? <T color={palette.textMuted}>{subtitle}</T> : null}
      </View>
      {actions ? <View style={{ flexDirection: 'row', gap: 6 }}>{actions}</View> : null}
    </View>
  );
}

/** Tonal back button and title for pages below a tab, with optional actions on the right. */
export function PageHeader({ title, onBack, actions }: { title: string; onBack: () => void; actions?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter - 4, paddingRight: Gutter - 4, paddingTop: 8, paddingBottom: 8, gap: 12 }}>
      <IconButton variant="tonal" name={Platform.OS === 'ios' ? 'arrow-back-ios-new' : 'arrow-back'} onPress={onBack} label="Back" size={Platform.OS === 'ios' ? 18 : 22} />
      <T v="title" lines={1} style={{ flex: 1 }}>{title}</T>
      {actions}
    </View>
  );
}

/** Section title above a group of content, with an optional text button on the right. */
export function SectionTitle({ text, trailing }: { text: string; trailing?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: Gutter, paddingRight: Gutter - 8, paddingTop: 24, paddingBottom: 10, minHeight: 32 }}>
      <T v="titleS" style={{ flex: 1 }}>{text}</T>
      {trailing}
    </View>
  );
}

export function SectionLabel({ text }: { text: string }) {
  return <T v="titleS" style={{ marginTop: 8 }}>{text}</T>;
}

// ---------------------------------------------------------------- Bento and tiles

const BentoWidth = createContext(0);

/** Two-column grid of tiles with a 10 gap. Put <Tile>s inside. */
export function Bento({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const [width, setWidth] = useState(0);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: space.tileGap, marginHorizontal: Gutter }, style]}>
      <BentoWidth.Provider value={width}>{width > 0 ? children : null}</BentoWidth.Provider>
    </View>
  );
}

/** Width of one Bento column (0 outside a Bento or before layout). Full width = 2 × column + gap. */
export function useBentoColumn(): number {
  const bento = useContext(BentoWidth);
  return bento > 0 ? (bento - space.tileGap) / 2 : 0;
}

/** `auto` takes no size from the Bento: the parent's layout decides (e.g. stacked tiles beside a square). */
export type TileSpan = '1x1' | '2x1' | '2x2' | 'auto';

/**
 * A surface tile: 1×1 (square), 2×1 (wide) or 2×2 (hero). Heights are minimums, so tiles grow
 * with large font settings instead of clipping. Outside a Bento it simply fills its parent.
 */
const OUTER_KEYS = ['margin', 'marginHorizontal', 'marginVertical', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'flex', 'flexGrow', 'flexBasis', 'alignSelf'] as const;

/**
 * Buttons inside a pressable tile go in `overlay`: they are drawn over the tile as a sibling
 * (absolutely positioned), never nested inside the tile's own pressable. Leave room for them in
 * the tile's content (e.g. a spacer) so the layout looks the same.
 */
export function Tile({ span = '1x1', children, onPress, background = palette.surface, style, label, center, padding = space.tilePad, border, overlay }: {
  span?: TileSpan; children?: ReactNode; onPress?: () => void; background?: string; style?: StyleProp<ViewStyle>; label?: string;
  center?: boolean; padding?: number; border?: string; overlay?: ReactNode;
}) {
  const bento = useContext(BentoWidth);
  const col = bento > 0 ? (bento - space.tileGap) / 2 : 0;
  const sized = bento > 0 && span !== 'auto';
  const width = sized ? (span === '1x1' ? col : bento) : undefined;
  const minHeight = sized ? (span === '2x1' ? undefined : span === '2x2' ? bento * 0.9 : col) : undefined;
  const box: StyleProp<ViewStyle> = [{
    width, minHeight, borderRadius: span === '2x2' ? radius.xl : radius.lg, backgroundColor: background, padding, overflow: 'hidden',
    borderWidth: border ? 2 : 0, borderColor: border,
  }, center && { alignItems: 'center', justifyContent: 'center' }, style];
  const surface = onPress
    ? <PressableScale onPress={onPress} label={label} style={box}>{children}</PressableScale>
    : <View style={box} accessible={!!label} accessibilityLabel={label}>{children}</View>;
  if (!overlay) return surface;
  // Margins and flex belong to the wrapper, so the overlay lines up with the tile.
  const flat = (StyleSheet.flatten(box) ?? {}) as Record<string, unknown>;
  const outer: Record<string, unknown> = { width: flat.width };
  for (const k of OUTER_KEYS) if (flat[k] !== undefined) { outer[k] = flat[k]; }
  const inner = [box, Object.fromEntries(OUTER_KEYS.map((k) => [k, undefined])), { width: flat.width != null ? '100%' : undefined }] as StyleProp<ViewStyle>;
  return (
    <View style={outer as ViewStyle}>
      {onPress
        ? <PressableScale onPress={onPress} label={label} style={inner}>{children}</PressableScale>
        : <View style={inner} accessible={!!label} accessibilityLabel={label}>{children}</View>}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>{overlay}</View>
    </View>
  );
}

/** Tile header: small icon + overline, muted. */
export function TileHeader({ icon, text, color = palette.textMuted, center, trailing }: { icon?: IconName; text: string; color?: string; center?: boolean; trailing?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: center ? 'center' : 'flex-start' }}>
      {icon && <Icon name={icon} size={16} color={color} />}
      <T v="overline" color={color} style={!center && trailing ? { flex: 1 } : undefined}>{text}</T>
      {trailing}
    </View>
  );
}

/** A stat tile body: hero number in Space Grotesk, then a one-line caption. */
export function TileNumber({ value, caption, color = palette.text, v = 'displayM' }: { value: string; caption?: string; color?: string; v?: TypeVariant }) {
  return (
    <View style={{ gap: 2 }}>
      <T v={v} color={color}>{value}</T>
      {caption ? <T v="bodyS" color={palette.textMuted}>{caption}</T> : null}
    </View>
  );
}

// ---------------------------------------------------------------- Grouped lists

/** A surface rounded-28 container; its rows are separated by 1px hairlines inset 18. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginHorizontal: Gutter, borderRadius: radius.lg, backgroundColor: palette.surface, overflow: 'hidden' }, style]}>
      {rows.map((row, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Hairline inset={space.tilePad} />}
          {row}
        </React.Fragment>
      ))}
    </View>
  );
}

/** One row in a ListGroup: optional icon, title and subtitle, then a trailing element or chevron. */
export function ListRow({ icon, iconColor, title, subtitle, trailing, onPress, danger, enabled = true, chevron, leading, label }: {
  icon?: IconName; iconColor?: string; title: string; subtitle?: string; trailing?: ReactNode; onPress?: () => void; danger?: boolean;
  enabled?: boolean; chevron?: boolean; leading?: ReactNode; label?: string;
}) {
  const tint = danger ? palette.ember : enabled ? palette.text : palette.textFaint;
  // A tappable row with its own trailing control: the control sits beside the pressable, not inside it.
  const split = !!onPress && trailing != null;
  const row = (
    <Pressable
      onPress={onPress && (() => { haptics.tick(); onPress(); })}
      disabled={!onPress || !enabled}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', paddingLeft: space.tilePad, paddingRight: split ? 4 : space.tilePad, paddingVertical: 12, gap: 14, minHeight: 60,
        backgroundColor: pressed ? palette.surfaceHigh : 'transparent', flex: split ? 1 : undefined,
      })}
    >
      {leading ?? (icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: danger ? palette.emberContainer : palette.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={iconColor ?? (danger ? palette.ember : enabled ? palette.textMuted : palette.textFaint)} />
        </View>
      ) : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="titleS" color={tint} lines={2}>{title}</T>
        {subtitle ? <T v="bodyS" color={enabled ? palette.textMuted : palette.textFaint}>{subtitle}</T> : null}
      </View>
      {!split && trailing}
      {chevron ?? (onPress && enabled && !trailing) ? <Icon name="chevron-right" color={palette.textMuted} /> : null}
    </Pressable>
  );
  if (!split) return row;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: space.tilePad - 8 }}>
      {row}
      {trailing}
    </View>
  );
}

// ---------------------------------------------------------------- Feedback

/** A short, friendly explanation of why a question is asked or what a word means. */
export function HelpNote({ text, background = palette.surface }: { text: string; background?: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: background, alignItems: 'center' }}>
      <ExpressiveShape shape="pebble" size={34} fill={tone(palette.lime, 0.2, background)}>
        <Icon name="info-outline" size={18} color={palette.lime} />
      </ExpressiveShape>
      <T color={palette.textMuted} style={{ flex: 1 }}>{text}</T>
    </View>
  );
}

/** A warning or milestone note: ember or gold container, coloured icon in a small burst. Informs, never blocks. */
export function Notice({ lines, kind = 'ember', icon = kind === 'gold' ? 'emoji-events' : 'priority-high', title }: {
  lines: string[]; kind?: 'ember' | 'gold'; icon?: IconName; title?: string;
}) {
  const color = kind === 'gold' ? palette.gold : palette.ember;
  const bg = kind === 'gold' ? palette.goldContainer : palette.emberContainer;
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: bg }}>
      <ExpressiveShape shape="burst" size={32} fill={tone(color, 0.25, bg)}>
        <Icon name={icon} size={16} color={color} />
      </ExpressiveShape>
      <View style={{ flex: 1, gap: 4, justifyContent: 'center' }}>
        {title ? <T v="titleS">{title}</T> : null}
        {lines.map((line, i) => <T key={i} v="bodyS">{line}</T>)}
      </View>
    </View>
  );
}

/** Empty state: a large tonal shape with an icon, a title and a one-line hint. */
export function EmptyState({ icon, title, hint, shape = 'pebble', action }: { icon: IconName; title: string; hint?: string; shape?: ShapeName; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 32, gap: 10 }}>
      <ExpressiveShape shape={shape} size={96} fill={tone(palette.lime, 0.12, palette.ink)}>
        <Icon name={icon} size={36} color={palette.lime} />
      </ExpressiveShape>
      <T v="title" center style={{ marginTop: 6 }}>{title}</T>
      {hint ? <T color={palette.textMuted} center>{hint}</T> : null}
      {action}
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

/**
 * Fades and slides its content up 12px when the page opens. `index` staggers items (50 ms)
 * so a page builds itself from top to bottom. Fade only with reduce motion.
 */
export function Appear({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const progress = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: reduce ? 200 : 420, delay: 50 * index, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
  }, [index, progress, reduce]);
  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [reduce ? 0 : 12, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/** Animates from its previous value to `value` (0..1 fractions, sizes...). */
export function useAnimatedNumber(value: number, duration = 700, from?: number): Animated.Value {
  const reduce = useReduceMotion();
  const anim = useState(() => new Animated.Value(from ?? value))[0];
  useEffect(() => {
    if (reduce) { anim.setValue(value); return; }
    Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [value, duration, anim, reduce]);
  return anim;
}

/** A number that counts up from `from` to `value` (or from its previous value when it changes). */
export function CountingNumber({ value, from = 0, v = 'displayM', color = palette.text, format = formatKcal, style }: {
  value: number; from?: number; v?: TypeVariant; color?: string; format?: (n: number) => string; style?: StyleProp<TextStyle>;
}) {
  const anim = useAnimatedNumber(value, 1200, from);
  const [shown, setShown] = useState(from);
  useEffect(() => {
    const id = anim.addListener(({ value: x }) => setShown(Math.trunc(x)));
    return () => anim.removeListener(id);
  }, [anim]);
  return <T v={v} color={color} style={style} accessibilityLabel={format(value)}>{format(shown)}</T>;
}

/** A slim pill bar (8px) that glides to `progress` (0..1). For static values; WavyProgress is for ongoing ones. */
export function ProgressBar({ progress, color = palette.lime, track = palette.surfaceHigh, height = 8, duration = 700 }: {
  progress: number; color?: string; track?: string; height?: number; duration?: number;
}) {
  const anim = useAnimatedNumber(Math.min(Math.max(progress, 0), 1), duration, 0);
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={{ height, borderRadius: height / 2, backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

/** A block that shimmers with a diagonal sheen while content loads, in the shape of what's coming. */
export function Skeleton({ width = '100%', height = 16, radius: r = 8, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0);
  const sheen = useLoop(1400);
  const band = Math.max(w * 0.6, 60);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ width, height, borderRadius: r, backgroundColor: palette.surfaceHigh, overflow: 'hidden' }, style]}>
      {w > 0 && (
        <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: band, transform: [{ translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-band, w + band] }) }] }}>
          <LinearGradient colors={[withAlpha(palette.text, 0), withAlpha(palette.text, 0.07), withAlpha(palette.text, 0)]}
            start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.7 }} style={{ flex: 1 }} />
        </Animated.View>
      )}
    </View>
  );
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
      <Skeleton height={120} radius={radius.lg} />
      <Skeleton width={160} height={14} />
    </View>
  );
}

// ---------------------------------------------------------------- Inputs

/** Pill chip: surfaceHighest at rest; selected = limeContainer with a check that pops in. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const pop = useState(() => new Animated.Value(selected ? 1 : 0))[0];
  useEffect(() => { springTo(pop, selected ? 1 : 0, 'bouncy').start(); }, [selected, pop]);
  return (
    <Pressable
      onPress={() => { haptics.tick(); onPress(); }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        height: 36, paddingHorizontal: 16, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: selected ? palette.limeContainer : palette.surfaceHighest,
      }}
    >
      {selected && <Animated.View style={{ transform: [{ scale: pop }] }}><Icon name="check" size={16} color={palette.onLimeContainer} /></Animated.View>}
      <T v="label" color={selected ? palette.onLimeContainer : palette.text}>{label}</T>
    </Pressable>
  );
}

/** Custom switch: track surfaceHighest → lime; the thumb is a small cookie that becomes a circle when on. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const x = useState(() => new Animated.Value(value ? 1 : 0))[0];
  const fill = useState(() => new Animated.Value(value ? 1 : 0))[0];
  useEffect(() => {
    springTo(x, value ? 1 : 0, 'fast').start();
    fadeTo(fill, value ? 1 : 0, false).start();
  }, [value, x, fill]);
  return (
    <Pressable onPress={() => { haptics.tick(); onChange(!value); }} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} hitSlop={8}>
      <Animated.View style={{ width: 52, height: 32, borderRadius: 16, justifyContent: 'center', paddingHorizontal: 4,
        backgroundColor: fill.interpolate({ inputRange: [0, 1], outputRange: [palette.surfaceHighest, palette.lime] }) }}>
        <Animated.View style={{ transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }}>
          <ExpressiveShape shape={value ? 'circle' : 'cookie9'} size={24} fill={value ? palette.onLime : palette.textMuted} token="fast" />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/** Joined options in a surfaceHigh pill track; the selected one is a lime pill that slides with a spring. */
export function Segmented<K extends string>({ options, selected, onSelect, disabled }: {
  options: { key: K; label: string }[]; selected: K; onSelect: (k: K) => void; disabled?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(options.findIndex((o) => o.key === selected), 0);
  const x = useState(() => new Animated.Value(index))[0];
  useEffect(() => { springTo(x, index, 'default').start(); }, [index, x]);
  const seg = (width - 8) / Math.max(options.length, 1);
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: palette.surfaceHigh, borderRadius: radius.full, padding: 4, opacity: disabled ? 0.5 : 1 }}>
      {width > 0 && (
        <Animated.View style={{ position: 'absolute', top: 4, bottom: 4, left: 4, width: seg, borderRadius: radius.full, backgroundColor: palette.lime,
          transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, seg] }) }] }} />
      )}
      {options.map((o) => {
        const on = o.key === selected;
        return (
          <Pressable
            key={o.key}
            disabled={disabled}
            onPress={() => { haptics.tick(); onSelect(o.key); }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{ flex: 1, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <T v="label" color={on ? palette.onLime : palette.text}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Filled text field: surfaceHigh, radius 16, the label floats inside the field, and a 2px lime
 * bar grows from the centre on focus. Error: an ember bar and the message under it.
 */
export function TextField({ label, value, onChangeText, suffix, error, hint, big, style, right, ...rest }: {
  label?: string; value: string; onChangeText: (t: string) => void; suffix?: string; error?: string | null; hint?: string;
  big?: boolean; style?: StyleProp<ViewStyle>; right?: ReactNode;
} & Omit<TextInputProps, 'value' | 'onChangeText' | 'style'>) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value !== '' || !!rest.placeholder;
  const lift = useState(() => new Animated.Value(floated ? 1 : 0))[0];
  const bar = useState(() => new Animated.Value(0))[0];
  useEffect(() => { springTo(lift, floated ? 1 : 0, 'fast', false).start(); }, [floated, lift]);
  useEffect(() => { springTo(bar, focused || error ? 1 : 0, 'default').start(); }, [focused, error, bar]);
  const accent = error ? palette.ember : palette.lime;
  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceHigh, borderRadius: 16, paddingHorizontal: 16, minHeight: 60, overflow: 'hidden' }}>
        <View style={{ flex: 1, justifyContent: 'center', paddingTop: label ? 18 : 0 }}>
          {label ? (
            <Animated.Text numberOfLines={1} pointerEvents="none" style={[type.body, {
              position: 'absolute', left: 0, right: 0,
              color: error ? palette.ember : focused ? palette.lime : palette.textMuted,
              top: lift.interpolate({ inputRange: [0, 1], outputRange: [19, 9] }),
              fontSize: lift.interpolate({ inputRange: [0, 1], outputRange: [15, 12] }),
              lineHeight: lift.interpolate({ inputRange: [0, 1], outputRange: [22, 16] }),
            }]}>{label}</Animated.Text>
          ) : null}
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
            onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
            placeholderTextColor={palette.textFaint}
            selectionColor={palette.lime}
            cursorColor={palette.lime}
            keyboardAppearance="dark"
            accessibilityLabel={label}
            {...rest}
            style={[big ? type.displayS : type.body, { color: palette.text, paddingVertical: label ? 6 : 16 },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          />
        </View>
        {suffix ? <T v="body" color={palette.textMuted} style={{ marginLeft: 6, paddingTop: label ? 14 : 0 }}>{suffix}</T> : null}
        {right}
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, backgroundColor: accent, transform: [{ scaleX: bar }] }} />
      </View>
      {error ? <T v="bodyS" color={palette.ember} style={{ marginTop: 6, marginLeft: 6 }}>{error}</T>
        : hint ? <T v="bodyS" color={palette.textMuted} style={{ marginTop: 6, marginLeft: 6 }}>{hint}</T> : null}
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
