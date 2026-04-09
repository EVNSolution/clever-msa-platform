# 2026-04-09 Development Linked Child Repos Migration Plan

## Goal

Move the root `clever-msa-platform` workspace from the current mixed `snapshot + linked repo` state to a consistent model where all independent repos under `development/` are represented as linked child repos.

## Phase 0. Governance Freeze

1. Approve the target representation in a design note.
2. Keep `development/front-web-console/` as the first linked child repo example.
3. Do not add new root-tracked snapshots for any additional child repo.

## Phase 1. Inventory The Current Root Representation

Create an inventory table for every first-level repo under `development/`.

For each repo, record:

1. repo path
2. current remote URL
3. current root representation
   - tracked snapshot
   - linked child repo
   - hidden / inconsistent
4. local operational sensitivity
   - low
   - medium
   - high
5. migration batch candidate

Expected outcome:

- a clear list of repos that still need conversion from root-tracked snapshot to linked child repo
- a clear list of high-risk repos that should migrate later

## Phase 2. Standardize The Conversion Procedure

Before batch migration, define one repeatable procedure.

Each repo conversion must include:

1. confirm child repo remote and current commit
2. remove root-tracked snapshot representation for that repo path
3. register the repo as a linked child repo entry from the root
4. confirm root GitHub visibility remains intact
5. confirm local clone/update instructions remain understandable
6. commit the conversion with a repo-specific message

This phase should produce a short runbook or checklist that every later batch follows.

## Phase 3. Convert Low-Risk Repos First

Start with repos that have low coordination risk and low day-to-day churn.

Recommended early batch candidates:

1. read-only or auxiliary operator UI repos
2. low-change supporting services
3. repos where child repo ownership is already obvious and actively maintained

Do not start with the busiest orchestration or policy-critical repos if an easier batch can prove the pattern first.

## Phase 4. Convert Core Runtime Repos In Batches

After the procedure is stable, convert the remaining snapshot-backed repos in batches.

Recommended batch grouping:

1. operator UI batch
2. auth/governance batch
3. settlement/delivery batch
4. telemetry/terminal batch
5. remaining domain services batch

Each batch should be small enough that rollback is obvious if the representation change causes confusion.

## Phase 5. Workspace Documentation Cleanup

After most repos are converted:

1. update `WORKSPACE.md`
2. update `repo-map.md`
3. update any onboarding docs that still imply root-tracked implementation snapshots are the normal representation
4. add a short note for contributors explaining that runtime code changes belong in child repos and root only exposes linked entries

## Exit Criteria

The migration is complete when:

1. all intended `development/*` repos are represented from the root as linked child repos
2. no intentional root-tracked implementation snapshots remain for active child repos
3. GitHub visibility is consistent across the `development/*` set
4. workspace docs describe one model instead of a mixed model

## Risks

1. local contributors may be used to root-tracked snapshots and may need updated workflow guidance
2. large-batch conversion can make history noisy if done without staging the rollout
3. a mixed state can linger too long if inventory and batching are not explicit

## Recommended Immediate Next Step

Create the inventory for all current `development/*` repos and classify each one as `tracked snapshot` or `linked child repo`.
