# Front Driver App Expo Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Register `development/front-driver-app/` as an official child repo and prepare the empty repository for Expo-based Android/iOS app development.

**Architecture:** Keep platform truth in the root docs and keep runtime ownership in the child repo. First replace the old Flutter assumption in canonical documents with an Expo/React Native direction, then register the repo in the whitelist/runtime inventory, then clone the empty GitHub repo into `development/`, and finally bootstrap only the minimal Expo project shell needed for future app work.

**Tech Stack:** Expo, React Native, TypeScript, Expo Router, Node.js, npm, iOS Simulator, Android Emulator, Git submodule/child repo workflow, CLEVER root docs.

---

### Task 1: Replace the Old Flutter Assumption in Canonical Docs

**Files:**
- Modify: `docs/superpowers/specs/2026-04-13-driver-app-mvp-design.md`
- Modify: `docs/contracts/21-design-system-and-surface-rules.md`
- Modify: `docs/runbooks/front-driver-app-local-setup.md`

- [ ] **Step 1: Update the driver app MVP spec to Expo**

Replace the framework section, recommended libraries, repo bootstrap notes, and local toolchain assumptions so the spec consistently describes Expo/React Native instead of Flutter/FVM/Shorebird.

- [ ] **Step 2: Update the design system contract appendix**

Change the driver app appendix from `planned + Flutter` wording to `active child repo onboarding + Expo` wording, and replace Flutter-specific token/font unknowns with Expo/React Native equivalents.

- [ ] **Step 3: Rewrite the local setup runbook for Expo**

Replace the Flutter SDK/FVM/CocoaPods-centered instructions with:

```text
- Node.js and npm/pnpm baseline
- Watchman (if used)
- Xcode / iOS Simulator baseline
- Android Studio / Android Emulator baseline
- Expo CLI / npx create-expo-app flow
- `npx expo start`, `npx expo start --ios`, `npx expo start --android`
```

- [ ] **Step 4: Verify no stale Flutter guidance remains in canonical driver-app docs**

Run:

```bash
rg -n "Flutter|FVM|Shorebird" docs/superpowers/specs/2026-04-13-driver-app-mvp-design.md \
  docs/contracts/21-design-system-and-surface-rules.md \
  docs/runbooks/front-driver-app-local-setup.md
```

Expected:
- only intentionally historical mentions remain, or no matches remain

- [ ] **Step 5: Commit the doc pivot**

```bash
git add docs/superpowers/specs/2026-04-13-driver-app-mvp-design.md \
        docs/contracts/21-design-system-and-surface-rules.md \
        docs/runbooks/front-driver-app-local-setup.md
git commit -m "docs: switch front driver app direction to expo"
```

### Task 2: Register front-driver-app in the Root Workspace Inventory

**Files:**
- Modify: `WORKSPACE.md`
- Modify: `repo-map.md`
- Modify: `docs/mappings/current-runtime-inventory.md`

- [ ] **Step 1: Add `front-driver-app` to the root whitelist**

Update `WORKSPACE.md` so `front-driver-app` is listed with the other approved `front-*` repos.

- [ ] **Step 2: Add the repo to the repo map**

Insert a new repo-map row describing:

```text
| `front-driver-app` | front | driver-only mobile app | Expo-based Android/iOS driver self-service app | `development/front-driver-app/` | `migrated-target` |
```

- [ ] **Step 3: Add the repo to the current runtime inventory**

Record `front-driver-app` as a mobile app repo in `docs/mappings/current-runtime-inventory.md` with an explicit note that it is an active child repo but not a compose-hosted runtime service.

- [ ] **Step 4: Verify workspace references are aligned**

Run:

```bash
rg -n "front-driver-app" WORKSPACE.md repo-map.md docs/mappings/current-runtime-inventory.md
```

Expected:
- all three documents describe the same repo path and active status

- [ ] **Step 5: Commit the workspace registration**

```bash
git add WORKSPACE.md repo-map.md docs/mappings/current-runtime-inventory.md
git commit -m "docs: register front driver app child repo"
```

