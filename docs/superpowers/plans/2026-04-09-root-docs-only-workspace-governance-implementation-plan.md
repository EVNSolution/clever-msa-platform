# 2026-04-09 Root Docs-Only Workspace Governance Implementation Plan

## Goal

Align the active platform workspace with the rule that `clever-msa-platform` root owns docs and orchestration only, while each `development/*` repo owns its own implementation code.

## Step 1. Freeze the rule in current docs

1. Add a governance design note that states the root is docs-only.
2. Reflect the same rule in workspace-level onboarding docs.
3. Reflect the same rule in repo map guidance for `development/*` repos.

## Step 2. Stop new child repo ingestion at the root

1. Add ignore protection for `development/front-web-console/` in the root repo.
2. Treat the ignore as a protection against accidental embedded-repo tracking, not as a statement that the child repo does not exist.

## Step 3. Preserve historical state until explicitly retired

1. Do not use this cleanup step to rewrite or remove historical root-tracked implementation snapshots.
2. Treat those tracked snapshots as technical debt to be retired deliberately later.
3. Do not use their existence as justification for adding new child runtime code to the root.

## Step 4. Follow-up cleanup

1. Inventory root-tracked runtime files that still live under `development/`.
2. Decide which ones must stay temporarily and which ones should be removed from root tracking.
3. Replace any required visibility with docs, repo maps, rollout notes, or commit-reference manifests.

## Completion Criteria

1. Current docs consistently state that the root is docs-only.
2. `development/front-web-console/` no longer reappears as a new embedded repo candidate at the root.
3. Future cross-repo coordination work uses docs-first references instead of root-level runtime snapshots.
