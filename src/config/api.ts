import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const BACKEND_PORT = 5000;
export const API_PREFIX = '/api';
export const LAPTOP_LAN_IP = '192.168.31.239';
export const DEV_API_BASE_URL = `http://${LAPTOP_LAN_IP}:${BACKEND_PORT}${API_PREFIX}`;

/**
 * Determine API URL dynamically for Web, Android physical devices, and Android emulators.
 */
export function getApiBaseUrl(): string {
  // 1. Production remote API URL or explicit override via environment
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. Extra config from Expo configuration
  const configuredUrl = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl;
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  // 3. Web platform running on the laptop browser
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}${API_PREFIX}`;
  }

  // 4. Dynamically derive from Metro hostUri if connected over Expo Go / Dev Client on LAN
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:${BACKEND_PORT}${API_PREFIX}`;
    }
  }

  // 5. Physical Android phone / LAN fallback using laptop IPv4 address
  return DEV_API_BASE_URL;
}

export const API_BASE_URL = getApiBaseUrl();

