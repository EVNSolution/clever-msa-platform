# service-settlement-operations-view

## Purpose / Boundary

이 repo는 정산 운영 조회 `operations-view`를 소유하는 Django read-only fan-out repo다.

현재 역할:
- 외부 read API `health/`, `runs/`, `items/`, `drivers/<driver_id>/latest-settlement/` 제공
- 외부 read API `drivers/<driver_id>/daily-settlements/` 제공
- payroll read fan-out 수행
- `latest-settlement` wrapper에서 delivery history 존재 여부와 current attendance inference를 read-only로 조립
- driver 단위 latest settlement summary read 조립
- payroll day-level truth에 delivery snapshot reference를 붙여 external driver settlement read를 조립

포함하지 않음:
- `SettlementRun`, `SettlementItem` write
- payout/result truth
- settlement seed runtime
- 정산 정책/기준표 정본
- 배송 원천 기록 정본
- 계산 엔진 구현
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `settlement-ops-api` 다.
- gateway prefix는 `/api/settlement-ops/` 다.
- upstream write owner는 `service-settlement-payroll` 이다.
- day-level 금액 계산 truth는 payroll에서 읽고, 이 repo는 snapshot ref enrichment만 수행한다.
- 이 repo는 정산 write ownership, migration, seed runtime을 가지지 않는다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`

- GitHub Actions workflow 이름은 `Build service-settlement-operations-view image` 다.
- workflow는 immutable `service-settlement-operations-view:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- settlement-ops proof를 settlement write proof로 과장하지 않는다.
- honest production proof는 mutation 없는 `health 200 + protected 401` 조합이다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- focused Track A tests: `. .venv/bin/activate && python manage.py test settlements.tests.test_source_clients settlements.tests.test_daily_settlement_service settlements.tests.test_settlement_api -v 2`
- honest smoke는 `/api/settlement-ops/health/`, `/api/settlement-ops/runs/`, `/api/settlement-ops/items/` 중 protected read path를 포함한다.

## Root Docs / Runbooks

- `../../docs/contracts/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- `../../docs/decisions/06-settlement-process-note.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
