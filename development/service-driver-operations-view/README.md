# service-driver-operations-view

## Purpose / Boundary

이 repo는 배송원 운영 조회 `driver ops` operations-view를 소유한다.

현재 역할:
- driver ops summary와 detail 조회
- profile, account, personnel-document, settlement-ops scoped latest-settlement summary를 조합한 운영 view
- `me/work-logs/`, `me/settlement-calendar/` 같은 driver self-service facade 제공
- driver profile HR 상태 노출
- 배송원 정리 현황과 근태/배송이력 rule status 요약 제공

포함하지 않음:
- driver profile 정본 쓰기
- account access 정본 쓰기
- settlement 정본 쓰기
- settlement payroll collection 직접 fan-out
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `driver-ops-api` 다.
- gateway prefix는 `/api/driver-ops/` 다.
- 이 repo는 read-only query service이며, 정본 쓰기를 소유하지 않는다.
- settlement read amount truth는 소유하지 않고 `service-settlement-operations-view`를 세션 기준으로 감싼다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`


- GitHub Actions workflow 이름은 `Build service-driver-operations-view image` 다.
- workflow는 immutable `service-driver-operations-view:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- upstream missing data는 `404` 그대로 보존해야 한다. broad `500`로 덮으면 안 된다.
- driver ops proof를 driver profile write proof로 과장하지 않는다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- focused Track A tests: `. .venv/bin/activate && python manage.py test driver360.tests.test_source_clients driver360.tests.test_work_logs driver360.tests.test_settlement_calendar -v 2`
- honest smoke는 `/api/driver-ops/health/` 와 unknown driver detail `404` 조합이다.

## Root Docs / Runbooks

- `../../docs/contracts/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
