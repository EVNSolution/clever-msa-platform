# 10. Phase 1 Runtime Refactor Priority

## 문서 목적

이 문서는 현재 active runtime으로 올라온 phase 1 구현물의 리팩토링 우선순위를 고정한다.

이번 문서는 아래 두 가지를 같이 만족해야 한다.

1. 새 서비스 추가가 아니라 현재 구현물 정리를 먼저 한다.
2. 서비스 경계를 깨는 shared runtime package 도입 없이 정리 방향을 잡는다.

## 우선순위

1. rollout 문서 정리
2. API 문서 living guide 동기화
3. 서비스 bootstrap 중복 축소
4. 로컬 smoke 검증 스크립트 정리

## 근거

### 1. rollout 문서 정리

- `docs/rollout/README.md`는 `docs/rollout/plans/`를 `active plan only`로 규정한다.
- 같은 문서는 구현 완료된 plan은 `docs/archive/historical/rollout/`로 이동하라고 적고 있다.
- 현재 `docs/rollout/plans/`에는 파일이 8개 남아 있다.
- 그중 `delivery-record`, `personnel-document-registry`, `announcement-registry`, `region-registry`, `support-registry`, `region-analytics`, `notification-hub` plan은 모두 이미 active runtime으로 올라온 서비스와 대응한다.

즉 현재 rollout 폴더는 자기 규칙과 약간 어긋난다. 가장 먼저 정리해야 하는 리팩토링 포인트다.

### 2. API 문서 living guide 동기화

- `development/integration-local-stack/compose/api-docs/service-schemas/` 아래 exported schema 파일은 현재 22개다.
- `docs/mappings/08-current-msa-api-docs-reading-guide.md`도 현재 schema-backed 목록 22개로 동기화되었다.
- central deploy는 이제 API docs freshness gate를 가진다.
- 현재 남은 gap은 per-service schema diff나 artifact content 검증까지는 아직 하지 않는다는 점이다.

즉 사람 읽는 가이드와 산출물 간 목록 mismatch는 정리됐다. 다음 리팩토링 포인트는 `freshness gate`를 넘어서 `service-level schema change review`를 어디까지 자동화할지 정하는 일이다.

### 3. 서비스 bootstrap 중복 축소

- 현재 `development/` 아래 non-venv 기준 `authentication.py`는 22개다.
- non-venv 기준 `permissions.py`도 22개다.
- non-venv 기준 `exceptions.py`는 31개다.
- 플랫폼 root `AGENTS.md`는 shared base package를 기본 금지로 두고 있다.

즉 지금 필요한 리팩토링은 “공용 runtime 패키지 추출”이 아니라, 서비스 scaffold 생성 방식과 파일 템플릿을 정리하는 쪽이다.

### 4. 로컬 smoke 검증 스크립트 정리

- `development/integration-local-stack/scripts/`에는 현재 API docs script와 telemetry helper는 있다.
- 하지만 서비스별 `health -> login -> list/create` smoke를 공통으로 돌리는 helper는 없다.
- 최근 live smoke는 서비스마다 ad-hoc in-network command로 수행했다.

즉 phase 1 구현이 늘어난 지금은 smoke를 코드로 묶는 정리가 필요하다.

## 실행 원칙

1. 서비스 간 runtime import는 추가하지 않는다.
2. 중복 축소는 generator, template, helper script 중심으로 처리한다.
3. current truth는 계속 `docs/mappings/current-runtime-inventory.md` 기준으로 유지한다.
4. final phase 기능 추가보다 이 문서의 리팩토링 항목을 먼저 처리한다.

## 완료 기준

1. 완료된 implementation plan이 `docs/rollout/plans/`에서 빠진다.
2. API docs reading guide가 current schema-backed truth와 맞는다.
3. API docs refresh와 중앙 배포의 관계, 그리고 freshness gate의 한계가 운영 문서에 명확히 적혀 있다.
4. 새 service runtime을 찍어낼 수 있는 bootstrap 규칙 또는 generator가 생긴다.
5. 반복되는 smoke 검증을 재사용 가능한 로컬 스크립트로 돌릴 수 있다.

## 연결 문서

- `README.md`
- `09-remaining-empty-shell-service-priority.md`
- `../mappings/current-runtime-inventory.md`
- `../mappings/08-current-msa-api-docs-reading-guide.md`
