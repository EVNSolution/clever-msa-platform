# 08. Current MSA API Docs Reading Guide

## 문서 목적

이 문서는 `edge-api-gateway`가 소유하는 public OpenAPI artifact를 현재 MSA 기준으로 어떻게 읽어야 하는지 설명하는 가이드다.

현재 산출물은 더 이상 운영 Swagger나 legacy namespace를 source로 사용하지 않는다.

대신 아래 세 축을 합쳐 만든다.

1. `docs/` 정본
   - active runtime repo, gateway prefix, ownership 경계
2. 각 active runtime service repo 코드
   - `urls.py`, `views.py`에 정의된 현재 HTTP route와 method
3. 선택적 service-owned OpenAPI export
   - schema exporter를 붙인 서비스의 request/response schema

즉 이 문서는 아래 질문에 답한다.

1. 현재 API 문서에 어떤 서비스가 포함되는가
2. path, method, tag가 무엇을 기준으로 생성되는가
3. 어떤 서비스가 schema-backed 상태인가
4. 현재 문서가 아직 표현하지 못하는 정보는 무엇인가

## 먼저 볼 정본 문서

현재 MSA API 문서를 읽기 전에 아래 문서를 같이 본다.

1. `docs/mappings/current-runtime-inventory.md`
2. `docs/mappings/repo-responsibility-matrix.md`
3. 필요 시 각 서비스별 decision / contract 문서

읽기 순서는 아래가 기본이다.

1. current runtime inventory로 active HTTP service와 gateway prefix를 본다.
2. responsibility matrix로 각 service가 무엇을 소유하고 무엇을 소유하지 않는지 본다.
3. 그 다음 current MSA OpenAPI에서 endpoint 상세를 읽는다.

## 포함 대상

현재 문서는 아래 조건을 모두 만족하는 서비스만 포함한다.

1. `current-runtime-inventory.md`에서 `active runtime`
2. repo 이름이 `service-*`
3. gateway prefix가 존재하고 `internal-only`가 아님

예시:

- `service-account-access`
- `service-driver-profile`
- `service-settlement-registry`
- `service-telemetry-hub`

## 제외 대상

현재 문서는 아래를 기본 제외한다.

1. `service-telemetry-listener`
   - internal-only worker
2. empty shell repo
3. front repo
4. edge gateway 자체
5. monolith legacy path

즉 `/api/documents/*`, `/api/dashboard/*` 같은 레거시 namespace는 이 문서에 남기지 않는다.

## Tag 읽기 규칙

현재 문서의 tag는 active runtime repo 이름 그대로 쓴다.

예:

- `service-account-access`
- `service-organization-registry`
- `service-driver-profile`
- `service-vehicle-registry`

이 tag는 곧 owner repo를 의미한다.

더 이상 아래 분류는 쓰지 않는다.

1. `target-*`
2. `pending-*`
3. `legacy-*`

## Path 읽기 규칙

path는 service 내부 local route가 아니라 현재 gateway 외부 prefix 기준으로 생성한다.

예:

1. `service-account-access`
   - gateway prefix: `/api/auth/`
2. `service-settlement-registry`
   - gateway prefix: `/api/settlement-registry/`
3. `service-vehicle-registry`
   - gateway prefix: `/api/vehicles/`

따라서 현재 문서의 path는 사용자가 gateway를 통해 실제로 읽는 외부 API 경로를 우선 반영한다.

## Method 생성 규칙

service-owned OpenAPI export가 없는 서비스는 각 서비스 코드의 `views.py` class 형태를 기준으로 method를 추론한다.

사용 기준:

1. `APIView`
   - class 안에 직접 정의된 `get`, `post`, `patch`, `delete` 등을 읽는다.
2. DRF generic view
   - `ListCreateAPIView`, `RetrieveUpdateAPIView` 같은 base class로부터 표준 method를 읽는다.
3. DRF `ModelViewSet`
   - router 등록과 `lookup_field`, `http_method_names`를 기준으로 collection/detail method를 만든다.

