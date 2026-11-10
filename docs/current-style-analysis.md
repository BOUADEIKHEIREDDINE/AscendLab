# AscendLab — Current Visual Style (full description)

This document describes the **current** look and feel of the AscendLab app, so a designer (or another LLM) can say what to change. Every value below comes from the code on `main` (commit `4a95296`).

---

## 0. Context

- **Product:** AscendLab, a fitness + nutrition app. Tagline: **"Training made simple."** Brand identity name: **"Daily Ascent"** (energy, clarity, steady progress, nothing intimidating).
- **Active app:** `mobile/`, an **Expo / React Native** app (iOS, Android, Web). Stack: React Navigation 7 (native stack + bottom tabs), `react-native-svg` for charts, `expo-linear-gradient`, `expo-haptics`, `@expo/vector-icons`.
- **Legacy app:** `app/` is an older native Android (Kotlin) version. The Expo theme was copied from it. It is no longer the main target.
- **No UI library** (no NativeBase, Paper, Tamagui). Every component is hand-written with inline `style={{...}}` objects. No StyleSheet files, no styled-components, no Tailwind.
- **Where the style lives (important for making changes):**
  - `mobile/src/ui/theme.ts`: colors, semantic color roles, gutter, radii, type scale, avatar colors, `withAlpha()` helper.
  - `mobile/src/ui/components/core.tsx`: text, icons, buttons, headers, inputs, chips, toggles, segmented control, progress bar, skeletons, entry animations.
  - `mobile/src/ui/components/overlays.tsx`: dialog, bottom sheet, action menu, toast.
  - `mobile/src/ui/components/onboarding.tsx`: onboarding page frame + ChoiceCard.
  - `mobile/src/ui/components/charts.tsx`: Ring, BarChart, LineChart, MultiLineChart.
  - `mobile/src/ui/components/feed.tsx`: social post card, meal/workout "covers", race leaderboard.
  - `mobile/src/ui/components/plan.tsx`: calorie / macro / week summary blocks.
  - `mobile/src/ui/haptics.ts`: haptic feedback.
  - `mobile/src/navigation/AppNavigator.tsx`: tab bar style and page transitions.
  - `mobile/App.tsx` + `mobile/app.config.ts`: splash, status bar, dark-only setting.
  - The screens live in `mobile/src/ui/screens/{onboarding,home,train,food,profile}/`. They use the theme tokens, but they also contain a lot of inline layout values and a few hard-coded colors (see §11).

---

## 1. Overall personality

- **Dark-only.** No light mode. `userInterfaceStyle: 'dark'`, the status bar is light, and the window background is midnight blue everywhere (also on splash and web).
- **Calm, sporty, minimal.** Mostly flat. **No shadows, no elevation, no glassmorphism.** The only gradients are on social-post "covers".
- **"Content on the background, not in cards"** is an explicit rule written in `core.tsx`: *"content sits directly on the background, edge to edge, separated by hairlines and space, never boxed in cards. One clear primary action per screen."* Lists and sections are full-bleed rows separated by 0.5px hairlines. The few boxed surfaces are: choice cards in onboarding, dialogs, bottom sheets, the help note, the warm-up note and the volume notice.
- **Material Design 3 feel.** The naming (`onSurface`, `primaryContainer`, `surfaceContainerHigh`…), the type scale, the outlined text fields, the 28px-radius dialogs with text-button actions and the Material Icons all come from Android Material 3. On iOS it still looks like Material, apart from an iOS-style back chevron.
- **Inspirations in the layout:** the Home feed copies **Instagram** (stories row with rings, square edge-to-edge post images, heart/comment/send row, double-tap to like with a heart burst, 3-column profile grid, profile header with avatar + 3 stats). Training copies **Hevy** (routine list, live workout set table with Previous / kg / reps / ✓ columns, rest timer bar). Food copies **Yazio** (270° calorie gauge with Eaten / Remaining / Burned, macro bars, per-meal rings with a round + button).

---

## 2. Color palette

