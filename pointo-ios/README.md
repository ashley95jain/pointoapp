# Pointo for iOS (Native)

Native SwiftUI implementation of **Pointo**, the Japan-focused points app
where users sign in, earn rewards from referral installs, walk-to-earn step
milestones, and daily missions.

This folder contains the production-style native iOS app. The earlier Expo
prototype still lives in `../pointo/` for reference.

## Features

- **Phone-number login** with a 6-digit OTP (mock backend). Validates Japanese
  mobile formats (`080/090/070` and the `+81` international form).
- **Localised in Japanese first**, with English as the fallback. `ja` is the
  development region.
- **Referral programme** powered by Universal Links of the form
  `https://pointo.app/join/<CODE>` plus a deterministic referral code per
  account so links survive reinstalls.
- **Walk-to-earn** powered by `CMPedometer` (CoreMotion). Falls back to a
  simulated step stream when running on a device without motion data (e.g. the
  iOS Simulator).
- **Reward catalogue** featuring partners commonly found in Japan: Amazon JP,
  Starbucks JP, PayPay, Rakuten, dPoint, 7-Eleven, UNICEF donation.
- **Persistent wallet** stored in `UserDefaults` (swap for Keychain / a remote
  ledger in production).
- Clean **MVVM** layout with services injected via `EnvironmentObject` so views
  stay decoupled from concrete implementations.

## Requirements

- Xcode 16 or newer (project uses synchronized file system groups, available
  from Xcode 15.3+).
- iOS 17.0 SDK as the deployment target.
- Swift 5.0+ toolchain.

## Running the app

```bash
open pointo-ios/Pointo.xcodeproj
```

Then pick the **Pointo** scheme and run on either the iOS Simulator or a
physical device. On first launch:

1. Enter any 10–11 digit Japanese phone number such as `090-1234-5678`.
2. The app prints a 6-digit demo code in the verify screen — enter it (or
   simply enter `000000`).
3. You'll arrive at the Home tab with `120 pt` welcome bonus already credited.

The Walk tab exposes "demo controls" to inject steps manually so you can
exercise the milestone crediting in the Simulator.

## Project layout

```
pointo-ios/
├── Pointo.xcodeproj/                # Xcode project (synchronized root group)
└── Pointo/
    ├── App/                         # PointoApp entry point, environment, theme
    ├── Models/                      # User, Mission, Reward, PointTransaction
    ├── Services/                    # Auth, points ledger, step counter, referrals
    ├── Views/                       # Login, MainTab, Home, Walk, Referral, Wallet
    └── Resources/                   # Assets.xcassets and Localizable.strings (ja/en)
```

## Where to extend

- **Real authentication**: replace `AuthService.requestCode` / `verify` with
  Firebase Auth, Auth0, KDDI Message Cast, or your own SMS gateway.
- **Universal Links**: enable the Associated Domains entitlement and host
  `apple-app-site-association` at `https://pointo.app/.well-known/`. The
  in-app parser already understands `https://pointo.app/join/<CODE>` and
  `pointo://join/<CODE>`.
- **Backend ledger**: implement the `PointsStore` API against your service
  (Firestore, Supabase, or a custom REST endpoint).
- **Live step verification**: add HealthKit corroboration in `StepCounter`
  alongside `CMPedometer` to mitigate spoofing before paying rewards.

## License

MIT — see the repository root `LICENSE`.
