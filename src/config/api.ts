import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Determine API URL dynamically for Web, Android Emulator, and Physical Devices over Expo Go/LAN.
 */
function getApiBaseUrl(): string {
  // Support production remote API URL via environment or Expo extra config
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  const configuredUrl = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }

  // Android emulator loopback alias
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
}

export const API_BASE_URL = getApiBaseUrl();
