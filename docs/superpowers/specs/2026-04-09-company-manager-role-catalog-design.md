# CLEVER Company Manager Role Catalog

## Purpose

이 문서는 기존 `전역 manager_role + 회사별 override` 모델을 대체하는 `회사별 관리자 역할 카탈로그` 상위 설계를 고정한다.

이번 설계의 목적은 아래다.

1. 관리자 역할을 전역 고정 문자열이 아니라 `회사 소속 역할`로 다룬다.
2. 시스템 관리자는 모든 회사의 역할과 메뉴 정책을 관리할 수 있게 한다.
3. 회사 전체 관리자는 자기 회사의 역할과 메뉴 정책만 관리할 수 있게 한다.
4. 향후 메뉴 노출 정책과 API authorization을 같은 역할 모델 위에 올릴 수 있게 한다.

## Current Problem

현재 모델은 아래 한계를 가진다.

- `vehicle_manager`, `settlement_manager`, `fleet_manager` 같은 전역 문자열이 역할과 정책의 기준이다.
- 회사별 역할 추가/삭제 요구를 자연스럽게 담을 수 없다.
- 회사별 정책 override는 가능하지만, 역할 카탈로그 자체는 회사 소속이 아니다.
- 시스템 관리자 화면도 결국 전역 역할 편집 UI에 머무른다.

즉 현재 요구인 `회사 아래에 역할이 존재하고, 회사 전체 관리자가 그 역할을 관리한다`를 만족하지 못한다.

## Primary Decision

관리자 권한 모델의 주체를 아래로 바꾼다.

- before: `global manager_role -> allowed_nav_keys`
- after: `company_manager_role -> allowed_nav_keys`

즉 역할은 `전역 role_type 문자열`이 아니라 `회사 소속 역할 레코드`다.

## Ownership Model

### System Admin

- 모든 회사 조회 가능
- 모든 회사 역할 생성/수정/삭제 가능
- 모든 회사 메뉴 정책 수정 가능
- 강제 수정 가능

### Company Super Admin

- 자기 회사만 조회 가능
- 자기 회사 역할 생성/수정/삭제 가능
- 자기 회사 메뉴 정책 수정 가능

### Other Managers

- 역할과 정책을 편집하지 않는다.
- 정책에 따라 허용된 메뉴와 API만 사용한다.

## Role Catalog Model

권장 모델은 `CompanyManagerRole`이다.

필수 필드:

- `company_manager_role_id`
- `company_id`
- `code`
- `display_name`
- `is_system_required`
- `is_default`
- `is_active`
- `allowed_nav_keys[]`
- `created_at`
- `updated_at`

설명:

- `code`: 내부 안정 키. 시스템/토큰/API에서 사용.
- `display_name`: 운영자가 보는 이름. 변경 가능.
- `is_system_required`: 삭제 금지 역할 여부.
- `is_default`: 기본 생성된 역할 여부.

## Required Default Roles

회사 생성 시 아래 역할을 자동 생성한다.

1. `company_super_admin`
   - 표시명: `회사 전체 관리자`
   - 필수 역할
   - 삭제 불가

2. `vehicle_manager`
   - 기본 역할

3. `settlement_manager`
   - 기본 역할

4. `fleet_manager`
   - 기본 역할

시스템 관리자는 이후 회사별로 추가 역할을 만들 수 있고, 회사 전체 관리자도 자기 회사에서 추가 역할을 만들 수 있다.

## Delete / Rename Rules

### Delete Rules

- `company_super_admin`는 삭제 불가
- 현재 사용자에게 배정된 역할은 삭제 불가
- 하나 이상의 관리자 계정이 배정된 역할은 삭제 불가
- 삭제 가능 조건을 만족하는 역할만 삭제 가능

### Rename Rules

- `display_name`은 변경 가능
- 내부 `code`는 안정적으로 유지한다
- 기본 역할도 이름 변경은 허용할 수 있으나, `company_super_admin`의 표시명은 고정하는 것을 권장한다

권장 결정:

- `company_super_admin.display_name`은 고정
- 나머지 역할은 이름 변경 허용

## Policy Model

