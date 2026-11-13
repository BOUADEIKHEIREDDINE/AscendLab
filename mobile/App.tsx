import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthRepository } from './src/data/authRepo';
import { ProfileRepository } from './src/data/profileRepo';
import { TrainRepository } from './src/data/trainRepo';
import { auth } from './src/lib/firebase';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Onboarding, StartPage, startFor } from './src/state/session';
import { ToastHost } from './src/ui/components/overlays';
import { palette, ThemeProvider } from './src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
// The app is always dark, so the window behind every page is ink (no white flashes).
SystemUI.setBackgroundColorAsync(palette.ink).catch(() => undefined);

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: palette.ink, card: palette.ink, primary: palette.primary, text: palette.text, border: palette.outline },
};

/** Where to start: Welcome, Home, or back into onboarding for someone who stopped halfway. */
async function decideStart(): Promise<StartPage> {
  await auth.authStateReady();
  if (!AuthRepository.isSignedIn) return 'Welcome';
  // The device copy usually answers instantly; a new phone needs a network check.
  const profile = (await ProfileRepository.cached()) ?? (await ProfileRepository.load());
  await TrainRepository.restoreActive();
  if (profile && !profile.onboardingComplete) Onboarding.resumeFrom(profile);
  return startFor(profile);
}

export default function App() {
  const [start, setStart] = useState<StartPage | null>(null);
  // Space Grotesk for numbers and display, Inter for UI text. If loading fails we still
  // start (the system font stands in) rather than keep the splash up forever.
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold,
  });
  const fontsReady = fontsLoaded || fontError != null;

  useEffect(() => {
    decideStart().then(setStart).catch(() => setStart('Welcome'));
  }, []);
  useEffect(() => {
    if (start && fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [start, fontsReady]);

  return (
    // Swipe gestures (swipe a set left to delete it) need the gesture root around the whole app.
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.ink }}>
    <ThemeProvider>
    <SafeAreaProvider style={{ backgroundColor: palette.ink }}>
      <StatusBar style="light" />
      {start == null || !fontsReady ? (
        <View style={{ flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('./assets/logo.png')} style={{ width: '60%', height: undefined, aspectRatio: 1200 / 219 }} resizeMode="contain" accessibilityLabel="AscendLab" />
        </View>
      ) : (
        <NavigationContainer theme={navTheme}>
          <AppNavigator start={start} />
        </NavigationContainer>
      )}
      <ToastHost />
    </SafeAreaProvider>
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
