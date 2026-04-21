# Driver App MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first driver-only Flutter app MVP for Android and iOS, including local machine setup, driver-only auth gating, communication/self-service features, self-scoped attendance/dispatch reads, and limited beta delivery preparation.

**Architecture:** Keep ownership in existing CLEVER MSA services and add only thin self-scoped read contracts where the mobile app would otherwise need to juggle internal IDs or admin-oriented queries. Implement the mobile client as a new `development/front-driver-app/` child repo with a single Flutter codebase and flavor-based environment separation. Ship in phases: local toolchain, repo bootstrap, core app shell, communication/self-service, driver-scoped read APIs, then beta release plumbing.

**Tech Stack:** Flutter, Dart, FVM, Riverpod, go_router, dio, freezed/json_serializable, flutter_secure_storage, Firebase Messaging, Xcode/iOS Simulator, Android Studio/Android Emulator, Shorebird (after first beta release), existing Django/DRF service repos.

---

### Task 1: Register the New Driver App Repo in Root Docs and Workspace Inventory

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-to-target-repo-map.md`
- Modify: `docs/mappings/current-runtime-inventory.md`
- Modify: `docs/mappings/repo-responsibility-matrix.md`
- Test: doc consistency review in the same files

- [ ] **Step 1: Add the planned child repo to root workspace docs**

Record `development/front-driver-app/` as the mobile client repo that consumes existing MSA APIs and does not own new domain truth.

- [ ] **Step 2: Describe the repo role consistently in repo map and responsibility matrix**

Use wording like:

```md
| `front-driver-app` | front | driver-only mobile app | Android/iOS Flutter self-service app for driver accounts | `development/front-driver-app/` | `migrated-target` or `planned-target` during bootstrap |
```

- [ ] **Step 3: Keep runtime inventory explicit about non-HTTP frontend ownership**

If the repo is not deployed inside the current local compose runtime yet, document it as a child repo / client app rather than pretending it is part of gateway compose.

- [ ] **Step 4: Review the docs for boundary leakage**

Check that no root doc implies:

1. the mobile app owns backend truth
2. the mobile app is an admin console
3. the mobile app introduces a new backend BFF repo

- [ ] **Step 5: Commit**

```bash
git add WORKSPACE.md repo-map.md docs/mappings/current-to-target-repo-map.md docs/mappings/current-runtime-inventory.md docs/mappings/repo-responsibility-matrix.md
git commit -m "docs: register driver app repo in workspace inventory"
```

### Task 2: Prepare the Local Flutter Toolchain on This Mac

**Files:**
- Create: `docs/runbooks/front-driver-app-local-setup.md`
- Test: local toolchain commands only, no repo code yet

- [ ] **Step 1: Install Flutter SDK**

Recommended approach: install via Homebrew or manual SDK archive, then verify PATH.

Run:

```bash
brew install --cask flutter
flutter --version
```

Expected:

- `flutter` command is available
- Flutter prints a stable version

- [ ] **Step 2: Install FVM**

Run:

```bash
dart pub global activate fvm
fvm --version
```

Expected:

- `fvm` command is available

- [ ] **Step 3: Install CocoaPods**

Run:

```bash
sudo gem install cocoapods
pod --version
```

Expected:

- `pod` command is available

- [ ] **Step 4: Install Android Studio and create one ARM64 AVD**

Use Android Studio Setup Wizard to install:

1. Android SDK
2. Platform tools
3. Android Emulator
4. one Pixel-class ARM64 emulator image

Then verify:

```bash
flutter emulators
```

Expected:

- at least one Android emulator is listed

- [ ] **Step 5: Install one iOS Simulator runtime**

Run:

```bash
xcodebuild -downloadPlatform iOS
xcrun simctl list devices available
```

Expected:

- at least one available iPhone simulator appears

- [ ] **Step 6: Run Flutter doctor and capture the local baseline**

Run:

```bash
flutter doctor -v
```

Expected:

- no blocking errors for Flutter, Xcode, Android toolchain, CocoaPods

- [ ] **Step 7: Write the local setup runbook**

Document:

1. exact versions installed
2. where Flutter SDK lives
3. how to open iOS Simulator
4. how to launch the Android emulator
5. the RAM 8GB constraint and “one emulator/simulator at a time” guidance

- [ ] **Step 8: Commit**

```bash
git add docs/runbooks/front-driver-app-local-setup.md
git commit -m "docs: add driver app local setup runbook"
```

### Task 3: Bootstrap the New Flutter Repo and Pin the SDK Version

**Files:**
- Create: `development/front-driver-app/`
- Create: `development/front-driver-app/.fvmrc`
- Create: `development/front-driver-app/README.md`
- Create: `development/front-driver-app/pubspec.yaml`
- Create: `development/front-driver-app/lib/main.dart`
- Test: `flutter test`, `flutter run` on one simulator

- [ ] **Step 1: Create the new child repo**

Create the new repo outside or inside the current workspace according to your git child-repo practice, then expose it at:

```text
development/front-driver-app/
```

- [ ] **Step 2: Pin Flutter with FVM**

Choose a stable Flutter version compatible with Shorebird and write it to `.fvmrc`.

Example:

```json
{
  "flutter": "3.24.0"
}
```

- [ ] **Step 3: Scaffold the Flutter app**

Run:

```bash
cd development
flutter create front-driver-app --platforms=android,ios
```

Expected:

- standard Flutter app scaffold is created

- [ ] **Step 4: Replace the default README with project-specific instructions**

The README should state:

1. driver-only app
2. Flutter + FVM workflow
3. flavor strategy (`dev`, `staging-beta`, `prod-beta`)
4. how to run on iOS and Android

- [ ] **Step 5: Verify the clean scaffold**

Run:

```bash
cd development/front-driver-app
flutter test
```

Expected:

- default tests pass

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: bootstrap front driver app repo"
```

