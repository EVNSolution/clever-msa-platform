# CLEVER Manager Navigation Policy Company Override

## Purpose

이 문서는 `관리자 네비게이션 정책`의 Phase 2 확장으로서 `회사별 override` 설계를 고정한다.

현재 전역(global) 정책이 이미 구현된 상태에서, 이번 문서의 목표는 아래다.

1. 회사 관리자가 자기 회사 범위에서만 메뉴 노출 정책을 조정할 수 있게 한다.
2. 전역 정책과 회사별 정책의 책임 경계를 분리한다.
3. 역할 생성이 아닌 `정책 override`를 우선 확장 축으로 고정한다.

## Primary Decision

회사별 확장의 첫 단계는 아래로 고정한다.

- 시스템 관리자는 전역 기본 정책을 관리한다.
- 회사 관리자는 자기 회사 범위의 `manager_role -> allowed_nav_keys`만 override 할 수 있다.
- 회사 관리자는 새 관리자 유형을 만들 수 없다.
- 정책 계산 순서는 `company override -> global policy -> default fallback`이다.

즉, Phase 2는 `role creation`이 아니라 `policy override`다.

## Why This Boundary Matters

### 1. 역할 생성은 너무 빠르게 권한 모델을 오염시킨다

회사별 관리자가 임의 역할을 생성하게 열어두면 아래 문제가 생긴다.

- 역할 이름 체계가 무너진다.
- 정책 추적과 감사가 어려워진다.
- API 권한 모델과 UI 정책 모델이 분리되기 쉽다.
- 회사별 예외가 시스템 전체 역할 체계를 침식한다.

따라서 초기 확장에서는 역할 생성권을 열지 않는다.

### 2. 실제 운영 요구는 대부분 override로 해결 가능하다

현재 예상 요구는 아래 형태다.

- A 회사는 플릿 관리자에게 배차를 보여준다.
- B 회사는 플릿 관리자에게 배차를 숨긴다.
- C 회사는 차량 관리자에게 인사문서를 보여주지 않는다.

이건 새 역할 없이도 override만으로 처리할 수 있다.

## Scope

### Included

- 회사별 관리자 네비게이션 정책 override
- 회사 관리자용 정책 편집 화면
- 현재 로그인 사용자 기준 회사 override 반영 정책 조회
- 전역 정책 상속 여부 표시

### Not Included

- 회사별 새 관리자 유형 생성
- 임의 속성 생성
- action 단위 세분화
- API authorization override
- row-level 데이터 권한

## Ownership Model

### Global Owner

- 시스템 관리자
- 역할: 전역 기본 정책 정의

### Company Owner

- 회사 전체 관리자(`company_super_admin`)
- 역할: 자기 회사 범위 정책 override

### Non-Owners

- `vehicle_manager`
- `settlement_manager`
- `fleet_manager`

이들은 정책을 편집하지 않는다.

## Policy Resolution Order

정책 계산은 아래 순서로 한다.

1. 시스템 관리자 계정이면 전체 허용
2. 회사 override가 있으면 그 값 사용
3. 전역 저장 정책이 있으면 그 값 사용
4. 둘 다 없으면 코드 기본 fallback 사용

즉 회사 override는 전역 정책을 덮어쓴다.

## Data Model Extension

Phase 2에서 필요한 최소 추가 필드는 아래다.

- `company_id`
- `is_override`

권장 저장 형태는 아래 둘 중 하나다.

### Option A. 동일 테이블 확장

- `manager_role`
- `company_id nullable`
- `nav_item_key`
- `action`
- `effect`

의미:
- `company_id is null` = global policy
- `company_id set` = company override

### Option B. override 전용 별도 테이블

- `ManagerNavigationPolicy` = global
- `CompanyManagerNavigationPolicy` = override

권장:
- `Option A`
- 이유: 정책 해석 축이 같고 resolution order가 단순하다.

## UI Decision

회사 관리자 화면에는 `회사 관리자 권한 정책` 또는 기존 정책 화면의 회사 범위 버전을 둔다.

권장 UI:

- 현재 로그인 회사 고정 표시
- 관리자 유형 선택
- 현재 적용 정책 source 표시
  - `company override`
  - `global policy`
  - `default fallback`
- 메뉴 체크박스 편집
- `전역 기본값으로 되돌리기` 액션

즉 회사 관리자는 자기 회사 기준으로만 수정하고, 다른 회사 정책은 볼 수 없다.

## API Decision

Phase 2 API는 아래가 필요하다.

1. 현재 로그인 사용자 허용 메뉴 조회
- 회사 override 반영 결과 반환

2. 회사 관리자용 정책 조회
- 현재 회사의 override 상태 반환
- source와 inherited 여부 반환

3. 회사 관리자용 정책 저장
- 현재 회사 범위에서만 허용

4. 회사 관리자용 reset
- 현재 회사 override 삭제
- 전역 정책 상속 상태로 복귀

## Security Decision

회사 관리자는 아래를 절대 할 수 없다.

- 다른 회사 정책 조회/수정
- 새 역할 생성
- 전역 정책 수정
- 시스템 관리자 전용 메뉴 정책 변경

즉 회사 override는 회사 범위의 제한된 편집권이다.

## Audit Decision

회사별 override부터는 감사 흔적이 필요하다.

최소 기록 항목:

- `updated_by_identity_id`
- `updated_at`
- `company_id`
- `manager_role`
- 변경 전/후 허용 메뉴 집합

Phase 2 구현에서는 간단한 변경 이력 모델 또는 structured log를 남겨야 한다.

## Compatibility Decision

Phase 2는 Phase 1 전역 정책과 충돌 없이 올라가야 한다.

전환 원칙:

1. 기존 global policy API 유지
2. current-user policy API는 내부 해석만 company override 대응으로 확장
3. company override가 없는 회사는 기존 동작 그대로 유지

즉 기존 사용자 경험은 깨지지 않아야 한다.

## Final Decision Summary

1. 회사별 확장은 `override`부터 시작한다.
2. 회사 관리자는 자기 회사 정책만 수정할 수 있다.
3. 회사 관리자는 역할을 새로 만들 수 없다.
4. 정책 계산 순서는 `company override -> global policy -> default fallback`이다.
5. 현재 로그인 사용자 policy API는 이 순서를 반영하도록 확장된다.
6. 회사 override부터는 최소 감사 흔적이 필요하다.

즉 Phase 2의 핵심은 `회사별 관리자 네비게이션 정책 override`이며, 이는 전역 정책 위에 쌓이는 제한된 편집권으로 다룬다.
