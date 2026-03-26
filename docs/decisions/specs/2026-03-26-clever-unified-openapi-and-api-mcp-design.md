# CLEVER Unified OpenAPI And API MCP 디자인

## 목적

이 문서는 CLEVER MSA 플랫폼에서 API 문서 탐색과 MCP 연동을 위해 `서비스별 정본 OpenAPI + 플랫폼용 통합 OpenAPI + 단일 API MCP` 구조를 고정한다.

이번 설계의 목표는 아래와 같다.

1. 서비스마다 별도 MCP를 두지 않고 CLEVER API 문서 진입점을 하나로 만든다.
2. 각 `service-*` repo의 API 소유권과 플랫폼 차원의 통합 문서 탐색을 동시에 만족시킨다.
3. `docs/`를 설계 정본으로 유지하면서, 실제 통합 산출물과 build glue는 `integration-local-stack` 경계에 둔다.
4. service 구분이 Swagger/OpenAPI 문서 안에서도 분명히 드러나도록 tag, group, overlay 메타데이터 규칙을 고정한다.

## 문제 정의

현재 상태는 아래와 같다.

1. 플랫폼 루트에는 체크인된 OpenAPI/Swagger 스펙 파일이 없다.
2. legacy API inventory 문서는 운영 Swagger를 근거로 사용하지만, current MSA 문서는 여기에 의존하지 않도록 분리해야 한다.
3. 현재 active runtime repo와 gateway prefix는 이미 `docs/mappings/current-runtime-inventory.md`에 living truth로 정리돼 있다.
4. 사용자 관점에서는 서비스마다 다른 Swagger/MCP를 고르는 구조보다 하나의 통합 진입점이 더 단순하다.

특히 아래 문제를 먼저 고정해야 한다.

1. 서비스별 MCP를 두면 설정 수가 늘고 질문마다 어느 MCP를 써야 하는지 라우팅 비용이 생긴다.
2. 커스텀 개인용 Swagger MCP를 먼저 만들면, 아직 정본 OpenAPI 산출물과 tag 규칙이 없는 상태에서 구현 비용만 앞서게 된다.
3. `docs/`에 통합 스펙 파일이나 generated artifact를 직접 두면 문서 정본과 실행 glue가 섞인다.

## 기준 근거

이번 설계는 아래 문서를 기준으로 잡는다.

1. `docs/mappings/01-current-api-inventory-and-overlap.md`
   - 현재 운영 Swagger가 API inventory의 근거다.
2. `docs/mappings/current-runtime-inventory.md`
   - 현재 active runtime repo, compose service, gateway prefix truth다.
3. `development/integration-local-stack/AGENTS.md`
   - local compose, env, seed, smoke, bootstrap helper 같은 cross-repo glue의 소유 경계를 정의한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. CLEVER 통합 OpenAPI artifact의 목적과 위치
2. 단일 API MCP 연결 구조
3. tag naming 규칙
4. optional tag group 규칙
5. 통합 단계에서 붙이는 최소 overlay 메타데이터
6. 과도기 입력원과 목표 입력원의 구분

## 비스코프

이번 설계에서는 아래를 다루지 않는다.

1. 개별 `service-*` repo 안의 실제 OpenAPI 구현
2. Swagger UI, ReDoc, Stoplight 같은 문서 UI 제품 선택
3. 커스텀 MCP 서버 구현
4. gateway prefix나 service boundary 자체의 변경
5. Notion 같은 외부 문서 도구 연동

## 고려한 접근

### 1. 서비스별 Swagger MCP 다중 구성

- 각 서비스 repo 또는 각 Swagger URL을 별도 MCP 서버로 등록한다.

장점:

1. 구조가 단순해 보인다.
2. 서비스별 독립 운영은 쉽다.

단점:

1. MCP 수가 runtime repo 수만큼 늘어난다.
2. 사용자 질문마다 어느 MCP를 골라야 하는지 판단이 필요하다.
3. 플랫폼 차원의 통합 탐색 경험이 약하다.

### 2. 개인용 커스텀 Swagger MCP 서버 우선 구현

- 여러 Swagger/OpenAPI를 한 서버가 읽고 CLEVER 전용 리소스로 재가공한다.

장점:

1. 원하는 질의 경험을 세밀하게 설계할 수 있다.
2. CLEVER 용어와 경계 문서를 서버에서 직접 반영할 수 있다.

단점:

1. 정본 OpenAPI 구조가 아직 고정되지 않은 상태에서 구현 비용이 크다.
2. 통합 스펙과 tag 규칙이 바뀌면 서버도 같이 수정해야 한다.
3. 문서 정리 목적만 놓고 보면 초기 투자 대비 효과가 과하다.

### 3. 통합 OpenAPI artifact 1개 + 읽기 전용 OpenAPI MCP 1개

- 서비스별 정본은 각 repo에 남기고, 플랫폼에서는 통합 OpenAPI artifact를 만들어 단일 MCP가 그 파일만 읽게 한다.

장점:

