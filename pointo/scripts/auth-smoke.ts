/**
 * Run with: `npx tsx scripts/auth-smoke.ts`
 *
 * Exercises HttpAuthProvider against a stubbed `fetch` so we can verify
 * the request shape and error handling without depending on a network
 * service.
 */
import { HttpAuthProvider, isValidJapanesePhone } from '../src/services/auth';

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    console.log(`  FAIL  ${label}${detail ? ` -- ${detail}` : ''}`);
    failures++;
  }
}

type FetchCall = { url: string; init: RequestInit };
function stubFetch(responder: (call: FetchCall) => { status: number; body: unknown }) {
  const calls: FetchCall[] = [];
  (globalThis as { fetch: typeof fetch }).fetch = async (
    url: string | URL | Request,
    init?: RequestInit,
  ) => {
    const call = { url: String(url), init: init ?? {} };
    calls.push(call);
    const result = responder(call);
    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as Response;
  };
  return calls;
}

async function main() {
  console.log('Japanese phone validation');
  check('accepts 080-1234-5678', isValidJapanesePhone('080-1234-5678'));
  check('accepts +81 80 1234 5678', isValidJapanesePhone('+81 80 1234 5678'));
  check('rejects empty string', !isValidJapanesePhone(''));
  check('rejects 050 IP-phone prefix', !isValidJapanesePhone('050-1234-5678'));
  check('rejects 010 (non-mobile)', !isValidJapanesePhone('010-1234-5678'));

  console.log('\nHttpAuthProvider.requestCode happy path');
  let calls = stubFetch(() => ({
    status: 200,
    body: { verificationId: 'vrf_abc' },
  }));
  const provider = new HttpAuthProvider({ baseUrl: 'https://api.example.com/' });
  const r1 = await provider.requestCode('080-1234-5678');
  check('returns verificationId', r1.verificationId === 'vrf_abc');
  check('does not surface a demoCode', r1.demoCode === undefined);
  check('strips trailing slash from baseUrl', calls[0].url === 'https://api.example.com/v1/auth/request-code');
  const body1 = JSON.parse(String(calls[0].init.body));
  check('normalises phone to +81 form', body1.phone === '+818012345678');
  check('sends Content-Type: application/json', (calls[0].init.headers as Record<string, string>)['Content-Type'] === 'application/json');

  console.log('\nHttpAuthProvider.requestCode validates locally before HTTP');
  let didFetch = false;
  stubFetch(() => {
    didFetch = true;
    return { status: 200, body: {} };
  });
  try {
    await provider.requestCode('not a phone');
    check('throws on invalid phone', false, 'expected throw');
  } catch (err) {
    check('throws on invalid phone before hitting network', !didFetch && (err as Error).message.includes('phone'));
  }

  console.log('\nHttpAuthProvider.verifyCode happy path');
  calls = stubFetch(() => ({
    status: 200,
    body: {
      token: 'tok_xyz',
      user: {
        id: 'usr_1',
        phone: '+818012345678',
        displayName: 'Aiko',
        joinedAt: '2026-06-30T00:00:00.000Z',
      },
    },
  }));
  const r2 = await provider.verifyCode({
    verificationId: 'vrf_abc',
    code: '12-34 56',
    displayName: '  Aiko  ',
  });
  check('returns token', r2.token === 'tok_xyz');
  check('returns user with id', r2.user.id === 'usr_1');
  const body2 = JSON.parse(String(calls[0].init.body));
  check('strips non-digit chars from code', body2.code === '123456');
  check('trims displayName', body2.displayName === 'Aiko');

  console.log('\nHttpAuthProvider error mapping');
  stubFetch(() => ({
    status: 400,
    body: { error: { kind: 'invalidCode', message: 'No match.' } },
  }));
  try {
    await provider.verifyCode({ verificationId: 'x', code: '999999', displayName: 'A' });
    check('throws on 400 invalidCode', false);
  } catch (err) {
    const e = err as Error & { authKind?: string };
    check('throws AuthError-shaped invalidCode', e.authKind === 'invalidCode' && e.message === 'No match.');
  }

  stubFetch(() => ({ status: 429, body: {} }));
  try {
    await provider.requestCode('080-1234-5678');
    check('throws on 429', false);
  } catch (err) {
    check('maps 429 to rateLimited', (err as Error & { authKind?: string }).authKind === 'rateLimited');
  }

  stubFetch(() => ({ status: 503, body: { error: { message: 'Service unavailable' } } }));
  try {
    await provider.requestCode('080-1234-5678');
    check('throws on 5xx', false);
  } catch (err) {
    check('5xx surfaces a user-friendly retry message', (err as Error).message.includes('temporarily unavailable'));
  }

  console.log('\n' + (failures === 0 ? 'All auth checks passed.' : `${failures} failures.`));
  process.exit(failures === 0 ? 0 : 1);
}

void main();