### Brand colors (`colors` in theme.ts)
| Token | Hex | Role |
|---|---|---|
| `midnightBlue` | `#101820` | Main background (every screen, tab bar, nav bar, splash) |
| `slateBlue` | `#1C2934` | Cards / surfaces (`surfaceContainer`), bottom sheets, help notes, inputs in the set table |
| `mintGreen` | `#75E2BE` | **Primary accent**: primary buttons, active tab, progress rings and bars, links, selected states, checkmarks |
| `softWhite` | `#F4F7FA` | Primary text |
| `lightGray` | `#A9B6C2` | Secondary text, inactive tab icons |
| `apricot` | `#FFB987` | Rare accent for **milestones and warnings**: "Setup complete" badge, PR banner, over-budget rings, warm-up set badge, volume notices, race winner |

### Derived colors
| Token | Hex | Use |
|---|---|---|
| `slateBlueRaised` | `#243441` | `surfaceContainerHigh`: dialogs, skeletons, progress tracks, pressed rows, disabled primary button |
| `mintOnSlate` | `#2E4E50` | `primaryContainer`: selected chips, segments and choice cards, tonal buttons, completed set rows, rest-timer bar |
| `outline` | `#3A4A58` | Hairlines, outlined buttons, input borders, tab bar top border |
| `outlineSubtle` | `#2A3844` | Unselected choice-card borders, chart grid lines, empty day dots |
| `error` | `#FF8A80` | Errors, destructive actions, "failure" set badge |
| `like` | `#FF5A6E` | Filled heart on liked posts |

### Semantic mapping (`c`, used by the components)
`background`=midnight, `onSurface`=softWhite, `onSurfaceVariant`=lightGray, `primary`=mint, `onPrimary`=midnight (dark text on mint buttons), `primaryContainer`=mintOnSlate, `surfaceContainer`=slate, `surfaceContainerHigh`=slateRaised, `outline`, `outlineVariant`, `error`, `tertiary`=apricot.

### Other palettes
- **Avatar backgrounds** (letter avatars, picked by hashing the uid): `#75E2BE`, `#FFB987`, `#8EC5FF`, `#E0A3FF`, `#FFE08A`, with the initial in `#101820`, bold.
- **Person colors for comparison charts** (checked for color-blind separation): `#199E70`, `#D95926`, `#3987E5`, `#C98500`, `#D55181`.
- **Macro colors** (Plan ready / planner): Protein = mint, Carbs = apricot, Fat = light gray.
- **Post cover gradients** (diagonal, top-left to bottom-right): meal `#1C3A3A → #101820 → #2A2420` (teal to brown); workout `#15302B → #101820 → #1C2934` (green to slate).
- **Scrims:** dialog `rgba(0,0,0,0.55)`, bottom sheet `rgba(0,0,0,0.45)`, comment/photo overlays `rgba(16,24,32,0.7–0.85)`. The Story viewer uses a pure black `#000` background with white text.

---

## 3. Typography

- **Font:** the system sans-serif (Roboto on Android, SF Pro on iOS, `Roboto, system-ui` on web). **No custom font is loaded.** The only exception is monospace for the friend code on the Friends screen.
- **Tabular numbers** (`fontVariant: tabular-nums`) on display, title and labelLarge styles, so calories, reps and timers line up.
- **Headings are bold (700).** Titles are semibold (600). Body text is regular.
- Scale (Material 3 sizes, with heavier weights than stock Material):

