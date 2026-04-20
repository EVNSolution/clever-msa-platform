# 2026-04-20 Public OpenAPI Edge Ownership Design

## Purpose

This document fixes the stable ownership model for the public API documentation surface in the current CLEVER MSA runtime.

The immediate problem is not only broken GitHub Actions in the platform root.

The deeper problem is ownership drift:

- `clever-msa-platform` currently still carries API docs refresh workflow history even though the root is a docs-and-visibility umbrella
- `runtime-prod-release` owns production rollout but should not become the source of API contract truth
- the public routes `/openapi.yaml` and `/swagger/` are served through the API edge, but the ownership model for the underlying artifact is not yet fixed cleanly

This design sets one stable rule:

- public API docs surface ownership belongs to `edge-api-gateway`

## Problem Statement

The current state mixes four different concerns in the wrong places.

1. The platform root still looks like an API docs CI owner.
- That conflicts with `WORKSPACE.md`, which fixes the root as a docs-and-linked-child-repo umbrella rather than an execution repo.

2. Production rollout lives in `runtime-prod-release`.
- That repo should decide what image digest goes live in production.
- It should not become the primary owner of public OpenAPI content.

3. The actual public routes are edge routes.
- Operators and consumers reach API docs through `/openapi.yaml`, `/swagger/`, and `/redoc/`.
- Those routes belong to the public API entry surface, not to a release-control plane.

4. The underlying API docs artifact is not yet anchored to one runtime-facing repo.
- Today the root workflow history, service-local schema endpoints, and gateway exposure all suggest different owners.
- That makes failures hard to interpret and makes future cleanup ambiguous.

## Design Goal

The goal is a model that is easy to reason about in operations and hard to misread in code ownership.

The stable target is:

- `clever-msa-platform`
  - owns only docs, mappings, contracts, decisions, and umbrella visibility
- `service-*` repos
  - own service-local API schema exports and schema correctness
- `edge-api-gateway`
  - owns the public API docs artifact and public docs routes
- `runtime-prod-release`
  - owns release selection and production rollout of the edge image that contains the public docs artifact

## Decision

### 1. Public API docs surface is edge-owned

`edge-api-gateway` becomes the canonical owner of:

- public `/openapi.yaml`
- public `/swagger/`
- public `/redoc/`
- the public aggregated OpenAPI artifact used by those routes

This means:

- public API docs are treated as part of the API entry surface
- public docs move with the edge image
- docs availability becomes an edge runtime concern, not a platform-root workflow concern

### 2. The platform root stops owning executable API docs refresh workflows

`clever-msa-platform` must not own:

- public docs refresh workflows
- deploy workflows
- host provisioning workflows
- public docs release logic

The root remains the source of truth for design and boundary rules only.

The target end state for root `.github/workflows/` is:

- no deploy workflows
- no provisioning workflows
- no public API docs refresh workflow

If any workflow must continue temporarily during migration, it should be treated as migration residue, not as the target model.

### 3. Production release stays release-only

`runtime-prod-release` remains the only production rollout entrypoint.

Its job is:

- choose workload/image digests
- deploy the selected `edge-api-gateway` image
- record release evidence

Its job is not:

- generating public OpenAPI content
- serving Swagger
- acting as the canonical API docs source repo

### 4. Service repos remain schema producers, not public docs hosts

Each HTTP service repo owns its own service contract material.

The stable rule is:

- service repos produce service-local OpenAPI export or equivalent schema source
- edge consumes those inputs and assembles the public aggregated artifact
- public consumers do not need to discover or browse each service repo separately

## Ownership Model

### `clever-msa-platform`

Owns:

- policy
- mappings
- contracts
- design docs
- runbooks that describe ownership

Does not own:

- public OpenAPI artifact generation
- public Swagger runtime routes
- deploy-time docs gate logic

### `service-*` repos

Own:

- service-local OpenAPI export
- service route/schema correctness
- repo-local tests for schema availability where relevant

Do not own:

- production public aggregated docs endpoint
- production public Swagger UI

### `edge-api-gateway`

Owns:

- public docs entry routes
- public aggregated OpenAPI artifact
- Swagger UI and Redoc UI wiring
- refresh/build workflow for the public docs artifact
- packaging the public docs artifact into the edge runtime image

This ownership is the key stabilizing move in this design.

### `runtime-prod-release`

Owns:

- deployment of the edge image
- release evidence for the deployed edge artifact
- linkage between deployed edge digest and the public docs snapshot contained in that image

Does not own:

- authoring the public docs artifact

## Public Route Contract

The public contract is fixed as:

- `/openapi.yaml`
  - canonical machine-readable public API specification
