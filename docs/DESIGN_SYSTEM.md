# AscendLab — "Ascent Expressive" design system

> Put this file in your repo at `docs/DESIGN_SYSTEM.md`. It is the source of truth for the redesign. The CLI prompt (PROMPT.md) tells Claude Code to read it.

## 0. The idea in one paragraph

AscendLab is about **climbing, one small step at a time**. The new language turns that into a visual system. **Progress is shape.** Every number lives in a tile, and every tile has a shape from one shared family: soft scalloped "cookies", bursts, clovers, pebbles, and rounded triangles. They are close cousins of Material 3 Expressive, but drawn by us. Shapes are not just decoration. They **morph to show state**. A spiky burst means "far from the goal", a smooth circle means "summit reached", and a sharp ember burst means "over the limit". The background is near-black ink, the accent is a cool, bright **Iris**, and the numbers are huge, tight, and geometric. The app should feel like a premium sports watch face: calm, dense with meaning, and alive when you touch it.

**Three rules everyone (human or AI) must follow:**
1. **Tiles for numbers, rows for lists.** Dashboards (Food summary, Profile stats, Plan ready, workout stats) become a bento grid of tiles. Long lists (history, settings, exercise library, comments) stay flat rows on a grouped surface, separated by hairlines.
2. **One expressive shape per tile, at most.** The shape carries meaning (progress, state, category). Never stack two decorative shapes in one tile.
3. **One iris thing per screen is the hero.** Iris marks the primary action or the main progress. Everything else uses tonal surfaces and the data palette.

---

## 1. Color

Dark-only for now, but the theme must be built so a light theme can be added later (ThemeProvider + `useTheme()`).

### Core
| Token | Hex | Use |
|---|---|---|
| `ink` (background) | `#0A0B0E` | Every screen background, splash, status/nav bar |
| `surface` | `#14161B` | Tiles, grouped list surfaces, bottom sheets |
| `surfaceHigh` | `#1D2027` | Dialogs, pressed tiles, tracks of rings/bars, skeletons, inputs |
| `surfaceHighest` | `#272B34` | Selected-but-not-primary states, chips at rest, tab dock |
| `outline` | `#30343D` | Input borders, outlined buttons |
| `hairline` | `#22252C` | 1px dividers inside grouped lists |
| `text` | `#F4F2EC` | Primary text (warm white, not blue-white) |
| `textMuted` | `#9A9EA8` | Secondary text, inactive icons |
| `textFaint` | `#5E636D` | Disabled text, chart axis labels |

### Accent
| Token | Hex | Use |
|---|---|---|
| `primary` (iris) | `#9FA8FF` | Primary buttons, main progress, active tab, links |
| `onPrimary` | `#0A0B0E` | Text and icons on iris |
| `primaryContainer` | `#2A2D40` | Tonal buttons, selected chips, completed set rows, shape fills behind iris content |
| `onPrimaryContainer` | `#DDE1FF` | Text on primaryContainer |
| `ember` | `#FF6B3D` | Over budget, calories burned, failure sets, destructive actions |
| `emberContainer` | `#3A1A10` | Background of warnings |
| `gold` | `#FFC94A` | Milestones only: PRs, "Setup complete", race winner, streak records |
| `goldContainer` | `#3A2C0C` | PR banner, milestone tiles |
| `error` | `#FF6E6E` | Form errors |
| `like` | `#FF4D6D` | Filled heart |

### Data palette (charts, macros, people)
| Token | Hex | Meaning |
|---|---|---|
| `protein` | `#FF8A5B` | Protein (warm coral) |
| `carbs` | `#FFD25E` | Carbs (sun) |
| `fat` | `#6FE3C1` | Fat (mint) |
| `water` (future) | `#5EE6FF` | Hydration |
| `recovery` (future) | `#FF8FC7` | Sleep / recovery |
| People (compare charts) | `#9FA8FF`, `#FF8A5B`, `#6FE3C1`, `#FFC94A`, `#FF8FC7` | Person 1–5 |

Avatar backgrounds use the same five people colors, with the initial in `ink`, weight 700.

### Tonal shape fills
Each tile shape sits on a tonal version of its content color: 16% of the color mixed into `surface`. Add a helper `tone(color, 0.16)` that returns a solid hex (not rgba) so shapes never look muddy where they overlap. Examples: protein tile → coral-tinted shape, PR tile → gold-tinted shape. This is the "brown shape on black" look from the Pixel Weather app, in our colors.

