# Front Driver App Local Setup

## Purpose

This runbook records the current macOS baseline for `front-driver-app` before native mobile bootstrap begins.

The current goal is not to validate a framework-specific scaffold.
The goal is to confirm that this machine can support a real Android/iOS app workflow once the native framework decision is fixed in docs.

## Current Repo State

- repo path: `development/front-driver-app/`
- repo type: official linked child repo
- current branch expectation: `main`
- current implementation state: empty shell

Do not treat this repo as bootstrapped.
Do not reintroduce Expo, Flutter, or web-preview assumptions until a native framework decision is documented first.

## Current Machine Baseline

- Machine: Apple M2
- Memory: 8 GB RAM
- OS: macOS 26.4.1

## Verified Tooling on This Machine

- Git: available through the normal developer toolchain
- Node.js: `v25.9.0`
- npm: `11.12.1`
- Xcode: `26.4.1`
- available iOS runtime: `iOS 26.4`
- Android AVD: `pixel_8_api_35`

Node is recorded because some cross-platform native stacks may use it, but it is not by itself a framework decision.

## Missing or Not Yet Verified

- approved native app framework and bootstrap command
- framework-specific package manager and CLI workflow
- app scaffold execution inside `development/front-driver-app/`
- app launch from the repo on iOS simulator
- app launch from the repo on Android emulator
- beta delivery tooling chosen for the selected framework

## Verified Commands

```sh
node -v
npm -v
xcodebuild -version
xcrun simctl list devices available
emulator -list-avds
```

Latest verification result:

- available iOS devices include current iOS 26.4 simulators
- available Android AVD includes `pixel_8_api_35`
- this machine is ready for framework selection and native bootstrap planning

## iOS Readiness Check

Open Simulator when needed:

```sh
open -a Simulator
```

List available devices:

```sh
xcrun simctl list devices available
```

Do not treat simulator availability alone as app bootstrap success.
The actual gate is whether the selected framework launches from `development/front-driver-app/`.

## Android Readiness Check

Launch the prepared Android emulator if needed:

```sh
emulator @pixel_8_api_35
```

If Android Studio is needed for SDK Manager or Device Manager:

```sh
open -a "Android Studio"
```

Do not treat emulator boot alone as app bootstrap success.
The actual gate is whether the selected framework launches from `development/front-driver-app/`.

## Operational Guidance for This Machine

- keep only one heavy runtime active at a time:
  - one iOS Simulator, or
  - one Android emulator
- avoid running Android Studio, Xcode, Simulator, and Android Emulator together on 8 GB RAM
- prefer:
  - iOS layout checks on Simulator
  - Android checks on a single AVD or real device

## Ready State for Native Bootstrap

Treat this machine as ready to start native bootstrap only when all of the following are true:

1. `development/front-driver-app/` exists and points at the official GitHub repo.
2. one iOS simulator target is available locally.
3. one Android emulator target is available locally.
4. the native framework decision is fixed in canonical docs.
5. the framework-specific bootstrap command is documented before scaffold execution.

## Current Next Step

Proceed in this order:

1. fix the native framework decision in canonical docs
2. create the framework-specific bootstrap plan
3. scaffold the app in `development/front-driver-app/`
4. verify launch on:
   - one iOS simulator
   - one Android target
