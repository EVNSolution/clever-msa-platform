# 2026-04-09 Image Deploy Operating Policy

## Purpose

This document fixes the standard operating rule for CLEVER MSA image deployments after the ECR-based rollout baseline was established.

The rule is simple:

- service repos produce images
- the central control repo performs deployments
- local UI and UX work is verified against the integrated local stack before rollout
- the default deployment unit is a release bundle, not an immediate per-repo deploy

## Source of Truth

- Platform policy and planning live in this repository.
- Central deploy runtime, workflows, and runbooks live in `clever-deploy-control`.
- Service repos own only application code and image production.

## Default Operating Model

### 1. Service repos are build-only

For image-migrated services, a service repo change should normally do only this:

- build Docker image
- push image to ECR
- record the resulting image tag through the normal GitHub Actions evidence trail

The service repo should not be treated as the primary deployment entrypoint.

### 1a. Local integrated verification comes before rollout

UI and UX work must not be judged only from an isolated frontend dev server.

The normal verification path is:

1. complete the change locally
2. verify it against the integrated local stack in `development/integration-local-stack`
3. include any required gateway or backend changes in the same local validation cycle
4. only after that, build images and hand rollout to the central deploy repo

This rule exists because many UX changes in CLEVER MSA depend on gateway routing, auth state, error envelopes, and service contract changes.

### 1b. Frontend edit loop must not rebuild Docker images on every save

During active frontend work, the normal local loop is:

1. keep the integrated backend and gateway stack running from `development/integration-local-stack`
2. run the frontend with the host dev server from the child repo
3. use the frontend dev server for rapid UI iteration and HMR
4. use Docker image rebuild only for final integrated verification, not for each edit

The standard split is:

- `http://localhost:5174` = frontend dev loop
- `http://localhost:8080` = integrated gateway and backend verification

This rule exists because repeated `docker build` on frontend edits adds avoidable Docker Desktop latency without improving the normal UI feedback loop.

### 2. Central deploy repo is deploy-only

Actual runtime rollout should happen from `clever-deploy-control`.

The central repo is responsible for:

- release target selection
- matrix and wave orchestration
- SSM dispatch
- host-side image state coordination
- rollout evidence
- rollback coordination

### 3. Default deployment unit is a release bundle

When multiple repos changed during the same working cycle, the normal path is:

1. finish code changes in each affected service repo
2. build and push images for each affected service
3. define the release candidate service set
4. execute one central matrix deploy for that set

This avoids fragmented host state and reduces partial-rollout drift.

### 4. Matrix + wave is the standard rollout path

The standard release path is:

`service repo build -> ECR push -> central matrix deploy -> wave execution on EC2 hosts`

Direct one-off host manipulation is not the standard workflow.

### 4a. Central deploy checks API docs freshness before rollout

The central deploy repo should check platform API docs freshness before rollout begins.

The default rule is:

- `clever-deploy-control` checks the latest `refresh-api-docs.yml` run on `clever-msa-platform` `main`
- if the latest run is not successful, rollout stops
- an operator can bypass the gate only through an explicit exception input

This keeps API docs refresh coupled to rollout evidence without moving deploy ownership back into service repos.

## Environment Template Rule

`integration-local-stack` maintains separate environment template sets for local verification and deployed runtime.

- local verification templates live in `development/integration-local-stack/infra/env/local/`
- deployed runtime templates live in `development/integration-local-stack/infra/env/deploy/`

The rule is:

- local compose uses `local/`
- deploy compose uses `deploy/`
- local-only conveniences such as debug flags must not leak into deploy templates

## Release Candidate Rule

A release candidate bundle is the set of image-backed services that should move together in one rollout.

The bundle should include:

- every service changed in the current work cycle
- any image-backed dependency that must move with them for runtime compatibility

The bundle should be handed to the central deploy workflow as one target list.

## Exceptions

The default rule can be bypassed only in explicit cases.

### Allowed exceptions

- emergency production hotfix explicitly approved for single-target rollout
- verification of a non-migrated service that still uses source deploy
- temporary UI-only validation where the user explicitly asks for immediate deployment
- explicit API docs gate bypass for a release that is approved to roll out without waiting for a fresh docs-success signal

### Non-default behavior

If an exception is used, it should be called out as an exception, not treated as the new standard.

## Agent Working Rule

When operating on CLEVER MSA deployable repos:

- do not immediately deploy from a service repo after each code change
- prefer finishing the image build first
- prefer handing deployment to `clever-deploy-control`
- prefer one matrix deploy for the full release candidate bundle
- use direct single-target deployment only when the user explicitly asks for the exception path
- treat API docs freshness check as part of the normal central deploy path, not as an optional follow-up task

## Implications for Ongoing Migration

This policy applies only to image-migrated services.

Services that still use source deploy may temporarily continue under the old contract, but the target end state remains:

- service repo: image producer
- central repo: deploy orchestrator

## Completion Criteria for This Policy

This policy is considered active when:

- new deployment work follows build-only in service repos
- central deploy is the normal rollout entrypoint
- image-backed changes are grouped into release bundles by default