### Gradients
Only two are allowed:
- **Summit glow**: radial, `primary` (iris) at 18% → transparent. Used behind the Fuel Bloom when the goal is reached, and behind the Welcome logo.
- **Cover gradient** for posts without photos: `#14162A → #0A0B0E → #1A120E` (iris-dusk → ink → ember-dusk), diagonal.

No other hard-coded colors anywhere in screens. Everything goes through the theme.

---

## 2. Typography

Load two Google fonts with `expo-font` and `@expo-google-fonts/*`:
- **Space Grotesk** (500, 700) for **display and numbers**: calories, reps, timers, stats, big titles. Geometric, a little technical, very "pro sports".
- **Inter** (400, 500, 600, 700) for **all UI text**.

All numbers use `fontVariant: ['tabular-nums']`.

| Variant | Font | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `hero` | Space Grotesk | 64/68 | 700 | -2 | Fuel Bloom remaining kcal, PR weight |
| `displayL` | Space Grotesk | 48/52 | 700 | -1.5 | Meal cover kcal, rest timer |
| `displayM` | Space Grotesk | 36/40 | 700 | -1 | Tile hero numbers |
| `displayS` | Space Grotesk | 28/32 | 700 | -0.5 | Small tile numbers, profile stats |
| `headline` | Inter | 28/34 | 700 | -0.6 | Tab titles, onboarding titles |
| `title` | Inter | 20/26 | 600 | -0.3 | Page titles, dialog titles |
| `titleS` | Inter | 16/22 | 600 | -0.1 | Section titles, row titles, button labels |
| `body` | Inter | 15/22 | 400 | 0 | Default |
| `bodyS` | Inter | 13/18 | 400 | 0 | Secondary details |
| `label` | Inter | 13/16 | 600 | 0 | Chips, tile labels, tab labels |
| `overline` | Inter | 11/14 | 700 | +1.2, UPPERCASE | Tile headers ("PROTEIN", "STREAK") |
| `mono` | Space Grotesk | 15/20 | 500 | +2 | Friend code |

**Tile header pattern** (copied from the weather app): small icon + `overline` text, centered or top-left, in `textMuted`. Then the hero number in Space Grotesk. Then a one-line caption in `bodyS`.

Copy stays sentence case, except overlines.

---

## 3. Shape system (the heart of the redesign)

### 3.1 One polar shape family
Every expressive shape is drawn by **one** function, so any shape can morph into any other:

```
ShapeSpec = { lobes: number, depth: number, sharpness: number, rotation: number, wobble?: number }

radius(θ) = R * (1 - depth + depth * wave(θ))
wave(θ)   = ((cos(lobes * (θ - rotation)) + 1) / 2) ^ sharpness     // sharpness 1 = soft, 3 = spiky
           + wobble * sin(2θ + 0.7) * 0.5                            // optional organic wobble (pebble)
```

Sample 144 points, close the path, smooth with Catmull-Rom → cubic Béziers, and return an SVG `d` string. Morphing = interpolating the ShapeSpec numbers (not the paths) and regenerating the path on each frame. This lives in `mobile/src/ui/shapes/`.

### 3.2 The named shapes
| Name | lobes | depth | sharpness | wobble | Used for |
|---|---|---|---|---|---|
| `circle` | 0 | 0 | 1 | 0 | Goal reached, avatars, neutral |
| `cookie9` | 9 | 0.07 | 1 | 0 | UV-style badges, streak tile, stats |
| `cookie12` | 12 | 0.05 | 1 | 0 | Story rings, set-done check |
| `burst` | 12 | 0.14 | 2.4 | 0 | "Far from goal", PR badge (gold) |
| `emberBurst` | 16 | 0.12 | 3 | 0 | Over budget (ember) |
| `clover` | 4 | 0.18 | 1 | 0 | Friends, social |
| `softTriangle` | 3 | 0.22 | 1 | 0 | Wind-style direction, "trend" tile |
| `pebble` | 2 | 0.06 | 1 | 0.18 | Organic blobs (macros, mood) |
| `flower` | 6 | 0.16 | 1.4 | 0 | Category icons (breakfast) |
| `gem` | 5 | 0.12 | 1.2 | 0 | Category icons (lunch) |

### 3.3 Meal shapes (a little personality system)
Each meal has its own shape, used for its icon container everywhere (Food tab, meal covers, logging sheets): Breakfast = `flower`, Lunch = `gem`, Dinner = `cookie9`, Snacks = `clover`. Workouts use `softTriangle` (an arrow pointing up: ascent).