### Task 4: Add Core App Shell, Flavors, Routing, and Shared Infrastructure

**Files:**
- Modify/Create under `development/front-driver-app/`
- Create: `lib/app/`
- Create: `lib/core/auth/`
- Create: `lib/core/env/`
- Create: `lib/core/error/`
- Create: `lib/core/networking/`
- Create: `lib/core/storage/`
- Create: `lib/core/design/`
- Create: `lib/shared/`
- Test: widget tests for app boot + environment wiring

- [ ] **Step 1: Add the app architecture dependencies**

Add to `pubspec.yaml`:

1. `flutter_riverpod`
2. `go_router`
3. `dio`
4. `freezed_annotation`
5. `json_annotation`
6. `flutter_secure_storage`
7. `shared_preferences`
8. `logger`

- [ ] **Step 2: Generate the app shell structure**

Create folders for:

1. app bootstrap
2. env config
3. auth/session handling
4. HTTP client
5. shared error mapping
6. design tokens/theme

- [ ] **Step 3: Implement flavor-aware environment loading**

Expose only what the app needs:

1. `API_BASE_URL`
2. `APP_FLAVOR`
3. `SENTRY_DSN`
4. `FIREBASE_PROJECT_ID`
5. `SHOREBIRD_CHANNEL`

- [ ] **Step 4: Add base navigation with placeholder feature routes**

Set up routes for:

1. splash
2. login
3. blocked
4. home
5. announcements
6. notifications
7. support
8. account
9. attendance
10. dispatch

- [ ] **Step 5: Write tests for app boot and routing guards**

Test that the app:

1. starts on splash
2. can route to login when no session exists
3. can route to blocked/home based on session guard results

- [ ] **Step 6: Run tests**

Run:

```bash
flutter test
```

Expected:

- app shell tests pass

- [ ] **Step 7: Commit**

```bash
git add pubspec.yaml lib
git commit -m "feat: add driver app shell and core infrastructure"
```

### Task 5: Implement Auth Session Flow and Admin Blocked Screen

**Files:**
- Modify/Create: `lib/features/splash/`
- Modify/Create: `lib/features/login/`
- Modify/Create: `lib/features/blocked/`
- Modify/Create: `lib/core/auth/`
- Test: auth/session unit tests + widget tests

- [ ] **Step 1: Add auth DTOs for identity session payload**

Model the current contract from `/api/auth/identity-login/` and `/api/auth/identity-me/`.

- [ ] **Step 2: Implement auth API client**

Support:

1. login
2. me
3. refresh
4. logout
5. profile read/update
6. password change

- [ ] **Step 3: Implement access-token persistence strategy**

Store:

1. access token
2. minimal session metadata

Do not store sensitive business data in plain preferences.

- [ ] **Step 4: Implement splash-time session restoration**

Rules:

1. try refresh
2. if refresh/me fails -> login
3. if active account is `driver` -> home
4. if active account is `system_admin` or `manager` -> blocked

- [ ] **Step 5: Build the blocked screen**

Show only:

```text
추후 업데이트 될 예정입니다
```

- [ ] **Step 6: Write tests for account-type gating**

Cover:

1. `driver` goes to home
2. `manager` goes to blocked
3. `system_admin` goes to blocked
4. no session goes to login

