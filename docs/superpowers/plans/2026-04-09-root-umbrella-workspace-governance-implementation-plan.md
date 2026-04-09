# 2026-04-09 Root Umbrella Workspace Governance Implementation Plan

## Goal

Align the active platform workspace with the rule that `clever-msa-platform` root is the umbrella GitHub workspace for platform docs and `development/*` repo visibility, while each child repo remains the implementation source of truth for its own runtime code.

## Step 1. Freeze the umbrella rule in current docs

1. Replace the incorrect docs-only framing.
2. State that root GitHub must expose `development/*` repos consistently.
3. State that child repos remain authoritative for implementation changes.

## Step 2. Remove selective exclusions

1. Remove any root ignore rule that hides `development/front-web-console/`.
2. Ensure the root workspace exposes the front repo again.
3. Do not create front-only exceptions while other `development/*` repos remain visible.

## Step 3. Preserve ownership boundaries

1. Keep implementation edits in the child repos first.
2. Keep platform contracts, rollout notes, and repo governance in the root.
3. Use the root workspace for umbrella visibility, not for denying child repo existence.

## Step 4. Follow-up cleanup

1. Inventory how each `development/*` repo is represented in the root workspace.
2. Decide later whether to standardize on tracked snapshots, linked child repos, or another explicit umbrella pattern.
3. Do not let that longer-term cleanup block immediate visibility consistency.

## Completion Criteria

1. Current docs describe the root as the umbrella workspace rather than a docs-only repo.
2. `development/front-web-console/` is visible from the root workspace again.
3. The workspace contract is explicit: root for platform coordination, child repos for implementation ownership.
