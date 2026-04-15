# Platform Next Development And Deploy Scenarios Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the next development and deployment scenarios after `ev-dashboard` became the canonical `infra -> CDK/ECS -> prod` surface, and add the two parallel cleanup tracks the user requested: `archive/develop` removal and cross-service templating.

**Architecture:** Keep `ev-dashboard` release work as the primary operational lane, then run two parallel standardization lanes around it. One lane removes stale archive/develop leftovers from active operator paths, and the other introduces a light template baseline across service repos for deploy structure, directory layout, and hygiene files without forcing full code uniformity.

**Tech Stack:** Markdown plans, root docs, repo standards, deploy/runbook governance

---

### Scenario A: Canonical ev-dashboard Development And Deploy

**Intent:** Continue all real release work through the canonical path:

```text
GitHub main
-> immutable ECR SHA
-> infra-ev-dashboard-platform
-> temporary pre-prod lane
-> prod release
```

**Default order:**

- [ ] Keep all `ev-dashboard` runtime changes aligned to the current runbook set:
  - `docs/runbooks/ev-dashboard-preprod-release-gate.md`
  - `docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
  - `docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
  - `docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- [ ] Build once, prove the same SHA in temporary pre-prod, then promote the same SHA to prod.
- [ ] Treat `clever-deploy-control` only as bridge-lane or legacy reference, not as current runtime truth.
- [ ] Record every deploy change back into lesson and runbook documents immediately after release.

**Why this stays first:** It is the only current canonical runtime path. All other cleanup or standardization work must stay subordinate to this lane so operator truth does not drift again.

### Scenario B: `archive/develop` Removal Track

**Intent:** Remove stale archive/develop leftovers from active operator and development paths without destroying historical evidence that still belongs in `docs/archive/`.

**Working interpretation:**
- keep `docs/archive/` for retired historical documents
- remove or relocate anything in active paths that still behaves like an archived/develop leftover
- active docs, active runbooks, and active development repos should not point operators at stale develop/archive structures by default

**Planned work:**

- [ ] Audit root docs, runbooks, and development repo READMEs for references that still send operators to stale develop/archive paths.
- [ ] Move completed rollout artifacts that are still sitting in active plan folders into `docs/archive/historical/rollout/`.
- [ ] Remove orphaned or misleading development-era scaffolds from active guidance when they no longer match the canonical runtime.
- [ ] Preserve historical evidence by moving it, not by deleting operator history blindly.

**Guardrail:** This track is cleanup and reclassification work, not mass deletion of runtime repos or history. Anything with current operator value stays out of `archive/`.

Current progress:

- [x] dedicated cleanup plan written
- [x] first duplicate historical rollout batch removed from active `docs/rollout/plans/`
- [x] second historical move batch applied for completed activation/cutover records
- [ ] broader archive/develop audit and remaining move batch

### Scenario C: Cross-Service Template Baseline

**Intent:** Standardize service repo scaffolding where it improves maintainability and deploy consistency, without forcing every service into an identical code layout.

**What should be standardized:**

- [ ] deploy-facing directory structure where it repeats across service repos
- [ ] Dockerfile / entrypoint conventions where the runtime contract is the same
- [ ] `.gitignore` hygiene
- [ ] README sections for local run, image build, deploy contract, and environment files
- [ ] build workflow naming and baseline structure
- [ ] lesson file placement and update rule

**What should not be over-standardized:**

- [ ] internal business-module layout when service boundaries differ
- [ ] view/model/test layout if a repo already has a justified shape
- [ ] read-model and write-model repos forced into one artificial folder pattern

**Why this is separate from runtime migration:** Templating reduces repeated mistakes and onboarding friction, but it is a platform hygiene track. It must not block actual `ev-dashboard` release work unless a repo’s deploy contract is broken.

Current progress:

- [x] baseline spec written
- [x] rollout plan written
- [x] audit matrix created with first batch
- [x] first batch repo normalization patches

### Recommended Execution Order

1. `ev-dashboard` canonical development/deploy lane remains the default release path.
2. Start an `archive/develop` audit pass and move only clearly completed or stale items first.
3. Define a service-template baseline document before rewriting multiple repos.
4. Apply template changes incrementally to high-frequency repos first:
   - `front-web-console`
   - `edge-api-gateway`
   - `service-account-access`
   - `integration-local-stack`
5. Expand template cleanup to the remaining `service-*` repos once the baseline survives real usage.

### Deliverables Added

- [x] A dedicated `archive/develop` cleanup plan with an explicit move/delete list.
- [x] A service-template baseline spec describing which files and sections are mandatory and which remain repo-specific.
- [x] A service-template rollout plan that applies the baseline to repos in batches.

### Definition Of Done For This Plan

- [ ] Operators can explain the next work in three lanes:
  - canonical `ev-dashboard` release lane
  - archive/develop cleanup lane
  - service templating lane
- [ ] No one treats cleanup or templating as a replacement for the canonical deploy path.
- [x] The next concrete plans for cleanup and templating are written before any broad refactor starts.
