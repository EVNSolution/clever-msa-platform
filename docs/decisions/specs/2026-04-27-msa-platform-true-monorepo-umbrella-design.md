# 2026-04-27 MSA Platform True Monorepo Umbrella Design

## Status

Approved for execution.

## Context

`clever-msa-platform` has been operated as a root umbrella workspace with many `development/*` child repositories exposed as submodules. That model kept service histories independent, but day-to-day platform work is now fragmented across many remotes, gitlinks, and local child repo states.

The active decision is to stop treating the root as a submodule launcher and make it the single monorepo umbrella for platform docs, runtime source, service slices, gateway, frontends, and production runtime control slices.

This supersedes the 2026-04-09 linked child repo governance steady state for active `development/*` directories.

## Decision

The target model is:

1. `clever-msa-platform` is the single Git repository for active CLEVER MSA platform work.
2. `development/*` directories become ordinary root-tracked source directories, not submodules.
3. Existing child repo remote URL, branch, and HEAD information is preserved in a migration manifest before nested Git metadata is detached.
4. Service boundaries remain logical and contractual boundaries even though they live in one Git repository.
5. Cross-service imports remain forbidden unless a future approved design explicitly changes that rule.
6. Root docs stay the architecture, mapping, rollout, and contract source of truth.

## Non-Goals

This migration does not merge service runtime boundaries.

It does not introduce shared base packages, cross-service imports, a single deployable application, or a shared database ownership model.

It does not delete historical child remotes. They can remain as read-only archive, mirror, or transition references outside the root source-of-truth path.

## Migration Shape

The migration starts by removing submodule wiring:

1. record a manifest of every nested `development/*` Git working tree
2. remove `.gitmodules`
3. remove root gitlink index entries
4. detach nested `.git` markers from `development/*`
5. clear local root `submodule.*` config
6. add previously tracked child files as ordinary root-tracked files
7. restore root-level CI/build entrypoints that used to live under child repo `.github/workflows`
8. run `scripts/verify/verify-monorepo-umbrella.sh`

Untracked files inside child working trees are preserved on disk but are not automatically imported unless explicitly added later.

## Required Invariants

1. `git ls-files -s development` must not contain mode `160000`.
2. `.gitmodules` must not exist.
3. No first-level `development/*/.git` marker may remain.
4. Root local Git config should not contain `submodule.*` entries after migration.
5. `docs/mappings/current-runtime-inventory.md` remains the runtime naming truth.
6. `docs/mappings/repo-responsibility-matrix.md` remains the service ownership truth.
7. image build workflows run from root `.github/workflows`, because nested `development/*/.github/workflows` files are retained as source history only and are not active GitHub Actions entrypoints.

## Operating Rule After Migration

New runtime slices are added as root-owned directories under `development/` and documented in root mappings first.

If a slice still needs an external standalone repository, that repository is a mirror or archive, not the source of truth, unless a future decision reopens the model.
