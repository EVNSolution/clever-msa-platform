# 2026-04-19 Prod Runtime Release Reset Design

## Purpose

This document fixes the target operating model for a new production-only deployment system for the current CLEVER MSA runtime.

The reset boundary is intentionally narrow:

- keep the current service layer and frontend repo structure
- keep the current business-domain boundaries
- redesign only the production runtime release system

The goal is operational stability for `prod`, not a generalized multi-environment platform.

## Product-Level Objective

Production deployment must become one standard runtime release path.

The target operator experience is:

- application repos build and publish immutable images
- one production release system decides what moves to runtime
- infrastructure shape changes stay separate from runtime release
- release selection is based on image digest and release manifest, not mutable tags

The production release system must not depend on stale manual inputs such as subnet ids, security group ids, or ad hoc instance lookup values during normal application rollout.

## Deployment Architecture

The confirmed operating model is:

- single EC2 runtime host
- attached EBS data volume
- single prod release repo
- separate prod platform repo for runtime shape

This means:

- the canonical production runtime host is one EC2 instance named `EVDash-msa`
- runtime data persists on one attached EBS volume mounted at `/data`
- application containers, PostgreSQL, and Redis run on the same runtime host in this first production reset phase
- application rollout is handled by one dedicated production release control plane
- runtime shape ownership remains separate in a newly created prod platform repo

## Runtime Release Model

### 1. App repos are build-only

All application repos are fixed as:

- build
- test
- publish immutable image

They do not perform production rollout jobs.

Their runtime-facing contract is:

- produce an immutable image
- publish image metadata
- hand off runtime selection to the production release system

### 2. Production rollout is centralized

Production rollout is owned by one dedicated repo:

- `runtime-prod-release`

This repo is the only production deployment entrypoint.

It owns:

- `prod` GitHub environment approvals
- production release concurrency
- release manifest resolution
- AWS OIDC runtime authentication
- SSM-based EC2 rollout execution
- release evidence
- scoped smoke and rollback control

### 3. Infra remains separate

A new dedicated prod platform repo owns runtime shape:

- `runtime-prod-platform`

The existing `infra-ev-dashboard-platform` repo is not reused as the canonical source for this prod runtime reset.

- ALB
- EC2 hosts
- security groups
- Route53
- secrets and runtime wiring
- infrastructure-level shape changes

It does not decide which application version is released to production on a given day.

## Release Identity

The release identity is:

- workload item
- image digest
- target host group
- deploy method
- healthcheck contract
- rollback target

The production system must not use mutable image tags as rollout truth.

The canonical runtime release input is a release manifest whose items are pinned to immutable image digests.

The release unit is fixed as:

- workload

The repo remains source-ownership metadata only.

The runtime control plane must reason in workload units, not repo units.

## Release Manifest Model

The production release system separates:

1. release intent input
2. resolved rollout plan

The operator-facing release intent contains only the requested release input.

Each release intent item must contain at least:

- `workload_id`
- `repo`
- `image_digest`
- `release_reason`

The release system then resolves the rollout plan from:

- infra-owned canonical inventory
- workload metadata
- rollback evidence

Each resolved rollout plan item must contain at least:

- `workload_id`
- `repo`
- `image_digest`
- `target_host_group`
- `deploy_method`
- `healthcheck`
- `rollback_target`

The system does not use fixed predeclared bundles such as a permanent `settlement bundle` or `vehicle bundle`.

Instead, the release intent starts from explicitly selected changed items and expands into a resolved rollout plan only when impact rules require companion items.

### Canonical manifest semantics

- `workload_id`
  - the canonical runtime release unit
- `repo`
  - source repo metadata only
- `image_digest`
  - immutable release artifact
- `release_reason`
  - operator-supplied release context only
- `target_host_group`
  - not a free-form operator field
  - resolved from infra-owned canonical runtime inventory
- `deploy_method`
  - not selected per release
  - derived from workload class metadata
- `healthcheck`
  - workload-owned health assertion contract
- `rollback_target`
  - the last successful release item for that workload

### Host group ownership

`target_host_group` is owned by infra truth, not by release-time operator choice.

The canonical source is an infra-owned runtime inventory that maps:

- `workload_id`
- workload class
- target host group
- deploy method
- healthcheck contract

The release repo may resolve this inventory, but it does not invent or override it during routine production rollout.

For the first production reset phase, the canonical inventory resolves every workload to one runtime target:

- `target_host_group = evdash-msa`

That host group maps to:

- EC2 instance name `EVDash-msa`
- attached EBS volume mounted at `/data`
- one shared host-local runtime for app containers, PostgreSQL, and Redis

