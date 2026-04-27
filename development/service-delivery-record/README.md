# service-delivery-record

## Purpose / Boundary

이 repo는 배송 원천 기록 정본과 일별 집계 입력 snapshot 정본을 제공하는 active runtime repo다.

현재 역할:
- 배송 원천 기록 API
- 정산 전 집계 입력용 일별 snapshot API
- authenticated read / admin write gate

포함:
- Django/DRF runtime
- DB migration
- API
- seed 대상 데이터

포함하지 않음:
- `SettlementRun`
- `SettlementItem`
- payout/result truth
- settlement read-model API
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `delivery-record-api` 다.
- gateway prefix는 `/api/delivery-record/` 다.
- 이 repo는 배송 원천 기록과 일별 snapshot truth만 소유한다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-delivery-record image` 다.
- workflow는 immutable `service-delivery-record:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- 이 repo의 write는 settlement downstream 계산에 직접 영향을 준다.
- prod proof는 prefix root보다 실제 read path를 확인하는 편이 honest 하다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- honest smoke는 `/api/delivery-record/records/` protected read path를 포함한다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- `../../docs/archive/historical/rollout/2026-03-20-settlement-phase-1-decomposition-implementation-plan.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