### 3.4 Corner radii (non-expressive surfaces)
`xs 8 · sm 12 · md 20 · lg 28 · xl 36 · full 999`
- Tiles: 28. Large hero tile: 36.
- Buttons: full pill at rest. **On press they morph to radius 16** (Material 3 Expressive "shape morph" button) with a spring.
- Inputs: 16 (filled style, see §5).
- Chips: full pill.
- Dialogs and sheets: 36.
- Post images: 24 (inside the gutter, not edge to edge).

### 3.5 Wave edges
A `WaveEdge` component draws a soft sine top edge (amplitude 6, wavelength 48) for "liquid" tiles: the macro columns and the humidity-style water tile. The wave slowly drifts sideways (8s loop) unless reduce-motion is on.

---

## 4. Spacing and layout

- Base unit 4. Page gutter **16**. Gap between tiles **10**. Tile inner padding **18**.
- **Bento grid**: two columns. A tile is `1×1` (square), `2×1` (wide) or `2×2` (hero). Build a tiny `<Bento>` + `<Tile span="1x1|2x1|2x2">` layout helper.
- **Grouped list surface**: a `surface` rounded-28 container with rows inside, separated by 1px `hairline` inset 18. Replaces the old full-bleed rows.
- Section title: `titleS` text, 24 top, 10 bottom, optional text button on the right.
- Screens get extra bottom padding so content clears the floating tab dock (96).

---

## 5. Core components

**Buttons** (all heights follow M3 Expressive sizes: S 40, M 48, L 56, XL 72)
- `PrimaryButton`: L 56, iris, `onPrimary` label in `titleS`, full pill. Press → radius morphs to 16 and scale 0.98, with a spring and haptic tick. Disabled → `surfaceHigh` + `textFaint`.
- `HeroButton` (new): XL 72, used **only** for "Start workout" and "Finish workout". Iris, with the label in Space Grotesk 20.
- `Button` kinds: `tonal` (primaryContainer + onPrimaryContainer, the default secondary), `outline` (1px outline), `text` (iris text), `danger` (emberContainer + ember).
- `IconButton`: 44 circle. Variants `standard`, `tonal` (surfaceHigh), `filled` (iris). Press = morph to `cookie9` shape for 120ms (a playful "squish"), then back.
- **Split button** for "Start routine ▾" in Train (main action + menu half).

**Inputs**
- `TextField`: **filled** style instead of outlined. `surfaceHigh` background, radius 16, label floats inside the field, a 2px iris underline-bar that grows from the center on focus. Error: ember bar + message.
- `Chip`: pill, `surfaceHighest` at rest; selected = primaryContainer + check icon that pops in.
- `Segmented`: a pill track in `surfaceHigh`; the selected segment is a **iris pill that slides** between options with a spring (no outline).
- `Toggle`: custom switch: track `surfaceHighest` → iris; the thumb is a small `cookie9` that becomes a circle when on.
- `Stepper`: two tonal 40 circles around a Space Grotesk number.

**Feedback**
- `WavyProgress` (new, replaces ProgressBar where it shows *ongoing* progress): an M3 Expressive-style wavy line. Iris wave for the done part, flat `surfaceHigh` line for the rest. Used in onboarding steps and long loading.
- `ProgressBar` stays for static values (macros in lists), but becomes 8px tall with full-pill ends.
- `ShapeLoader` (new, replaces spinners): a 40px shape that morphs `cookie9 → clover → softTriangle → burst → circle` while rotating. Used in buttons, "Building your plan", pull-to-refresh.
- `Toast`: floating pill above the dock, `surfaceHighest`, with a small colored shape icon on the left (iris cookie = success, ember burst = error).
- `Skeleton`: tiles and rows shimmer with a diagonal sheen (not a pulse).
- Empty states: a large tonal shape (e.g. pebble) with an icon inside, a `title`, and a one-line hint. No illustrations needed.
- `HelpNote`: `surface` pill-ish box (radius 20) with a iris `pebble` icon container.
- Notices (volume, warnings): `emberContainer` or `goldContainer` box, radius 20, colored icon in a small burst.

**Overlays**
- `Dialog`: `surfaceHigh`, radius 36, a 56px tonal shape with the icon on top, centered `title`, then **full-width stacked buttons** (primary on top, text button below). Scales in from 0.92 with a spring.
- `BottomSheet`: `surface`, top radius 36, grab handle 36×5. Spring slide with slight overshoot.
- `ActionMenu`: a floating rounded-28 menu anchored near the ⋮ button (not a bottom sheet) on tablets/web; bottom sheet on phones. Destructive rows in ember.

