/// <reference types="node" />
import { existsSync } from 'fs';
import { ExpoConfig } from 'expo/config';

// Firebase config files (not committed, like ../app/google-services.json). Download them
// from the Firebase console > Project settings > Your apps, and drop them in this folder.
const androidServices = existsSync('./google-services.json') ? './google-services.json' : undefined;
const iosServices = existsSync('./GoogleService-Info.plist') ? './GoogleService-Info.plist' : undefined;

const config: ExpoConfig = {
  name: 'AscendLab',
  slug: 'ascendlab',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // The brand is dark-only.
  userInterfaceStyle: 'dark',
  backgroundColor: '#101820',
  scheme: 'ascendlab',
  ios: {
    bundleIdentifier: 'com.ascendlab.app',
    supportsTablet: true,
    googleServicesFile: iosServices,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.ascendlab.app',
    googleServicesFile: androidServices,
    adaptiveIcon: {
      backgroundColor: '#101820',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, backgroundColor: '#101820' }],
    ['expo-image-picker', {
      photosPermission: 'AscendLab uses your photos so you can add a picture to a meal or a comment.',
      cameraPermission: 'AscendLab uses the camera so you can take a picture of your meal.',
      microphonePermission: false,
    }],
    'expo-system-ui',
    // Google sign-in needs the Firebase config files (it reads the client ids from them).
    ...(androidServices || iosServices ? ['@react-native-google-signin/google-signin'] : []),
  ],
};

export default config;
