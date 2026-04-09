# Company Navigation Policy Runbook

## 목적

- 회사 메뉴 정책의 source of truth를 `CompanyManagerRole.allowed_nav_keys`로 고정한다.
- 회사 전체 관리자가 자기 회사 역할 카탈로그의 메뉴 공개/비공개를 조정하는 운영 절차를 기록한다.
- 별도 `company override row`나 reset endpoint에 의존하지 않는 현재 동작을 기준으로 남긴다.

## 용어

- `메뉴 정책`
  - 시스템 관리자 전용 화면
  - 모든 회사의 역할별 메뉴 허용 집합을 직접 관리한다.
- `회사 메뉴 정책`
  - 회사 전체 관리자 중심 화면
  - 자기 회사 역할별 메뉴 허용 집합을 직접 관리한다.
- `관리자 역할`
  - 회사별 역할 카탈로그 관리 화면
  - 역할 생성, 이름 변경, 삭제 제한 확인을 다룬다.

## 권한

- 시스템 관리자
  - 모든 회사의 `메뉴 정책` 편집 가능
  - 모든 회사의 `관리자 역할` 관리 가능
  - `회사 메뉴 정책`도 강제 수정 가능
- 회사 전체 관리자(`company_super_admin`)
  - 자기 회사의 `회사 메뉴 정책` 편집 가능
  - 자기 회사의 `관리자 역할` 관리 가능
- 일반 관리자 역할
  - 정책/역할 편집 불가

## 현재 데이터 모델

- `CompanyManagerRole`
  - `company_id`
  - `code`
  - `display_name`
  - `allowed_nav_keys`
  - `is_system_required`
- 필수 기본 역할
  - `company_super_admin`
  - `vehicle_manager`
  - `settlement_manager`
  - `fleet_manager`

현재 메뉴 공개/비공개는 별도 override 테이블이 아니라 각 회사 역할 레코드의 `allowed_nav_keys`를 직접 수정해 반영한다.

## UI 진입점

- 시스템 관리자
  - `/admin/menu-policy`
  - 사이드바 항목: `메뉴 정책`
- 회사 전체 관리자
  - `/company/menu-policy`
  - 사이드바 항목: `회사 메뉴 정책`

## API

회사 역할 목록 조회:

- `GET /api/auth/company-manager-roles/?company_id=<company_id>`

회사 역할 생성:

- `POST /api/auth/company-manager-roles/`

회사 역할 수정:

- `PATCH /api/auth/company-manager-roles/<role_id>/`

회사 역할 삭제:

- `DELETE /api/auth/company-manager-roles/<role_id>/`

현재 로그인 사용자 정책 조회:

- `GET /api/auth/identity-navigation-policy/`

## 운영 원칙

1. 메뉴 공개/비공개의 최종 저장 위치는 `CompanyManagerRole.allowed_nav_keys`다.
2. 시스템 관리자는 어떤 회사든 직접 편집할 수 있다.
3. 회사 전체 관리자는 자기 회사 역할만 수정할 수 있다.
4. `company_super_admin` 역할은 필수 역할이므로 삭제할 수 없다.
5. 관리자 계정이 배정된 역할은 삭제할 수 없다.
6. 구식 company navigation policy endpoint는 제거되었다.

## 삭제 제한

- 삭제 불가
  - `company_super_admin`
  - 관리자 계정이 이미 배정된 역할
- 삭제 가능
  - 배정이 없는 비필수 역할
  - 기본 역할도 배정이 없으면 삭제 가능

## 장애 확인 포인트

1. 현재 로그인 계정이 시스템 관리자 또는 회사 전체 관리자 권한을 가졌는지 확인
2. `GET /api/auth/identity-navigation-policy/` 응답에 필요한 nav key가 포함되는지 확인
3. `GET /api/auth/company-manager-roles/` 응답에서 대상 역할의 `allowed_nav_keys`가 기대값인지 확인
4. `company_super_admin` 또는 배정된 역할을 삭제하려고 했을 때 삭제 제한 메시지가 노출되는지 확인
5. 구식 endpoint 호출이 404인지 확인
   - `GET /api/auth/company-navigation-policy/manage/`
   - `PUT /api/auth/company-navigation-policy/manage/`
   - `POST /api/auth/company-navigation-policy/reset/`
