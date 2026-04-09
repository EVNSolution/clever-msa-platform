# Global Settlement Config Phase 1 Design

## Purpose

이 문서는 정산 기준 설정의 1차 방어선을 `전역 정산 세팅`으로 다시 고정하는 결정을 기록한다.

현재 MSA의 `settlement-registry`는 아래 3단 구조를 가진다.

- `SettlementPolicy`
- `SettlementPolicyVersion`
- `SettlementPolicyAssignment`

이 구조는 `정책 템플릿 -> 버전 -> 회사/플릿 연결` 모델이므로, 운영자가 화면에서 기대하는 `회사/플릿별 독립 설정`과 다르게 읽힌다. 특히 아래 문제가 생긴다.

- 전역 정책과 버전이 여러 회사/플릿에 섞여 보인다.
- 정책 또는 버전 삭제가 다른 회사/플릿 연결에도 영향을 준다.
- 실제 운영 요구보다 더 복잡한 모델이 먼저 노출된다.

이번 1차의 목적은 회사/플릿별 세분화를 완성하는 것이 아니다. 반대로 범위를 줄여서, 실제로는 모두가 같은 기준을 따르는 `전역 정산 세팅`을 명시적으로 도입하고 나중 단계에서만 세분화를 다시 열 수 있게 하는 것이다.

## Primary Decision

정산 기준 설정은 1차에서 `GlobalSettlementConfig` singleton 1건으로 고정한다.

- 회사/플릿별 정산 기준 세분화는 이번 단계에서 열지 않는다.
- 모든 정산 입력, 실행, 결과 계산은 같은 전역 세팅 1세트를 참조한다고 본다.
- 회사/플릿 문맥은 `정산 입력`, `정산 조회`, `정산 실행`, `정산 결과`의 범위 선택에만 사용한다.

즉 이번 단계의 원칙은 아래 두 줄이다.

1. 기준은 전역 1세트다.
2. 입력과 조회는 회사-플릿별이다.

## Legacy Reference Interpretation

레거시 `/logis/settings/settlement`는 fleet별 정산 정책 편집 화면이 아니라, 세율/보험료율 같은 정산 설정값을 편집하는 화면에 가깝다.

이번 단계는 레거시의 UI 모양을 그대로 베끼지 않는다. 대신 아래 원칙만 가져온다.

- 정산 기준은 다건 정책 목록이 아니라 설정값 편집 경험이어야 한다.
- 기준값은 화면이 아니라 저장소와 API 계약에서 관리되어야 한다.
- 값이나 규칙을 프런트 또는 계산 코드에 하드코딩하지 않는다.

## Data Model Decision

`service-settlement-registry`는 `GlobalSettlementConfig` 모델을 새로 소유한다.

모델 특성:

- singleton record 1건
- typed field 기반
- 자유 JSON `rule_payload` 금지
- 회사/플릿 식별자 없음
- soft variant 없이 전역 공통 기준만 저장

1차 필드 후보:

- `income_tax_rate`
- `vat_tax_rate`
- `reported_amount_rate`
- `national_pension_rate`
- `health_insurance_rate`
- `medical_insurance_rate`
- `employment_insurance_rate`
- `industrial_accident_insurance_rate`
- `special_employment_insurance_rate`
- `special_industrial_accident_insurance_rate`
- `two_insurance_min_settlement_amount`
- `meal_allowance`

필드명은 계약이다. 하드코딩 금지의 대상은 아래다.

- 세율/보험료율 수치
- 계산 예외값
- 특정 회사/플릿 분기
- 프런트의 화면 구성 메타데이터

## API Contract

`service-settlement-registry`는 아래 전용 API를 제공한다.

### 1. `GET /settlement-config/metadata`

프런트가 화면을 동적으로 그릴 수 있도록 메타데이터를 제공한다.

필수 정보:

- 섹션 목록
- 각 섹션의 title
- field key
- label
- description
- input type
- unit
- min / max
- decimal precision 또는 integer 여부
- required 여부

이 메타데이터는 프런트의 섹션/라벨 하드코딩을 막기 위한 계약이다.

### 2. `GET /settlement-config/`

현재 전역 정산 세팅 1건을 반환한다.

- 값이 아직 없더라도 API는 기본 레코드를 보장해야 한다.
- 프런트는 다건 목록이 아니라 단일 설정 객체만 받는다.

### 3. `PATCH /settlement-config/`

부분 수정만 허용한다.

- 숫자 범위 검증은 서버가 수행한다.
- 허용되지 않은 key는 거부한다.
- 프런트는 변경된 필드만 보내도 된다.

## Deprecation Decision

기존 `policies`, `policy-versions`, `policy-assignments` API는 1차에서 정산 기준 UI의 공식 계약에서 제외한다.

실행 방향:

- `front-web-console`은 더 이상 이 API들을 사용하지 않는다.
- 백엔드는 1차에서 즉시 제거하거나, 잠시 deprecated 상태로 남길 수 있다.
- 단, 사용자에게 노출되는 정산 기준 화면은 새 singleton 계약만 사용한다.

즉 1차 목표는 호환성보다 명확한 동작이다. `정책 연결` 개념은 이번 단계의 사용자 모델에서 제거한다.

## Frontend Screen Decision

`front-web-console`의 `SettlementCriteriaPage`는 기존 3패널 구조를 버린다.

제거 대상:

- 정책 목록
- 정책 버전 목록
- 정책 연결 목록
- 정책/버전/연결 생성, 수정, 삭제 모달

대체 구조:

