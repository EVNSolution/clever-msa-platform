# Front Driver App Native Bootstrap Implementation Plan

> **For agentic workers:** use `superpowers:executing-plans` or equivalent execution discipline. Bootstrap only after following the `React Native + Expo, native-only` operating rule recorded here.

**Goal:** Keep `development/front-driver-app/` as the official child repo for the driver app, lock the stack to `React Native + Expo`, and bootstrap it under a native-only operating model for the Cheonha phase-1 app.

**Architecture:** Product truth stays in root docs. Runtime implementation stays in the child repo. The stack is now fixed as `React Native + Expo`, but product acceptance remains native-only. This means web preview and Expo Go are not treated as the product target. The next step is to scaffold the child repo and verify local native compile and launch on iOS and Android.

**Tech Direction:** Real Android/iOS app, `React Native + Expo`, native-first product assumptions, `native-only` operation, no web-target acceptance criteria, linked child repo workflow.

---

## 1. Status Summary (2026-04-21)

- [x] `front-driver-app` is registered as an official root child repo.
- [x] the child repo is reset to `origin/main` empty-shell state.
- [x] canonical root docs now fix the app stack as `React Native + Expo`.
- [x] native-only operating rule is defined.
- [ ] child repo bootstrap is still pending.

## 2. Completed Reset Work

### 2.1 Child Repo Reset

- `development/front-driver-app/` was returned to upstream `main`.
- prior scaffold files and temporary implementation work were removed.
- the repo now represents an empty shell again.

### 2.2 Canonical Doc Alignment

Updated documents:

- `repo-map.md`
- `docs/mappings/current-runtime-inventory.md`
- `docs/contracts/21-design-system-and-surface-rules.md`
- `docs/runbooks/front-driver-app-local-setup.md`
- `docs/superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md`

Result:

1. `front-driver-app` is now described as `active child repo, empty shell`.
2. the target product is a real Android/iOS app.
3. the stack is fixed as `React Native + Expo`, but bootstrap is still pending.

## 3. Remaining Work

### Task 1: Bootstrap the Child Repo on React Native + Expo

- [ ] Create a feature branch in `development/front-driver-app/`.
- [ ] Scaffold the minimal app shell inside the child repo.
- [ ] Keep the shell minimal:
  - app launch succeeds
  - environment baseline is wired
  - tenant-fixed phase-1 work has a clean entry point
  - Expo Go is not required for the core dev loop

### Task 2: Verify Native Launch Baseline

- [ ] Verify one iOS simulator launch from the child repo with `npx expo run:ios`.
- [ ] Verify one Android target launch from the child repo with `npx expo run:android`.
- [ ] Record the exact bootstrap and launch commands in docs after verification.
- [ ] Keep web preview out of the acceptance checklist.

### Task 3: Hand Off to Cheonha Phase-1 App Work

- [ ] Start from the minimum product scope in `2026-04-21-cheonha-driver-app-minimum-design.md`.
- [ ] Build the first slice only after native bootstrap is proven:
  - auth
  - work-log view
  - MY page
  - admin empty screen

## 4. Validation Plan

### 4.1 Doc Validation

Run:

```bash
rg -n "front-driver-app|React Native|Expo|expo run:ios|expo run:android|Expo Go|Flutter|flutter" \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/contracts/21-design-system-and-surface-rules.md \
  docs/runbooks/front-driver-app-local-setup.md \
  docs/superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md \
  docs/superpowers/plans
```

Expected:

- active docs consistently describe `React Native + Expo` for `front-driver-app`
- active docs do not position web preview or Expo Go as the product target
- archived history may still contain superseded records

### 4.2 Repo Validation

Run:

```bash
git -C development/front-driver-app status --short --branch
find development/front-driver-app -maxdepth 2 -type f | sort
```

Expected:

- child repo is on `main`
- only baseline empty-shell files are present
- no scaffold leftovers remain

## 5. Execution Rule

Do not start app code again until both conditions are true:

1. the child repo bootstrap command set is agreed and verified
2. at least one iOS and one Android native launch path are proven
