package com.ascendlab.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

// The brand is dark-only: no light variant and no dynamic (wallpaper) colors.
private val AscendColorScheme = darkColorScheme(
    primary = MintGreen,
    onPrimary = MidnightBlue,
    primaryContainer = MintOnSlate,
    onPrimaryContainer = MintGreen,
    inversePrimary = MintGreen,

    secondary = LightGray,
    onSecondary = MidnightBlue,
    secondaryContainer = MintOnSlate,
    onSecondaryContainer = MintGreen,

    tertiary = Apricot,
    onTertiary = MidnightBlue,
    tertiaryContainer = Apricot,
    onTertiaryContainer = MidnightBlue,

    background = MidnightBlue,
    onBackground = SoftWhite,

    surface = MidnightBlue,
    onSurface = SoftWhite,
    surfaceVariant = SlateBlue,
    onSurfaceVariant = LightGray,
    surfaceTint = MidnightBlue, // no tonal tint: surfaces stay true to the palette
    inverseSurface = SoftWhite,
    inverseOnSurface = MidnightBlue,

    surfaceBright = SlateBlueRaised,
    surfaceDim = MidnightBlue,
    surfaceContainerLowest = MidnightBlue,
    surfaceContainerLow = SlateBlue,
    surfaceContainer = SlateBlue,
    surfaceContainerHigh = SlateBlueRaised,
    surfaceContainerHighest = SlateBlue,

    outline = Outline,
    outlineVariant = OutlineSubtle,
    scrim = MidnightBlue,

    error = ErrorRed,
    onError = MidnightBlue,
)

@Composable
fun AscendLabTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AscendColorScheme,
        typography = AscendTypography,
        shapes = AscendShapes,
        content = content,
    )
}