### Deploy method ownership

`deploy_method` is fixed by workload class.

The release repo does not choose deployment mechanics item by item.

The starting policy is:

- `entry`
  - `compose`
- `core-api`
  - `compose`
- `worker`
  - `systemd`
- `consumer`
  - `systemd`

The runtime inventory may refine classes, but release-time choice remains disallowed.

### Rollback target ownership

`rollback_target` is the last successful release item for the same workload.

The minimum rollback evidence is:

- `image_digest`
- applied config revision
- smoke pass record

Rollback is therefore pinned to the most recent successful applied item, not an abstract label.

## Manifest Expansion Rules

The confirmed rule is:

- no fixed bundle model
- workload-level image release by default
- manifest-based dynamic expansion when runtime impact requires companion rollout

### Base rule

The default release unit is one runtime workload item pinned to one immutable image digest.

Repo membership does not define the release unit.

### Impact metadata ownership

Dynamic expansion is not inferred ad hoc from operator judgment.

It is determined from repo- and workload-owned metadata declarations, enforced by the production release system.

The metadata contract must declare at least:

- `workload_id`
- `workload_class`
- `entry_impact`
- `public_api_contract_impact`
- `read_model_impact`
- `async_event_impact`
- `runtime_config_gate`
- `depends_on_workloads`
- `expands_to_workloads`

The release system evaluates the declared metadata and computes the final release set before approval and execution.

### Expansion rules

The release system automatically expands the selected set when needed by:

- entry impact
- public API contract impact
- read-model impact
- async/event impact
- runtime config or migration gate impact

### Entry impact

When the change affects the production entry flow, the release set expands to include the canonical entry path items:

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`

The 판정 주체 is the workload metadata field `entry_impact`.

### Public API contract impact

When a public route, auth boundary, or response contract changes:

- include `edge-api-gateway`
- include the changed upstream service
- include `front-web-console` when the frontend directly depends on that public contract

The 판정 주체 is the workload metadata field `public_api_contract_impact`.

### Read-model impact

When a source-of-truth change can invalidate a read-model runtime contract:

- include the corresponding `*-operations-view` repo in the same release set

The 판정 주체 is the workload metadata field `read_model_impact` plus declared `expands_to_workloads`.

### Async/event impact

When producer-consumer schema compatibility is at risk:

- include the affected producer and consumer items together

The 판정 주체 is the workload metadata field `async_event_impact` plus declared producer-consumer dependencies.

### Runtime config and migration impact

When runtime config, secret shape, or migration boundaries are involved:

- the release must be gated for explicit approval
- this is not treated as a routine automatic application-only release

The 판정 주체 is the workload metadata field `runtime_config_gate`.

## Production Release Execution

### Authentication

AWS authentication is unified on GitHub Actions OIDC.

The production release repo alone may assume the production release role.

The trust boundary is narrowed by:

- repository identity
- GitHub environment usage
- production workflow path

### GitHub Configuration Minimization

GitHub configuration is minimized on purpose, but the standard is split by path:

- production runtime release path
- app-repo build and publish path

The standard organization-level GitHub Actions variables remain exactly two:

- `PROD_AWS_ROLE_ARN`
  - the ARN of the production release role assumed by `runtime-prod-release`
- `AWS_REGION`
  - the shared AWS region for production release workflows

This standard follows GitHub Actions variable guidance:

- variables are for non-sensitive configuration
- secrets are for sensitive data

`PROD_AWS_ROLE_ARN` is treated as a non-sensitive configuration value and therefore belongs in a GitHub variable, not a secret.

`AWS_REGION` is also required as an explicit workflow input to `aws-actions/configure-aws-credentials`.

That means a role ARN alone is not a complete production AWS configuration according to the official workflow model; the region must be provided alongside it.

### App Repo Build and Publish GitHub Configuration

Application repos still need a standard AWS-authenticated build and publish path for immutable ECR image output.

That build and publish path is separate from production rollout.

The app-repo standard is:

- repo-level `ECR_BUILD_AWS_ROLE_ARN`
- shared `AWS_REGION`

Interpretation:

- `ECR_BUILD_AWS_ROLE_ARN`
  - repo-local or selected-repo variable for build and publish only
- `AWS_REGION`
  - shared non-sensitive region value, typically inherited from the organization-level variable

This means app repos still consume two configuration values for their GitHub Actions build path, but only one of them is app-repo specific.

The production rollout role must never be reused for build and publish.

The boundary is fixed as:

- app repo build and publish
  - `ECR_BUILD_AWS_ROLE_ARN` + `AWS_REGION`
- production runtime release
  - `PROD_AWS_ROLE_ARN` + `AWS_REGION`

`PROD_AWS_ROLE_ARN` must not be configured as an app-repo production deployment path.

### Forbidden GitHub AWS Configuration

The following are outside the GitHub organization or repository variable and secret standard for the production runtime release system:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_SESSION_TOKEN`
- `AWS_ACCOUNT_ID`
- `ECR_REGISTRY_URI`
- `INSTANCE_ID`
- `SUBNET_ID`
- `SECURITY_GROUP_ID`

