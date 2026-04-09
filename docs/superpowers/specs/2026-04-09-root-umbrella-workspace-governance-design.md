# 2026-04-09 Root Umbrella Workspace Governance Design

## Status

Adopted

## Context

`clever-msa-platform` root already behaves as an umbrella workspace on GitHub.

1. It is the active source of truth for architecture, mappings, contracts, rollout notes, and operating policy.
2. It also exposes the `development/*` implementation repos in the root workspace so operators and migration work can discover them from one place.

That reality means `development/front-web-console/` must not be treated as a special exclusion. Other `development/*` repos are already visible from the root repository. Hiding only the front repo creates an inconsistent workspace contract.

## Decision

The active rule is:

1. The root `clever-msa-platform` repo is the platform umbrella workspace.
2. The root owns docs, contracts, rollout notes, repo maps, and workspace policy.
3. Each child repo under `development/*` remains an independent implementation repo and the runtime source of truth for its own code.
4. The root GitHub view must expose `development/*` repos consistently. New child repos must not be selectively hidden from the root workspace.
5. When a child repo is already a nested git repo, the root may expose it as a linked child repo entry instead of pretending it is ordinary root-owned source.

## Immediate Consequences

1. `development/front-web-console/` must be visible from the root workspace like the other `development/*` repos.
2. The root `.gitignore` must not hide `development/front-web-console/`.
3. Child repo code changes still belong in the child repo first. The root workspace exists for umbrella visibility and platform coordination, not for replacing child repo ownership.

## Governance Rule

Short term:

1. Keep the root workspace and GitHub view consistent with the visible `development/*` repo map.
2. Do not create one-off exclusions for a single child repo.
3. Continue using child repos as the implementation authority for runtime code changes.

Long term:

1. Inventory which `development/*` repos are represented as tracked snapshots and which are represented as linked child repos.
2. Decide whether the umbrella workspace should standardize on one representation later.
3. Until then, consistency of visibility is more important than forcing a selective exception.

## Non-Goals

This decision does not:

1. Merge child repos back into a true monorepo.
2. Remove independent history from child repos.
3. Reclassify the root as the runtime source of truth for service code.
