/**
 * Referral utilities — URL parsing, share-payload formatting, and the
 * once-per-device redemption guard.
 *
 * Recognised inbound URL forms:
 *   - https://pointo.app/join/<CODE>
 *   - pointo://join/<CODE>
 *   - any of the above with `?code=<CODE>` query param
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const REFERRAL_INSTALL_REWARD = 300;
export const REFERRAL_INVITE_REWARD = 250;
const REDEEMED_CODES_KEY = 'pointo:referrals:redeemedCodes';

export type ParsedReferral = { code: string };

/**
 * Pulls the referral code out of a Universal Link / custom-scheme URL.
 * Returns null for anything we don't recognise so the caller can fall
 * through to other handlers.
 */
export function parseReferralUrl(rawUrl: string): ParsedReferral | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // pointo://join/<CODE>  →  host = 'join', first path segment = code.
  if (url.protocol === 'pointo:' && url.host === 'join') {
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 1) return { code: segments[0].toUpperCase() };
  }

  // https://pointo.app/join/<CODE>
  if ((url.protocol === 'https:' || url.protocol === 'http:') && /(^|\.)pointo\.app$/i.test(url.hostname)) {
    const segments = url.pathname.split('/').filter(Boolean);
    const joinIdx = segments.findIndex((s) => s.toLowerCase() === 'join');
    if (joinIdx !== -1 && segments[joinIdx + 1]) {
      return { code: segments[joinIdx + 1].toUpperCase() };
    }
  }

  // …?code=XXX fallback
  const qsCode = url.searchParams.get('code');
  if (qsCode) return { code: qsCode.toUpperCase() };

  return null;
}

/** Build a friendly share payload for the ReferralScreen share button. */
export function buildSharePayload(referralCode: string, referralUrl: string): {
  message: string;
  url: string;
  title: string;
} {
  const message =
    `Pointoで一緒にポイントを貯めよう！\n` +
    `招待コード: ${referralCode}\n${referralUrl}`;
  return {
    title: 'Pointo invite',
    message,
    url: referralUrl,
  };
}

// ---------------------------------------------------------------------------
// Once-per-device redemption guard
// ---------------------------------------------------------------------------

/**
 * Tracks which referral codes have already paid out their install bonus
 * on this device. Stored as a string array under a dedicated AsyncStorage
 * key so it survives a logout (a single device should still only ever earn
 * the install bonus once, regardless of which account is currently active).
 *
 * Returns `true` when the code is fresh and the caller should credit the
 * reward, or `false` when it was already redeemed.
 */
export async function tryRedeemReferralCode(code: string): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(REDEEMED_CODES_KEY);
    const redeemed = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    const normalized = code.toUpperCase();
    if (redeemed.has(normalized)) return false;
    redeemed.add(normalized);
    await AsyncStorage.setItem(REDEEMED_CODES_KEY, JSON.stringify([...redeemed]));
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[pointo] tryRedeemReferralCode failed', err);
    return false;
  }
}

export async function listRedeemedCodes(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(REDEEMED_CODES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}