The meaning is fixed as follows:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`
  - forbidden because production runtime auth is OIDC-only
- `AWS_ACCOUNT_ID`
  - derived from the assumed role session or AWS runtime identity
- `ECR_REGISTRY_URI`
  - derived from account and region at runtime
- `INSTANCE_ID`
  - replaced by SSM tag-based or inventory-derived targeting
- `SUBNET_ID`, `SECURITY_GROUP_ID`
  - infra-owned inventory data, not routine release inputs

For app repos, the same forbidden list applies to runtime release concerns.

The only AWS-authenticated app-repo standard input beyond shared region is `ECR_BUILD_AWS_ROLE_ARN`.

The production release path must not standardize ad hoc instance id input.

SSM Run Command supports target-based resolution, including tag-based targets, and the release system must use tag- or inventory-derived target resolution instead.

### Sensitive Data Handling

Long-lived AWS credential secrets are forbidden in GitHub for both:

- the production runtime release path
- the app-repo build and publish path

Only OIDC-based short-lived AWS authentication is allowed.

Application runtime secrets must not be duplicated into GitHub secrets as a second source of truth.

The canonical runtime secret source is:

- AWS Secrets Manager
- or AWS Systems Manager Parameter Store

The release system must also avoid passing plaintext secret values directly as SSM Run Command arguments.

SSM dispatch should reference runtime-managed secret sources or pre-rendered secure runtime material, not inline plaintext secret injection.

### Concurrency

Production rollout uses one shared concurrency group.

The production release queue must be serialized even if multiple candidate releases are ready.

`prod` environment approval and concurrency are both mandatory.

### Remote execution

Runtime execution is unified on AWS Systems Manager Run Command.

The release workflow sends commands to target EC2 host groups for actions such as:

- image pull
- compose update
- service restart
- runtime health assertion

This removes bastion- or operator-driven SSH as the normal production release path.

## Runtime Topology Rule

The first production reset phase intentionally uses one minimal EC2 + EBS runtime unit.

The canonical runtime topology is:

- one EC2 instance named `EVDash-msa`
- one attached EBS volume mounted at `/data`
- one host-local PostgreSQL runtime
- one host-local Redis runtime
- one shared container runtime for all application workloads

The release model still resolves workloads individually, but initial target resolution is intentionally collapsed to a single runtime target:

- `evdash-msa`

This phase does not preserve a separate `app-host` and `data-host` production topology.

## Production Validation Rule

Smoke scope is determined by release impact.

Production validation must not always run a full-platform smoke for every change.

Examples:

- entry-only release validates company entry path, login, and dashboard landing
- settlement-facing release validates settlement-facing routes and health
- dispatch-facing release validates dispatch-facing routes and health

The priority business entry flow already fixed for production protection is:

- company path identification
- login
- company dashboard landing

That flow is the top-priority protected smoke path.

## Active Front, Edge, Infra, and Service Repos

### Front

- `front-web-console`
  - role: single operator web console
  - GitHub: <https://github.com/EVNSolution/front-web-console>

### Edge

- `edge-api-gateway`
  - role: public edge entry and route mediation
  - GitHub: <https://github.com/EVNSolution/edge-api-gateway>

### Infra

- `runtime-prod-platform`
  - role: production runtime shape owner for the single-host EC2 + EBS runtime slice
  - GitHub: to be created

### Services

- `service-account-access`
  - role: account, authentication, authorization
  - GitHub: <https://github.com/EVNSolution/service-account-access>
- `service-organization-registry`
  - role: organization and fleet master
  - GitHub: <https://github.com/EVNSolution/service-organization-registry>
- `service-driver-profile`
  - role: driver base profile
  - GitHub: <https://github.com/EVNSolution/service-driver-profile>
- `service-personnel-document-registry`
  - role: personnel and proof-document metadata
  - GitHub: <https://github.com/EVNSolution/service-personnel-document-registry>
- `service-vehicle-registry`
  - role: vehicle master and operator access
  - GitHub: <https://github.com/EVNSolution/service-vehicle-registry>
- `service-vehicle-assignment`
  - role: driver-to-vehicle assignment truth
  - GitHub: <https://github.com/EVNSolution/service-vehicle-assignment>
- `service-vehicle-operations-view`
  - role: vehicle operations read model
  - GitHub: <https://github.com/EVNSolution/service-vehicle-operations-view>
- `service-driver-operations-view`
  - role: driver operations read model
  - GitHub: <https://github.com/EVNSolution/service-driver-operations-view>
- `service-terminal-registry`
  - role: terminal and device registry
  - GitHub: <https://github.com/EVNSolution/service-terminal-registry>
- `service-telemetry-hub`
  - role: telemetry ingest, normalization, snapshot
  - GitHub: <https://github.com/EVNSolution/service-telemetry-hub>
- `service-telemetry-listener`
  - role: MQTT ingress worker
  - GitHub: <https://github.com/EVNSolution/service-telemetry-listener>
- `service-telemetry-dead-letter`
  - role: telemetry dead-letter storage
  - GitHub: <https://github.com/EVNSolution/service-telemetry-dead-letter>
- `service-settlement-registry`
  - role: settlement rule and pricing registry
  - GitHub: <https://github.com/EVNSolution/service-settlement-registry>
- `service-attendance-registry`
  - role: daily attendance truth
  - GitHub: <https://github.com/EVNSolution/service-attendance-registry>
- `service-delivery-record`
  - role: delivery source records and daily snapshots
  - GitHub: <https://github.com/EVNSolution/service-delivery-record>
- `service-settlement-payroll`
  - role: settlement result write owner
  - GitHub: <https://github.com/EVNSolution/service-settlement-payroll>
- `service-settlement-operations-view`
  - role: settlement operations read model
  - GitHub: <https://github.com/EVNSolution/service-settlement-operations-view>
- `service-dispatch-registry`
  - role: dispatch source-of-truth
  - GitHub: <https://github.com/EVNSolution/service-dispatch-registry>
- `service-dispatch-operations-view`
  - role: dispatch operations read model
  - GitHub: <https://github.com/EVNSolution/service-dispatch-operations-view>
- `service-region-registry`
  - role: region master
  - GitHub: <https://github.com/EVNSolution/service-region-registry>
- `service-region-analytics`
  - role: region analytics
  - GitHub: <https://github.com/EVNSolution/service-region-analytics>
- `service-announcement-registry`
  - role: announcement source-of-truth
  - GitHub: <https://github.com/EVNSolution/service-announcement-registry>
- `service-support-registry`
  - role: support and ticket source-of-truth
  - GitHub: <https://github.com/EVNSolution/service-support-registry>
- `service-notification-hub`
  - role: notification token, inbox, send log
  - GitHub: <https://github.com/EVNSolution/service-notification-hub>

## Target Operating Sentence

The production runtime release system is fixed as:

- app repos perform build, test, and immutable image publish only
- production rollout is executed only from `runtime-prod-release`
- GitHub `environment=prod`, shared production concurrency, and OIDC-based AWS authentication are mandatory
- EC2 rollout execution is performed through SSM Run Command
- `runtime-prod-platform` owns runtime shape only
- the canonical production runtime target is one EC2 instance named `EVDash-msa`
- the canonical production data path is one attached EBS volume mounted at `/data`
- release scope is determined by a manifest of workload items pinned to immutable image digests with impact-based dynamic expansion

## Acceptance Criteria

This design is considered achieved when:

- every app repo is build-only for production purposes
- one production release repo becomes the only runtime rollout entrypoint
- production rollout no longer requires subnet, security group, or instance id inputs during routine release
- release scope is manifest-driven and image-digest based
- production validation is impact-scoped
- infra rollout is no longer the normal application release path
- app repos no longer retain prod rollout credentials
- no prod rollout entrypoint exists outside `runtime-prod-release`
- release evidence stores SSM command id, manifest, approver, and smoke result together
- routine production release no longer requires operator SSH
- the only standard organization-level GitHub Actions variables are `PROD_AWS_ROLE_ARN` and `AWS_REGION`
- every app repo build and publish path is standardized on `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`
- no app repo uses `PROD_AWS_ROLE_ARN` as its build or publish credential path
- no GitHub organization or repository secret stores long-lived AWS credentials for either production runtime release or app-repo build and publish
- the canonical production runtime instance name is `EVDash-msa`
- the canonical production runtime data mount is `/data`
- the canonical production runtime topology no longer depends on a separate `app-host` and `data-host` split
