# AscendLab (Expo: iOS, Android, web)

The cross-platform version of AscendLab, built with Expo and React Native. It is a full port of the
Kotlin app in `../app`, with the same features, design and Firebase project, so accounts, profiles,
posts, friends and workouts are shared between both apps.

## Run it

```bash
cd mobile
npm install
cp .env.example .env.local   # then fill it in (see below)
npx expo start
```

- **iPhone or Android phone:** for email sign-in, install **Expo Go** and scan the QR code.
  Google sign-in needs a development build (see below).
- **Web:** press `w`.

### Firebase config

`.env.local` holds the Firebase web config (`EXPO_PUBLIC_FIREBASE_*`). The Android values are in
`../app/google-services.json`. For iOS, register an iOS app (bundle id `com.ascendlab.app`) in the
Firebase console, download `GoogleService-Info.plist` into this folder, and put its `CLIENT_ID` in
`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Neither the env file nor the Firebase config files are committed.

### Google sign-in

Google sign-in uses a native module, so it only works in a **development or store build**, not in
Expo Go or on the web (the button is hidden there):

```bash
npx eas-cli@latest build --profile development --platform ios      # or android
```

On Android, add the SHA-1 of the build's signing key to the Firebase Android app, as for the Kotlin app.

### Local emulator

```bash
# from the repo root
npx firebase-tools emulators:start --only auth,firestore
# in mobile/
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true npx expo start
```

Test accounts for the emulator are listed in `e2e/emulator-accounts.json`. On a real phone, also set
`EXPO_PUBLIC_EMULATOR_HOST` to your computer's LAN IP.

### Quick local demo (no Firebase keys needed)

Runs the whole app against the local emulator, filled with demo data. Needs Java 17+ for the emulator.

```bash
# 1. from the repo root: start the emulator (add --config with another Firestore port if 8080 is taken)
npx firebase-tools emulators:start --only auth,firestore --project ascendlab-def55
# 2. in another terminal, from the repo root: fill it with demo data
python3 scripts/seed_demo.py          # FIRESTORE_EMULATOR_PORT=8085 python3 ... if you changed the port
# 3. in mobile/: create .env.local with the values below, then start the web app and open http://localhost:8081
npx expo start --web
```

`.env.local` for the demo: `EXPO_PUBLIC_FIREBASE_API_KEY=demo-key`, `EXPO_PUBLIC_FIREBASE_PROJECT_ID=ascendlab-def55`,
`EXPO_PUBLIC_FIREBASE_APP_ID=demo-app`, `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` (and
`EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT=8085` if you changed the port). Log in with `demo@ascendlab.test` / `demo-ascend-2026`.

## Food database: Open Food Facts

The Food tab opens with a search bar (with barcode and photo beside it). "Log a meal" puts the ways to add food
in a row on top (Barcode, Photo, Quick add, Recipes) and the search field below as the main element. It can search [Open Food Facts](https://openfoodfacts.org), the free food database, by product name
or barcode. Picking a food and its grams fills in the calories and macros (still editable). The code is in
`src/data/openFoodFacts.ts` and `src/ui/components/foodSearch.tsx`. The API allows about 10 searches a minute,
so the app only searches when the user submits, and retries twice when the server is busy.

## Meal plan ("Plan my day")

No dishes are suggested until the person asks. Home and the Food tab offer **Plan my day** (or "Not today").
The goal is the one set in onboarding (not asked again); the person picks the meals to plan, a cooking time, a budget and a diet; the planner
(`src/data/mealPlanner.ts`) picks dishes and sets each portion in quarter servings so calories, protein, carbs
and fat land within 10% of the targets. The plan's dishes are then kept (`src/data/dayPlanRepo.ts`, on the device):
swapping one ("Another idea" only offers dishes that keep the day on target), picking another recipe or removing a
dish re-sets every portion so the day stays balanced. With a plan, the Food tab lists the plan's meals; tapping one
shows its macros and recipe and logs it in one tap. Simulations in `src/data/__tests__/mealPlanner.test.ts` check
this for four bodies and all five goals.

## Recipes

Food → **Recipes** lists 70 recipes (`src/data/recipes.ts`) to filter by goal, meal, time, budget and diet. A recipe's
page shows its ingredients, seasoning and steps, and **Log** opens "Log a meal" already filled in.

- **Nutrition** is never typed in: each ingredient has its Ciqual values (Anses) per 100 g, and the recipe adds them up.
- **Prices** are average French supermarket prices per kilo (estimates), giving a cost per serving: € under €2,
  €€ €2 to €4, €€€ over €4.
- **Goals** follow fixed rules on a serving's numbers (`goalsFor`), so "Lose weight" always means the same thing.
- A summary table of all recipes is in [`docs/recipes.csv`](../docs/recipes.csv).

## Checks

```bash
npm run typecheck
npm run lint
npm test          # plan, body checks, records, feed: same results as the Android unit tests
```

## Structure

```
src/
├── data/        # Models and Firebase repositories (ported 1:1 from app/.../data)
├── lib/         # Firebase setup, small observable store, error messages
├── state/       # Onboarding draft and session helpers
├── navigation/  # Pages, params, tab stacks
└── ui/          # Theme ("Ascent Expressive"), shapes, shared components, screens per tab
```

## Differences from the Android app

- **Offline:** the Firebase JS SDK keeps its cache in memory, so writes made offline are synced while
  the app stays open but are lost if it is closed before reconnecting. Your profile and a workout in
  progress are still saved on the device.
- **Menus** (⋮) open as bottom sheets, and confirmations use a small toast, on every platform.
