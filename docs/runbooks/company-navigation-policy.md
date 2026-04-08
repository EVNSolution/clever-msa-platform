# Company Navigation Policy Runbook

## 목적

- 회사 전체 관리자가 자기 회사 범위에서만 관리자 유형별 사이드바 메뉴 정책을 override 한다.
- 정책 해석 순서는 `company override -> global policy -> default fallback` 이다.

## 대상 역할

- `vehicle_manager`
- `settlement_manager`
- `fleet_manager`

`company_super_admin` 자체는 회사 override 대상이 아니다.

## UI 진입점

- 회사 전체 관리자 로그인
- `/company/navigation-policy`
- 사이드바 항목: `회사 메뉴 정책`

## API

- `GET /api/auth/company-navigation-policy/manage/`
- `PUT /api/auth/company-navigation-policy/manage/`
- `POST /api/auth/company-navigation-policy/reset/`

## 운영 원칙

- 회사 override는 자기 회사 범위에만 적용된다.
- 전역 정책은 시스템 관리자만 편집한다.
- 회사 override reset 시 전역 정책이 있으면 전역 정책으로, 없으면 기본 fallback으로 복귀한다.

## 장애 확인 포인트

1. 현재 로그인 계정이 `company_super_admin`인지 확인
2. 현재 사용자 policy 응답의 `source` 확인
3. 회사 override row가 `ManagerNavigationPolicy.company_id`로 저장됐는지 확인
4. 전역 정책과 회사 override가 같은 `manager_role + nav_item_key`에 공존하는지 확인
