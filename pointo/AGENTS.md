# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

## Cursor Cloud specific instructions

- This checkout is a single Expo app in `pointo`; no backend, database, cache, or Docker service is required for the current local product flow.
- The README's `npm run ios` path requires macOS/iOS Simulator. In Cursor Cloud Linux, use the `pointo/package.json` scripts and run the web target; for headless sessions set `EXPO_NO_TELEMETRY=1 BROWSER=none` and open Expo's advertised `http://localhost:8081` URL.
- There are no configured lint or test scripts yet. Current useful checks are strict TypeScript (`npm exec tsc -- --noEmit`) and Expo Doctor (`npx --yes expo-doctor@latest`); `npm run lint --if-present` and `npm test --if-present` are safe no-ops until scripts are added.
