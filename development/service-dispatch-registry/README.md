# service-dispatch-registry

## Purpose / Boundary

배차 계획 정본을 소유하는 Django/DRF runtime repo다.

현재 역할:
- `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 1차 계획 truth
- `fleet + dispatch_date` 물량 계획
- `vehicle + dispatch_date + shift_slot` 차량 슬롯 계획
- `vehicle + driver + dispatch_date + shift_slot` 계획 배정

소유하지 않는 것:
- current runtime assignment truth
- 권역 / 목적지
- leave / 휴무 / 월 근무일수
- terminal / telemetry 상태

## Runtime Contract / Local Role

- compose service는 `dispatch-registry-api` 다.
- gateway prefix는 `/api/dispatch/` 다.
- `service-dispatch-registry`는 계획 truth다.
- `service-vehicle-assignment`는 current assignment truth다.

## Local Run / Verification

- local run: `python3 manage.py runserver 0.0.0.0:8000`
- local test: `python3 manage.py test -v 2`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`

- GitHub Actions workflow 이름은 `Build service-dispatch-registry image`다.
- workflow는 immutable `service-dispatch-registry:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- `operator_company_id`는 FK가 아닌 dispatch-context snapshot 컬럼이다.
- 계획 truth와 current assignment truth를 한 service에서 같이 쓰지 않는다.

## Key Tests Or Verification Commands

- full Django tests: `python3 manage.py test -v 2`
- external smoke는 `/api/dispatch/plans/` 같은 계획 read path를 포함하는 편이 낫다.

## Root Docs / Runbooks

- `../../docs/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
