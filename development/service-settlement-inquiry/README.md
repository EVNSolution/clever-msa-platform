# service-settlement-inquiry

## Purpose / Boundary

이 repo는 settlement inquiry workflow write owner runtime 이다.

현재 역할:
- driver/operator inquiry thread write
- inquiry message write
- settlement snapshot attachment reference write
- health endpoint와 protected API skeleton

포함하지 않음:
- settlement result truth
- source delivery truth
- generic support ticket truth
- notification channel truth
- gateway, compose, or platform glue

## Runtime Contract / Local Role

- compose service는 `settlement-inquiry-api` 다.
- gateway prefix는 `/api/settlement-inquiries/` 다.
- attachment preview는 read-time enrichment 대상이고 write truth는 이 repo가 가진다.

## Local Run / Verification

- local run: `. .venv/bin/activate && python manage.py runserver 0.0.0.0:8000`
- local test: `. .venv/bin/activate && python manage.py test -v 2`

## Image Build / Deploy Contract

- GitHub Actions workflow 이름은 `Build service-settlement-inquiry image` 다.
- workflow는 immutable `service-settlement-inquiry:<sha>` 이미지를 ECR로 publish 한다.
- workflow artifact `build-image-evidence-<sha>` 는 `immutable_image_uri` 와 `image_digest` 를 남기고, 이 값을 `runtime-prod-release` release intent 에 그대로 사용한다.
- production rollout은 `../runtime-prod-release/` 가 수행하고, runtime shape와 inventory는 `../runtime-prod-platform/` 이 소유한다.

## Environment Files And Safety Notes

- prod proof는 mutation 대신 `health 200 + protected 401` 조합을 우선한다.
- operator reply 이후 notification handoff는 best-effort 로 유지한다.

## Key Tests Or Verification Commands

- full Django tests: `. .venv/bin/activate && python manage.py test -v 2`
- honest smoke는 `/api/settlement-inquiries/health/` 와 protected path 조합이다.

## Root Docs / Runbooks

- `../../docs/boundaries/`
- `../../docs/mappings/`
- `../../docs/decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`
- `../../docs/superpowers/specs/2026-04-21-cheonha-driver-app-settlement-inquiry-design.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함될 target이다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
