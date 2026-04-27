# service-region-registry

## Purpose / Boundary

이 repo는 권역 기준 정본 runtime이다.

현재 역할:
- `Region` CRUD
- 권역 polygon GeoJSON, 난이도, 활성 상태 관리
- admin-only management API와 `health` endpoint
- deterministic bootstrap seed command

이 repo는 절대 소유하지 않음:
- 권역별 배송 통계
- 권역 성과 분석
- route recommendation logic
- 배송지 팁, 제한 구역, 추천 주차, 입구/출구

## Runtime Contract / Local Role

- compose service는 `region-registry-api` 다.
- gateway prefix는 `/api/regions/` 다.
- analytics projection은 `service-region-analytics` 에 남긴다.

## Local Run / Verification

- local run: `python3 manage.py runserver 0.0.0.0:8000`
- local test: `python3 manage.py test -v 2`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`


- GitHub Actions workflow 이름은 `Build service-region-registry image`다.
- workflow는 immutable `service-region-registry:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- registry truth와 analytics read model을 같은 service에서 같이 쓰지 않는다.
- polygon은 현재 GeoJSON payload 기준으로 유지한다.

## Key Tests Or Verification Commands

- full Django tests: `python3 manage.py test -v 2`
- external smoke는 `/api/regions/` protected path를 포함하는 편이 낫다.

## Root Docs / Runbooks

- `../../docs/mappings/`
- `../../docs/decisions/specs/2026-03-26-region-registry-phase-1-activation-design.md`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
