/**
 * Phone-number + 6-digit OTP authentication.
 *
 * The interface here is intentionally provider-agnostic so the mock
 * implementation used in this phase can later be swapped for Firebase Auth,
 * Auth0, Supabase, Twilio Verify, or a domestic Japanese SMS gateway such
 * as KDDI Message Cast without touching call sites.
 */

export type RequestCodeResult = {
  /** Opaque handle passed back to verifyCode so the provider can correlate. */
  verificationId: string;
  /**
   * Echo of the dispatched code, returned ONLY by the mock provider so the
   * login screen can show a developer-friendly hint. Real providers must
   * return `undefined` for this field.
   */
  demoCode?: string;
};

export type AuthenticatedUser = {
  id: string;
  phone: string;
  displayName: string;
  joinedAt: string;
};

export type VerifyCodeResult = {
  token: string;
  user: AuthenticatedUser;
};

export type AuthError =
  | { kind: 'invalidPhone'; message: string }
  | { kind: 'invalidCode'; message: string }
  | { kind: 'expired'; message: string }
  | { kind: 'rateLimited'; message: string };

export interface AuthProvider {
  requestCode(phone: string): Promise<RequestCodeResult>;
  verifyCode(input: {
    verificationId: string;
    code: string;
    displayName: string;
  }): Promise<VerifyCodeResult>;
}

// ---------------------------------------------------------------------------
// Phone-number helpers
// ---------------------------------------------------------------------------

/**
 * Loose validation for Japanese mobile numbers. Accepts:
 *   - `070`, `080`, `090` prefixes with the standard 11 total digits
 *   - the international `+81` form with the leading 0 stripped
 *
 * Punctuation (`-`, spaces, parentheses) is tolerated and stripped.
 */
export function isValidJapanesePhone(raw: string): boolean {
  const digits = raw.replace(/[^\d+]/g, '');

  if (digits.startsWith('+81')) {
    const local = digits.slice(3);
    return /^[789]0\d{8}$/.test(local);
  }

  if (/^0[789]0\d{8}$/.test(digits)) {
    return true;
  }

  return false;
}

/** Normalises a Japanese mobile number to the `+81…` form. */
export function normalizeJapanesePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+81')) return digits;
  if (digits.startsWith('0')) return `+81${digits.slice(1)}`;
  return digits;
}

/**
 * Stable, base32-style code derived from the user id. Avoids ambiguous
 * characters (0/O, 1/I/L). Same user id always produces the same code.
 *
 * Backed by 32-bit FNV-1a, which gives ~32^6 (≈ 10^9) distinct codes — fine
 * for a non-cryptographic invite handle. A real production system should
 * still store referral codes server-side and check for collisions.
 */
export function referralCodeForUserId(userId: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0x811c9dc5 >>> 0;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  let code = '';
  let working = hash;
  for (let i = 0; i < 6; i++) {
    code += alphabet[working % alphabet.length];
    working = Math.floor(working / alphabet.length);
  }
  return `PT-${code}`;
}

// ---------------------------------------------------------------------------
// Mock provider
// ---------------------------------------------------------------------------

type PendingVerification = {
  phone: string;
  code: string;
  issuedAt: number;
};

const CODE_TTL_MS = 5 * 60 * 1000;

/**
 * Local-only OTP provider used during development. Codes are kept in module
 * state (not persisted) so each app launch starts with a fresh slate. The
 * universal demo code `000000` is also accepted to make manual testing on
 * a teammate's machine painless.
 */
export class MockAuthProvider implements AuthProvider {
  private pending = new Map<string, PendingVerification>();

  async requestCode(phone: string): Promise<RequestCodeResult> {
    if (!isValidJapanesePhone(phone)) {
      throw rejectionFor('invalidPhone');
    }
    const normalized = normalizeJapanesePhone(phone);
    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const verificationId = `mock-${normalized}-${Date.now()}`;
    this.pending.set(verificationId, {
      phone: normalized,
      code,
      issuedAt: Date.now(),
    });
    return { verificationId, demoCode: code };
  }

