# service-account-access

## Purpose / Boundary

이 repo는 계정 출입구와 접근 제어 `access` 정본을 소유한다.

현재 역할:
- 계정, 인증, 토큰, 접근 제어
- 로그인/refresh/logout
- lockout, change-password, account-driver link helper

포함:
- Django/DRF runtime
- account/auth migration
- account/auth test
- service-local seed command

포함하지 않음:
- 조직 정본
- 배송원 profile 정본
- vehicle/assignment 로직
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- 이 repo는 `auth/docs/admin` surface의 current runtime owner다.
- public operator surface는 `/openapi.yaml`, `/swagger/`, `/redoc/`, `/admin/account-access/`를 포함한다.
- container runtime은 `entrypoint.sh`에서 `collectstatic` 후 `gunicorn`으로 올라간다.

## Local Run / Verification

- local Django run은 env를 맞춘 뒤 `python3 manage.py runserver 0.0.0.0:8000`으로 확인한다.
- host/env baseline은 out-of-band local support tooling에서 관리한다.

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-account-access image`다.
- workflow는 immutable `service-account-access:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- admin surface를 public으로 유지하려면 template/static contract를 같이 유지해야 한다.
- `STATIC_ROOT`, WhiteNoise, `collectstatic`, admin URL prefix가 같이 맞아야 한다.
- seed/fixture 계정은 prod truth와 혼동하지 않도록 operator runbook과 분리해서 관리한다.

## Key Tests Or Verification Commands

- full Django test entry: `python3 manage.py test`
- auth/docs/admin focused check: `python3 manage.py test accounts.tests.test_admin_and_schema_urls -v 2`
- static contract check: `python3 manage.py collectstatic --dry-run --noinput`

## Root Docs / Runbooks

- `../../docs/contracts/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
