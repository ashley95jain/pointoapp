/**
 * Push + local notifications via expo-notifications.
 *
 * Two distinct flows:
 *
 *   1. Remote pushes — the device registers with APNs / FCM via Expo's
 *      push-notification service, gets back an Expo push token, and the
 *      app's backend stores it against the user id so it can later
 *      target campaigns / streak nudges. The actual delivery happens
 *      server-side via https://exp.host/--/api/v2/push/send.
 *
 *   2. Local notifications — the app schedules in-app reminders directly
 *      (e.g. a 6pm "you have only N steps today" nudge). No backend
 *      required; these survive app kill as long as the OS holds the
 *      schedule.
 *
 * Both are gated behind a single OS permission prompt.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationPermission =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type ReminderKind = 'walk-evening' | 'streak-morning';

const REMINDER_IDENTIFIERS: Record<ReminderKind, string> = {
  'walk-evening': 'pointo.reminder.walk-evening',
  'streak-morning': 'pointo.reminder.streak-morning',
};

/**
 * Configure how notifications behave when the app is foregrounded. We
 * surface them as in-app banners so a reward-credit nudge fired by the
 * server isn't silently dropped while the user is staring at the app.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export async function getPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') return 'unsupported';
  if (!Device.isDevice) {
    // Simulators / emulators don't get real push tokens, but local
    // notifications still work. Treat them as "supported, unknown".
    const { status } = await Notifications.getPermissionsAsync();
    return mapStatus(status);
  }
  const { status } = await Notifications.getPermissionsAsync();
  return mapStatus(status);
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') return 'unsupported';
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  // Set up the default Android channel only after permission is granted —
  // Android requires the channel to exist before the first delivery.
  if (status === 'granted' && Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Pointo',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F4C81',
    });
  }
  return mapStatus(status);
}

/**
 * Returns the Expo push token, or null if the device can't receive
 * remote pushes (web, simulator, permission denied, or the project id
 * isn't configured). Callers should treat a null result as non-fatal.
 */
export async function getExpoPushToken(
  projectId: string | undefined,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;
  const perm = await getPermission();
  if (perm !== 'granted') return null;
  try {
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return result.data;
  } catch (err) {
    if (__DEV__) console.warn('[pointo] getExpoPushToken failed', err);
    return null;
  }
}

/**
 * Schedule a one-off local reminder at the given hour of today (or
 * tomorrow if that hour has already passed). Idempotent — the previous
 * reminder of the same kind is cancelled first so we don't end up with
 * a stack of nudges across reschedules.
 */
export async function scheduleDailyReminder(input: {
  kind: ReminderKind;
  hour: number; // 0-23
  minute?: number; // 0-59
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const perm = await getPermission();
  if (perm !== 'granted') return null;

  const identifier = REMINDER_IDENTIFIERS[input.kind];
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

  try {
    return await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: input.title,
        body: input.body,
        data: input.data,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: input.hour,
        minute: input.minute ?? 0,
      },
    });
  } catch (err) {
    if (__DEV__) console.warn('[pointo] scheduleDailyReminder failed', err);
    return null;
  }
}

export async function cancelReminder(kind: ReminderKind): Promise<void> {
  if (Platform.OS === 'web') return;
  const identifier = REMINDER_IDENTIFIERS[kind];
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
}

export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Promise.all(
    (Object.keys(REMINDER_IDENTIFIERS) as ReminderKind[]).map(cancelReminder),
  );
}

/**
 * Fire a notification right now. Used to acknowledge milestone /
 * redemption events while the app is backgrounded.
 */
export async function fireLocalNotification(input: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const perm = await getPermission();
  if (perm !== 'granted') return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: input.title, body: input.body, data: input.data },
      trigger: null, // null trigger = deliver immediately
    });
  } catch (err) {
    if (__DEV__) console.warn('[pointo] fireLocalNotification failed', err);
    return null;
  }
}

function mapStatus(status: string): NotificationPermission {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'unknown';
}