- [ ] **Step 7: Run tests**

Run:

```bash
flutter test
```

Expected:

- auth/session tests pass

- [ ] **Step 8: Commit**

```bash
git add lib/features/splash lib/features/login lib/features/blocked lib/core/auth
git commit -m "feat: add driver auth flow and admin block gate"
```

### Task 6: Implement Communication and Self-Service Screens Using Existing APIs

**Files:**
- Modify/Create: `lib/features/announcements/`
- Modify/Create: `lib/features/notifications/`
- Modify/Create: `lib/features/support/`
- Modify/Create: `lib/features/account/`
- Test: feature tests for list/detail/form flows

- [ ] **Step 1: Implement announcements feature**

Read endpoints:

1. `GET /api/announcements/`
2. `GET /api/announcements/{announcement_id}/`

Use list + detail only.

- [ ] **Step 2: Implement notifications feature**

Support:

1. list notifications
2. mark as read
3. register/update push token

Use endpoints:

1. `GET /api/notifications/general/`
2. `PATCH /api/notifications/general/{notification_id}/`
3. `GET/POST /api/notifications/fcm/tokens/`
4. `PATCH /api/notifications/fcm/tokens/{push_token_id}/`

- [ ] **Step 3: Implement support feature**

Support:

1. ticket list
2. ticket detail
3. response thread
4. create ticket
5. add response

- [ ] **Step 4: Implement account feature**

Support:

1. identity me/profile
2. profile patch
3. password change

- [ ] **Step 5: Add a basic home navigation shell**

Make the user able to reach:

1. home
2. announcements
3. notifications
4. support
5. account

- [ ] **Step 6: Write tests for the self-service flows**

Cover:

1. announcement list rendering
2. notification read update
3. support ticket create flow
4. profile patch validation

- [ ] **Step 7: Run tests**

Run:

```bash
flutter test
```

Expected:

- communication/self-service tests pass

- [ ] **Step 8: Commit**

```bash
git add lib/features/announcements lib/features/notifications lib/features/support lib/features/account
git commit -m "feat: add driver communication and self-service features"
```

### Task 7: Add Thin Self-Scoped Backend Read Contracts for Driver App

**Files:**
- Modify: `development/service-driver-operations-view/driver360/urls.py`
- Modify: `development/service-driver-operations-view/driver360/views.py`
- Create/Modify: relevant service / serializer / source-client files in `service-driver-operations-view`
- Modify: `development/service-attendance-registry/attendanceregistry/urls.py`
- Modify: `development/service-attendance-registry/attendanceregistry/views.py`
- Modify: `development/service-dispatch-operations-view/dispatchops/urls.py`
- Modify: `development/service-dispatch-operations-view/dispatchops/views.py`
- Test: Django tests in each touched service repo

- [ ] **Step 1: Write failing tests for `GET /api/driver-ops/me/home/`**

The endpoint must:

1. derive the linked `driver_id` from the session
2. return driver summary, today attendance, and today dispatch summary
3. return controlled warnings when an upstream source is unavailable

- [ ] **Step 2: Implement `driver-ops me/home`**

Keep this in `service-driver-operations-view`.
Do not add a new BFF repo.

- [ ] **Step 3: Write failing tests for `GET /api/attendance/me/days/`**

The endpoint must:

1. resolve the caller’s linked driver
2. support date range filtering
3. never require the app to send raw `driver_id`

- [ ] **Step 4: Implement `attendance me/days`**

Keep ownership in `service-attendance-registry`.

- [ ] **Step 5: Write failing tests for `GET /api/dispatch-ops/me/today/`**

The endpoint must:

1. resolve the caller’s linked driver
2. return only today’s driver-scoped dispatch/vehicle summary
3. avoid forcing the app to call fleet board APIs directly

- [ ] **Step 6: Implement `dispatch-ops me/today`**

Keep ownership in `service-dispatch-operations-view`.

- [ ] **Step 7: Write failing tests for driver-visible announcement scope**

Decide and codify the contract:

1. include `driver` exposure in non-admin visible scope
2. keep `draft`/`archived` hidden

- [ ] **Step 8: Implement the announcement scope update**

Modify `service-announcement-registry` so driver users can read driver-targeted published announcements.

- [ ] **Step 9: Run repo-local backend tests**

Run:

```bash
cd development/service-driver-operations-view && python manage.py test -v 2
cd development/service-attendance-registry && python manage.py test -v 2
cd development/service-dispatch-operations-view && python manage.py test -v 2
cd development/service-announcement-registry && python manage.py test -v 2
```