**Navigation chrome**
- **Floating tab dock**: a pill (height 64, radius full) floating 12 above the bottom safe area, `surfaceHighest` at 92% with a hairline border. The active tab gets a **iris pill indicator that stretches and slides** to the next tab (like a liquid blob, spring), with the icon in `onPrimary` and the label shown only for the active tab. Inactive icons are `textMuted`.
- `TabHeader`: `headline` title left, subtitle in `textMuted`, actions as tonal icon buttons. On scroll, the title collapses into a small centered title over an `ink` 90% bar.
- `PageHeader`: tonal back button (a 44 circle) + `title`.
- Transitions: keep the current ones, but use spring timing; shared-element feel for tile → detail (the tile scales into the page).

---

## 6. Signature components (the special stuff)

### 6.1 Fuel Bloom (replaces the 270° calorie gauge)
The hero of the Food tab. A **2×2 hero tile**, about 240px.
- The outline is a polar shape whose **spikiness shows how much you still have to eat**:
  - lots remaining → `burst` (energetic, "hungry")
  - closer to the goal → the lobes shrink smoothly (`depth` and `sharpness` interpolate toward 0)
  - goal reached (within ±5%) → perfect `circle`, a **Summit glow** blooms behind it, a heavy haptic fires, and the caption becomes "Summit reached".
  - over budget → morphs to `emberBurst` in ember.
- The progress stroke (14px, round caps) runs **along that shape's outline**, measured from the sampled points, so the progress traces the scallops. It is split into **meal segments** with 4px gaps (each segment = one meal, all iris, but each with a small meal-shape marker at its end).
- **Burned calories** appear as an ember extension past the goal ("you earned more fuel").
- Center: remaining kcal in `hero` (Space Grotesk 64), the word "left" in `label`, then "1 840 eaten · 320 burned" in `bodyS`.
- Inside the outline, a soft tonal `pebble` slowly "breathes" (scale 0.98 ↔ 1.0, 4s) unless reduce-motion.
- On open: the stroke draws in over 900ms, the number counts up, and the shape morphs from `circle` to its current state.

### 6.2 Macro columns (replaces the 3 macro bars)
A `2×1` tile with **three liquid columns** (Protein, Carbs, Fat), each a rounded-20 glass with a `WaveEdge` liquid surface filled with the macro color. The liquid level = progress. When food is logged, the liquid **sloshes** (wave amplitude spikes, then settles). Under each column: grams eaten in `displayS` + "/ 160 g" in `bodyS`. Over the goal, the column's rim turns ember.

### 6.3 Meal tiles (replaces the meal rows)
A 2-column grid of `1×1` tiles: the meal-shape container (§3.3) with its icon, the progress stroke traced around that shape, the meal name, and "420 / 600 kcal". A small iris `+` icon button in the corner. Tapping the tile opens the meal; the food lines move to the meal detail sheet.

### 6.4 Ridge week (replaces the week dots)
The weekly plan is drawn as a **mountain ridge line**: 7 points on one smooth path; training days are **peaks**, rest days are valleys. Completed peaks are filled iris with a small flag; today's peak pulses; missed ones are `textFaint`. Peaks rise one after another on mount.

### 6.5 Streak tile
A `cookie9` tile in gold tone: the week-streak number in `displayM`, label "WEEK STREAK". Every time the streak grows, the cookie gains a lobe animation (spins 1/9 turn with a spring) and a gold sparkle of tiny shapes.

### 6.6 Story rings
The rings become `cookie12` outlines (3px). The calorie progress is traced around the scallops. Seen stories turn `textFaint`. The ring slowly rotates while the user has an unseen story.

### 6.7 Live workout
- **Stats strip**: three small tiles (Duration, Volume, Sets) with Space Grotesk numbers.
- **Exercise card**: each exercise is a `surface` tile (radius 28). Name in `titleS` iris, ⋮ menu, plan note.
- **Set rows**: pills inside the card. Columns stay (SET · PREVIOUS · KG · REPS · ✓). Inputs are `surfaceHigh` radius-12 boxes with Space Grotesk numbers.
- **Set done**: the check box **morphs from a rounded square to a iris `cookie12`** with a check, the row fills `primaryContainer`, haptic confirm.
- **Set type badges**: W = gold soft circle, F = ember burst, D = iris clover.
- **Rest timer**: a floating `HeroButton`-sized pill above the dock: a iris **liquid fill that drains** from right to left as time passes, the time in `displayL`-sized Space Grotesk, plus −15 / +15 / Skip. At 0 → heavy haptic, the pill flashes iris.
- **Minimized workout**: a floating mini-player pill above the tab dock (live timer + current exercise + expand chevron), on every tab.
- **New PR**: a gold `burst` badge with "New PR" springs in on the set row, gold confetti of tiny shapes, and a goldContainer banner slides down from the top.

