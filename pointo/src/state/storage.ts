import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { MissionId } from '../data/missions';

const LEDGER_KEY = 'pointo:ledger:v1';
const TOKEN_KEY = 'pointo.authToken';
const TOKEN_WEB_FALLBACK_KEY = 'pointo:authToken:webFallback';

/**
 * Versioned snapshot of all non-secret state persisted across launches.
 * `version` is reserved for future migrations.
 */
export type LedgerSnapshot = {
  version: 1;
  isLoggedIn: boolean;
  name: string;
  phone: string;
  points: number;
  completedMissionIds: MissionId[];
};

export async function loadLedger(): Promise<LedgerSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LedgerSnapshot>;
    if (parsed?.version !== 1) return null;
    return parsed as LedgerSnapshot;
  } catch (err) {
    if (__DEV__) console.warn('[pointo] loadLedger failed', err);
    return null;
  }
}

export async function saveLedger(snapshot: LedgerSnapshot): Promise<void> {
  try {
    await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(snapshot));
  } catch (err) {
    if (__DEV__) console.warn('[pointo] saveLedger failed', err);
  }
}

export async function clearLedger(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LEDGER_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[pointo] clearLedger failed', err);
  }
}

/**
 * Auth-token storage. Uses SecureStore on iOS/Android (Keychain / Keystore)
 * and AsyncStorage on web (Keychain is unavailable in browsers — this is a
 * development convenience only; for production web you should authenticate
 * via httpOnly cookies on the backend instead of storing a token client-side).
 */
export async function loadAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(TOKEN_WEB_FALLBACK_KEY);
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[pointo] loadAuthToken failed', err);
    return null;
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(TOKEN_WEB_FALLBACK_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED,
    });
  } catch (err) {
    if (__DEV__) console.warn('[pointo] saveAuthToken failed', err);
  }
}

export async function clearAuthToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(TOKEN_WEB_FALLBACK_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[pointo] clearAuthToken failed', err);
  }
}