Expected:

- all touched service tests pass

- [ ] **Step 10: Commit**

Commit each service repo intentionally rather than batching unrelated backend changes.

### Task 8: Implement Home, Attendance, and Today Dispatch Screens in Flutter

**Files:**
- Modify/Create: `lib/features/home/`
- Modify/Create: `lib/features/attendance/`
- Modify/Create: `lib/features/dispatch/`
- Test: widget and integration-lite tests

- [ ] **Step 1: Add DTOs and repositories for the new self-scoped endpoints**

Model:

1. `driver-ops/me/home`
2. `attendance/me/days`
3. `dispatch-ops/me/today`

- [ ] **Step 2: Build the home screen**

Show:

1. driver identity summary
2. company/fleet
3. today attendance
4. today dispatch/vehicle
5. warning banners when upstream data is partial

- [ ] **Step 3: Build the attendance screen**

Support:

1. date range query
2. simple history list
3. final status display only

- [ ] **Step 4: Build the today dispatch screen**

Show only the driver-scoped “today” view, not the admin board.

- [ ] **Step 5: Add tests for driver-scoped UI**

Cover:

1. home renders partial data safely
2. attendance empty state
3. dispatch empty state
4. warning state rendering

- [ ] **Step 6: Run tests**

Run:

```bash
flutter test
```

Expected:

- feature tests pass

- [ ] **Step 7: Commit**

```bash
git add lib/features/home lib/features/attendance lib/features/dispatch
git commit -m "feat: add driver home attendance and dispatch screens"
```

### Task 9: Add Push Setup, Beta Flavors, and Release Plumbing

**Files:**
- Modify/Create: Flutter Android/iOS project files under `front-driver-app/android/` and `front-driver-app/ios/`
- Modify/Create: flavor config files and Firebase config files
- Create: beta release notes / runbook files if needed
- Test: one beta build per platform

- [ ] **Step 1: Configure Firebase Messaging**

Add:

1. Android Firebase config
2. iOS Firebase config
3. app startup token registration hook

- [ ] **Step 2: Add flavor separation**

Provide:

1. `dev`
2. `staging-beta`
3. `prod-beta`

Each must point to its own API base URL / runtime config.

- [ ] **Step 3: Create one Android beta build**

Run:

```bash
flutter build appbundle --flavor staging-beta -t lib/main_staging_beta.dart
```

Expected:

- build succeeds

- [ ] **Step 4: Create one iOS beta build**

Run:

```bash
flutter build ipa --flavor staging-beta -t lib/main_staging_beta.dart
```

Expected:

- build succeeds

- [ ] **Step 5: Verify UI manually on one iOS and one Android target**

Minimum smoke:

1. login
2. blocked-account routing
3. announcements
4. notifications
5. support ticket create
6. home/attendance/dispatch view

- [ ] **Step 6: Add Shorebird after the first beta release path is proven**

Only after the app can already produce beta artifacts:

1. install Shorebird CLI
2. initialize the app for Shorebird
3. create the first Shorebird release

- [ ] **Step 7: Document beta release steps**

Add a runbook with:

1. Android closed testing upload
2. TestFlight external testing upload
3. how to map testers across multiple companies/fleets
4. Shorebird patch constraints for Dart-only changes

- [ ] **Step 8: Commit**

```bash
git add android ios lib docs
git commit -m "feat: add beta release plumbing for driver app"
```

### Task 10: Final Verification Across Local Toolchain and Beta Readiness

**Files:**
- Test only

- [ ] **Step 1: Run full Flutter test suite**

Run:

```bash
cd development/front-driver-app
flutter test
```

Expected:

- all app tests pass

- [ ] **Step 2: Run on iOS simulator**

Run:

```bash
flutter devices
flutter run -d <ios-simulator-id>
```

Expected:

- app boots and core flows work

- [ ] **Step 3: Run on Android emulator or real device**

Run:

```bash
flutter devices
flutter run -d <android-device-id>
```

Expected:

- app boots and core flows work

- [ ] **Step 4: Verify backend service tests still pass for touched repos**

Re-run the affected Django test suites.

- [ ] **Step 5: Record any residual risks explicitly**

Capture:

1. iOS signing blockers
2. APNs/FCM credential blockers
3. driver-account link data gaps by company/fleet
4. any endpoints still missing for beta

- [ ] **Step 6: Prepare release/no-release decision**

Beta should not proceed unless:

1. driver-only auth gate works
2. today-home reads are stable
3. push token registration works
4. one iOS and one Android test path succeed

