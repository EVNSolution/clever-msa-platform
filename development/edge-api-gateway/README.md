# edge-api-gateway

## Purpose / Boundary

이 repo는 플랫폼의 edge gateway를 소유한다.

현재 역할:
- Nginx reverse proxy
- 단일 web/service API 진입점
- auth header와 cookie forwarding

포함:
- `nginx.conf`
- gateway `Dockerfile`
- edge routing profile

포함하지 않음:
- token 발급 로직
- 도메인 비즈니스 로직
- front source
- 서비스 모델/serializer

## Runtime Contract / Local Role

- 이 repo는 public edge routing behavior를 소유한다.
- upstream 이름과 path contract는 current service/runtime truth와 같이 움직여야 한다.
- shared ALB, ACM, Route53, ECS orchestration은 이 repo가 아니라 infra repo가 소유한다.

## Local Run / Verification

- config review target: `nginx.conf`
- route regression check: `python3 -m unittest discover -s tests -p 'test_*.py'`

## Image Build / Deploy Contract

- prod contract is build, test, and immutable image publish only
- production runtime rollout ownership belongs to `runtime-prod-release`
- build and publish auth uses `ECR_BUILD_AWS_ROLE_ARN` plus shared `AWS_REGION`

- GitHub Actions workflow 이름은 `Build edge-api-gateway image`다.
- workflow는 immutable `edge-api-gateway:<sha>` 이미지를 ECR로 publish 한다.
- runtime rollout은 `../runtime-prod-release/` 가 소유한다.
- production runtime shape와 canonical inventory는 `../runtime-prod-platform/` 이 소유한다.
- 이 repo는 gateway image와 routing behavior를 소유하지만, runtime orchestration은 소유하지 않는다.

## Environment Files And Safety Notes

- repo-local env contract보다 `nginx.conf` route contract가 더 중요하다.
- Docker-local resolver 가정이나 variable `proxy_pass` 패턴은 ECS/Service Connect에서 그대로 안전하지 않다.
- route 추가나 변경은 lesson과 infra upstream naming을 같이 확인한다.

## Key Tests Or Verification Commands

- docs/admin routes: `python3 -m unittest tests.test_nginx_docs_routes`
- settlement routes: `python3 -m unittest tests.test_nginx_settlement_routes`
- support routes: `python3 -m unittest tests.test_nginx_support_routes`
- terminal/telemetry routes: `python3 -m unittest tests.test_nginx_terminal_telemetry_routes`
- public OpenAPI script deps: `python -m pip install -r requirements-public-openapi.txt`
- public OpenAPI build/parity: `python scripts/build_public_openapi.py`
- public OpenAPI parity gate: `python scripts/check_public_openapi_parity.py`
- public OpenAPI unit tests: `python -m unittest tests.test_public_openapi_build tests.test_public_openapi_parity`

## Public OpenAPI Artifact Contract

- `scripts/build_public_openapi.py` is the edge-owned aggregator for `public-api-docs/openapi.yaml`, `public-api-docs/service-export-manifest.json`, and `public-api-docs/revision.json`.
- `scripts/check_public_openapi_parity.py` compares the generated edge artifact against `tests/fixtures/pre-cutover-public-openapi.yaml` and writes `public-api-docs/parity-report.json`.
- `revision.json` is intentionally narrow. It contains only `edge_commit_sha`, `openapi_sha256`, and `service_export_manifest_sha`.
- `service-export-manifest.json` is canonicalized before hashing so equivalent JSON key order does not change `service_export_manifest_sha`.
- Use the active `python` interpreter for these scripts. The repo-local dependency declaration is `requirements-public-openapi.txt`.

## Current Task 2 Source Scope

- The current builder uses a real service-owned export from `../service-account-access/` by shelling out to `python ../service-account-access/manage.py spectacular --file <temp-path>` with the same active interpreter used for the edge scripts.
- `EDGE_COMMIT_SHA` is used when provided. Local builds fall back to `git rev-parse HEAD` from this repo.
- The generated artifact is deterministic from the declared service export inputs plus `public-api-docs/fallback-allowlist.json`.
- The public builder prunes `components` down to the ref closure reachable from retained public operations so private/internal-only schemas do not leak into the published artifact.

## Fallback Allowlist Contract

- Version 1 keeps fallback explicit and per-operation. The file is `public-api-docs/fallback-allowlist.json`.
- Each fallback entry is edge-owned and must include `service_id`, `fallback_mode`, `path`, `method`, and an `operation` object.
- Only `route_inventory` fallback entries are accepted in this task's implementation.
- Fallback entries are copied into `service-export-manifest.json` and surfaced in `parity-report.json` as `fallback_entries_used`.
- Private or internal fallback operations are rejected during the build.

## Root Docs / Runbooks

- `../../docs/contracts/`
- `../../docs/mappings/`
- `../../docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md`

## Root Development Whitelist

- 이 repo는 `clever-msa-platform` root `development/` whitelist에 포함된다.
- root visible set은 `front-web-console`, `edge-api-gateway`, `runtime-prod-release`, `runtime-prod-platform`, active `service-*` repo만 유지한다.
- local stack support repo, legacy infra repo, bridge lane repo는 root `development/` whitelist 바깥에서 관리한다.
- 이 README와 repo-local AGENTS는 운영 안내 문서이며 정본이 아니다. 경계, 계약, 런타임 truth는 root `docs/`를 따른다.
