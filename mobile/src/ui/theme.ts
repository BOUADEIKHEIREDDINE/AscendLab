/**
 * "Daily Ascent" visual identity (see ressources/Identite-visuelle.md), mirrored from the
 * Android theme. The brand is dark-only: no light variant.
 */
import { Platform, TextStyle } from 'react-native';

export const colors = {
  // Brand palette
  midnightBlue: '#101820', // Main background
  slateBlue: '#1C2934', // Cards and surfaces
  mintGreen: '#75E2BE', // Primary accent and progress
  softWhite: '#F4F7FA', // Primary text
  lightGray: '#A9B6C2', // Secondary text
  apricot: '#FFB987', // Occasional accent, milestones

  // Derived tones, not part of the brand palette itself
  slateBlueRaised: '#243441', // Slightly lifted surface (dialogs, menus)
  mintOnSlate: '#2E4E50', // Mint at ~20% over slate, for selected states
  outline: '#3A4A58',
  outlineSubtle: '#2A3844',
  error: '#FF8A80',
  like: '#FF5A6E',
};

/** Semantic names, matching the Material roles the Android screens used. */
export const c = {
  background: colors.midnightBlue,
  onSurface: colors.softWhite,
  onSurfaceVariant: colors.lightGray,
  primary: colors.mintGreen,
  onPrimary: colors.midnightBlue,
  primaryContainer: colors.mintOnSlate,
  surfaceContainer: colors.slateBlue,
  surfaceContainerHigh: colors.slateBlueRaised,
  outline: colors.outline,
  outlineVariant: colors.outlineSubtle,
  error: colors.error,
  tertiary: colors.apricot,
};

/** The one side margin used across the app. */
export const Gutter = 20;

export const radius = { xs: 8, sm: 12, md: 20, lg: 24, xl: 32 };

// Roboto on Android, SF on iOS: the system sans-serif with bold headings.
const base: TextStyle = Platform.select({ web: { fontFamily: 'Roboto, system-ui, sans-serif' }, default: {} })!;
// Tabular figures keep numbers aligned and easy to read (calories, reps, streaks).
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  displayLarge: { ...base, ...tabular, fontSize: 56, lineHeight: 64, fontWeight: '700' },
  displayMedium: { ...base, ...tabular, fontSize: 44, lineHeight: 52, fontWeight: '700' },
  displaySmall: { ...base, ...tabular, fontSize: 36, lineHeight: 44, fontWeight: '700' },
  headlineLarge: { ...base, fontSize: 32, lineHeight: 40, fontWeight: '700' },
  headlineMedium: { ...base, fontSize: 28, lineHeight: 36, fontWeight: '700' },
  headlineSmall: { ...base, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  titleLarge: { ...base, ...tabular, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  titleMedium: { ...base, ...tabular, fontSize: 16, lineHeight: 24, fontWeight: '600', letterSpacing: 0.15 },
  titleSmall: { ...base, ...tabular, fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  bodyLarge: { ...base, fontSize: 16, lineHeight: 24, letterSpacing: 0.15 },
  bodyMedium: { ...base, fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },
  bodySmall: { ...base, fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  labelLarge: { ...base, ...tabular, fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  labelMedium: { ...base, fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
  labelSmall: { ...base, fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/** Kotlin's String.hashCode, so avatar colours match the Android app for the same uid. */
export function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

const avatarColors = ['#75E2BE', '#FFB987', '#8EC5FF', '#E0A3FF', '#FFE08A'];
export const avatarColor = (seed: string) => avatarColors[Math.abs(javaHash(seed)) % avatarColors.length];

/** Fixed order, validated for colour-blind separation: you first, then friends. */
export const personColors = ['#199E70', '#D95926', '#3987E5', '#C98500', '#D55181'];

/** Hex colour with alpha (0..1), e.g. withAlpha('#FFFFFF', 0.7). */
export function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.min(Math.max(alpha, 0), 1) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}
