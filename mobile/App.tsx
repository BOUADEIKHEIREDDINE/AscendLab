import React, { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthRepository } from './src/data/authRepo';
import { ProfileRepository } from './src/data/profileRepo';
import { TrainRepository } from './src/data/trainRepo';
import { auth } from './src/lib/firebase';
import { AppNavigator } from './src/navigation/AppNavigator';
import { Onboarding, StartPage, startFor } from './src/state/session';
import { ToastHost } from './src/ui/components/overlays';
import { c } from './src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
// The app is always dark, so the window behind every page is midnight blue (no white flashes).
SystemUI.setBackgroundColorAsync(c.background).catch(() => undefined);

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: c.background, card: c.background, primary: c.primary, text: c.onSurface, border: c.outline },
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

  useEffect(() => {
    decideStart().then(setStart).catch(() => setStart('Welcome'));
  }, []);
  useEffect(() => {
    if (start) SplashScreen.hideAsync().catch(() => undefined);
  }, [start]);

  return (
    <SafeAreaProvider style={{ backgroundColor: c.background }}>
      <StatusBar style="light" />
      {start == null ? (
        <View style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={require('./assets/logo.png')} style={{ width: '60%', height: undefined, aspectRatio: 1200 / 219 }} resizeMode="contain" accessibilityLabel="AscendLab" />
        </View>
      ) : (
        <NavigationContainer theme={navTheme}>
          <AppNavigator start={start} />
        </NavigationContainer>
      )}
      <ToastHost />
    </SafeAreaProvider>
  );
}
