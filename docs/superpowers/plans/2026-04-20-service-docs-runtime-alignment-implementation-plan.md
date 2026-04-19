# Service Docs Runtime Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit every active `service-*` repo README and `lesson.md`, then align them to the current production runtime and deploy truth without changing service boundaries or runtime code.

**Architecture:** Use the root platform docs as the canonical source of truth, then run one full documentation pass across every active `service-*` child repo. The work is audit-first: capture drift, batch fixes by domain family, and only then run a final consistency sweep back against root docs.

**Tech Stack:** Markdown docs, git child repos, ripgrep, shell verification, root platform docs (`WORKSPACE.md`, `repo-map.md`, `docs/mappings/current-runtime-inventory.md`, `docs/boundaries/*`, `docs/contracts/*`)

---

## Scope And Canonical Truth

This plan covers every active backend service repo under `development/service-*`.

The canonical truth for this doc-alignment wave is:

- [WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md)
- [repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md)
- [current-runtime-inventory.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md)
- active boundary docs in [docs/boundaries](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/boundaries)
- active contract docs in [docs/contracts](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts)
- runtime reset docs:
  - [2026-04-19-prod-runtime-release-reset-design.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-19-prod-runtime-release-reset-design.md)
  - [2026-04-19-prod-runtime-release-reset-implementation-plan.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-19-prod-runtime-release-reset-implementation-plan.md)

Every service-local doc update must agree with the following runtime/deploy facts:

- app repos are build/test/publish only for prod
- prod runtime rollout belongs to `runtime-prod-release`
- prod runtime shape and canonical inventory belong to `runtime-prod-platform`
- current prod runtime target is `EVDash-msa + /data`
- stale references to old deploy owners, bridge lanes, or old runtime layers must be either removed or clearly marked historical

## File Structure

### Root docs used as audit inputs

- Read only:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
  - relevant files under `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/boundaries/`
  - relevant files under `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/`

### New audit artifact

- Create:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md`

This checklist becomes the working audit ledger for all service repos. It should capture, per service:

- whether README matches current boundary
- whether README matches current prod deploy ownership
- whether README matches current runtime topology
- whether `lesson.md` contains outdated deploy/runtime truth
- whether the repo is clean after updates

### Service repo docs to audit and update

- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-announcement-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-announcement-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-operations-view/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-operations-view/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-notification-hub/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-notification-hub/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-organization-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-organization-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-personnel-document-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-personnel-document-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-analytics/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-analytics/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-support-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-support-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-assignment/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-assignment/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-operations-view/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-operations-view/lesson.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-registry/README.md`
- `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-registry/lesson.md`

## Audit Rules

Each service repo audit must check these exact drift categories:

1. boundary drift
   - README purpose/boundary disagrees with `repo-map.md` or boundary docs
2. runtime drift
   - README or lesson still describes an outdated runtime layer, host layout, or route truth
3. deploy ownership drift
   - README or lesson still treats the service repo as prod rollout owner
   - or still points to older canonical deploy lanes without clearly marking them as historical
4. stale topology drift
   - README or lesson still treats old ECS/Fargate/Service Connect, old central deploy, or old bridge lane as the current truth when that is no longer true
5. verification drift
   - local verification or smoke wording no longer matches the repo’s honest runtime surface
6. historical-reference drift
   - historical notes exist, but are written like current truth instead of clearly bounded history

Allowed outcome:

- a service repo may mention old deploy/runtime layers only if they are explicitly marked as historical context
- a worker like `service-telemetry-listener` may retain special notes such as `desired=0`, as long as that wording matches current inventory truth

## Task 1: Create The Audit Ledger

**Files:**
- Create: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md`
- Read:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`

- [ ] **Step 1: Create the checklist file with one section per active service repo**

The checklist must enumerate all 24 active service repos and give each repo these fields:
- boundary status
- runtime status
- deploy status
- verification status
- notes

- [ ] **Step 2: Record the canonical audit rules at the top of the checklist**

Copy the six drift categories above into the checklist so later workers use the same review standard.

- [ ] **Step 3: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md
git commit -m "docs: add service doc alignment checklist"
```

## Task 2: Run The First Full Audit Pass Across All Service Repos

**Files:**
- Read every `README.md` and `lesson.md` listed above
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md`

- [ ] **Step 1: Run a bulk drift search before manual reading**

Run:

```bash
rg -n "infra-ev-dashboard-platform|clever-deploy-control|Service Connect|service connect|Fargate|ECS|prod-shared|hub.evnlogistics.com|runtime-prod-release|runtime-prod-platform" /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-*/README.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-*/lesson.md
```

Expected: a drift candidate list, not a final truth judgment.

- [ ] **Step 2: Read every service README and lesson manually**

For each service repo:
- compare boundary wording with `repo-map.md`
- compare runtime wording with `current-runtime-inventory.md`
- compare deploy wording with runtime reset docs
- note whether old deploy/runtime references are still presented as current truth

- [ ] **Step 3: Mark each service in the checklist**

Expected outcome:
- every service gets a status note
- no service remains unclassified

