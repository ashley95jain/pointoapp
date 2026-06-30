# Pointo

Pointo is an iOS-friendly rewards app concept for users in Japan. Users can sign in, join through a referral link, and earn points by installing the app, completing walk-based challenges, and inviting friends.

## Features
- Simple login experience
- Referral-based invitation flow
- Point rewards for app installation
- Walk-and-earn missions
- Friend referral rewards

## Project structure
- Expo-based React Native app in the pointo folder
- Main app experience in pointo/App.tsx
- App configuration in pointo/app.json

## Run locally
```bash
cd pointo
npm install
npm run ios
```

## Auth backend (Phase 3.1)

The app ships with a `MockAuthProvider` so it runs offline against the universal `000000` verification code. To point the login flow at a real backend, copy `pointo/.env.example` to `pointo/.env` and set:

```bash
EXPO_PUBLIC_AUTH_PROVIDER=http
EXPO_PUBLIC_AUTH_API_URL=https://your-auth-backend.example.com
```

The backend must implement:

```
POST /v1/auth/request-code   body: { phone: "+81…" }
                             200:  { verificationId: string, expiresAt?: number }

POST /v1/auth/verify-code    body: { verificationId, code, displayName }
                             200:  { token: string, user: { id, phone, displayName, joinedAt } }
```

Errors are returned as `{ error: { kind, message } }` where `kind` is one of `invalidPhone | invalidCode | expired | rateLimited`. See `pointo/src/services/auth.ts` for the full contract.

Variables prefixed with `EXPO_PUBLIC_` are inlined by Metro at bundle time and are therefore safe to commit only when the value is non-secret. Sensitive credentials belong in EAS Secrets, not in `.env`.

## Server-side ledger (Phase 3.2)

By default every point movement lives only on the device. To enable server-side reconciliation (so credits survive uninstall, and anti-fraud can reverse fraudulent transactions), add:

```bash
EXPO_PUBLIC_LEDGER_API_URL=https://ledger.pointo.app
```

The backend must implement:

```
POST /v1/ledger/transactions   headers: Authorization: Bearer <token>
                                body:    { transactions: PointTransaction[] }
                                200:     { accepted: string[], rejected: { id, reason }[] }

GET  /v1/ledger/snapshot       headers: Authorization: Bearer <token>
                                200:     { points: number, transactions: PointTransaction[], redemptions: Redemption[] }
```

The client persists every transaction to an outbox queue (capped at 500 entries) before showing the credit, and pushes the queue on app launch, after every credit/debit, and on each foreground. Transient errors (network, 5xx, rate-limit) keep the entries in the queue for retry; hard 4xx rejections drop them. Manual "Push outbox" and "Pull from server" controls live in the Wallet tab when the sync is enabled.

## Notes
This project is a starter concept for a referral-based points app and can be extended with authentication, backend services, and real reward tracking.