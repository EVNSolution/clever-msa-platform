# service-organization-registry

## Purpose / Boundary

이 repo는 조직 기준 마스터 `registry`를 소유한다.

현재 역할:
- `Company`, `Fleet` 정본
- 조직 기준 식별자와 기본 CRUD
- 다른 서비스가 참조하는 organization source

포함:
- Django/DRF runtime
- organization migration
- organization test
- service-local seed command

포함하지 않음:
- account/auth 로직
- driver profile 로직
- vehicle/assignment 로직
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `organization-master-api`다.
- gateway prefix는 `/api/org/` 다.
- `Company`, `Fleet` truth는 이 repo에서만 쓴다.

## Local Run / Verification

- local run: `python3 manage.py runserver 0.0.0.0:8000`
- local test: `python3 manage.py test -v 2`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`


- GitHub Actions workflow 이름은 `Build service-organization-registry image`다.
- workflow는 immutable `service-organization-registry:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- 조직 데이터는 여러 downstream 서비스가 읽으므로, prod smoke에서는 가급적 read-only proof를 우선한다.
- public path와 protected path는 함께 확인해야 한다. `/companies/public/` 만으로는 auth contract를 증명하지 못한다.

## Key Tests Or Verification Commands

- full Django tests: `python3 manage.py test -v 2`
- honest smoke는 protected list path까지 포함한다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