  async verifyCode({
    verificationId,
    code,
    displayName,
  }: {
    verificationId: string;
    code: string;
    displayName: string;
  }): Promise<VerifyCodeResult> {
    const pending = this.pending.get(verificationId);
    const trimmed = code.replace(/\D/g, '');

    if (trimmed === '000000') {
      const phone = pending?.phone ?? `+81unknown-${Date.now()}`;
      this.pending.delete(verificationId);
      return makeSession(phone, displayName);
    }

    if (!pending) {
      throw rejectionFor('expired');
    }
    if (Date.now() - pending.issuedAt > CODE_TTL_MS) {
      this.pending.delete(verificationId);
      throw rejectionFor('expired');
    }
    if (trimmed !== pending.code) {
      throw rejectionFor('invalidCode');
    }

    this.pending.delete(verificationId);
    return makeSession(pending.phone, displayName);
  }
}

function makeSession(phone: string, displayNameRaw: string): VerifyCodeResult {
  const displayName =
    displayNameRaw.trim() || `Pointo会員${phone.slice(-4)}`;
  const id = stableUserId(phone);
  const user: AuthenticatedUser = {
    id,
    phone,
    displayName,
    joinedAt: new Date().toISOString(),
  };
  return {
    user,
    // Pseudo-token. A real provider returns a JWT or session key.
    token: `mock-token-${id}-${Date.now().toString(36)}`,
  };
}

/**
 * Deterministic user id derived from the phone number. Exported so the
 * storage layer's v1 → v2 migration can produce the same id the auth
 * provider would, keeping a single source of truth for resumed sessions.
 */
export function stableUserId(normalizedPhone: string): string {
  let hash = 0;
  for (let i = 0; i < normalizedPhone.length; i++) {
    hash = (hash * 31 + normalizedPhone.charCodeAt(i)) >>> 0;
  }
  return `usr_${hash.toString(36)}`;
}

function rejectionFor(kind: AuthError['kind'], override?: string): Error {
  const messages: Record<AuthError['kind'], string> = {
    invalidPhone: 'That phone number does not look valid.',
    invalidCode: 'The verification code did not match.',
    expired: 'Verification code expired. Please request a new one.',
    rateLimited: 'Too many attempts. Please wait a moment and try again.',
  };
  const err = new Error(override ?? messages[kind]) as Error & {
    authKind: AuthError['kind'];
  };
  err.authKind = kind;
  return err;
}

export function authErrorKind(err: unknown): AuthError['kind'] | null {
  if (err && typeof err === 'object' && 'authKind' in err) {
    return (err as { authKind: AuthError['kind'] }).authKind;
  }
  return null;
}

// ---------------------------------------------------------------------------
// HTTP provider
// ---------------------------------------------------------------------------

/**
 * Configuration for `HttpAuthProvider`. Endpoints are resolved relative to
 * `baseUrl`, so a base of `https://auth.pointo.app` will hit
 * `https://auth.pointo.app/v1/auth/request-code` etc.
 *
 * The provider expects the following contract from the backend (any
 * implementation that satisfies it — Firebase Functions, Supabase Edge,
 * AWS Lambda, custom Express, KDDI Message Cast wrapper — works):
 *
 *   POST /v1/auth/request-code
 *     body:  { phone: string }
 *     200:   { verificationId: string, expiresAt?: number }
 *     4xx:   { error: { kind: AuthError['kind'], message: string } }
 *
 *   POST /v1/auth/verify-code
 *     body:  { verificationId: string, code: string, displayName: string }
 *     200:   { token: string, user: AuthenticatedUser }
 *     4xx:   { error: { kind: AuthError['kind'], message: string } }
 */
export type HttpAuthConfig = {
  baseUrl: string;
  /** Per-request timeout. Defaults to 15s. */
  timeoutMs?: number;
  /** Extra headers injected on every call (e.g. `x-app-version`). */
  defaultHeaders?: Record<string, string>;
};

