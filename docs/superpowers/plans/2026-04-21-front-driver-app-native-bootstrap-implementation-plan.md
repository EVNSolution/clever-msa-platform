# Front Driver App Native Bootstrap Implementation Plan

> **For agentic workers:** use `superpowers:executing-plans` or equivalent execution discipline. Do not scaffold the child repo before the framework decision gate is closed in docs.

**Goal:** Keep `development/front-driver-app/` as the official child repo for the driver app while resetting the repo to an empty shell and redefining the canonical docs around a real Android/iOS app direction.

**Architecture:** Product truth stays in root docs. Runtime implementation stays in the child repo. The current phase does not bootstrap a specific framework. It first restores the repo to a clean shell, rewrites the canonical docs so they no longer assume Expo or Flutter, and leaves one explicit next gate: choose the native framework, then scaffold.

**Tech Direction:** Real Android/iOS app, native-first product assumptions, framework `TBD`, no web-preview acceptance criteria, linked child repo workflow.

---

## 1. Status Summary (2026-04-21)

- [x] `front-driver-app` is registered as an official root child repo.
- [x] the child repo is reset to `origin/main` empty-shell state.
- [x] canonical root docs now describe the app as a native Android/iOS target with framework `TBD`.
- [ ] native framework selection decision is still pending.
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
3. framework wording is neutral until a separate decision is made.

## 3. Remaining Work

### Task 1: Choose the Native Framework

- [ ] Define the approved framework in canonical docs before any scaffold command runs.
- [ ] Evaluate candidates against these gates:
  - actual Android/iOS product fit
  - agent-friendly tooling and documentation
  - low-friction auth/session/storage integration
  - manageable native bridge complexity
  - beta delivery practicality
- [ ] Record the chosen framework and reject the non-chosen assumptions explicitly.

### Task 2: Bootstrap the Child Repo on the Approved Framework

- [ ] Create a feature branch in `development/front-driver-app/`.
- [ ] Scaffold the minimal app shell inside the child repo.
- [ ] Keep the shell minimal:
  - app launch succeeds
  - environment baseline is wired
  - tenant-fixed phase-1 work has a clean entry point

### Task 3: Verify Native Launch Baseline

- [ ] Verify one iOS simulator launch from the child repo.
- [ ] Verify one Android target launch from the child repo.
- [ ] Record the exact bootstrap and launch commands in docs after verification.

### Task 4: Hand Off to Cheonha Phase-1 App Work

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
rg -n "front-driver-app|Expo|expo|Flutter|flutter" \
  repo-map.md \
  docs/mappings/current-runtime-inventory.md \
  docs/contracts/21-design-system-and-surface-rules.md \
  docs/runbooks/front-driver-app-local-setup.md \
  docs/superpowers/specs/2026-04-21-cheonha-driver-app-minimum-design.md \
  docs/superpowers/plans
```

Expected:

- active docs do not instruct workers to bootstrap Expo or Flutter for `front-driver-app`
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

1. the native framework decision is fixed in canonical docs
2. the child repo bootstrap command set is agreed and verified