- `정산 기준` 요약 패널
- metadata 기반 섹션 렌더링
- 각 필드의 현재 값 표시
- 수정 가능한 전역 설정 폼
- 저장 액션

문구 원칙:

- `모든 정산 입력/실행에 공통 적용되는 기준`
- `회사/플릿 범위와 무관한 전역 설정`

삭제 버튼은 두지 않는다. 설정은 수정만 가능해야 한다. 기본값 복원이 필요하면 이후 별도 액션으로 다룬다.

## Frontend Metadata Rendering Rule

프런트는 아래를 하드코딩하지 않는다.

- 필드 라벨
- 섹션 분류
- 설명 문구
- 입력 타입 매핑
- 단위 표기

프런트가 직접 가지는 것은 최소한의 generic renderer뿐이다.

- text/number/percent/currency 같은 입력 컴포넌트
- metadata를 읽어 섹션을 순회하는 루프
- validation error를 보여주는 공통 UI

즉 프런트는 구조를 렌더링하고, 구조의 의미는 서버 metadata가 정의한다.

## Context Boundary Decision

`SettlementFlowContext`는 유지하되, 역할을 `입력/조회 범위 선택기`로 한정한다.

### 전역 기준 화면

- `정산 기준`
- 회사/플릿 문맥에 종속되지 않음
- 선택된 회사/플릿이 있어도 기준 API에는 영향을 주지 않음

### 회사-플릿 범위 화면

- `정산 입력`
- `정산 조회`
- `정산 실행`
- `정산 결과`

이 화면들은 선택된 `company_id`, `fleet_id` 기준으로만 데이터를 보아야 한다.

## Query Filtering Decision

입력/조회 관련 API는 프런트 로컬 필터만으로 처리하지 않는다. 서버도 같은 범위를 이해해야 한다.

1차에서 아래 목록 API는 `company_id`, `fleet_id` 필터를 지원해야 한다.

- delivery record list
- daily input snapshot list
- settlement run list
- settlement item list
- settlement read run list
- settlement read item list
- 배송원 최신 정산 read

프런트는 선택된 회사/플릿 문맥을 그대로 요청 파라미터로 넘긴다.

이 결정의 목적:

- 서로 다른 회사/플릿 데이터 혼합 방지
- 불필요한 전체 조회 제거
- 권한/범위 기준을 프런트 임시 필터가 아니라 API 계약으로 고정

## Backend Boundary Decision

이번 단계에서도 정산 기준 정본은 `service-settlement-registry`가 소유한다.

`service-settlement-payroll`은 여전히 아래만 소유한다.

- `SettlementRun`
- `SettlementItem`
- `deduction`, `incentive`, `payout_status`

즉 기준 저장을 payroll로 옮기지 않는다. 기준은 registry, 결과 write는 payroll이라는 경계를 유지한다.

## Migration Strategy

1. `GlobalSettlementConfig` 모델 추가
2. metadata endpoint 추가
3. singleton read/update endpoint 추가
4. 프런트 `SettlementCriteriaPage`를 metadata 기반 화면으로 교체
5. 프런트의 기존 policy/version/assignment API 사용 제거
6. 입력/조회 API에 `company_id`, `fleet_id` 필터 추가
7. 입력/조회 화면에서 문맥 기반 요청 사용

1차에서는 기존 policy 데이터의 자동 변환을 목표로 하지 않는다.

이유:

- 기존 정책 구조 자체를 이번 단계의 truth로 보지 않기 때문이다.
- 전역 singleton 기준으로 새 출발하는 편이 동작과 설명이 더 명확하다.

## Testing Direction

구현은 테스트를 먼저 추가하는 방식으로 진행한다.

백엔드 최소 검증:

1. singleton config 기본 레코드 보장
2. metadata 응답 shape 검증
3. PATCH validation 검증
4. 기존 policy UI 비사용 상태 검증 또는 deprecated 처리 검증
5. 입력/조회 API의 `company_id`, `fleet_id` 필터 검증

프런트 최소 검증:

1. metadata 기반 섹션 렌더링
2. 단일 설정값 조회 및 수정 플로우
3. `정산 기준` 화면에서 정책/버전/연결 UI가 사라졌는지 검증
4. `정산 입력`/`정산 결과`/`정산 조회`가 선택된 회사/플릿 문맥 기준으로만 요청하는지 검증

로컬 검증 루프:

- `integration-local-stack`에서는 `gateway`만 기동
- `front-web-console`은 `npm run dev`
- 빠른 수정 확인은 `http://localhost:5174`
- 최종 통합 확인은 `http://localhost:8080`
- 프런트 수정 중 Docker rebuild 금지

## Out of Scope

이번 단계는 아래를 포함하지 않는다.

- 회사별 정산 기준
- 플릿별 정산 기준
- 회사/플릿별 정책 override
- 기준 이력 버전 관리
- 정책 삭제/복제 워크플로
- 전역 설정을 실제 계산 엔진에 완전 연결하는 후속 계산 리팩터

## Final Decision Summary

1. 정산 기준은 `GlobalSettlementConfig` singleton 1건으로 고정한다.
2. 회사/플릿별 정산 기준 세분화는 이번 단계에서 열지 않는다.
3. `SettlementCriteriaPage`는 metadata 기반 전역 설정 화면으로 교체한다.
4. 프런트는 기준 화면의 섹션/라벨/입력 타입을 하드코딩하지 않는다.
5. 입력과 조회는 계속 회사-플릿별로 보되, API 자체도 같은 필터를 지원해야 한다.
6. 기존 policy/version/assignment 모델은 1차의 사용자-facing truth에서 제외한다.
