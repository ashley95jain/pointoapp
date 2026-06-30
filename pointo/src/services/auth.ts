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

function rejectionFor(kind: AuthError['kind']): Error {
  const messages: Record<AuthError['kind'], string> = {
    invalidPhone: 'That phone number does not look valid.',
    invalidCode: 'The verification code did not match.',
    expired: 'Verification code expired. Please request a new one.',
    rateLimited: 'Too many attempts. Please wait a moment and try again.',
  };
  const err = new Error(messages[kind]) as Error & { authKind: AuthError['kind'] };
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
// Wired-up singleton
// ---------------------------------------------------------------------------

/** Active provider. Swap with a real implementation in production. */
export const authProvider: AuthProvider = new MockAuthProvider();
