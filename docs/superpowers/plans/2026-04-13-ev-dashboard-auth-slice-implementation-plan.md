# EV Dashboard Auth Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring up the first `api.next.ev-dashboard.com` auth/docs/admin slice on ECS by adding dedicated `service-account-access` Postgres and Redis infrastructure plus the required runtime wiring.

**Architecture:** Keep `front-web-console` as the already-validated front-only pilot, then extend `infra-ev-dashboard-platform` so `service-account-access` gets its own managed data stores and ECS env wiring. `edge-api-gateway` remains the public API entrypoint, but this phase only guarantees `/api/auth/*`, `/openapi.yaml`, `/swagger/`, `/redoc/`, and `/admin/account-access/`.

**Tech Stack:** AWS CDK (TypeScript), ECS/Fargate, ALB, Route53, ACM, RDS PostgreSQL 16, ElastiCache Redis, Secrets Manager, GitHub Actions, OIDC, Django/Gunicorn, Nginx.

**Status:** Implemented on 2026-04-14 KST. External smoke proved the auth/docs/admin slice on `api.next.ev-dashboard.com`.

---

### Task 1: Lock The Auth Slice Boundary In Docs

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/plans/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [x] Write the auth-slice scope update before code changes.
- [x] State that this phase adds dedicated `service-account-access` Postgres and Redis, not the full backend graph.
- [x] Record that `api.next.ev-dashboard.com` success in this phase means auth/docs/admin only.
- [x] Verify with `git diff --check -- docs/rollout/plans/2026-04-13-ev-dashboard-domain-ecs-cutover-plan.md docs/rollout/2026-04-13-ecs-cdk-oidc-actions-transition.md lesson.md`.

### Task 2: Add Failing Infra Tests For Data Resources

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/config.test.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/test/ev-dashboard-platform-stack.test.ts`

- [x] Write a failing config test for private subnet parsing and auth-slice runtime env defaults.
- [x] Write a failing stack test that expects a dedicated Postgres instance, Redis resource, and ECS secret/env wiring for `service-account-access`.
- [x] Run `npm test -- --runInBand` in `development/infra-ev-dashboard-platform` and confirm the new assertions fail for the expected reason.

### Task 3: Implement Dedicated service-account-access Data Infrastructure

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/config.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lib/ev-dashboard-platform-stack.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/README.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`

- [x] Add private subnet config inputs for stateful resources.
- [x] Create dedicated `service-account-access` Postgres 16 in private subnets.
- [x] Create dedicated Redis in private subnets for refresh/lockout state.
- [x] Generate and inject the required Django/JWT/database secrets and env values into the `service-account-access` task definition.
- [x] Keep `publiclyAccessible` disabled and only allow ingress from the ECS service security group.
- [x] Re-run `npm test -- --runInBand` and `npx cdk synth`.

### Task 4: Configure Dev Runtime Variables And Rehearse The Auth Slice

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform/lesson.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md`

- [x] Set the new private subnet variables in `EVNSolution/infra-ev-dashboard-platform`.
- [x] Raise `GATEWAY_DESIRED_COUNT=1` and `ACCOUNT_ACCESS_DESIRED_COUNT=1` for the dev environment.
- [x] Run the deploy workflow with explicit image URIs.
- [x] Smoke-check:
  - `https://api.next.ev-dashboard.com/api/auth/health/`
  - `https://api.next.ev-dashboard.com/openapi.yaml`
  - `https://api.next.ev-dashboard.com/swagger/`
  - `https://api.next.ev-dashboard.com/redoc/`
  - `https://api.next.ev-dashboard.com/admin/account-access/`
- [x] Record failures and final boundary notes in lesson/docs.