### Task 3: Clone the Official Empty Repo into development/

**Files:**
- Create: `development/front-driver-app/`

- [ ] **Step 1: Clone the GitHub repo into the whitelisted path**

Run:

```bash
git clone https://github.com/EVNSolution/front-driver-app.git development/front-driver-app
```

Expected:
- `development/front-driver-app/.git` exists
- remote `origin` points to `https://github.com/EVNSolution/front-driver-app.git`

- [ ] **Step 2: Inspect the default branch state**

Run:

```bash
cd development/front-driver-app
git branch --show-current
find . -maxdepth 2 -type f | sort
```

Expected:
- current branch is `main`
- repo is effectively empty except baseline files such as `README.md`

- [ ] **Step 3: Verify the root worktree still treats it as an independent child repo path**

Run:

```bash
cd /Users/jiin/Documents/Files/03_Work_EVnSolution/01_Repos/02_CLEVER/clever-msa-platform
git status --short development/front-driver-app
```

Expected:
- no accidental root-tracked implementation snapshot files are introduced

- [ ] **Step 4: Do not scaffold app code yet**

Stop after clone if the repo is empty and reachable. App bootstrap belongs to the next task group after the doc and child-repo registration are complete.

### Task 4: Bootstrap the Minimal Expo App Shell in the Child Repo

**Files:**
- Modify/Create under: `development/front-driver-app/`
- Create: `development/front-driver-app/app/`
- Create: `development/front-driver-app/app/_layout.tsx`
- Create: `development/front-driver-app/app/index.tsx`
- Create: `development/front-driver-app/package.json`
- Create: `development/front-driver-app/app.json`
- Create: `development/front-driver-app/tsconfig.json`
- Create: `development/front-driver-app/babel.config.js`

- [ ] **Step 1: Scaffold the Expo app with TypeScript**

Run:

```bash
cd development/front-driver-app
npx create-expo-app@latest . --template default
```

Expected:
- Expo app scaffold is created in place
- React Native / Expo defaults are present

- [ ] **Step 2: Add Expo Router baseline**

Install and wire the router:

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens
```

Then create:

```tsx
// app/_layout.tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

```tsx
// app/index.tsx
import { Text, View } from "react-native";

export default function IndexScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>front-driver-app expo bootstrap</Text>
    </View>
  );
}
```

- [ ] **Step 3: Verify the clean Expo shell**

Run:

```bash
npx expo start --web
```

Expected:
- Expo dev server starts
- the default bootstrap screen renders in the browser

- [ ] **Step 4: Verify native launch commands are reachable**

Run:

```bash
npx expo start --ios
npx expo start --android
```

Expected:
- Expo attempts to open the configured simulator/emulator without framework-level bootstrap errors

- [ ] **Step 5: Commit the initial Expo shell in the child repo**

```bash
cd development/front-driver-app
git add .
git commit -m "chore: bootstrap expo driver app"
```

### Task 5: Record the Ready State and Hand Off to Feature Work

**Files:**
- Modify: `docs/superpowers/plans/2026-04-21-cheonha-driver-app-minimum-implementation-plan.md`
- Optional Modify: `development/front-driver-app/README.md`

- [ ] **Step 1: Update the minimum app plan to point at Expo bootstrap completion**

Add a short status note that the child repo exists and the framework decision is now Expo.

- [ ] **Step 2: Add repo-local developer instructions**

Document:

```text
- install dependencies
- run web/native preview
- where tenant-fixed app work will start next
```

- [ ] **Step 3: Verify final readiness**

Run:

```bash
git -C development/front-driver-app status --short
git -C development/front-driver-app remote -v
```

Expected:
- child repo is clean after commit
- origin points to the GitHub repo

- [ ] **Step 4: Commit the handoff docs**

```bash
git add docs/superpowers/plans/2026-04-21-cheonha-driver-app-minimum-implementation-plan.md
git commit -m "docs: record expo bootstrap readiness"
```
