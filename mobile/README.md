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
└── ui/          # Theme ("Daily Ascent"), shared components, screens per tab
```

## Differences from the Android app

- **Offline:** the Firebase JS SDK keeps its cache in memory, so writes made offline are synced while
  the app stays open but are lost if it is closed before reconnecting. Your profile and a workout in
  progress are still saved on the device.
- **Menus** (⋮) open as bottom sheets, and confirmations use a small toast, on every platform.
