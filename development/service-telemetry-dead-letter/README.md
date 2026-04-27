# service-telemetry-dead-letter

## Purpose / Boundary

이 repo는 실패한 telemetry payload를 보관하는 `dead-letter` runtime shell 이다.

현재 역할:
- failed telemetry payload append-only store
- internal write / admin read 경계의 서비스 shell
- health endpoint를 포함한 Django service scaffold

포함하지 않음:
- telemetry raw / timeseries / snapshot 정본
- 자동 replay
- broker retry 정책
- vehicle / terminal / assignment 정본 수정
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `telemetry-dead-letter-api` 다.
- gateway prefix는 `/api/telemetry-dead-letters/` 다.
- 의존 서비스는 `service-telemetry-listener`, `service-telemetry-hub` 이다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-telemetry-dead-letter image` 다.
- workflow는 immutable `service-telemetry-dead-letter:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- dead-letter admin surface는 `7a` closure이고, listener enablement `7b`와 분리해서 본다.
- honest production proof는 write-path test 없이 `health 200 + protected 401` 조합이다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- honest smoke는 `/api/telemetry-dead-letters/health/` 와 `/api/telemetry-dead-letters/` 조합이다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- `../../docs/decisions/specs/2026-03-21-telemetry-dead-letter-design.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
