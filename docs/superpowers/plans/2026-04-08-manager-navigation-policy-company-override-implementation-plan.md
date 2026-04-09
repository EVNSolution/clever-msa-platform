# Manager Navigation Policy Company Override Implementation Plan

## Status

- 이 문서는 초기 `company override row` 구현 계획을 대신해, 현재 `회사별 관리자 역할 카탈로그`로 이행된 상태와 남은 후속 작업을 기록한다.
- 초기 계획의 핵심이었던 별도 company override endpoint와 reset 흐름은 구현 대상에서 제거되었다.

## Implemented Reality

현재 구현은 아래를 기준으로 동작한다.

### Backend

- `CompanyManagerRole`가 회사별 역할 카탈로그를 가진다.
- `allowed_nav_keys`가 메뉴 공개/비공개의 source of truth다.
- 역할 CRUD API가 있다.
- 시스템 관리자와 회사 전체 관리자의 권한 경계가 적용된다.
- 구식 company navigation policy endpoint는 제거되었다.

### Frontend

- `메뉴 정책`
  - 시스템 관리자 전용
  - `/admin/menu-policy`
- `관리자 역할`
  - 시스템 관리자 + 회사 전체 관리자
  - `/admin/manager-roles`
- `회사 메뉴 정책`
  - 회사 전체 관리자 중심
  - `/company/menu-policy`

### Runtime

- 로그인 세션과 현재 사용자 policy 계산은 `CompanyManagerRole.allowed_nav_keys`를 우선 사용한다.
- custom role 승인과 권한 변경 흐름도 회사 역할 카탈로그를 기준으로 동작한다.

## Completed Tasks

### 1. Company role catalog introduction

- `CompanyManagerRole` 모델 추가
- 기본 역할 lazy seed
- 역할 CRUD API 추가
- 삭제 제한 적용

### 2. Manager approval and assignment migration

- 관리자 승인 시 회사 역할 카탈로그 기준 검증
- 관리자 계정 권한 변경도 회사 역할 카탈로그 기준 검증
- custom role display name 노출

### 3. Menu policy UI migration

- `/admin/menu-policy`를 회사/역할 선택 기반으로 전환
- `/company/menu-policy`를 회사 역할 카탈로그 기반으로 전환
- `/admin/manager-roles` 화면 추가

### 4. Legacy endpoint removal

제거된 endpoint:

- `GET /api/auth/company-navigation-policy/manage/`
- `PUT /api/auth/company-navigation-policy/manage/`
- `POST /api/auth/company-navigation-policy/reset/`

## Remaining Work

### 1. Legacy model cleanup

- `ManagerNavigationPolicy` 기반 legacy fallback을 완전히 걷어낼지 결정
- 현재는 runtime 안정성을 위해 일부 fallback이 남아 있을 수 있다

### 2. Audit trail

- 회사 역할 생성/수정/삭제
- 메뉴 정책 변경
- 누가 언제 어떤 값을 바꿨는지 감사 로그 추가

### 3. Authorization expansion

- 현재 메뉴 정책은 `view` 중심
- 이후 `edit`, `approve`, `assign`, `export`까지 확장 가능

### 4. Company-side UX polish

- `/company/menu-policy`
- `/admin/manager-roles`
- 운영자 관점의 밀도와 안내 메시지 추가 정리

## Verification Baseline

다음은 현재 모델에서 유지되어야 하는 기본 검증 축이다.

1. 구식 company navigation policy endpoint는 404여야 한다.
2. 시스템 관리자 정책 화면은 모든 회사/역할을 편집할 수 있어야 한다.
3. 회사 전체 관리자는 자기 회사 역할만 수정할 수 있어야 한다.
4. `company_super_admin`은 삭제 불가여야 한다.
5. 배정된 역할은 삭제 불가여야 한다.
6. 로그인 사용자 policy 계산은 회사 역할 카탈로그를 우선 사용해야 한다.

## Summary

이 계획 파일의 원래 목표였던 `company override row` 확장은 현재 구조에서 더 이상 유효하지 않다.

현재 구현의 핵심은 아래다.

1. 회사별 역할 카탈로그가 존재한다.
2. 메뉴 정책은 각 회사 역할의 `allowed_nav_keys`에 직접 저장된다.
3. 시스템 관리자와 회사 전체 관리자의 편집 권한이 분리된다.
4. 구식 company override endpoint는 제거되었다.
