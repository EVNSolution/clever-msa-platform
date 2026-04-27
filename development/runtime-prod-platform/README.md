# runtime-prod-platform

Production runtime shape owner for the fixed EC2 runtime used by CLEVER MSA.

Scope:

- canonical production runtime inventory
- host group and workload class mapping
- deploy-method class defaults
- healthcheck contract ownership for runtime rollout targeting
- single-host runtime shape ownership for `EVDash-msa + /data`

This repo is not the rollout control plane.

`runtime-prod-release` consumes the exported inventory artifact and performs production rollout.

## Current Canonical Runtime Shape

- canonical host: `EVDash-msa`
- canonical host group: `evdash-msa`
- canonical data path: `/data`
- local data services: PostgreSQL and Redis on the same host
- retired topology: split `app-host` / `data-host`

## Export Contract

- canonical source: `release/prod-runtime-inventory.json`
- export command: `python3 scripts/export-runtime-inventory.py --artifact-dir dist`
- export artifact:
  - `prod-runtime-inventory.json`
  - `prod-runtime-inventory.sha256`
- release control plane는 manual instance id 입력 대신 이 inventory와 host group 해석값을 사용한다.

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
