/**
 * "Ascent Expressive" design tokens (see docs/DESIGN_SYSTEM.md). Dark-only for now, but
 * every token lives in a Theme object served by <ThemeProvider> / useTheme(), so a light
 * theme can be added later by providing a second Theme.
 *
 * Screens import the static `palette`, `type`, `radius`, `space` and `spring` tokens (they
 * are the dark theme's values); new components should prefer useTheme().
 */
import React, { createContext, ReactNode, useContext } from 'react';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';

// ---------------------------------------------------------------- Color

export const palette = {
  // Core
  ink: '#0A0B0E', // Every screen background, splash, status / nav bar
  surface: '#14161B', // Tiles, grouped list surfaces, bottom sheets
  surfaceHigh: '#1D2027', // Dialogs, pressed tiles, tracks, skeletons, inputs
  surfaceHighest: '#272B34', // Selected-but-not-primary states, chips at rest, tab dock
  outline: '#30343D', // Input borders, outlined buttons
  hairline: '#22252C', // 1px dividers inside grouped lists
  text: '#F4F2EC', // Primary text (warm white)
  textMuted: '#9A9EA8', // Secondary text, inactive icons
  textFaint: '#5E636D', // Disabled text, chart axis labels

  // Accent
  primary: '#9FA8FF', // Iris: primary buttons, main progress, active tab, links
  onPrimary: '#0A0B0E',
  primaryContainer: '#2A2D40', // Tonal buttons, selected chips, completed set rows
  onPrimaryContainer: '#DDE1FF',
  ember: '#FF6B3D', // Over budget, calories burned, failure sets, destructive actions
  emberContainer: '#3A1A10',
  gold: '#FFC94A', // Milestones only: PRs, setup complete, race winner, streak records
  goldContainer: '#3A2C0C',
  error: '#FF6E6E', // Form errors
  like: '#FF4D6D', // Filled heart

  // Photo overlays (stories, captions on images): always light-on-dark, whatever the theme.
  overlayText: '#FFFFFF',
  overlayBackground: '#000000',
  photoMat: '#FFFFFF', // Behind exercise photos, which are drawn on white
};

/** Data palette: macros and future metrics. */
export const data = {
  protein: '#FF8A5B',
  carbs: '#FFD25E',
  fat: '#6FE3C1', // mint
  water: '#5EE6FF',
  recovery: '#FF8FC7',
};

/** People colours for compare charts and avatars, in a fixed order (person 1 is you). */
export const people = ['#9FA8FF', '#FF8A5B', '#6FE3C1', '#FFC94A', '#FF8FC7'];

/** Cover gradient for posts without a photo: iris dusk → ink → ember dusk, diagonal. */
export const coverGradient = ['#14162A', '#0A0B0E', '#1A120E'] as const;

/** Summit glow: the primary colour at 18% fading to transparent (radial). */
export const summitGlowOpacity = 0.18;

const hex = (h: string) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(Math.min(Math.max(v, 0), 255)).toString(16).padStart(2, '0')).join('').toUpperCase();

/**
 * A solid tonal version of `color`: `amount` of it mixed into `base` (the tile surface by
 * default). Solid hex, never rgba, so overlapping shapes don't look muddy.
 */
export function tone(color: string, amount = 0.16, base: string = palette.surface): string {
  const a = hex(color), b = hex(base);
  return toHex(b.map((v, i) => v + (a[i] - v) * amount));
}

/** Hex colour with alpha (0..1), e.g. withAlpha(palette.ink, 0.9). */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255).toString(16).padStart(2, '0');
  return `${color}${a}`;
}

/** Kotlin's String.hashCode, so avatar colours stay stable for the same uid across both apps. */
export function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

export const avatarColor = (seed: string) => people[Math.abs(javaHash(seed)) % people.length];

// ---------------------------------------------------------------- Shape, space

