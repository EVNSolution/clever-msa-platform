# Front Driver App Local Setup

## Purpose

This runbook records the verified local Flutter mobile toolchain on the current macOS machine for `front-driver-app` bootstrap and UI testing.

## Current Machine Baseline

- Machine: Apple M2
- Memory: 8 GB RAM
- OS: macOS 26.4.1
- Free disk after setup: about 34 GiB

## Installed Toolchain

- Flutter: `3.41.6`
- Dart: `3.11.4`
- DevTools: `2.54.2`
- FVM: `4.0.5`
- CocoaPods: `1.16.2`
- Xcode: `26.4` (`Build 17E192`)
- iOS Simulator runtime: `iOS 26.4 (23E244)`
- Android Studio: `2025.3.3.6`
- Android SDK: `36.0.0`
- Android Build Tools: `36.0.0`
- Android Emulator: `36.5.10.0`

## Important Paths

- Flutter SDK: `/opt/homebrew/share/flutter`
- Android SDK: `/Users/jiin/Library/Android/sdk`
- Android AVD name: `pixel_8_api_35`
- Shell config updated: `/Users/jiin/.zshrc`

The shell is configured with:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH"
export PATH="$HOME/.pub-cache/bin:$PATH"
```

Open a new terminal or run `source ~/.zshrc` before using the tools in a fresh shell.

## Verified Commands

```sh
flutter --version
fvm --version
pod --version
flutter doctor -v
flutter emulators
emulator -list-avds
xcrun simctl list devices available
```

Latest verification result:

- `flutter doctor -v`: no blocking issues
- Available Flutter emulators:
  - `apple_ios_simulator`
  - `pixel_8_api_35`
- Available Android AVDs:
  - `pixel_8_api_35`

## iOS UI Test Flow

Open Simulator:

```sh
open -a Simulator
```

List available devices:

```sh
xcrun simctl list devices available
```

Example currently available devices:

- `iPhone 17`
- `iPhone 17 Pro`
- `iPhone 17 Pro Max`
- `iPhone 17e`
- `iPhone Air`

Run Flutter on the booted iOS simulator:

```sh
flutter run -d apple_ios_simulator
```

There is also one detected physical iPhone connection via wireless debugging:

- `ImJing`

## Android UI Test Flow

Launch the prepared Android emulator:

```sh
flutter emulators --launch pixel_8_api_35
```

Or directly:

```sh
emulator @pixel_8_api_35
```

Run Flutter on the Android emulator:

```sh
flutter run -d pixel_8_api_35
```

If Android Studio is needed for SDK Manager or Device Manager:

```sh
open -a "Android Studio"
```

## FVM Usage for the App Repo

When `development/front-driver-app/` is created, pin Flutter in `.fvmrc` and use:

```sh
fvm use <flutter-version>
fvm flutter pub get
fvm flutter test
fvm flutter run
```

## Operational Guidance for This Machine

- Keep only one heavy runtime active at a time:
  - one iOS Simulator, or
  - one Android emulator
- Avoid running Android Studio, Xcode, Simulator, and Android Emulator together on 8 GB RAM.
- Prefer:
  - iOS layout checks on Simulator or the connected iPhone
  - Android checks on a single AVD
- Re-run `flutter doctor -v` after major Xcode or Android SDK updates.

## Recommended Next Step

Proceed to bootstrap `development/front-driver-app/` with Flutter + FVM and verify the clean scaffold on:

1. `apple_ios_simulator`
2. `pixel_8_api_35`
