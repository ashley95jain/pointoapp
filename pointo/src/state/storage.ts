import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { MissionId } from '../data/missions';
import { stableUserId, type AuthenticatedUser } from '../services/auth';

const LEDGER_KEY = 'pointo:ledger:v1';
const TOKEN_KEY = 'pointo.authToken';
const TOKEN_WEB_FALLBACK_KEY = 'pointo:authToken:webFallback';

/**
 * Versioned snapshot of all non-secret state persisted across launches.
 * The `version` field exists so structural changes can run a migration
 * without bricking installed sessions.
 *
 * v1 (Phase 1.2): { isLoggedIn, name, phone, points, completedMissionIds }
 * v2 (Phase 2.1): { user | null, points, completedMissionIds }
 * v3 (Phase 2.3): + { walkMilestoneDay, creditedWalkMilestones }
 */
export type LedgerSnapshot = {
  version: 3;
  user: AuthenticatedUser | null;
  points: number;
  completedMissionIds: MissionId[];
  walkMilestoneDay: string | null;
  creditedWalkMilestones: number[];
};

type LedgerSnapshotV1 = {
  version: 1;
  isLoggedIn: boolean;
  name: string;
  phone: string;
  points: number;
  completedMissionIds: MissionId[];
};

type LedgerSnapshotV2 = {
  version: 2;
  user: AuthenticatedUser | null;
  points: number;
  completedMissionIds: MissionId[];
};

export async function loadLedger(): Promise<LedgerSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { version?: number };

    if (parsed?.version === 3) {
      return parsed as LedgerSnapshot;
    }
    if (parsed?.version === 2) {
      return migrateV2ToV3(parsed as LedgerSnapshotV2);
    }
    if (parsed?.version === 1) {
      return migrateV2ToV3(migrateV1ToV2(parsed as LedgerSnapshotV1));
    }
    return null;
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

// ---------------------------------------------------------------------------
// Migrations
// ---------------------------------------------------------------------------

function migrateV1ToV2(old: LedgerSnapshotV1): LedgerSnapshotV2 {
  // v1 stored the user implicitly via `isLoggedIn + name + phone`. Promote
  // it to a structured AuthenticatedUser so the rest of the app can treat
  // resumed sessions identically to freshly-authenticated ones.
  if (!old.isLoggedIn) {
    return {
      version: 2,
      user: null,
      points: old.points,
      completedMissionIds: old.completedMissionIds,
    };
  }

  const id = stableUserId(old.phone);
  return {
    version: 2,
    user: {
      id,
      phone: old.phone,
      displayName: old.name,
      joinedAt: new Date(0).toISOString(),
    },
    points: old.points,
    completedMissionIds: old.completedMissionIds,
  };
}

function migrateV2ToV3(old: LedgerSnapshotV2): LedgerSnapshot {
  // Walk-to-earn fields are entirely new. Defaulting them to "no milestones
  // claimed for any day" means existing users still get the full set of
  // step rewards for the day they first launch the updated app, which is
  // the desired UX.
  return {
    version: 3,
    user: old.user,
    points: old.points,
    completedMissionIds: old.completedMissionIds,
    walkMilestoneDay: null,
    creditedWalkMilestones: [],
  };
}
