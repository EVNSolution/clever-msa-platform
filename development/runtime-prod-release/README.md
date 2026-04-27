# runtime-prod-release

Production-only runtime release control plane for CLEVER MSA.

Scope:

- resolve release intent into workload-based rollout plans
- authenticate to AWS with GitHub OIDC
- dispatch runtime rollout through SSM Run Command
- target the canonical prod host group through SSM tag resolution

Non-scope:

- building application images
- owning runtime host topology
- storing canonical runtime inventory
- automatic smoke, rollback, or persistent evidence automation in the minimal cutover wave

The canonical production runtime inventory is owned by `runtime-prod-platform`.

## Current Minimal Runtime Contract

- canonical host group: `evdash-msa`
- canonical host tag selector: `tag:CleverHostGroup=evdash-msa`
- runtime root on host: `/opt/ev-dashboard`
- production release auth path: GitHub OIDC only
- release action in scope:
  - resolve intent
  - resolve inventory
  - dispatch SSM reconcile command

The current wave deliberately stops at the minimum repeatable release path. `prod-smoke`, `prod-rollback`, and persistent evidence storage belong to the next wave.

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