export class HttpAuthProvider implements AuthProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpAuthConfig) {
    if (!config.baseUrl) {
      throw new Error('HttpAuthProvider: baseUrl is required.');
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = config.timeoutMs ?? 15_000;
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  async requestCode(phone: string): Promise<RequestCodeResult> {
    if (!isValidJapanesePhone(phone)) {
      throw rejectionFor('invalidPhone');
    }
    const normalized = normalizeJapanesePhone(phone);
    const data = await this.post<{ verificationId: string }>(
      '/v1/auth/request-code',
      { phone: normalized },
    );
    return { verificationId: data.verificationId };
  }

  async verifyCode(input: {
    verificationId: string;
    code: string;
    displayName: string;
  }): Promise<VerifyCodeResult> {
    const data = await this.post<{ token: string; user: AuthenticatedUser }>(
      '/v1/auth/verify-code',
      {
        verificationId: input.verificationId,
        code: input.code.replace(/\D/g, ''),
        displayName: input.displayName.trim(),
      },
    );
    return data;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.defaultHeaders,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err) {
      if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') {
        throw new Error('Network timeout. Please check your connection and retry.');
      }
      throw new Error('Network error. Please check your connection and retry.');
    } finally {
      clearTimeout(timer);
    }

    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      // Body may be empty / non-JSON on errors. Fall through.
    }

    if (!response.ok) {
      const errPayload = (parsed as { error?: { kind?: string; message?: string } })?.error;
      const kind = errPayload?.kind;
      if (kind && isAuthErrorKind(kind)) {
        throw rejectionFor(kind, errPayload?.message);
      }
      if (response.status === 429) throw rejectionFor('rateLimited');
      if (response.status >= 500) {
        throw new Error('The login service is temporarily unavailable. Please retry shortly.');
      }
      throw new Error(errPayload?.message ?? `Login failed (HTTP ${response.status}).`);
    }

    return parsed as T;
  }
}

function isAuthErrorKind(value: string): value is AuthError['kind'] {
  return value === 'invalidPhone' || value === 'invalidCode' || value === 'expired' || value === 'rateLimited';
}

// ---------------------------------------------------------------------------
// Wired-up singleton
// ---------------------------------------------------------------------------

/**
 * Selects an auth provider at module-load time:
 *
 *   1. If `EXPO_PUBLIC_AUTH_PROVIDER === 'http'`, build an `HttpAuthProvider`
 *      from `EXPO_PUBLIC_AUTH_API_URL` (required in that mode).
 *   2. If `EXPO_PUBLIC_AUTH_API_URL` is set without an explicit provider
 *      hint, default to `'http'`.
 *   3. Otherwise fall back to the `MockAuthProvider` so local development
 *      keeps working with the universal `000000` code.
 *
 * The Expo bundler inlines any env var prefixed with `EXPO_PUBLIC_`, so
 * setting these in `.env` / `eas.json` is enough — no app-config changes
 * required.
 */
function resolveAuthProvider(): AuthProvider {
  const explicit = process.env.EXPO_PUBLIC_AUTH_PROVIDER;
  const baseUrl = process.env.EXPO_PUBLIC_AUTH_API_URL;

  if (explicit === 'mock') return new MockAuthProvider();

  if (explicit === 'http' || (!explicit && baseUrl)) {
    if (!baseUrl) {
      if (__DEV__) {
        console.warn(
          '[pointo] EXPO_PUBLIC_AUTH_PROVIDER=http but EXPO_PUBLIC_AUTH_API_URL is missing — falling back to mock.',
        );
      }
      return new MockAuthProvider();
    }
    return new HttpAuthProvider({ baseUrl });
  }

  return new MockAuthProvider();
}

export const authProvider: AuthProvider = resolveAuthProvider();

/** Exposed for diagnostics — used by the LoginScreen's demo hint. */
export function isUsingMockAuth(): boolean {
  return authProvider instanceof MockAuthProvider;
}
