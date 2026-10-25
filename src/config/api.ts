import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const BACKEND_PORT = 5000;
export const API_PREFIX = '/api';

/**
 * Verified live production HTTPS backend deployed on Render.
 * All production builds must use HTTPS to comply with Android Network Security Policy.
 */
export const PRODUCTION_API_URL = 'https://fieldflow-bmg2.onrender.com/api';

/**
 * Determine API URL dynamically for Web, Android, and iOS.
 * Production builds always resolve to the secure HTTPS production API.
 */
export function getApiBaseUrl(): string {
  // 1. Explicit override via EXPO_PUBLIC_API_URL environment variable
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    const sanitizedEnvUrl = envUrl.replace(/\/$/, '');
    // In production builds, block insecure cleartext HTTP to prevent Android network security crashes
    if (!__DEV__ && sanitizedEnvUrl.startsWith('http://') && !sanitizedEnvUrl.includes('localhost') && !sanitizedEnvUrl.includes('127.0.0.1')) {
      console.warn('[FieldFlow Network] Insecure HTTP URL detected in production build. Enforcing secure HTTPS production URL.');
      return PRODUCTION_API_URL;
    }
    return sanitizedEnvUrl;
  }

  // 2. Extra config from Expo configuration (e.g. app.json / app.config.js extra.apiUrl)
  const configuredUrl = (Constants.expoConfig?.extra as Record<string, string> | undefined)?.apiUrl?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  // 3. In production or release build, always default to the verified HTTPS production URL
  if (!__DEV__) {
    return PRODUCTION_API_URL;
  }

  // 4. Web platform running in local browser during development
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}${API_PREFIX}`;
  }

  // 5. Metro hostUri derived from active LAN connection in development mode only
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:${BACKEND_PORT}${API_PREFIX}`;
    }
  }

  // 6. Final fallback default: use production HTTPS backend
  return PRODUCTION_API_URL;
}

export const API_BASE_URL = getApiBaseUrl();
