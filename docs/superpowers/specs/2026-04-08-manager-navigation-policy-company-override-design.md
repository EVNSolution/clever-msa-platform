# CLEVER Manager Navigation Policy Company Override Design

## Status

- 이 문서는 초기 `company override row` 설계에서 현재 `회사별 관리자 역할 카탈로그` 구현으로 업데이트한 최종 상태를 기록한다.
- 파일명은 유지하지만, 현재 구현은 더 이상 별도 override row 모델을 채택하지 않는다.

## Final Decision

회사별 메뉴 정책은 별도 `company override` 행으로 저장하지 않는다.

대신 각 회사의 역할 카탈로그 레코드인 `CompanyManagerRole`이 아래를 직접 가진다.

- `code`
- `display_name`
- `allowed_nav_keys`
- `is_system_required`

즉 회사별 메뉴 공개/비공개의 source of truth는 `CompanyManagerRole.allowed_nav_keys`다.

## Ownership Model

### System Admin

- 모든 회사 선택 가능
- 모든 회사의 역할 생성, 수정, 삭제 가능
- 모든 회사의 메뉴 정책 편집 가능
- 강제 수정 가능

### Company Super Admin

- 자기 회사만 관리 가능
- 자기 회사의 역할 생성, 수정, 삭제 가능
- 자기 회사의 메뉴 정책 편집 가능

### Other Manager Roles

- 정책 편집 불가
- 역할 CRUD 불가

## Role Catalog Model

각 회사는 자기 역할 카탈로그를 가진다.

기본 역할:

- `company_super_admin`
- `vehicle_manager`
- `settlement_manager`
- `fleet_manager`

추가 규칙:

1. `company_super_admin`은 필수 역할이다.
2. 회사 전체 관리자와 시스템 관리자는 새 역할을 추가할 수 있다.
3. 기본 역할도 배정이 없으면 삭제할 수 있다.
4. 이미 관리자 계정이 배정된 역할은 삭제할 수 없다.
5. 역할 이름은 `display_name`으로 변경할 수 있다.
6. 내부 식별은 `code`로 유지한다.

## Navigation Policy Model

정책 저장 단위는 `manager_role -> allowed_nav_keys`가 아니라 아래다.

- `company_manager_role_id -> allowed_nav_keys`

즉 메뉴 공개/비공개는 선택한 회사 역할 하나를 기준으로 직접 편집한다.

## UI Model

### System Admin

- 메뉴: `관리 > 메뉴 정책`
- 경로: `/admin/menu-policy`
- 기능:
  - 회사 선택
  - 역할 선택
  - 허용 메뉴 편집
  - 미리보기

### Company Super Admin

- 메뉴: `관리 > 회사 메뉴 정책`
- 경로: `/company/menu-policy`
- 기능:
  - 현재 회사 고정
  - 역할 선택
  - 허용 메뉴 편집

### Role Management

- 메뉴: `관리 > 관리자 역할`
- 경로: `/admin/manager-roles`
- 기능:
  - 회사 선택
  - 역할 생성
  - 이름 변경
  - 삭제 제한 표시

## API Model

현재 구현은 아래 API를 사용한다.

- `GET /api/auth/company-manager-roles/?company_id=<company_id>`
- `POST /api/auth/company-manager-roles/`
- `PATCH /api/auth/company-manager-roles/<role_id>/`
- `DELETE /api/auth/company-manager-roles/<role_id>/`
- `GET /api/auth/identity-navigation-policy/`

구식 API는 제거되었다.

- `GET /api/auth/company-navigation-policy/manage/`
- `PUT /api/auth/company-navigation-policy/manage/`
- `POST /api/auth/company-navigation-policy/reset/`

## Policy Resolution

현재 로그인 사용자의 허용 메뉴 계산은 아래를 따른다.

1. 시스템 관리자면 전체 허용
2. 활성 manager account가 참조하는 회사 역할이 있으면 그 `allowed_nav_keys` 사용
3. 없으면 코드 기본 fallback

즉 현재 주 경로는 `CompanyManagerRole.allowed_nav_keys`다.

## Security Decision

1. 시스템 관리자는 모든 회사에 대해 강제 수정 가능
2. 회사 전체 관리자는 자기 회사만 수정 가능
3. 일반 관리자는 정책/역할 편집 불가
4. 배정된 역할 삭제 불가
5. `company_super_admin` 삭제 불가

## Why This Replaced Separate Company Override Rows

초기 override row 접근은 아래 문제를 가졌다.

- 역할 카탈로그와 정책 저장이 분리됨
- 역할 생성/삭제 요구를 수용하지 못함
- UI가 `역할 관리`와 `메뉴 정책`을 분리해 설명하기 어려움
- 회사별 custom role을 실제 계정 승인/배정 흐름에 태우기 어려움

회사 역할 카탈로그가 정책과 역할 관리를 함께 소유하는 현재 구조가 운영 요구에 더 맞는다.

## Final Summary

1. 회사별 메뉴 정책의 source of truth는 `CompanyManagerRole.allowed_nav_keys`다.
2. 시스템 관리자는 모든 회사를 관리한다.
3. 회사 전체 관리자는 자기 회사만 관리한다.
4. 역할은 회사별 카탈로그로 관리된다.
5. 배정된 역할과 `company_super_admin`은 삭제 제한이 있다.
6. 구식 company override endpoint와 reset 개념은 더 이상 현재 모델의 중심이 아니다.