1. 사용자 진입점이 하나다.
2. 서비스 소유권과 통합 탐색을 동시에 만족시킨다.
3. 커스텀 MCP 없이도 문서 탐색을 시작할 수 있다.
4. 이후 필요하면 thin wrapper MCP를 덧붙이기 쉽다.

단점:

1. 통합 OpenAPI를 만드는 merge/overlay step이 필요하다.
2. 서비스별 정본 스키마 exporter가 없는 과도기에는 current runtime docs와 local route inventory로 route-level 통합 문서를 먼저 만들 수 있다.

## 선택된 접근

이번 설계에서는 3번을 선택한다.

선택 이유는 아래와 같다.

1. 현재 목적이 API 문서 정리와 탐색이지, AI 기반 실호출 자동화가 아니다.
2. 서비스별 MCP 확산을 막으면서도 service ownership을 문서 안에 남길 수 있다.
3. 현재 레포 경계상 architecture truth는 `docs/`에, cross-repo glue는 `integration-local-stack`에 두는 편이 맞다.
4. 커스텀 MCP는 통합 OpenAPI만으로 부족하다는 근거가 생긴 뒤에 얹어도 늦지 않다.

## 선택된 구조

구조는 아래처럼 고정한다.

1. 각 `service-*` repo
   - 자기 API의 정본 OpenAPI를 장기적으로 소유한다.
2. `clever-msa-platform/docs/`
   - 통합 OpenAPI와 API MCP 운영 기준을 설명하는 설계 정본을 소유한다.
3. `development/integration-local-stack/`
   - 여러 서비스 스펙을 합쳐 플랫폼용 통합 OpenAPI artifact를 만들고 보관하는 glue를 소유한다.
4. API MCP
   - 서비스별 스펙이 아니라 통합 OpenAPI artifact 하나만 읽는다.

## 통합 OpenAPI Artifact 위치

문서 정본과 generated/build asset을 분리하기 위해 아래 경로를 권장 위치로 고정한다.

1. 통합 OpenAPI artifact
   - `development/integration-local-stack/compose/api-docs/clever-unified.openapi.yaml`
2. 통합 overlay source
   - `development/integration-local-stack/compose/api-docs/overlays/`
3. build script
   - `development/integration-local-stack/scripts/build_unified_openapi.py`
   - 또는 `development/integration-local-stack/scripts/build_unified_openapi.sh`

이 배치의 이유는 아래와 같다.

1. 통합 OpenAPI는 domain truth 그 자체가 아니라 cross-repo 문서 glue 산출물이다.
2. `integration-local-stack`은 이미 compose, env, smoke, bootstrap helper를 소유하는 integration shell이다.
3. `docs/`에는 설계와 규칙만 두고 generated artifact는 넣지 않는 편이 현재 workspace 원칙과 맞다.

## 입력원 규칙

### 1. 과도기 입력원

서비스별 정본 OpenAPI가 아직 다 갖춰지기 전에는 아래를 current source로 사용한다.

1. `docs/mappings/current-runtime-inventory.md`
2. `docs/mappings/repo-responsibility-matrix.md`
3. 각 active runtime service repo의 `urls.py`
4. 각 active runtime service repo의 `views.py`

### 2. 목표 입력원

장기적으로는 아래 구조로 전환한다.

1. 각 active HTTP service repo의 OpenAPI 파일 또는 OpenAPI export
2. 통합 단계의 overlay 파일
3. 플랫폼용 merge step

### 3. 제외 대상

통합 OpenAPI에 기본 포함하지 않는 대상은 아래와 같다.

1. `service-telemetry-listener`
   - internal-only worker이므로 HTTP API 문서 대상이 아니다.
2. empty shell repo
   - runtime API가 없으므로 통합 스펙 대상이 아니다.
3. front repo
   - API producer가 아니므로 OpenAPI ownership 대상이 아니다.

## Tag Naming 원칙

tag는 화면명이나 consumer명이 아니라 target repo 역할을 기준으로 고정한다.

원칙:

1. canonical tag 이름은 target repo 이름과 같은 축을 쓴다.
2. gateway prefix나 과거 monolith namespace를 tag 정본으로 쓰지 않는다.
3. 한 서비스 안에 여러 bounded area가 있으면 optional sub-tag를 둘 수 있다.
4. optional sub-tag는 `<target-repo>:<bounded-area>` 형식을 쓴다.

예시:

1. `service-account-access`
2. `service-organization-registry`
3. `service-driver-profile`
4. `service-vehicle-registry`
5. `service-vehicle-registry:vehicle-master`
6. `service-vehicle-registry:vehicle-operator-access`
7. `service-settlement-payroll`
8. `service-dispatch-operations-view`

금지:

1. `dashboard`
2. `documents`
3. `driver-360`
4. `web`
5. `admin`

즉 tag는 legacy namespace나 consumer 표현이 아니라 MSA target repo와 boundary를 기준으로 한다.

## Tag Group 원칙

문서 UI가 ReDoc 계열 extension을 지원하면 tag group을 아래처럼 둔다.

1. `Registry`
2. `Operations View`
3. `Write Owner`
4. `Edge And Access`
5. `Telemetry And Support`

배치 예시:

