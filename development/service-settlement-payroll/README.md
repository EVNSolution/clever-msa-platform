# service-settlement-payroll

## Purpose / Boundary

이 repo는 settlement write owner runtime 이다.

현재 역할:
- `SettlementRun`, `SettlementItem` write
- driver scoped upstream `daily-settlements` amount truth read
- `deduction`, `incentive`, `payout_status` 상태 관리
- local bootstrap seed command
- external/internal `health`, `runs`, `items` runtime

포함하지 않음:
- registry/master data
- source delivery or input record truth
- read-model only settlement consumers
- gateway, compose, or platform glue

## Runtime Contract / Local Role

- compose service는 `settlement-payroll-api` 다.
- gateway prefix는 `/api/settlements/` 다.
- 정산 결과 read model은 `service-settlement-operations-view`가 읽는다.
- day-level 정산 금액 truth도 payroll이 계산한다.
- 현재 upstream contract:
  - `SETTLEMENT_ORG_BASE_URL`
  - `SETTLEMENT_DRIVER_BASE_URL`
  - `SETTLEMENT_REGISTRY_BASE_URL`
  - `DELIVERY_RECORD_BASE_URL`
  - `DISPATCH_REGISTRY_BASE_URL`
  - `ATTENDANCE_REGISTRY_BASE_URL`

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-settlement-payroll image` 다.
- workflow는 immutable `service-settlement-payroll:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- payroll write는 실제 정산 결과를 바꾸므로 prod proof는 mutation 없이 닫는 편이 맞다.
- honest production proof는 `health 200 + protected 401` 조합으로 본다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- focused Track A tests: `. .venv/bin/activate && python manage.py test settlements.tests.test_daily_settlement_source_service settlements.tests.test_settlement_api -v 2`
- honest smoke는 `/api/settlements/health/` 와 `/api/settlements/runs/` 조합이다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- `../../docs/decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`
- `../../docs/archive/historical/rollout/2026-03-23-settlement-phase-2-decomposition-implementation-plan.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
