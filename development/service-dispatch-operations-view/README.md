# service-dispatch-operations-view

## Purpose / Boundary

배차 운영 조회 `operations-view`를 소유하는 Django read-model repo다.

이 repo의 1차 역할:
- `service-dispatch-registry`의 계획 정본과 `service-vehicle-assignment`의 현재 truth를 비교하는 상황판 제공
- 사람이 읽을 수 있는 배차 유닛 상태와 요약을 보여 주는 read-only runtime 경계 제공
- dispatch write API, 정본 저장, terminal/telemetry/region 조합은 다루지 않음

포함하지 않음:
- 배차 정본 쓰기
- 현재 배정 정본 쓰기
- terminal / telemetry write
- 권역 / 목적지 write
- 승인 / 예외 흐름
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `dispatch-ops-api` 다.
- gateway prefix는 `/api/dispatch-ops/` 다.
- `service-dispatch-registry`는 배차 계획 정본을 소유하고, 이 repo는 계획과 현재를 읽어서 비교만 한다.
- 환경 변수 `VEHICLE_ASSET_BASE_URL`은 이름을 유지하지만 실제로는 `service-vehicle-registry` 런타임을 가리킨다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`
- local integration wiring reference는 out-of-band support repo에서 관리한다.

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-dispatch-operations-view image` 다.
- workflow는 immutable `service-dispatch-operations-view:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- empty board 또는 zero summary는 valid success signal 이다.
- dispatch-ops proof를 dispatch write ownership proof로 과장하지 않는다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- honest smoke는 `/api/dispatch-ops/health/`, `/api/dispatch-ops/board/`, `/api/dispatch-ops/summary/` 조합이다.

## Root Docs / Runbooks

- `../../docs/contracts/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
