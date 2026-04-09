# API Docs Deploy Gate Design

## Purpose

This document fixes the policy for how central deploy should treat Swagger/OpenAPI refresh state.

The current CLEVER MSA baseline already has an API docs refresh pipeline:

- source workflow: `clever-msa-platform/.github/workflows/refresh-api-docs.yml`
- output artifact: `clever-current-msa-api-docs`

The missing piece is rollout coupling.

At the moment:

- platform CI can refresh API docs
- central deploy can roll out release bundles
- but deploy success does not prove that the latest API docs refresh run succeeded

This document defines the deploy-time gate that closes that gap.

## Problem Statement

The current split creates two risks.

1. API contract documentation can drift silently from runtime rollout.
- A service image may roll out after API-affecting changes.
- The platform refresh pipeline may have failed or may not have been reviewed.
- Central deploy still succeeds.

2. Operators do not get one release-time signal.
- API docs refresh lives in the platform repo.
- rollout lives in `clever-deploy-control`.
- without a gate, the operator has to remember a separate manual check.

## Design Goal

The goal is not to make docs generation part of a service repo deploy.

The goal is:

- keep service repos build-only
- keep central repo deploy-only
- make central deploy verify API docs freshness before rollout
- allow an explicit operator exception for emergency cases

## Decision

Central deploy will enforce an API docs freshness gate with an explicit skip path.

### Default mode

- gate mode: `enforce`
- deploy checks the latest `refresh-api-docs.yml` run on `clever-msa-platform` `main`
- if that run is not successful, deploy stops before wave execution

### Exception mode

- gate mode: `skip`
- deploy records that the gate was bypassed
- this mode is for emergency or explicitly approved exception rollouts only

## Why This Design

### 1. It preserves the build-only / deploy-only split

The service repos still do not deploy.

The central repo still owns rollout orchestration.

The only change is that deploy orchestration now verifies one more release precondition.

### 2. It creates one operator checkpoint

The operator sees API docs freshness in the same workflow that decides wave rollout.

This is better than a runbook-only reminder.

### 3. It avoids a fragile hard coupling to every changed service

Version 1 does not compute per-service schema drift.

Instead it asks a simpler question:

- did the latest platform API docs refresh run on main complete successfully?

This is strong enough to raise the bar immediately and simple enough to operate.

## Gate Contract

### Inputs

`clever-deploy-control` exposes:

- `api_docs_gate=enforce`
- `api_docs_gate=skip`

### External dependency

The central deploy workflow needs read access to Actions runs in `EVNSolution/clever-msa-platform`.

Required secret:

- `GH_ACTIONS_CLEVER_PLATFORM_READ_TOKEN`

The token should have read access only to what is needed to query workflow run state.

### Check logic

Central deploy queries:

- repository: `EVNSolution/clever-msa-platform`
- workflow file: `refresh-api-docs.yml`
- branch: `main`

Pass condition:

- latest workflow run on `main` has `status=completed`
- latest workflow run on `main` has `conclusion=success`

Fail condition:

- no run exists
- latest run is in progress
- latest run is failed, cancelled, or timed out
- required read token is missing while gate mode is `enforce`

## Scope

### In scope

- central deploy input and gate job
- deploy summary output
- runbook wording for exception handling
- platform operating policy wording

### Out of scope

- per-service OpenAPI diffing
- schema compatibility enforcement per target service
- artifact content checksum verification
- gateway or backend runtime route changes

## Operational Rule

The standard path is:

1. service repos build images
2. platform repo refreshes API docs through its CI workflow
3. central deploy checks API docs freshness
4. central deploy executes matrix and wave rollout

The exception path is:

1. operator sets `api_docs_gate=skip`
2. deploy summary records the bypass
3. rollout proceeds under explicit exception

## Future Extension

Later versions can make the gate stricter by adding one or more of these:

- check the refresh artifact exists and can be downloaded
- compare release bundle targets against schema-backed services
- verify that the refresh run happened after a known platform commit window

Those are later refinements.

The current decision is only to make freshness visible and blocking by default.
