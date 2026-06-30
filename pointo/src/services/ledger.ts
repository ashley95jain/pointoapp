/**
 * Server-side ledger sync. The app keeps every point movement in a local
 * outbox queue and replays it against a backend that owns the canonical
 * balance. Anti-fraud, retroactive corrections, and survive-uninstall
 * behaviour all live server-side; the client treats local state as
 * optimistic until acknowledged.
 *
 * The provider here is intentionally narrow — it covers the two HTTP
 * calls a typical backend needs and nothing else. Cron jobs, anti-fraud
 * heuristics, etc. all happen on the server side.
 */

import type { PointTransaction } from '../data/transactions';
import type { Redemption } from '../data/redemptions';

export type LedgerPushResult = {
  /** Transaction ids the server persisted successfully. */
  accepted: string[];
  /**
   * Transaction ids the server refused. The client should surface the
   * reason and ideally reverse the corresponding local credit/debit.
   */
  rejected: { id: string; reason: string }[];
};

export type LedgerPullResult = {
  points: number;
  transactions: PointTransaction[];
  redemptions: Redemption[];
};

export interface LedgerSync {
  /**
   * `false` when the no-op provider is wired up (env not configured).
   * Call sites check this to skip queue maintenance entirely on dev
   * builds and on web smoke runs.
   */
  readonly enabled: boolean;
  push(transactions: PointTransaction[], token: string | null): Promise<LedgerPushResult>;
  pull(token: string | null): Promise<LedgerPullResult>;
}

// ---------------------------------------------------------------------------
// No-op default
// ---------------------------------------------------------------------------

class NoopLedgerSync implements LedgerSync {
  readonly enabled = false;
  async push(): Promise<LedgerPushResult> {
    return { accepted: [], rejected: [] };
  }
  async pull(): Promise<LedgerPullResult> {
    return { points: 0, transactions: [], redemptions: [] };
  }
}

// ---------------------------------------------------------------------------
// HTTP implementation
// ---------------------------------------------------------------------------

export type HttpLedgerConfig = {
  baseUrl: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
};

export class HttpLedgerSync implements LedgerSync {
  readonly enabled = true;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpLedgerConfig) {
    if (!config.baseUrl) {
      throw new Error('HttpLedgerSync: baseUrl is required.');
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  async push(
    transactions: PointTransaction[],
    token: string | null,
  ): Promise<LedgerPushResult> {
    if (transactions.length === 0) {
      return { accepted: [], rejected: [] };
    }
    return this.request<LedgerPushResult>('/v1/ledger/transactions', 'POST', token, {
      transactions,
    });
  }

  async pull(token: string | null): Promise<LedgerPullResult> {
    return this.request<LedgerPullResult>('/v1/ledger/snapshot', 'GET', token);
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST',
    token: string | null,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...this.defaultHeaders,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') {
        throw new LedgerSyncError('timeout', 'Ledger sync timed out.');
      }
      throw new LedgerSyncError('network', 'Ledger sync network error.');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new LedgerSyncError('unauthorized', 'Ledger sync rejected — re-authenticate.');
      }
      if (response.status === 429) {
        throw new LedgerSyncError('rateLimited', 'Ledger sync rate-limited.');
      }
      if (response.status >= 500) {
        throw new LedgerSyncError('server', `Ledger backend ${response.status}.`);
      }
      throw new LedgerSyncError('client', `Ledger backend ${response.status}.`);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new LedgerSyncError('badPayload', 'Ledger backend returned non-JSON.');
    }
  }
}

export type LedgerSyncErrorKind =
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'rateLimited'
  | 'server'
  | 'client'
  | 'badPayload';

export class LedgerSyncError extends Error {
  constructor(
    public readonly kind: LedgerSyncErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'LedgerSyncError';
  }
}

/**
 * Heuristic for whether a failed push should keep the transaction in the
 * outbox for a future retry. Transient errors (network / timeout / 5xx /
 * rate-limit) get retried; auth / client errors are surfaced immediately
 * so the user can react.
 */
export function isRetryable(err: unknown): boolean {
  if (!(err instanceof LedgerSyncError)) return true; // unknown -> retry
  return err.kind === 'timeout' || err.kind === 'network' || err.kind === 'rateLimited' || err.kind === 'server';
}

// ---------------------------------------------------------------------------
// Wired-up singleton
// ---------------------------------------------------------------------------

function resolveLedgerSync(): LedgerSync {
  const baseUrl = process.env.EXPO_PUBLIC_LEDGER_API_URL;
  if (!baseUrl) return new NoopLedgerSync();
  return new HttpLedgerSync({ baseUrl });
}

export const ledgerSync: LedgerSync = resolveLedgerSync();
