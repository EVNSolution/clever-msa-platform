# service-terminal-registry

## Purpose / Boundary

이 repo는 단말과 장치 `registry` 정본 runtime 을 구현하는 서비스다.

현재 역할:
- `terminal_registry`
- `terminal_installation`
- 단말 자산과 현재 차량 장착 관계 관리

포함하지 않음:
- MQTT payload 처리
- 위치 snapshot
- diagnostic/fault
- 배송원 배정
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `terminal-registry-api` 다.
- gateway prefix는 `/api/terminals/` 다.
- 단말 자산과 설치/장착 관계 truth만 이 repo에서 소유한다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-terminal-registry image` 다.
- workflow는 immutable `service-terminal-registry:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- terminal registry proof를 telemetry ingest proof로 과장하지 않는다.
- prod proof는 `/api/terminals/health/` 와 protected list path를 같이 봐야 honest 하다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- honest smoke는 `/api/terminals/health/` 와 `/api/terminals/` 조합이다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- `../../docs/decisions/specs/2026-03-20-terminal-registry-design.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
