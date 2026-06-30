/**
 * Persisted outbox of point transactions queued for upload to the server-
 * side ledger. Kept in AsyncStorage (not SecureStore) — the contents are
 * not secrets, and AsyncStorage works on web where SecureStore does not.
 *
 * Capped so a long offline session can't bloat the snapshot indefinitely;
 * the cap is generous enough to cover several days of typical use.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PointTransaction } from '../data/transactions';

const OUTBOX_KEY = 'pointo:ledger:outbox:v1';
export const MAX_OUTBOX_ENTRIES = 500;

export async function loadOutbox(): Promise<PointTransaction[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (__DEV__) console.warn('[pointo] loadOutbox failed', err);
    return [];
  }
}

export async function saveOutbox(transactions: PointTransaction[]): Promise<void> {
  try {
    const trimmed =
      transactions.length > MAX_OUTBOX_ENTRIES
        ? transactions.slice(transactions.length - MAX_OUTBOX_ENTRIES)
        : transactions;
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(trimmed));
  } catch (err) {
    if (__DEV__) console.warn('[pointo] saveOutbox failed', err);
  }
}

export async function clearOutbox(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OUTBOX_KEY);
  } catch (err) {
    if (__DEV__) console.warn('[pointo] clearOutbox failed', err);
  }
}
