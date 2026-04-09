# 2026-04-09 Root Docs-Only Workspace Governance Design

## Status

Adopted

## Context

`clever-msa-platform` root has two overlapping behaviors today.

1. It is the active platform source of truth for architecture, mappings, contracts, rollout notes, and operating policy.
2. It also still contains historical tracked snapshots from some repos under `development/`.

That mixed state caused a governance problem around `development/front-web-console/`. The repo is an independent implementation repo, but the root workspace can still see it as an embedded git repository and attempt to re-track it. That is not a valid ownership model for the active MSA workspace.

## Decision

The active rule is:

1. The root `clever-msa-platform` repo is docs-only.
2. Runtime implementation code under `development/` belongs to each independent child repo.
3. The root repo must not newly track child runtime code, whether by file snapshot, embedded repo, or accidental whitelist.
4. Cross-repo visibility from the root must be expressed through docs, contracts, rollout notes, repo maps, or commit references. It must not be expressed by re-ingesting child repo code into the root.

## Immediate Consequences

1. `development/front-web-console/` must remain owned by the `front-web-console` repo only.
2. The root workspace must ignore that child repo so it does not reappear as an embedded repository candidate.
3. Historical tracked code that still exists under some `development/*` paths is treated as existing technical debt, not as precedent for adding more child runtime code into the root.

## Migration Rule

Short term:

1. Freeze the docs-only rule in workspace docs.
2. Prevent new child code ingestion from the root.
3. Keep historical tracked snapshots unchanged unless a focused cleanup plan explicitly removes them.

Long term:

1. Inventory remaining root-tracked implementation snapshots under `development/`.
2. Decide which ones should be removed from the root or replaced by commit-reference manifests.
3. Continue treating each `development/*` repo as the only runtime source of truth for its code.

## Non-Goals

This decision does not:

1. Merge child repos back into the root workspace.
2. Convert child repos into submodules.
3. Reclassify the root as a monorepo.
