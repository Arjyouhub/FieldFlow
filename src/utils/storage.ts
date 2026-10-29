import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fieldflow_staff_token';
const USER_KEY = 'fieldflow_staff_user';

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[Storage] setItemAsync failed for ${key}:`, err);
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[Storage] getItemAsync failed for ${key}:`, err);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[Storage] deleteItemAsync failed for ${key}:`, err);
  }
}

export async function saveAuthSession(token: string, user: any) {
  await setItem(TOKEN_KEY, token);
  await setItem(USER_KEY, JSON.stringify(user));
}

export async function getAuthSession(): Promise<{ token: string | null; user: any | null }> {
  const token = await getItem(TOKEN_KEY);
  const userJson = await getItem(USER_KEY);
  let user = null;
  if (userJson) {
    try {
      user = JSON.parse(userJson);
    } catch {}
  }
  return { token, user };
}

export async function clearAuthSession() {
  await removeItem(TOKEN_KEY);
  await removeItem(USER_KEY);
}
