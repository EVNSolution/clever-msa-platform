# service-vehicle-registry

## Purpose / Boundary

이 repo는 차량 `registry` 정본을 소유한다.

현재 역할:
- 차량 기본 정보 CRUD
- bootstrap 단계의 vehicle registry
- 이후 `vehicle_master + vehicle_operator_access` 구조로 확장될 기준점

포함:
- Django/DRF runtime
- vehicle migration
- vehicle test
- service-local seed command

포함하지 않음:
- 배송원 배정 정본
- telemetry 수집
- vehicle operations read model
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `vehicle-asset-api` 다.
- gateway prefix는 `/api/vehicles/` 다.
- vehicle registry truth와 assignment/telemetry/read-model 경계를 섞지 않는다.

## Local Run / Verification

- local run: `python3 manage.py runserver 0.0.0.0:8000`
- local test: `python3 manage.py test -v 2`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`


- GitHub Actions workflow 이름은 `Build service-vehicle-registry image`다.
- workflow는 immutable `service-vehicle-registry:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- vehicle truth를 assignment나 telemetry 상태와 같은 모델로 합치지 않는다.
- read-model 화면이 넓게 보여도 write truth는 이 repo에만 둔다.

## Key Tests Or Verification Commands

- full Django tests: `python3 manage.py test -v 2`
- external smoke는 `/api/vehicles/` protected read path를 포함하는 편이 낫다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
