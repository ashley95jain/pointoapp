/**
 * Lightweight AsyncStorage wrapper for the user's notification toggles.
 * Lives in its own module so AppState doesn't need to know about the
 * storage key shape.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'pointo:notification-prefs:v1';

export type StoredNotificationPrefs = {
  walkEveningReminder: boolean;
  streakMorningReminder: boolean;
  rewardAlerts: boolean;
};

export async function loadNotificationPrefs(): Promise<StoredNotificationPrefs | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.walkEveningReminder === 'boolean' &&
      typeof parsed.streakMorningReminder === 'boolean' &&
      typeof parsed.rewardAlerts === 'boolean'
    ) {
      return parsed as StoredNotificationPrefs;
    }
    return null;
  } catch (err) {
    if (__DEV__) console.warn('[pointo] loadNotificationPrefs failed', err);
    return null;
  }
}

export async function saveNotificationPrefs(
  prefs: StoredNotificationPrefs,
): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    if (__DEV__) console.warn('[pointo] saveNotificationPrefs failed', err);
  }
}

export async function clearNotificationPrefs(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFS_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[pointo] clearNotificationPrefs failed', err);
  }
}