즉 fallback method 집합은 문서 추정이 아니라 현재 repo 코드 구조에서 직접 나온다.

## Schema-backed 규칙

현재는 일부 서비스만 service-owned OpenAPI exporter를 붙인다.

현재 대상:

- `service-account-access`
- `service-announcement-registry`
- `service-personnel-document-registry`
- `service-delivery-record`
- `service-organization-registry`
- `service-driver-profile`
- `service-region-registry`
- `service-region-analytics`
- `service-support-registry`
- `service-notification-hub`
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `service-vehicle-operations-view`
- `service-dispatch-registry`
- `service-dispatch-operations-view`
- `service-driver-operations-view`
- `service-settlement-payroll`
- `service-settlement-registry`
- `service-settlement-operations-view`
- `service-terminal-registry`
- `service-telemetry-hub`
- `service-telemetry-dead-letter`

이 서비스들의 schema input은 edge build 시 `development/edge-api-gateway/public-api-docs/service-source-registry.json` 기준으로 수집되고, 결과는 edge artifact의 `public-api-docs/service-export-manifest.json`에 기록된다.

exported schema가 없거나 export에 실패하면 edge-owned fallback allowlist와 route inventory 기준으로 artifact에 남는다.

## 현재 문서가 보장하는 것

1. active runtime HTTP service만 나온다.
2. 각 endpoint는 현재 gateway prefix를 따른다.
3. 각 endpoint는 owner repo, compose service, runtime status 메타데이터를 가진다.
4. schema-backed 서비스는 request/response schema를 포함할 수 있다.
5. 각 tag는 current runtime inventory와 responsibility matrix 설명을 따라 읽을 수 있다.

## 현재 문서가 아직 보장하지 않는 것

1. schema exporter가 아직 없는 서비스의 serializer 수준 request schema
2. schema exporter가 아직 없는 서비스의 response body schema
3. 예시 payload
4. auth scheme의 OpenAPI security definition
5. service 내부 business rule 전체

즉 지금 단계의 문서는 `현재 MSA route inventory + ownership guide`, 그리고 일부 서비스의 `service-owned schema`를 합친 상태에 가깝다.

정확한 request/response schema 범위를 넓히려면 이후 각 서비스에 service-owned OpenAPI exporter를 더 붙여야 한다.

## Build 와 배포 연동 상태

현재 API docs 운영 방식은 아래처럼 연결되어 있다.

1. edge public docs build
   - owner: `development/edge-api-gateway/`
   - builder:
     - `scripts/build_public_openapi.py`
   - build output:
     - `public-api-docs/openapi.yaml`
     - `public-api-docs/swagger/`
     - `public-api-docs/revision.json`
     - `public-api-docs/service-export-manifest.json`
   - public runtime surface:
     - `/openapi.yaml`
     - `/swagger/`
     - `/redoc/`

2. prod release evidence
   - owner: `development/runtime-prod-release/`
   - release workflow는 deployed edge runtime에서 docs revision을 읽어 `release-evidence.json`에 넣는다.
   - edge workload evidence는 아래 세 값을 같이 가진다.
     - `edge_commit_sha`
     - `openapi_sha256`
     - `service_export_manifest_sha`

현재 결론:

1. root `clever-msa-platform`은 더 이상 API docs refresh workflow를 소유하지 않는다.
2. public docs current truth는 edge image에 포함된 artifact와 그 runtime surface다.
3. prod 기준 증적은 latest root refresh run이 아니라 `runtime-prod-release` evidence의 `api_docs_revision`이다.
4. 다만 이 구조도 per-service semantic schema review를 자동 보장하는 것은 아니고, exporter coverage와 parity gate 범위에 의존한다.

## 운영 원칙

현재 문서가 틀렸다면 아래 순서를 따른다.

1. `docs/mappings/current-runtime-inventory.md` 또는 `docs/mappings/repo-responsibility-matrix.md`를 먼저 고친다.
2. 서비스 코드의 `urls.py` / `views.py`를 현재 truth로 고친다.
3. 그 다음 edge public OpenAPI artifact를 다시 생성하고 release evidence를 확인한다.
