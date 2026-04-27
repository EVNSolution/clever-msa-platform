# service-personnel-document-registry

## Purpose / Boundary

기사 인사문서 메타데이터 정본 runtime repo다.

현재 역할:
- 기사 단위 계약, 증빙, 계좌증빙, 사업자등록 문서 메타데이터 정본
- 문서 종류, 상태, 유효기간, 외부 참조, 부가 payload 관리
- admin-only CRUD와 bootstrap seed 제공

비스코프:
- 파일 바이너리 저장
- approval workflow
- driver profile 정본 복제
- 회사 단위 문서 aggregate

## Runtime Contract / Local Role

- compose service는 `personnel-document-registry-api` 다.
- gateway prefix는 `/api/personnel-documents/` 다.
- internal path는 `/health/`, `/documents/` 를 포함한다.
- 이 repo는 문서 메타데이터 truth만 소유한다.

## Local Run / Verification

- local run: `python3 manage.py runserver 0.0.0.0:8000`
- local test: `python3 manage.py test -v 2`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`


- GitHub Actions workflow 이름은 `Build service-personnel-document-registry image`다.
- workflow는 immutable `service-personnel-document-registry:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- 이 service는 metadata truth만 다룬다. binary storage나 approval workflow를 여기로 끌어오지 않는다.
- driver profile 정보는 lookup 대상이지, local copy가 아니다.

## Key Tests Or Verification Commands

- full Django tests: `python3 manage.py test -v 2`
- external smoke는 `/api/personnel-documents/` protected path를 포함하는 편이 낫다.

## Root Docs / Runbooks

- `../../docs/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