1. `Registry`
   - `service-organization-registry`
   - `service-driver-profile`
   - `service-vehicle-registry`
   - `service-terminal-registry`
   - `service-settlement-registry`
   - `service-personnel-document-registry`
2. `Operations View`
   - `service-driver-operations-view`
   - `service-vehicle-operations-view`
   - `service-settlement-operations-view`
   - `service-dispatch-operations-view`
3. `Write Owner`
   - `service-delivery-record`
   - `service-settlement-payroll`
   - `service-dispatch-registry`
   - `service-vehicle-assignment`
4. `Edge And Access`
   - `service-account-access`
   - `edge-api-gateway` 관련 public API 설명이 필요한 경우의 edge tag
5. `Telemetry And Support`
   - `service-telemetry-hub`
   - `service-telemetry-dead-letter`

Swagger UI처럼 tag group extension이 약한 도구를 쓰더라도, 최소한 tag description에는 같은 group 의미를 반복해 적는다.

## 최소 Overlay 메타데이터

통합 단계에서는 endpoint 또는 tag에 아래 5개 메타데이터를 최소로 붙인다.

1. `x-clever-owner-repo`
   - 예: `service-vehicle-registry`
2. `x-clever-compose-service`
   - 예: `vehicle-asset-api`
3. `x-clever-gateway-prefix`
   - 예: `/api/vehicles/`
   - internal-only면 `internal-only`
4. `x-clever-source-of-truth-doc`
   - 예: `docs/mappings/current-runtime-inventory.md`
   - 또는 해당 boundary / contract 문서 경로
5. `x-clever-runtime-status`
   - 예: `active runtime`, `empty shell`, `planned target`

이 5개를 먼저 고정하는 이유는 아래와 같다.

1. 사용자 입장에서 endpoint가 어느 repo 소유인지 바로 알 수 있어야 한다.
2. 현재 compose/gateway naming truth와 API 문서가 분리되면 drift가 생기기 쉽다.
3. 플랫폼 문서와 OpenAPI 문서를 연결하는 최소 링크가 필요하다.
4. status가 없으면 shell repo와 active runtime이 같은 무게로 보일 수 있다.

## Path And Server 원칙

통합 OpenAPI는 아래 원칙을 따른다.

1. 외부/consumer 기준 path는 현재 gateway prefix를 따른다.
2. 서비스별 path 분류는 path 자체보다 tag와 overlay 메타데이터를 기준으로 본다.
3. direct service URL보다 gateway 기준 설명을 우선하되, 필요하면 server 목록에 local compose용 direct URL을 추가할 수 있다.
4. current MSA 문서에는 legacy monolith path를 기본 포함하지 않는다.

## MCP 연결 원칙

MCP는 하나만 둔다.

규칙:

1. 이름은 예를 들어 `clever-api`처럼 플랫폼 단위 이름을 쓴다.
2. 서비스별 MCP는 기본 금지다.
3. MCP는 통합 OpenAPI artifact 하나만 바라본다.
4. 첫 단계에서는 읽기 전용 OpenAPI/Swagger MCP를 우선 사용한다.
5. custom MCP server는 아래 조건이 생길 때만 검토한다.

custom MCP server 검토 조건:

1. 통합 OpenAPI만으로 원하는 탐색 질의가 안 된다.
2. 여러 입력원 동기화와 CLEVER 용어 재분류를 서버 로직으로 처리해야 한다.
3. endpoint 검색뿐 아니라 boundary 문서, rollout 문서, runtime inventory를 같이 묶어 질의해야 한다.

## 구현 영향 범위

이번 설계를 구현으로 내릴 때 최소 수정 대상은 아래와 같다.

1. `development/integration-local-stack/compose/api-docs/`
   - 통합 OpenAPI artifact와 overlay source 추가
2. `development/integration-local-stack/scripts/`
   - 통합 build script 추가
3. `development/integration-local-stack/README.md`
   - 통합 API 문서 생성과 사용법 추가
4. 필요 시 gateway 또는 service repo
   - OpenAPI export source 정리
5. `docs/`
   - 이후 contract / boundary / mapping 문서에서 통합 OpenAPI 사용 지침 참조

## 검증 원칙

최소 검증 범위는 아래와 같다.

1. 통합 OpenAPI artifact가 생성된다.
2. active HTTP service가 최소 tag 단위로 구분된다.
3. 각 tag에 `x-clever-owner-repo`가 붙는다.
4. `current-runtime-inventory.md`의 active runtime repo와 통합 OpenAPI tag set이 대체로 일치한다.
5. `service-telemetry-listener` 같은 internal-only worker가 public API 문서에 잘못 포함되지 않는다.
6. MCP는 서비스별 개별 설정이 아니라 통합 artifact 하나만 사용한다.

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. 서비스별 MCP 대신 단일 API MCP 구조가 문서로 고정된다.
2. 통합 OpenAPI artifact 위치와 build 경계가 분명하다.
3. tag naming이 target repo 기준으로 고정된다.
4. 최소 overlay 메타데이터 5개가 합의된다.
5. 과도기 입력원과 목표 입력원이 분리돼 설명된다.
