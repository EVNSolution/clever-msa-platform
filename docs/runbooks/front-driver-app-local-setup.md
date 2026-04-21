# Front Driver App Local Setup

## Purpose

This runbook records the verified local Expo/React Native baseline on the current macOS machine for `front-driver-app` bootstrap and UI testing.

## Current Machine Baseline

- Machine: Apple M2
- Memory: 8 GB RAM
- OS: macOS 26.4.1

## Verified Toolchain

- Node.js: `v25.9.0`
- npm: `11.12.1`
- Xcode: `26.4.1`
- Available iOS runtime: `iOS 26.4`
- Android AVD: `pixel_8_api_35`

## Missing or Not Yet Verified

- `watchman`
- Expo scaffold execution inside `development/front-driver-app/`
- Expo launch on iOS simulator from the app repo
- Expo launch on Android emulator from the app repo
- `EAS CLI`

## Verified Commands

```sh
node -v
npm -v
xcodebuild -version
xcrun simctl list devices available
emulator -list-avds
npx create-expo-app@latest --help
```

Latest verification result:

- `create-expo-app` help loads successfully
- available iOS devices include `iPhone 17 Pro`, `iPhone 17`, and related iOS 26.4 simulators
- available Android AVD includes `pixel_8_api_35`

## iOS UI Test Flow

Open Simulator:

```sh
open -a Simulator
```

List available devices:

```sh
xcrun simctl list devices available
```

Bootstrap or run the app:

```sh
cd development/front-driver-app
npx expo start --ios
```

## Android UI Test Flow

Launch the prepared Android emulator if needed:

```sh
emulator @pixel_8_api_35
```

Then run the app:

```sh
cd development/front-driver-app
npx expo start --android
```

If Android Studio is needed for SDK Manager or Device Manager:

```sh
open -a "Android Studio"
```

## Optional Web Preview

The product target is still a mobile app, but a web preview can be used for fast layout checks:

```sh
cd development/front-driver-app
npx expo start --web
```

Do not treat web preview success as the mobile verification gate.

## Operational Guidance for This Machine

- Keep only one heavy runtime active at a time:
  - one iOS Simulator, or
  - one Android emulator
- Avoid running Android Studio, Xcode, Simulator, and Android Emulator together on 8 GB RAM.
- Prefer:
  - iOS layout checks on Simulator
  - Android checks on a single AVD
- Install `watchman` only if Expo file watching is unstable without it.

## Ready State for Bootstrap

Treat this machine as ready for `front-driver-app` bootstrap when all of the following are true:

1. `development/front-driver-app/` exists and points at the official GitHub repo.
2. `npx create-expo-app@latest` has scaffolded the app in that repo.
3. `npx expo start --ios` launches without framework-level bootstrap errors.
4. `npx expo start --android` launches without framework-level bootstrap errors.

## Recommended Next Step

Proceed to bootstrap `development/front-driver-app/` with Expo and verify the clean scaffold on:

1. an iOS simulator
2. the `pixel_8_api_35` Android target
