# 02. Target API Documentation And Delivery

## 문서 목적

이 문서는 CLEVER MSA 플랫폼의 API 문서가 최종적으로 어떤 상태여야 하는지를 고정하는 상위 목표 문서다.

이 문서는 API 문서 delivery의 north-star다. 현재 어떤 URL이 live인지, 어떤 workflow가 official gate인지 같은 current operator truth는 `../runbooks/`와 `../rollout/`에서 본다.

이 문서에서는 build script, 임시 viewer, 개별 exporter 구현 같은 세부 수단보다 아래를 먼저 정의한다.

1. 무엇을 공식 API 문서로 볼 것인가
2. 누가 어떤 단위의 정본을 소유하는가
3. 팀이 최종적으로 어떤 URL에서 통합 API 문서를 읽게 할 것인가
4. 로컬 확인용 문서와 공식 배포 문서를 어떻게 구분할 것인가

## 이 문서가 답해야 하는 질문

1. CLEVER API 문서의 정본 입력은 무엇인가
2. 통합 API 문서는 어디서 생성되고 어디에 배포되는가
3. 서비스별 경계와 통합 탐색을 어떻게 동시에 만족시키는가
4. 로컬 개발용 문서와 공식 운영용 문서를 무엇으로 구분하는가

## 목표 상태

### 1. 서비스별 API 정본은 각 active HTTP service가 소유한다

- 각 `service-*` repo는 자기 HTTP API의 service-owned OpenAPI를 가진다.
- request, response, path parameter, query parameter, auth 표현은 서비스 코드와 함께 관리한다.
- internal-only worker는 public HTTP API 정본 대상으로 보지 않는다.

### 2. 플랫폼은 통합 OpenAPI 진입점 하나를 가진다

- 플랫폼은 service별 문서를 따로 고르게 하지 않는다.
- CLEVER 차원의 공식 API 문서 진입점은 통합 OpenAPI artifact 하나를 기준으로 제공한다.
- 통합 문서는 서비스 경계를 흐리지 않고, tag와 metadata로 owner repo를 분명히 드러낸다.

### 3. 공식 문서는 로컬 파일이 아니라 원격 배포본으로 읽는다

- 로컬 문서는 개발자 확인용 preview다.
- 팀이 공유하는 공식 API 문서는 고정된 도메인 Swagger URL 또는 OpenAPI URL에서 읽는다.
- 사용자는 서비스별 로컬 실행 여부와 무관하게 동일한 원격 URL에서 최신 통합 문서를 확인할 수 있어야 한다.

### 4. 생성 책임은 root repo automation이 가진다

- CLEVER API 문서 생성과 검증의 automation 단위는 플랫폼 root repo다.
- 서비스별 개별 repo automation으로 문서를 따로 흩뿌리지 않는다.
- root repo의 CI가 service-owned schema export와 통합 OpenAPI refresh를 수행한다.

### 5. generated artifact는 수동 편집하지 않는다

- 통합 OpenAPI `yaml` 은 generated artifact로 취급한다.
- 사람이 직접 수정하는 정본 문서는 `docs/`와 각 service repo의 코드/serializer/schema annotation이다.
- generated artifact는 배포와 검증의 산출물이지 문서 정본 자체가 아니다.

## 목표 원칙

### 1. 문서 정본과 배포 산출물을 분리한다

- 목표와 규칙은 `docs/`에 둔다.
- generated OpenAPI artifact와 build glue는 integration 경계에 둔다.
- 공식 Swagger UI는 배포 환경에서 generated OpenAPI를 읽는다.

### 2. 서비스 소유권을 문서 안에서도 잃지 않는다

- 통합 문서의 tag는 consumer 화면 이름이 아니라 service repo 기준으로 잡는다.
- 각 endpoint는 owner repo와 gateway prefix를 읽을 수 있어야 한다.
- 통합 문서는 “큰 Swagger 한 장”이 아니라 “service ownership이 드러나는 통합 문서”여야 한다.

### 3. 로컬 성공이 아니라 원격 재현 가능성을 목표로 한다

- 개인 로컬에서만 열리는 문서는 최종 상태가 아니다.
- PR, push, 수동 workflow 실행만으로 같은 문서를 다시 만들 수 있어야 한다.
- 공식 문서는 특정 개발자의 로컬 파일에 의존하지 않아야 한다.

### 4. 문서 UI는 교체 가능해야 한다

- 현재 local HTML viewer는 bootstrap preview 수단이다.
- 최종 운영 문서 UI는 Swagger UI, ReDoc, 또는 배포 환경의 표준 문서 entry로 교체 가능해야 한다.
- 중요한 것은 UI 제품이 아니라 배포된 통합 OpenAPI URL과 service-owned schema 체계다.

## 목표 산출물

최종적으로 아래 세 층이 동시에 있어야 한다.

### 1. Service-owned OpenAPI

- 각 active HTTP service의 정본 OpenAPI export

### 2. Unified OpenAPI

- CLEVER 전체 탐색용 통합 OpenAPI artifact
- service tag, owner metadata, gateway 외부 경로 기준 path를 가진다

### 3. Official Delivery Entry

- 도메인에 연결된 Swagger URL 또는 OpenAPI URL
- 팀이 실제로 참고하는 공식 entry

## 비목표

이 문서는 아래를 목표로 삼지 않는다.

1. Notion 같은 별도 문서 도구를 API 문서 정본으로 쓰는 것
2. 서비스마다 별도 Swagger URL을 사람에게 직접 고르게 하는 것
3. generated `yaml` 을 사람이 직접 수정하며 유지하는 것
4. 로컬 preview HTML을 최종 운영 문서 UI로 고정하는 것

## 이 목표 문서를 사용할 때의 규칙

1. 이 문서에는 최종 상태와 상위 원칙만 적는다.
2. build script, exporter, local preview 같은 구현 세부는 decision 문서와 integration 문서에 둔다.
3. 현재 어떤 서비스가 schema-backed 인지 같은 시점 의존 정보는 mapping/decision 문서에서 관리한다.
4. 공식 문서 delivery 방식이 바뀌더라도, service-owned OpenAPI + unified OpenAPI + root repo automation 원칙은 유지한다.
5. current live API docs entry나 deploy gate가 필요하면 이 문서가 아니라 current runbook과 rollout note를 먼저 본다.

## 연결 문서

- `../decisions/specs/2026-03-26-clever-unified-openapi-and-api-mcp-design.md`
- `../mappings/08-current-msa-api-docs-reading-guide.md`
- `../../development/integration-local-stack/compose/api-docs/README.md`
