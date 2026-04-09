# 2026-04-09 Development Linked Child Repos Governance Design

## Status

Proposed

## Context

The current `clever-msa-platform` root mixes two different representations for repos under `development/`.

1. Most `development/*` repos are still represented as root-tracked snapshots.
2. `development/front-web-console/` is now represented as a linked child repo entry.

That mixed state is not a stable end state.

It creates three problems.

1. GitHub visibility becomes inconsistent across child repos.
2. Ownership boundaries are blurred because some child repos look root-owned while others look independently linked.
3. Routine workspace maintenance becomes harder because root history contains implementation snapshots that do not match the actual repo boundary model.

## Decision

The target end state is:

1. Every independent repo under `development/` is represented from the root in the same way.
2. The chosen representation is `linked child repo` for all independent implementation repos.
3. The root `clever-msa-platform` repo remains the umbrella workspace for platform docs, contracts, rollout notes, repo map, and linked repo visibility.
4. Each child repo remains the implementation source of truth for its own code and history.

In practice, the root should expose child repos as linked repo entries rather than continuing to carry long-lived tracked snapshots of their code.

## Why Linked Child Repos

This direction is preferred over continuing root-tracked snapshots.

1. It matches the actual ownership model: each `development/*` repo already has its own git history and remote.
2. It removes ambiguity about where implementation changes belong.
3. It preserves umbrella visibility in the root GitHub repository.
4. It avoids the current special-case problem where one child repo is linked and the rest are snapshot-backed.

## Scope

This rule applies to independent implementation repos under `development/`, including but not limited to:

- `front-*`
- `edge-*`
- `service-*`
- `integration-local-stack`

It does not apply to root-owned docs, contracts, rollout notes, or workspace governance files.

## Migration Principle

The migration must be phased, not done as a single big-bang rewrite.

1. Freeze the target model in docs.
2. Inventory how each current `development/*` repo is represented from the root.
3. Convert snapshot-backed repos into linked child repos in controlled batches.
4. Validate that GitHub visibility, workspace clone flow, and local operator workflows still work after each batch.

## Required Invariants

During and after migration:

1. Every `development/*` repo that is meant to be visible from the root remains visible from the root.
2. No repo is hidden from the root GitHub view by ad hoc ignore rules.
3. Runtime code edits continue to happen in the child repo first.
4. The root does not become the runtime source of truth for implementation code.

## Non-Goals

This decision does not:

1. Merge all child repos into a monorepo.
2. Remove child repo remotes or independent commit history.
3. Change service boundaries.
4. Change deployment topology.

## Final Decision Summary

1. `development/*` representation must be consistent across child repos.
2. The target consistent representation is `linked child repo`.
3. Root-tracked implementation snapshots are legacy state to be retired in phases.
4. The root remains an umbrella workspace, not a monolithic implementation repo.
