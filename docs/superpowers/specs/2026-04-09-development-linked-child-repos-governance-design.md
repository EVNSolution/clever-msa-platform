# 2026-04-09 Development Linked Child Repos Governance Design

## Status

Accepted and implemented

## Context

`clever-msa-platform` root now exposes every active first-level repo under `development/` as a linked child repo.

The earlier mixed `tracked snapshot + linked child repo` state has been retired.

This governance note records the steady-state rule going forward.

## Decision

The workspace model is:

1. every active independent repo under `development/` is represented from the root as a linked child repo
2. the root `clever-msa-platform` repo remains the umbrella workspace for platform docs, contracts, rollout notes, repo map, and linked repo visibility
3. each child repo remains the implementation source of truth for its own code and history
4. future `development/*` additions must start as linked child repos, not root-tracked snapshots

## Why This Is The Stable Model

1. it matches the actual ownership model because each `development/*` repo already has its own git history and remote
2. it keeps GitHub visibility consistent across the entire `development/*` set
3. it removes ambiguity about where implementation changes belong
4. it prevents the root repo from drifting into an implementation snapshot repo again

## Scope

This rule applies to independent implementation repos under `development/`, including:

- `front-*`
- `edge-*`
- `service-*`
- `integration-local-stack`

It does not apply to root-owned docs, contracts, rollout notes, or workspace governance files.

## Required Invariants

1. every active `development/*` repo remains visible from the root as a linked child repo
2. root must not reintroduce root-tracked implementation snapshots for active child repos
3. runtime code edits continue to happen in the child repo first
4. root does not become the runtime source of truth for implementation code

## Operational Rule

When a new implementation repo is added under `development/`:

1. create or confirm the independent child repo remote first
2. register it from the root as a linked child repo immediately
3. update workspace docs or inventory only if contributor guidance changes

## Non-Goals

This decision does not:

1. merge child repos into a monorepo
2. remove child repo remotes or independent commit history
3. change service boundaries
4. change deployment topology

## Final Decision Summary

1. `development/*` representation is standardized as `linked child repo`
2. the earlier snapshot-backed representation is retired for active child repos
3. root stays an umbrella workspace, not a monolithic implementation repo
4. future repos under `development/` must follow the linked child repo rule from day one