- `/swagger/`
  - human-facing interactive documentation UI that reads `/openapi.yaml`
- `/redoc/`
  - optional secondary human-facing documentation UI that reads `/openapi.yaml`

Operationally, the most important truth is `/openapi.yaml`.

`/swagger/` and `/redoc/` are views over that artifact.

Therefore:

- artifact correctness is anchored on `/openapi.yaml`
- UI availability is secondary to artifact availability

## Artifact Model

The public docs artifact should be a static, versioned file owned by `edge-api-gateway`.

The target model is:

- edge build produces or packages a single public aggregated OpenAPI artifact
- the edge runtime serves that file directly
- Swagger UI and Redoc read the same served artifact

This design intentionally rejects a production model where `/openapi.yaml` is generated on-demand by proxying a live upstream service at request time.

Why:

1. request-time proxying couples docs availability to one upstream service being healthy
2. it makes docs behavior drift from the released edge image
3. it hides which docs snapshot actually belongs to the live runtime

## Build And Refresh Model

### Stable target

The stable target is:

- edge repo workflow refreshes the public OpenAPI artifact
- refreshed artifact is committed or packaged in the edge repo
- edge image contains the exact artifact that production serves

### Inputs

The public aggregation step reads:

- service-owned OpenAPI exports when available
- edge-owned overlays and public-route metadata
- temporary fallback metadata only for services that have not yet adopted service-owned export

### Temporary migration fallback

During migration, not every service repo may provide a ready export.

Therefore version 1 may temporarily allow:

- route inventory fallback
- explicitly documented overlay-only sections

But the fallback is transitional only.

The long-term target is:

- public aggregated OpenAPI is built primarily from service-owned exports

## Release Coupling

Public docs should not be released by a separate root-repo workflow.

Instead:

1. edge repo refreshes or updates the public docs artifact
2. edge repo builds an image that contains that artifact
3. `runtime-prod-release` deploys that edge image
4. release evidence records the edge digest and the included docs revision

This couples docs to runtime in an honest way:

- no separate docs deploy lane
- no root-repo docs freshness gate
- no ambiguity about which docs snapshot belongs to the live edge

## Root Workflow Policy

The target root policy is strict:

- delete `central-deploy.yml`
- delete `central-deploy-dispatch.yml`
- delete `provision-ec2-app-host.yml`
- delete `refresh-api-docs.yml`

After cleanup, this repo should not be interpreted as either:

- deploy control plane
- provisioning control plane
- public API docs execution repo

## Active Docs Cleanup Rule

`clever-deploy-control` is a retired concept for current truth.

Active docs must stop using it as:

- deploy entrypoint
- docs gate owner
- rollout source of truth
- API docs coupling point

The active replacement language is:

- public docs surface owner: `edge-api-gateway`
- production rollout owner: `runtime-prod-release`
- production runtime inventory owner: `runtime-prod-platform`

Any active doc that still names `clever-deploy-control` as current truth is incorrect under this design.

## Rejected Approaches

### 1. Keep public API docs workflow in `clever-msa-platform`

Rejected because:

- the root is not an execution repo
- public docs are runtime-facing edge surface, not umbrella-docs-repo surface
- this keeps the current ownership drift alive

### 2. Move public docs ownership to `runtime-prod-release`

Rejected because:

- release control is not API contract authorship
- this would mix release evidence with public API product ownership
- operators would still need another repo to understand the entry surface

### 3. Let one backend service remain the public Swagger source indefinitely

Rejected because:

- the public API surface is broader than a single service boundary
- the public docs route should remain stable even if one upstream service changes internal schema wiring
- the edge is the correct public surface owner

## Migration Sequence

1. Write this ownership rule into active docs.
2. Remove root deploy/provision/public-docs workflows from `clever-msa-platform`.
3. Add public docs artifact ownership and refresh/build workflow to `edge-api-gateway`.
4. Keep `/openapi.yaml`, `/swagger/`, and `/redoc/` publicly routed from edge.
5. Make `runtime-prod-release` treat docs as part of the deployed edge image, not as a separate gate.
6. Remove active references that describe `clever-deploy-control` as current deployment or docs truth.

## Acceptance Criteria

This design is active when:

1. `clever-msa-platform` no longer contains deploy, provisioning, or public API docs workflows.
2. `edge-api-gateway` owns the public OpenAPI artifact and serves `/openapi.yaml`.
3. `edge-api-gateway` owns the Swagger UI route and serves `/swagger/`.
4. `runtime-prod-release` remains the only production rollout entrypoint.
5. active docs no longer describe `clever-deploy-control` as current truth.
6. the public docs snapshot moves to production only through the deployed edge image.
