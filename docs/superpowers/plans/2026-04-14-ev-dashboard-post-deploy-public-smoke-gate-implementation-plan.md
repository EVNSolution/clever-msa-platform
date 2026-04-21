# EV Dashboard Post-Deploy Public Smoke Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automated post-deploy public smoke gate so `Deploy ev-dashboard ECS platform` only succeeds when the public edge also answers with the expected status codes.

**Architecture:** Keep the smoke logic in `development/infra-ev-dashboard-platform` as a small TypeScript module plus CLI entrypoint, similar to preflight. The workflow will run the smoke script after `cdk deploy` and fail the job if required public endpoints do not return the expected status codes for the currently enabled runtime slices.

**Tech Stack:** TypeScript, Jest, GitHub Actions, Node.js `fetch`, existing infra repo deploy workflow.

---

### Task 1: Add A Testable Post-Deploy Smoke Module

**Files:**
- Create: `development/infra-ev-dashboard-platform/lib/postDeploySmoke.ts`
- Create: `development/infra-ev-dashboard-platform/bin/postDeploySmoke.ts`
- Create: `development/infra-ev-dashboard-platform/test/postDeploySmoke.test.ts`
- Modify: `development/infra-ev-dashboard-platform/package.json`

- [ ] Step 1: Write failing Jest tests for the smoke target selection and status validation.
- [ ] Step 2: Run the new smoke test file and verify it fails for missing implementation.
- [ ] Step 3: Implement the minimal smoke module that:
  - reads domains and desired counts from env
  - decides which endpoints are mandatory
  - accepts `200`, `302`, `401` exactly where expected
  - reports failures with endpoint, expected status, actual status
- [ ] Step 4: Add a CLI entrypoint and `npm run smoke:postdeploy`.
- [ ] Step 5: Run the smoke test file again and verify it passes.

### Task 2: Enforce The Smoke Gate In Workflow And Docs

**Files:**
- Modify: `development/infra-ev-dashboard-platform/.github/workflows/deploy-ecs.yml`
- Modify: `development/infra-ev-dashboard-platform/README.md`
- Modify: `docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`
- Modify: `docs/runbooks/ev-dashboard-ecs-preflight-gate.md`
- Modify: `lesson.md`
- Modify: `development/infra-ev-dashboard-platform/lesson.md`

- [ ] Step 1: Add a workflow step after `cdk deploy` that runs `npm run smoke:postdeploy`.
- [ ] Step 2: Update the GitHub step summary so operators know public smoke is now part of the deploy gate.
- [ ] Step 3: Update runbooks and lessons so the live operator sequence becomes:
  - preflight
  - deploy
  - automatic post-deploy public smoke
  - manual browser/UI smoke only when needed
- [ ] Step 4: Run:

```bash
cd development/infra-ev-dashboard-platform
npm test -- --runInBand
```

- [ ] Step 5: Verify workflow YAML parses cleanly.
