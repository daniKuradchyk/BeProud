import type { ExpoConfig } from 'expo/config';

const IS_DEV = process.env.APP_VARIANT === 'development';

const config: ExpoConfig = {
  name: IS_DEV ? 'BeProud (dev)' : 'BeProud',
  slug: 'beproud',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'beproud',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  runtimeVersion: { policy: 'appVersion' },
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#1F4E79',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: IS_DEV ? 'com.beproud.app.dev' : 'com.beproud.app',
    buildNumber: '1',
    infoPlist: {
      NSCameraUsageDescription:
        'BeProud usa la cámara para verificar tus tareas con foto y escanear códigos de barras de alimentos.',
      NSPhotoLibraryUsageDescription:
        'BeProud usa tu galería para subir fotos de tareas completadas.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: IS_DEV ? 'com.beproud.app.dev' : 'com.beproud.app',
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1F4E79',
    },
    permissions: [
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'READ_EXTERNAL_STORAGE',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-notifications',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        backgroundColor: '#1F4E79',
        resizeMode: 'contain',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'BeProud usa la cámara para verificar tareas y escanear códigos de barras.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'BeProud necesita acceso a tu galería para subir fotos de tareas.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '3d4937bd-76d8-481f-8301-da887fb27987',
    },
    router: {
      origin: false,
    },
  },
};

export default config;