메뉴 정책은 각 역할에 직접 붙는다.

- `company_manager_role_id -> allowed_nav_keys[]`

즉 더 이상 `global role -> company override` 2단 구조를 우선 모델로 보지 않는다.

정책 계산은 아래다.

1. 현재 로그인 사용자의 `active_company_manager_role_id` 확인
2. 해당 역할의 `allowed_nav_keys` 계산
3. 프론트 메뉴 노출과 API authorization 모두 이 결과를 사용

## Auth / Token Model

토큰과 세션에는 아래 값이 필요하다.

- `active_company_id`
- `active_company_manager_role_id`
- `active_company_manager_role_code`
- `allowed_nav_keys`

기존 `manager_role` 문자열은 점진적으로 deprecated 처리한다.

## UI Decision

### System Admin Screen

시스템 관리자 화면은 아래 구조를 가진다.

- `회사 선택`
- `역할 선택`
- `역할 추가`
- `역할 이름 변경`
- `역할 삭제`
- 본문: 편집 / 미리보기

시스템 관리자는 모든 회사의 역할을 편집할 수 있다.

### Company Super Admin Screen

회사 전체 관리자 화면은 아래 구조를 가진다.

- 회사는 고정 또는 읽기 전용 표시
- `역할 선택`
- `역할 추가`
- `역할 이름 변경`
- `역할 삭제`
- 본문: 편집 / 미리보기

즉 시스템 관리자와 회사 전체 관리자 화면은 같은 구조를 쓰되, 회사 선택 권한만 다르다.

## API Decision

필요한 API는 아래다.

1. 회사 목록 조회
   - 시스템 관리자용
   - 역할 정책 편집 화면의 company selector에 사용

2. 회사별 역할 목록 조회
   - `GET /auth/company-manager-roles/?company_id=...`

3. 회사별 역할 생성
   - `POST /auth/company-manager-roles/`

4. 회사별 역할 이름 변경
   - `PATCH /auth/company-manager-roles/:id/`

5. 회사별 역할 삭제
   - `DELETE /auth/company-manager-roles/:id/`
   - 삭제 제한 사유를 명확히 반환

6. 역할별 메뉴 정책 조회/저장
   - `GET /auth/company-manager-role-policies/?company_id=...&role_id=...`
   - `PUT /auth/company-manager-role-policies/:role_id/`

## Authorization Decision

`allowed_nav_keys`는 UI만이 아니라 API authorization에도 사용한다.

1차 action은 계속 `view`다.

즉 다음 단계에서 각 서비스는 아래를 보게 된다.

- 현재 사용자 role claim
- 해당 role의 `allowed_nav_keys`
- resource key와 action=`view`

## Migration Decision

기존 전역 정책은 바로 제거하지 않는다.

마이그레이션 순서:

1. 새 `CompanyManagerRole` 모델 추가
2. 기존 전역 역할 4개를 각 회사의 기본 역할로 시드
3. 기존 정책을 각 회사 역할 정책으로 복제
4. 토큰 claim과 프론트 UI를 새 모델로 전환
5. 이후 전역 역할 정책 API를 deprecated 처리

즉 운영 전환은 점진적으로 간다.

## Audit Decision

역할 카탈로그부터는 최소 아래 감사가 필요하다.

- 누가 역할을 생성/수정/삭제했는가
- 어떤 회사 역할의 허용 메뉴가 어떻게 바뀌었는가
- 삭제 실패 사유는 무엇인가

## Final Decision Summary

1. 관리자 역할의 기준은 전역 문자열이 아니라 `회사 소속 역할 레코드`다.
2. 시스템 관리자는 모든 회사의 역할과 정책을 편집할 수 있다.
3. 회사 전체 관리자는 자기 회사 범위만 편집할 수 있다.
4. 회사 생성 시 `회사 전체 관리자 + 기본 3역할`이 자동 생성된다.
5. `회사 전체 관리자`는 삭제 불가다.
6. 배정된 역할은 삭제 불가다.
7. 메뉴 정책과 API authorization은 같은 회사 역할 모델 위에 놓인다.
8. UI는 `회사 선택 + 역할 선택` 구조로 재편한다.