export const radius = { xs: 8, sm: 12, md: 20, lg: 28, xl: 36, full: 999 };

export const space = {
  unit: 4,
  gutter: 16,
  tileGap: 10,
  tilePad: 18,
  /** Room a tab page keeps at the bottom so its content clears the floating dock. */
  dock: 96,
};

/** The page side margin. */
export const Gutter = space.gutter;

// ---------------------------------------------------------------- Type

/** Font family per weight. The keys are the names the fonts are registered under in App.tsx. */
export const fonts = {
  display: { 500: 'SpaceGrotesk_500Medium', 700: 'SpaceGrotesk_700Bold' } as Record<number, string>,
  ui: { 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold', 700: 'Inter_700Bold' } as Record<number, string>,
};

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };
const display = (w: 500 | 700): TextStyle => ({ fontFamily: fonts.display[w], ...tabular });
const ui = (w: 400 | 500 | 600 | 700): TextStyle => ({ fontFamily: fonts.ui[w], ...tabular });

const base = {
  hero: { ...display(700), fontSize: 64, lineHeight: 68, letterSpacing: -2 },
  displayL: { ...display(700), fontSize: 48, lineHeight: 52, letterSpacing: -1.5 },
  displayM: { ...display(700), fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  displayS: { ...display(700), fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
  headline: { ...ui(700), fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  title: { ...ui(600), fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  titleS: { ...ui(600), fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { ...ui(400), fontSize: 15, lineHeight: 22 },
  bodyS: { ...ui(400), fontSize: 13, lineHeight: 18 },
  label: { ...ui(600), fontSize: 13, lineHeight: 16 },
  overline: { ...ui(700), fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  mono: { ...display(500), fontSize: 15, lineHeight: 20, letterSpacing: 2 },
} satisfies Record<string, TextStyle>;

export const type = base;
export type TypeVariant = keyof typeof type;

/** Which family a variant belongs to, so a `fontWeight` override can pick the right file. */
export function familyFor(style: TextStyle): 'display' | 'ui' {
  return typeof style.fontFamily === 'string' && style.fontFamily.startsWith('SpaceGrotesk') ? 'display' : 'ui';
}

/**
 * Custom fonts ship one file per weight, so `fontWeight` must become a family (Android
 * ignores or fakes weights on custom fonts). Returns the style with the weight resolved.
 */
export function resolveWeight(style: StyleProp<TextStyle>): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontWeight == null) return flat;
  const { fontWeight, ...rest } = flat;
  const w = fontWeight === 'bold' ? 700 : fontWeight === 'normal' ? 400 : Number(fontWeight) || 400;
  const fam = familyFor(rest);
  const weights = Object.keys(fonts[fam]).map(Number);
  const nearest = weights.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
  return { ...rest, fontFamily: fonts[fam][nearest] };
}

// ---------------------------------------------------------------- Motion

/** Spring tokens (damping / stiffness, mass 1), for Animated.spring. */
export const spring = {
  fast: { damping: 22, stiffness: 420, mass: 1 },
  default: { damping: 20, stiffness: 240, mass: 1 },
  slow: { damping: 24, stiffness: 140, mass: 1 },
  bouncy: { damping: 12, stiffness: 260, mass: 1 },
};
export type SpringToken = keyof typeof spring;

/** Plain timing for opacity and colour changes. */
export const fadeMs = 200;

// ---------------------------------------------------------------- Theme object

export interface Theme {
  dark: boolean;
  palette: typeof palette;
  data: typeof data;
  people: string[];
  radius: typeof radius;
  space: typeof space;
  type: typeof type;
  spring: typeof spring;
  tone: (color: string, amount?: number) => string;
}

export const darkTheme: Theme = { dark: true, palette, data, people, radius, space, type, spring, tone };

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ theme = darkTheme, children }: { theme?: Theme; children: ReactNode }) {
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

export const useTheme = () => useContext(ThemeContext);
