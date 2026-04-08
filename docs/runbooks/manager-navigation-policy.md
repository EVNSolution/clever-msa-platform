# Manager Navigation Policy Runbook

## Purpose

이 문서는 시스템 관리자가 `관리자 권한 정책` 화면을 통해 관리자 유형별 사이드바 메뉴 노출 정책을 조회하고 수정하는 절차를 정리한다.

## Current Scope

현재 정책은 전역(global) 기본 정책만 다룬다.

- subject: `manager_role`
- resource: `nav_item_key`
- action: `view`
- owner: 시스템 관리자

회사별 override는 아직 구현 범위 밖이다.

## Available Roles

- `company_super_admin`
- `vehicle_manager`
- `settlement_manager`
- `fleet_manager`

## Available Navigation Keys

- `dashboard`
- `account`
- `manager_navigation_policy`
- `accounts`
- `announcements`
- `support`
- `notifications`
- `companies`
- `regions`
- `vehicles`
- `vehicle_assignments`
- `drivers`
- `personnel_documents`
- `dispatch`
- `settlements`

## How To View Policy

1. 시스템 관리자 계정으로 로그인한다.
2. 좌측 메뉴에서 `관리자 권한 정책`으로 이동한다.
3. 관리자 유형을 선택한다.
4. 체크된 메뉴 항목이 현재 허용 정책이다.

## How To Update Policy

1. 시스템 관리자 계정으로 로그인한다.
2. `관리자 권한 정책` 화면으로 이동한다.
3. 수정할 관리자 유형을 선택한다.
4. 허용/비허용할 메뉴 체크박스를 조정한다.
5. `저장`을 누른다.

성공하면 저장 완료 메시지가 보이고, 이후 해당 관리자 유형 사용자 세션에서 변경된 메뉴만 노출된다.

## Fallback Behavior

정책 테이블이 비어 있으면 백엔드는 저장된 정책 대신 기본 정책을 반환한다.

즉 초기 배포 직후에도 콘솔은 기존 역할 기반 기본 노출 정책으로 동작한다.

## Current API Endpoints

- `GET /api/auth/identity-navigation-policy/`
  - 현재 로그인 사용자 허용 메뉴 조회
- `GET /api/auth/manager-navigation-policy/manage/`
  - 시스템 관리자용 전역 정책 조회
- `PUT /api/auth/manager-navigation-policy/manage/`
  - 시스템 관리자용 전역 정책 갱신

## Operational Notes

- 메뉴 숨김은 권한 모델의 첫 단계다.
- 이후 API authorization도 같은 정책 축으로 수렴해야 한다.
- 회사별 커스텀 역할 생성은 아직 허용하지 않는다.
- 다음 확장 단계는 `company override`다.