### 6.8 Workout summary / Finish
A full-screen celebration: a giant `softTriangle` (ascent arrow) in iris tone rises from the bottom, total volume in `hero`, then bento tiles (duration, sets, PRs in gold).

### 6.9 Charts
- **Bar chart** (workouts per week): full-pill bars; the current week is iris, past weeks `surfaceHighest`, the goal shown as a dashed line. Tapping a bar morphs it into a iris pill with a value bubble.
- **Line chart** (body weight): a smooth curve with a iris-to-transparent area fill; the latest point is a iris `cookie9` marker; the goal is a dashed gold line with a small flag.
- **Multi-line** (compare): people colors, 2.5px lines, the leader's line drawn on top and slightly thicker.

### 6.10 Feed
- Post card: rounded-24 image inside the gutter, author row above, action row below. The double-tap heart burst becomes a **heart that pops, then splits into small `like`-colored shapes**.
- Covers without a photo: a 1:1 tile with the cover gradient and the post's shape (meal shape or ascent triangle) huge and tonal in the background, the overline in iris, kcal in `displayL`, macro pills in their data colors at 16% tone.
- The daily race leaderboard: a podium of 3 shapes (gold cookie for #1, larger), then rows.

### 6.11 Profile
- Header: 84 avatar inside a `clover` ring, name in `headline`, handle in `textMuted`.
- Stats bento: Workouts (`circle` tile), Week streak (6.5, gold), Friends (`clover` tile).
- Dashboard buttons become a horizontal row of tonal tiles with shape icons.
- Post grid: 3 columns, 4px gaps, radius 12 per cell.

### 6.12 Onboarding and Welcome
- **Welcome**: the logo sits on a Summit glow; three shapes (`cookie9`, `clover`, `softTriangle`) rise and stack like steps next to the tagline. "Get started" is a `HeroButton`.
- **Onboarding**: `WavyProgress` at the top. ChoiceCards become tiles: when selected, their icon container morphs from `circle` into a iris `cookie9`, the tile fills `primaryContainer` and gets a 2px iris border.
- **Building your plan**: a large `ShapeLoader` in the center, and the 4 steps check off below it, each check being a small iris cookie.
- **Plan ready**: bento: calorie target (hero tile with a static Fuel Bloom preview), macro columns, ridge week, sessions list.

---

## 7. Motion

Use **springs, not durations**, for anything that moves or changes shape. Tokens (Reanimated `withSpring`):
| Token | damping | stiffness | Use |
|---|---|---|---|
| `spring.fast` | 22 | 420 | Press feedback, small icons, toggles |
| `spring.default` | 20 | 240 | Tiles, segmented pill, tab indicator |
| `spring.slow` | 24 | 140 | Big morphs (Fuel Bloom), sheets |
| `spring.bouncy` | 12 | 260 | Celebrations only (PR, goal reached, like) |

Opacity and color changes use plain timing (200ms, ease-out), never springs.

Keep the staggered "fade up" entrances (now 12px, 50ms stagger) and the count-up numbers. Keep all haptics (tick, confirm, reject, heavy).

**Reduce motion**: no breathing, no wave drift, no confetti, morphs become instant crossfades.

---

## 8. Icons

Keep Material Icons, but switch to the **Rounded** look where available (`MaterialIcons` with rounded names, or `MaterialCommunityIcons` rounded equivalents) and size 22 by default. Icons that sit inside shapes are 22–26 and colored with the shape's content color.

---

## 9. Accessibility

- Contrast: `text` on `ink` ≈ 18:1, `textMuted` on `surface` ≥ 6:1, `onPrimary` on `primary` ≈ 9:1, iris text on `surface` ≈ 8:1 (≥ 6.4:1 on every surface, 6.2:1 on `primaryContainer`). Keep every text pair at 4.5:1 or more.
- Shape changes always come with a text change ("12 left" → "Summit reached" → "180 over"). Never rely on shape or color alone.
- Touch targets ≥ 44.
- Respect reduce motion (§7) and font scaling (tiles grow in height, numbers may wrap to a second line rather than clip).

---

## 10. Voice

Unchanged: direct, positive, never pushy. A few new microcopy lines that go with the shapes: "Summit reached", "You earned 320 more", "Rest · 1:30", "New PR".
