# AscendLab

The active app is the Expo / React Native app in `mobile/` (see `mobile/AGENTS.md` for Expo
commands and rules). `app/` is the older native Android app and is not the main target.

## Visual design: "Ascent Expressive"

The source of truth is `docs/DESIGN_SYSTEM.md`. Three rules always apply:

1. **Tiles for numbers, rows for lists.** Dashboards (Food summary, Profile stats, Plan ready,
   workout stats) are a bento grid of tiles. Long lists (history, settings, exercise library,
   comments) are flat rows on a grouped surface, separated by hairlines.
2. **One expressive shape per tile, at most.** The shape carries meaning (progress, state,
   category). Never stack two decorative shapes in one tile.
3. **One lime thing per screen is the hero.** Lime marks the primary action or the main
   progress. Everything else uses tonal surfaces and the data palette.

## How to style a new screen

- **Tokens only.** Import `palette`, `data`, `people`, `radius`, `space`, `type`, `spring` and
  `tone()` from `mobile/src/ui/theme.ts`. No hex or `rgba()` values in screens or components;
  add a token to the theme if one is missing. Use `withAlpha(token, a)` for translucency.
- **Text** goes through `<T v="…">` (`hero`, `displayL/M/S` for numbers in Space Grotesk;
  `headline`, `title`, `titleS`, `body`, `bodyS`, `label`, `overline`, `mono` in Inter). Don't set
  `fontFamily`; a `fontWeight` override is mapped to the right font file by `T`.
- **Page frame**: `<Screen>` + `<TabHeader>` (tab roots) or `<PageHeader>` (sub-pages), then a
  `ScrollView`/`FlatList`. Side margin is `space.gutter` (16). The tab dock sits in flow under
  tab pages, so no extra bottom padding is needed for it.
- **Numbers** → `<Bento>` with `<Tile span="1x1|2x1|2x2|auto">`, `<TileHeader icon text />` and
  `<TileNumber>`, or a `<StatTile>` (components/workout.tsx).
- **Lists** → `<ListGroup>` of `<ListRow>`s (hairlines are inserted for you).
- **Buttons**: `PrimaryButton` (one per screen), `HeroButton` only for start/finish workout,
  `Button kind="tonal|outline|text|danger|filled"`, `SplitButton`, `IconButton variant=…`.
- **Shapes**: `<ExpressiveShape shape="cookie9" …>` from `mobile/src/ui/shapes/`. Pick from
  the named shapes in `shapes/library.ts`; meals use `mealShape[type]`, workouts `workoutShape`.
  Tonal fills are `tone(color, 0.16)`. Spinners are `<ShapeLoader>`, ongoing progress is
  `<WavyProgress>`, empty states are `<EmptyState>`, warnings are `<Notice>`.
- **Motion**: springs from `springTo(value, to, 'fast'|'default'|'slow'|'bouncy')` in
  `mobile/src/ui/motion.ts`; plain timing (`fadeTo`) only for opacity and colour. Anything that
  loops or morphs must respect `useReduceMotion()`.
- **Check** with `npx tsc --noEmit` and `npx expo lint` in `mobile/`. The dev-only shape gallery
  (Settings → Developer) shows every shape and morph.