- [ ] **Step 4: Commit the completed audit ledger**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md
git commit -m "docs: audit service repo doc drift"
```

## Task 3: Align Auth, Organization, Dispatch, And Settlement Service Docs

**Files:**
- Modify:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-organization-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-organization-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view/lesson.md`
- Modify checklist statuses for the same repos

- [ ] **Step 1: Rewrite boundary and deploy sections for this group**

Expected outcome:
- each README states build/test/publish-only prod ownership
- each README points prod rollout to `runtime-prod-release`
- each README points runtime shape truth to `runtime-prod-platform`

- [ ] **Step 2: Rewrite lesson wording that still implies older deploy/runtime truth**

Expected outcome:
- lessons keep useful repo-specific lessons
- stale deploy owner or topology wording is either deleted or explicitly marked historical

- [ ] **Step 3: Update checklist statuses for this group**

Expected: these repos move to aligned status.

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-account-access /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-organization-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-dispatch-operations-view /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-attendance-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-delivery-record /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-payroll /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-settlement-operations-view /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md
git commit -m "docs: align auth dispatch and settlement service docs"
```

## Task 4: Align Driver, Vehicle, Personnel, And Terminal Service Docs

**Files:**
- Modify:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-operations-view/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-operations-view/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-personnel-document-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-personnel-document-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-assignment/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-assignment/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-operations-view/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-operations-view/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry/lesson.md`
- Modify checklist statuses for the same repos

- [ ] **Step 1: Align README boundary/runtime wording for this group**

Expected outcome:
- no repo in this group claims shared deploy ownership
- route/runtime descriptions match current inventory and repo-map boundary wording

- [ ] **Step 2: Align lesson wording for this group**

Expected outcome:
- useful operational lessons remain
- outdated deploy layer references are removed or explicitly marked historical

- [ ] **Step 3: Update checklist statuses for this group**

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-profile /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-driver-operations-view /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-personnel-document-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-assignment /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-vehicle-operations-view /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-terminal-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md
git commit -m "docs: align driver vehicle and terminal service docs"
```

## Task 5: Align Telemetry, Region, Notification, Announcement, And Support Service Docs

**Files:**
- Modify:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-analytics/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-analytics/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-notification-hub/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-notification-hub/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-announcement-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-announcement-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-support-registry/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-support-registry/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter/README.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter/lesson.md`
- Modify checklist statuses for the same repos

- [ ] **Step 1: Align README boundary/runtime wording for this group**

Expected outcome:
- read-model, worker, and internal-only caveats stay honest
- stale deploy/runtime ownership wording is removed

- [ ] **Step 2: Align lesson wording for this group**

Expected outcome:
- worker-specific truths like `desired=0` remain if still valid
- anything that still frames old layers as current truth is corrected

- [ ] **Step 3: Update checklist statuses for this group**

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-region-analytics /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-notification-hub /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-announcement-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-support-registry /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-hub /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-listener /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-telemetry-dead-letter /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md
git commit -m "docs: align telemetry and support service docs"
```

## Task 6: Root-Level Truth Reconciliation

**Files:**
- Modify if needed:
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`
  - `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md`

- [ ] **Step 1: Re-read root docs after service updates**

Expected outcome:
- no service-local doc now contradicts root platform truth

- [ ] **Step 2: Update root truth docs only if the service pass exposed real root drift**

Do not churn root docs unless a service pass found an actual root inconsistency.

- [ ] **Step 3: Mark final checklist statuses**

Expected:
- every service repo marked aligned
- any intentionally historical exception explicitly called out

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-runtime-inventory.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/service-doc-alignment-checklist.md
git commit -m "docs: reconcile service doc alignment with root truth"
```

## Task 7: Final Verification Gate

**Files:**
- Verify all touched root docs and every touched `service-*` README/lesson

- [ ] **Step 1: Run drift search again**

Run:

```bash
rg -n "infra-ev-dashboard-platform|clever-deploy-control|Service Connect|service connect|Fargate|ECS|prod-shared|hub.evnlogistics.com" /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-*/README.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-*/lesson.md
```

Expected:
- only intentional historical references remain
- no stale deploy owner or stale runtime topology remains as current truth

- [ ] **Step 2: Manually inspect checklist completion**

Expected:
- all 24 service repos are marked
- each has a clear aligned or intentional-history status

- [ ] **Step 3: Review service repo cleanliness**

Run:

```bash
for d in /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/service-*; do
  echo "== $d =="
  git -C "$d" status --short
done
```

Expected:
- only intended doc edits remain before final merge or per-repo commit flow

- [ ] **Step 4: Commit any final checklist cleanup**

```bash
git add -A
git commit -m "docs: verify service doc runtime alignment"
```

## Acceptance Criteria

- every active `service-*` repo README and `lesson.md` has been read at least once during this wave
- every active `service-*` repo is listed in the alignment checklist
- no service README claims prod rollout ownership outside `runtime-prod-release`
- no service README treats `runtime-prod-platform` ownership as optional or ambiguous
- outdated deploy/runtime layers are either removed or clearly marked historical
- repo-local verification notes remain honest for worker/internal-only repos
- root truth docs and service-local docs no longer contradict each other
