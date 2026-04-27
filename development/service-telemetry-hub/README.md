# service-telemetry-hub

## Purpose / Boundary

이 repo는 텔레메트리 수집과 정규화 `hub` runtime 을 구현하는 서비스다.

현재 역할:
- raw ingest
- normalized timeseries
- latest snapshot / diagnostic API

포함하지 않음:
- 긴 기간 시계열 조회 API
- analytics / anomaly detection
- broker consumer daemon 구현
- 플랫폼 전체 compose와 gateway 설정

## Runtime Contract / Local Role

- compose service는 `telemetry-hub-api` 다.
- gateway prefix는 `/api/telemetry/` 다.
- MQTT broker consumer 주체는 이 repo가 아니라 `service-telemetry-listener` 다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-telemetry-hub image` 다.
- workflow는 immutable `service-telemetry-hub:<sha>` 이미지를 ECR로 publish 한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- `/api/telemetry/` prefix root는 honest smoke path 가 아니다.
- telemetry-hub proof를 listener/broker connectivity proof로 과장하지 않는다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- honest smoke는 `/api/telemetry/health/` 와 `/api/telemetry/terminals/<uuid>/latest-location/` protected path 조합이다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ui-smoke-and-decommission.md`
- `../../docs/decisions/07-vehicle-terminal-telemetry-assignment-legacy-split.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