| Variant | Size / line height | Weight | Typical use |
|---|---|---|---|
| displayLarge | 56/64 | 700 | Calories on a meal cover |
| displayMedium | 44/52 | 700 | — |
| displaySmall | 36/44 | 700 | "Remaining" kcal in the gauge, big plan numbers |
| headlineLarge | 32/40 | 700 | — |
| headlineMedium | 28/36 | 700 | Tab titles ("Today", "Train", the user's name), onboarding titles |
| headlineSmall | 24/32 | 700 | Dialog titles, body weight value |
| titleLarge | 22/28 | 700 | Sub-page titles, program name, side numbers, profile stats |
| titleMedium | 16/24 | 600 | Section titles, row titles, primary button label |
| titleSmall | 14/20 | 600 | Author names, small headings |
| bodyLarge | 16/24 | 400 | Subtitles, input text, menu items |
| bodyMedium | 14/20 | 400 | Default text |
| bodySmall | 12/16 | 400 | Secondary details, hints |
| labelLarge | 15/20 | 600 | Button labels, chips, kcal values |
| labelMedium | 12/16 | 500 | Field labels, tab labels, small captions |
| labelSmall | 11/16 | 500 | Timestamps, badges ("Up next") |

- Text is always **sentence case**. The only uppercase text is the small mint overline on covers ("WORKOUT", "BREAKFAST", 2px letter spacing) and the column headers of the workout set table (SET, PREVIOUS, REPS).
- The text color hierarchy uses only two levels: softWhite (primary) and lightGray (secondary). Mint marks interactive or positive text, apricot marks milestones and warnings.

---

## 4. Spacing, shape, sizing

- **Gutter:** one horizontal page margin of **20px** (`Gutter`) for tab pages and lists. Onboarding pages use **24px**, the Building-plan screen 32px.
- **Radii scale:** `xs 8, sm 12, md 20, lg 24, xl 32`. In practice:
  - Primary button: height 56, **fully pill-shaped (radius 28)**.
  - Secondary buttons: radius 24 (pill), min height 48 (36 when compact, 40 for text buttons).
  - Chips: height 34, **radius 10** (a rounded rectangle, not a pill).
  - Segmented control: pill (radius 24), 44 tall, outlined.
  - Text fields: **radius 8**, min height 56, outlined.
  - Choice cards: radius 20. Dialogs: radius 28. Bottom sheets: top corners 28. Help, warm-up and notice boxes: radius 12. Story image: 16. Exercise photos: 12.
  - Badges ("Up next", "Setup complete", macro chips on covers): radius 999 (pill).
  - Profile dashboard buttons: outlined, radius 20.
- **Hairlines:** 0.5px `#3A4A58`, full width or inset by the gutter (or more, to line up with the text in meal rows).
- **Touch targets:** icon buttons are 44×44 circles; the pressed state fills them with slate.
- **Section rhythm:** `SectionTitle` has 20px top padding, 4px bottom padding, titleMedium text, and an optional text button on the right.
- **Avatars:** circles with a colored background and the initial letter. 34 in the feed, 60 in stories (inside a 72 ring), 76 on the profile.

---

## 5. Iconography

- **Material Icons** (filled/outlined Google set) through `@expo/vector-icons`, plus some **Material Community Icons** (`mc:` prefix, e.g. trophy-outline, comment-outline).
- Default size 24, color softWhite. Inactive icons are lightGray, active ones mint.
- Tab icons: `home`, `fitness-center`, `restaurant`, `person`.
- Meal icons: `free-breakfast`, `lunch-dining`, `dinner-dining`, `cookie`.
- Icons sometimes sit in **44px mint-tinted circles** (`primaryContainer` background, mint icon), e.g. the Welcome "promises", and in 48px slate circles inside choice cards.
- No custom illustrations. The only brand image is the **logo PNG** (a geometric "A" with step cut-outs + the "AscendLab" wordmark, mint and white), used on the splash, Welcome and the Home header.

---

## 6. Components (what they look like now)

**Buttons**
- `PrimaryButton`: full width, 56px tall pill, **mint background, midnight text** (titleMedium), optional 20px icon. When disabled: slateRaised background with gray text. While loading: a spinner. Shrinks to 0.97 when pressed (spring).
- `Button` (secondary), with 4 kinds: **outline** (1px `#3A4A58` border, white text), **tonal** (mintOnSlate background, mint text), **text** (no background, mint text), **filled** (mint background, midnight text). Pressed = 70% opacity, disabled = 38%.
- `IconButton`: 44px circle, transparent; turns slate when pressed.

**Headers**
- `TabHeader` (root of each tab): large left-aligned **headlineMedium** title, optional gray subtitle (e.g. the date), action icons on the right. No app bar background.
- `PageHeader` (sub-pages): back arrow (`arrow-back` on Android, `arrow-back-ios-new` on iOS) + titleLarge title + optional actions.
- Home has no title. It shows the **logo** on the left and three icons on the right (add meal, trophy, add friend).

**Inputs**
- `TextField`: Material **outlined** field. The label sits *above* the box (labelMedium, gray, or mint when focused). The border is 1px gray, 2px mint when focused, 2px coral on error. Optional suffix (kg, cm…) and a hint or error line below.
- `Chip`: outlined rounded rectangle. When selected it gets a mintOnSlate fill, mint text and a ✓ icon.
- `Segmented`: an outlined pill split into equal segments. The selected one gets a mintOnSlate fill, mint text and a ✓.
- `Toggle`: the native Switch, mint track when on.
- `Stepper`: "− 3 +".
- Workout `NumberBox`: centered titleSmall number on a slate background with radius 8.

**Selection cards (onboarding)**
- `ChoiceCard`: slate box, radius 20, 1px subtle border. When selected: 2px mint border, mintOnSlate fill, a mint `check-circle` in the top-right corner and a small bounce. There are two layouts: a horizontal row (48px icon circle + title + description) and a "tall" layout (56px icon centered above the title).

**Feedback**
- `HelpNote`: slate box, radius 12, mint `info-outline` icon + gray text.
- `VolumeNoticeNote`: slateRaised box with a **3px apricot left border**.
- `ErrorText`: coral icon + coral text.
- `Toast`: an **inverted** pill (softWhite background, midnight text, radius 24), centered near the bottom, fades in and out, lasts 2.5s.
- Skeleton loaders: slateRaised blocks that pulse between 50% and 100% opacity, shaped like the content that is loading.
- Empty states: plain centered text (a titleMedium heading + a gray line). No illustrations.

**Overlays**
- `Dialog`: centered, slateRaised background, radius 28, 24px padding, max width 520. Optional centered icon, headlineSmall title, and **text-button actions aligned right** (destructive ones in coral). Fades in.
- `BottomSheet`: slides up, slate background, top radius 28, a small 32×4 grab handle, max 80% height.
- `ActionMenu` ("⋮" menus): bottom-sheet list. Each row is 52px tall with a gray icon and bodyLarge text; destructive rows are coral.

**Badges / pills**
- "Up next": mint pill with midnight labelSmall text.
- "Setup complete": apricot pill with a trophy icon and midnight text.
- Set type badges: plain numbers for normal sets; **W** (apricot), **F** (coral) and **D** (mint) for warm-up, failure and drop sets.
- PR banner: a full-width apricot strip at the top of the workout with a trophy icon and midnight text.

**Data visualisation (react-native-svg)**
- `Ring`: circular or arc progress, round caps, slateRaised track, mint fill (apricot when over the goal). Animates in over 900ms.
  - Food: a **168px 270° gauge** (12px stroke) with the remaining kcal (displaySmall) in the center, plus 56px rings around each meal icon.
  - Stories: 72px rings, 3px stroke. They fill with today's calories versus the goal and turn gray once seen.
- `ProgressBar`: slim 6px pill (8px in onboarding), slateRaised track, mint fill, glides to its value.
- `BarChart` (workouts per week), `LineChart` (body weight), `MultiLineChart` (compare with friends): minimal, three faint horizontal grid lines, no axes boxes. Tapping shows a value or a crosshair. A left-to-right "reveal" animation runs on load.
- Week dots (plan): circles per day, mint fill when it's a training day, otherwise a subtle outline. They pop in one by one.

**Social / feed**
- `PostCard`: author row (34px avatar, name, "Workout" or meal type, `more-horiz`), then a **square, edge-to-edge picture**, then an action row (heart `favorite-border` / filled `#FF5A6E` with a spring bounce, comment, send). The kcal + protein summary sits on the right in mint. Below: like count, a caption with the name in bold, "View all N comments", and the time ago in labelSmall gray.
- **Covers**, used when a post has no photo: a diagonal dark gradient, a mint uppercase overline, giant white numbers (56px kcal for meals), white-at-70% labels and translucent white macro pills (12% white). Workout covers show the title, a time / volume / sets / records row (records in apricot) and up to 4 exercise lines.
- Stories viewer: black background, segmented white progress bars at the top, the image in a rounded 16px frame, white text.
- Profile: a 76px avatar + 3 stats (workouts, week streak, friends), a row of 4 outlined "dashboard" buttons (mint icon + mint label), then sections, then a **3-column post grid** with 2px gaps.

**Workout session (full-screen mode)**
- Opens by **sliding up from the bottom** (other pages slide in from the right). Top bar: a chevron-down to minimize, the title, and a mint "Finish" filled button.
- Stats row (duration / volume / sets) in labelMedium + titleMedium.
- Each exercise: name in **mint titleMedium** (it is a link), a `more-vert` menu, a gray plan note line, and a column header row in labelSmall gray: SET, PREVIOUS, the weight unit (kg/lb, or +kg for bodyweight lifts), REPS, and an unlabeled ✓ column.
- Set rows: when done, the row background turns **mintOnSlate** and the check box becomes a solid mint 30px square (radius 8) with a midnight check. When not done, the box is slateRaised with a gray check, scaled to 0.9.
- Rest timer: a full-width mintOnSlate bar with a mint timer icon, "Rest 1:30" and −15 / +15 / Skip text buttons.

---

## 7. Navigation chrome

- **Bottom tab bar** with 4 tabs: Home, Train, Food, Profile. Background = page background (`#101820`), a 0.5px top hairline, no elevation. Active tab = mint, inactive = lightGray. Labels 12px semibold. A light haptic tick on tab press.
- No top app bars. Headers are part of the page content and scroll with it.
- Transitions: `slide_from_right` for pushed pages, `fade` for Welcome, the main tabs and the Story viewer, `slide_from_bottom` for the live workout.

---

## 8. Motion & haptics (a strong part of the current feel)

- `Appear`: content **fades in and slides up 16px** over 420ms (cubic ease-out), **staggered 60ms per item**, so pages build from top to bottom. Used on onboarding, Welcome and Plan ready.
- `PressableScale`: tappable rows and cards **shrink to 97%** with a spring and give a haptic tick.
- `CountingNumber`: calorie numbers **count up** over 1.2s.
- Progress bars and rings glide to their values (700–900ms). The macro bars fill one after another (250ms apart).
- ChoiceCard: a small squash-and-bounce when selected.
- Welcome: the logo fades and scales from 85% to 100%, then **three mint "steps" rise** next to the tagline with a staggered spring (a nod to the logo).
- "Building your plan" screen: 4 lines tick off one by one (gray dot, then spinner, then a mint check circle).
- Feed: double-tap shows a big white **heart burst**. The like heart springs to 115%.
- Skeletons pulse. Toasts fade.
- Haptics: `tick` (selection), `confirm` (success: like, set done, saved), `reject` (error), `heavy` (rest over, new record).
- On the exercise animation, reduce-motion is respected (the two photos are shown side by side instead of alternating).

---

## 9. Layout patterns per screen

- **Welcome:** vertically centered. Logo (72% width), mint tagline + rising steps, a gray intro sentence, 3 "promise" rows (mint circle icon + title + gray text). Pinned at the bottom: "Get started" primary button + a "I already have an account" text button.
- **Sign up / Log in:** back arrow, headlineMedium title + gray subtitle, outlined fields, an "or" divider made of hairlines, a Google button (52 tall), the primary button.
- **Onboarding questions (3 steps):** `OnboardingScaffold`. Top: back arrow + an **8px mint progress bar** + "Step X of 3". Then a title (headlineMedium) + a gray subtitle, scrolling content (choice cards, segmented controls, fields, help notes), and **one pinned primary button** at the bottom.
- **Plan ready:** the same frame, an apricot "Setup complete" pill, then flat sections separated by hairlines (calorie number with a reason, macro bars, week dots + session list).
- **Home:** logo header + icons, a stories row, a hairline, an optional "Find your friends" row, then the Instagram-style feed. The trophy opens a bottom sheet with the daily race leaderboard (rank 1 in apricot).
- **Train:** "Train" header, an in-progress workout row (mint dot + Resume), an outlined "Start empty workout" button, the program name as a titleLarge dropdown, a "+ Routine" text button, then routine rows (name, "Up next" pill, gray exercise list, a Start button that is filled for the next routine and tonal for the others, a ⋮ menu), then History.
- **Food ("Today"):** date subtitle, Summary (Eaten | 270° gauge | Burned), 3 macro bars, then Meals: 4 rows, each with a ring around the meal icon, the meal name, "x / y kcal" and a **solid mint 44px + circle**. Food lines are indented under each meal.
- **Profile:** a social-profile header, dashboard buttons, a bar chart, the weight line chart, the goal row, the post grid.
- **Settings / Edit goals / Programs / Routine editor / Exercise library / Statistics / Calendar / Compare / Friends / Comments / Create post:** PageHeader + flat lists with hairlines, using the same components.

---

## 10. Voice in the UI (affects the copy that sits in the design)

Direct, positive, inclusive, never pushy. Short sentence-case labels ("Let's start", "Log today's weight", "Tick a set first"). Explanations are friendly ("Small steps, every week, at your own pace"). Progress is always shown with **numbers + labels**, never with color alone (check marks and text labels go with the colors).

---

## 11. Inconsistencies / technical debt worth knowing before a restyle

1. **Styles are inline everywhere.** Changing the look means editing `theme.ts` + the shared components *and* many screen files. Paddings like 12/14/16/24 and radii like 8/12/16 are often hard-coded instead of using the `radius` tokens.
2. **Hard-coded colors outside the theme:** `#FFFFFF` and white-with-alpha on covers and stories, the gradient stops `#1C3A3A`, `#2A2420`, `#15302B` (in `feed.tsx` **and** duplicated in `ProfileScreen.tsx`), `#101820` written directly in Avatar, `#000` for stories, `#fff` behind exercise photos, and some rgba scrims.
3. **The theme is described as "dark-only"**, so nothing is ready for a light mode. Adding one would need the theme to become dynamic (a context or hook) instead of the static `c` object.
4. **No custom font is loaded.** It relies on system fonts, so iOS and Android look slightly different.
5. **The Material-only look on iOS:** Material icons, Android-style dialogs (text buttons on the right) and the Android Switch thumb colors, even on iOS.
6. Some Android-era naming is left over: `javaHash` is used so avatar colors match the old Kotlin app.
7. The README screenshots (`docs/screenshots/`) are from the older Android build and don't show the current Expo UI.

---

## 12. One-paragraph summary

AscendLab today is a **dark-only, Material-3-flavored, flat, minimal** fitness app. It uses a **midnight blue background (#101820)**, **slate surfaces (#1C2934)**, a single **mint green accent (#75E2BE)** for every action and progress indicator, and a rare **apricot (#FFB987)** for milestones and warnings. Text is the bold system sans-serif with tabular numbers, in soft white and light gray. Layout is **edge to edge, without cards**: sections are separated by 0.5px hairlines with a 20px side margin. Buttons are pills (a 56px mint primary button, one per screen), and inputs are outlined Material fields. Data is shown with mint rings, arcs and slim bars. The social feed copies Instagram, training copies Hevy and the food diary copies Yazio. The app feels lively through staggered fade-up entrances, press-to-shrink springs, counting numbers and haptics. All styling is inline React Native style objects driven by `mobile/src/ui/theme.ts` and the shared components in `mobile/src/ui/components/`.
