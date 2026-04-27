# service-vehicle-operations-view

## Purpose / Boundary

이 repo는 차량 운영 조회 `operations-view`를 소유한다.

현재 역할:
- vehicle summary와 detail 조회
- vehicle registry, assignment, organization, terminal, telemetry 정보를 조합한 운영 view
- 쓰기 없는 read-only query service

포함하지 않음:
- vehicle registry 정본 쓰기
- assignment 정본 쓰기
- telemetry 수집
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `vehicle-ops-api` 다.
- gateway prefix는 `/api/vehicle-ops/` 다.
- terminal/telemetry enrichment는 optional bridge이며, 이 repo의 hard write truth가 아니다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-vehicle-operations-view image` 다.
- workflow는 immutable `service-vehicle-operations-view:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- optional bridge failure는 warning/null enrichment로 degrade 해야 한다.
- vehicle ops proof를 terminal/telemetry ingest proof로 과장하지 않는다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- honest smoke는 `/api/vehicle-ops/health/`, `/api/vehicle-ops/vehicles/`, unknown vehicle detail `404` 조합이다.

## Root Docs / Runbooks

- `../../docs/contracts/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
