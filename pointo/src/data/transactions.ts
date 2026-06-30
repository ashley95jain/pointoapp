/**
 * Append-only log of every point movement. Each credit/debit in AppState
 * goes through `addTransaction`, which keeps the list capped at MAX_LOG.
 */

export type TransactionKind =
  | 'initial-balance'
  | 'mission'
  | 'walk-milestone'
  | 'referral-install'
  | 'referral-invite'
  | 'redemption';

export type PointTransaction = {
  id: string;
  kind: TransactionKind;
  delta: number; // positive = credit, negative = debit
  label: string;
  at: number; // ms epoch
  meta?: Record<string, string | number>;
};

export const MAX_TRANSACTION_LOG = 200;

export function nextTransactionId(): string {
  // Plenty of entropy for a per-device log; we don't need anything stronger.
  return `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
