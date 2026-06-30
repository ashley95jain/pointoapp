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

On Linux or in Cursor Cloud, run the web target instead:

```bash
cd pointo
npm run web
```

## Backend setup

The app is backend-ready with Supabase. Without Supabase environment variables it
runs in local demo mode.

1. Create a Supabase project.
2. Open the Supabase SQL editor and run `pointo/supabase/schema.sql`.
3. Copy `pointo/.env.example` to `pointo/.env.local`.
4. Fill in your project URL and public anon key:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
EXPO_PUBLIC_POINTO_APP_HOST=https://pointo.app
```

5. Restart Expo:

```bash
cd pointo
npm run web
```

The Supabase schema creates:
- `profiles` for users and referral codes
- `missions` for claimable rewards
- `mission_completions` for per-user mission state
- `point_transactions` as the points ledger
- `claim_mission(profile_id, mission_id)` to atomically claim a mission and add
  points

The current Supabase flow is suitable for MVP development. Before production,
add Supabase Auth or Edge Functions and restrict table access with row-level
security policies.

## Notes
This project is a starter concept for a referral-based points app and can be extended with authentication, backend services, and real reward tracking.