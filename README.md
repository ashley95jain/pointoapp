# Pointo

Pointo is a Japan-focused rewards app concept. Users sign in, join through a
referral link, and earn points for installs, walk-based challenges, and friend
invitations.

This repository contains two implementations:

| Folder         | Stack              | Status            |
| -------------- | ------------------ | ----------------- |
| `pointo-ios/`  | **Native SwiftUI** | Primary iOS app   |
| `pointo/`      | Expo / React Native | Early prototype   |

## Features
- Phone-number login with a 6-digit one-time-password flow
- Referral-based invitation flow with Universal Links (`https://pointo.app/join/<CODE>`)
- Point rewards for app installation
- Walk-and-earn missions powered by `CMPedometer`
- Reward catalogue tailored to Japan (Amazon JP, Starbucks JP, PayPay, Rakuten, dPoint, 7-Eleven, UNICEF donation)

## Run the native iOS app
```bash
open pointo-ios/Pointo.xcodeproj
```
Pick the **Pointo** scheme and run on a Simulator or device. See
[`pointo-ios/README.md`](pointo-ios/README.md) for full details.

## Run the Expo prototype (optional)
```bash
cd pointo
npm install
npm run ios
```

## Notes
The native app is the recommended starting point. It is structured for easy
extension toward a real backend (auth provider, server-side ledger,
HealthKit-corroborated step verification, etc.).