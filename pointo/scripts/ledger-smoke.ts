/**
 * Run with: `npx tsx scripts/ledger-smoke.ts`
 *
 * Stubbed-fetch tests for HttpLedgerSync. Covers the request shape,
 * Authorization header forwarding, success / 401 / 429 / 5xx mapping,
 * and the isRetryable helper.
 */
import {
  HttpLedgerSync,
  LedgerSyncError,
  isRetryable,
} from '../src/services/ledger';
import type { PointTransaction } from '../src/data/transactions';

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

const tx = (id: string, delta: number): PointTransaction => ({
  id,
  kind: 'mission',
  delta,
  label: `tx ${id}`,
  at: Date.now(),
});

async function main() {
  const provider = new HttpLedgerSync({ baseUrl: 'https://ledger.example.com/' });

  console.log('push happy path');
  let calls = stubFetch(() => ({
    status: 200,
    body: { accepted: ['t1', 't2'], rejected: [] },
  }));
  const r = await provider.push([tx('t1', 10), tx('t2', 20)], 'tok_abc');
  check('returns accepted list', r.accepted.join(',') === 't1,t2');
  check('hits transactions endpoint', calls[0].url === 'https://ledger.example.com/v1/ledger/transactions');
  check('uses POST', calls[0].init.method === 'POST');
  const headers = calls[0].init.headers as Record<string, string>;
  check('forwards bearer token', headers.Authorization === 'Bearer tok_abc');
  check('Content-Type json', headers['Content-Type'] === 'application/json');
  const body = JSON.parse(String(calls[0].init.body));
  check('body wraps transactions array', Array.isArray(body.transactions) && body.transactions.length === 2);

  console.log('\npush short-circuits on empty list');
  let didFetch = false;
  stubFetch(() => {
    didFetch = true;
    return { status: 200, body: {} };
  });
  const empty = await provider.push([], 'tok_abc');
  check('does not hit network when no transactions', !didFetch);
  check('returns empty result', empty.accepted.length === 0 && empty.rejected.length === 0);

  console.log('\npush without token is allowed (server can 401)');
  calls = stubFetch(() => ({ status: 200, body: { accepted: ['t1'], rejected: [] } }));
  await provider.push([tx('t1', 5)], null);
  const noAuthHeader = (calls[0].init.headers as Record<string, string>).Authorization;
  check('omits Authorization header when token is null', !noAuthHeader);

  console.log('\npull happy path');
  calls = stubFetch(() => ({
    status: 200,
    body: { points: 1234, transactions: [{ id: 's1', kind: 'mission', delta: 100, label: 'srv', at: 0 }], redemptions: [] },
  }));
  const snap = await provider.pull('tok_abc');
  check('returns server points', snap.points === 1234);
  check('returns server transactions', snap.transactions.length === 1);
  check('hits snapshot endpoint with GET', calls[0].url.endsWith('/v1/ledger/snapshot') && calls[0].init.method === 'GET');

  console.log('\nerror mapping');
  stubFetch(() => ({ status: 401, body: {} }));
  try {
    await provider.push([tx('x', 1)], 'tok_abc');
    check('throws on 401', false);
  } catch (err) {
    check('401 -> unauthorized', err instanceof LedgerSyncError && err.kind === 'unauthorized');
    check('unauthorized is NOT retryable', !isRetryable(err));
  }

  stubFetch(() => ({ status: 429, body: {} }));
  try {
    await provider.push([tx('x', 1)], 'tok_abc');
    check('throws on 429', false);
  } catch (err) {
    check('429 -> rateLimited', err instanceof LedgerSyncError && err.kind === 'rateLimited');
    check('rateLimited IS retryable', isRetryable(err));
  }

  stubFetch(() => ({ status: 502, body: {} }));
  try {
    await provider.push([tx('x', 1)], 'tok_abc');
    check('throws on 502', false);
  } catch (err) {
    check('5xx -> server', err instanceof LedgerSyncError && err.kind === 'server');
    check('server IS retryable', isRetryable(err));
  }

  stubFetch(() => ({ status: 422, body: {} }));
  try {
    await provider.push([tx('x', 1)], 'tok_abc');
    check('throws on 422', false);
  } catch (err) {
    check('4xx -> client', err instanceof LedgerSyncError && err.kind === 'client');
    check('client is NOT retryable', !isRetryable(err));
  }

  console.log('\nisRetryable defaults');
  check('non-LedgerSyncError defaults to retry', isRetryable(new Error('boom')));

  console.log('\n' + (failures === 0 ? 'All ledger checks passed.' : `${failures} failures.`));
  process.exit(failures === 0 ? 0 : 1);
}

void main();
