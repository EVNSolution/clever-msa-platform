# CLEVER Manager Role Scope Assignment

## Purpose

이 문서는 관리자 역할 정의와 관리자 계정 배정에 `회사 레벨`과 `플릿 레벨` 스코프를 도입하는 정본 설계를 고정한다.

이번 설계의 목적은 아래다.

1. 관리자 역할 생성 시 역할이 `회사 전체 대상`인지 `플릿 대상`인지 명확하게 정의한다.
2. 관리자 계정 요청 승인과 기존 관리자 권한 변경 시, `플릿 레벨 역할`에만 실제 `fleet` 배정을 붙인다.
3. 단일 플릿 담당자와 다중 플릿 담당자, 회사 전체 담당자가 같은 권한 모델 위에서 자연스럽게 동작하게 만든다.
4. 정산/배차 등 회사-플릿 문맥 화면이 세션 메타데이터만으로 빠르게 UI를 분기할 수 있게 만든다.

## Current Problem

현재 runtime에는 아래 공백이 있다.

- `CompanyManagerRole`는 회사 소속 역할 레코드까지는 도입됐지만, 역할이 회사 전체 범위인지 플릿 범위인지 저장하지 않는다.
- `ManagerAccount`는 `company_id + role_type`만 저장하고, 플릿 배정 정보를 저장하지 않는다.
- 계정 요청 승인과 기존 관리자 역할 변경은 `role_type`만 받고 끝난다.
- 세션 payload에는 `company_id`, `role_type`, `role_display_name`만 있고 `fleet scope`가 없다.

그래서 현재는 아래 요구를 구현할 수 없다.

1. 역할은 회사 레벨인지 플릿 레벨인지 먼저 정의한다.
2. 플릿 레벨 역할은 계정 배정 시 `fleet_ids[]`를 1개 이상 받아야 한다.
3. 같은 플릿 레벨 역할이라도 어떤 계정은 플릿 1개, 어떤 계정은 여러 플릿을 담당할 수 있어야 한다.
4. 세션/UI는 `회사 전체 담당`, `단일 플릿 담당`, `다중 플릿 담당`을 빠르게 구분해야 한다.

## Primary Decision

스코프 모델은 아래 두 층으로 나눈다.

1. 역할 레벨
   - `CompanyManagerRole.scope_level = company | fleet`
   - 역할이 회사 전체 대상인지, 플릿 배정이 필요한 역할인지 정의한다.
2. 계정 배정 범위
   - `ManagerAccountFleetAssignment`
   - 플릿 레벨 역할을 실제 어떤 플릿들에 배정했는지 저장한다.

즉 역할은 `레벨`만 가진다. 실제 `fleet_ids[]`는 계정 요청 승인과 관리자 권한 변경 시점에만 결정된다.

## Ownership Model

### CompanyManagerRole

`CompanyManagerRole`는 계속 역할 정의 owner다.

필수 필드:

- `company_manager_role_id`
- `company_id`
- `code`
- `display_name`
- `scope_level`
- `is_system_required`
- `is_default`
- `is_active`
- `allowed_nav_keys[]`

새 필드:

- `scope_level`
  - `company`
  - `fleet`

의미:

- `company`: 회사 전체 범위를 전제로 하는 역할
- `fleet`: 계정별 플릿 배정이 필요한 역할

### ManagerAccount

`ManagerAccount`는 계속 관리자 계정 owner다.

필수 필드:

- `manager_account_id`
- `identity_id`
- `company_id`
- `role_type`
- `status`

이 테이블에는 `fleet_ids`를 직접 넣지 않는다.

### ManagerAccountFleetAssignment

새 테이블 `ManagerAccountFleetAssignment`를 도입한다.

필수 필드:

- `manager_account_fleet_assignment_id`
- `manager_account_id`
- `company_id`
- `fleet_id`
- `assigned_at`

제약:

- 같은 `manager_account_id + fleet_id` 중복 금지
- `ManagerAccount.company_id`와 assignment `company_id`가 같아야 한다
- `company` 레벨 역할인 계정에는 assignment 생성 금지

## Core Rules

### Role-Level Rules

- `company` 레벨 역할은 계정 배정 시 `fleet_ids`를 가질 수 없다.
- `fleet` 레벨 역할은 계정 배정 시 `fleet_ids`를 1개 이상 반드시 가져야 한다.

### Assignment Rules

- `fleet` 레벨 역할 + `fleet_ids=[]` -> `400`
- `fleet` 레벨 역할 + 회사 밖 fleet 포함 -> `400`
- `company` 레벨 역할 + `fleet_ids` 전달 -> `400`
- `company` 레벨 역할로 변경되면 기존 fleet assignment는 모두 제거한다.
- `fleet` 레벨 역할에서 다른 `fleet` 레벨 역할로 바꾸면 fleet assignment를 함께 갱신할 수 있다.

### Scope Interpretation

- 회사 레벨 역할
  - 회사 전체 대상
  - 세션/UI에서 회사 컨텍스트를 기준으로 플릿 문맥 선택이 가능하다.
- 플릿 레벨 역할 + 배정 플릿 1개
  - 단일 플릿 담당
  - 세션/UI에서 플릿 선택 UI를 숨긴다.
- 플릿 레벨 역할 + 배정 플릿 2개 이상
  - 다중 플릿 담당
  - 세션/UI에서 플릿 선택 UI를 보여준다.

## Default Role Scope Decision

기본 시드 역할의 scope는 아래처럼 고정한다.

1. `company_super_admin`
   - `scope_level=company`
2. `vehicle_manager`
   - `scope_level=company`
3. `settlement_manager`
   - `scope_level=company`
4. `fleet_manager`
   - `scope_level=fleet`

추가 custom role은 생성 시 운영자가 `company | fleet`를 선택한다.

## API Decision

이번 설계는 `service-account-access` API만 바꾼다.

### Company Manager Role APIs

#### `GET /auth/company-manager-roles/?company_id=...`

응답에 `scope_level` 포함:

- `company_manager_role_id`
- `company_id`
- `code`
- `display_name`
- `scope_level`
- `is_system_required`
- `is_default`
- `allowed_nav_keys`
- `assigned_count`
- `can_delete`

#### `POST /auth/company-manager-roles/`

요청:

- `company_id`
- `display_name`
- `scope_level`

#### `PATCH /auth/company-manager-roles/:id/`

요청:

- `display_name?`
- `scope_level?`
- `allowed_nav_keys?`

제약:

- 이미 배정된 관리자 계정이 있는 역할의 `scope_level` 변경은 금지한다.
- `company_super_admin.scope_level`은 항상 `company`로 고정한다.

### Signup Request Approval APIs

관리자 request의 최종 승인 단계는 `role_type`뿐 아니라 `fleet_ids`도 받을 수 있어야 한다.

적용 surface:

- `POST /auth/identity-signup-requests/:id/approve/`
- `POST /auth/identity-signup-requests/:id/complete-setup/`

요청:

- `role_type`
- `fleet_ids?`

규칙:

- 선택한 role의 `scope_level=fleet`면 `fleet_ids` 필수
- 선택한 role의 `scope_level=company`면 `fleet_ids` 금지

### Manager Account Change APIs

`POST /auth/manager-accounts/:id/change-role/`

요청:

- `role_type`
- `fleet_ids?`

규칙은 request approval과 동일하다.

### Manager Account Read APIs

아래 응답은 모두 스코프 메타데이터를 포함해야 한다.

- `GET /auth/manager-accounts/manage/`
- `GET /auth/identity-me/`
- `POST /auth/identity-login/`
- `POST /auth/identity-refresh/`

## Session / Projection Decision

정본은 `scope_level + fleet assignments`지만, 프런트는 파생 메타데이터를 바로 받는다.

### Required Session Fields

세션/응답에 아래 projection을 추가한다.

- `role_scope_level`
- `assigned_fleet_ids`
- `scope_ui_mode`
- `default_fleet_id`

### scope_ui_mode

허용 값:

- `company_selectable`
- `fleet_fixed_single`
- `fleet_selectable_multi`

계산 규칙:

- `company` 레벨 역할 -> `company_selectable`
- `fleet` 레벨 역할 + assignment 1개 -> `fleet_fixed_single`
- `fleet` 레벨 역할 + assignment 2개 이상 -> `fleet_selectable_multi`

`default_fleet_id`는 `fleet_fixed_single`일 때만 그 fleet 값을 가진다.

## Frontend Decision

직접 구현 repo는 `front-web-console` 하나다.

### Manager Roles Page

`/admin/manager-roles`

변경:

- 역할 생성/수정 폼에 `scope_level(company | fleet)` 입력 추가
- 역할 목록에 `회사 레벨 / 플릿 레벨` 표시 추가
- 이미 배정된 역할은 `scope_level` 수정 비활성화 또는 서버 오류를 그대로 노출

중요:

- 이 화면에서는 플릿을 직접 고르지 않는다.
- 역할이 회사 레벨인지 플릿 레벨인지만 정의한다.

### Accounts Page

`/admin/account-requests`

변경 대상:

- 계정 요청 승인
- 기존 관리자 권한 변경

동작:

1. 역할 선택
2. 선택한 role의 `scope_level` 읽기
3. `scope_level=fleet`면 플릿 멀티 선택 UI 노출
4. `scope_level=company`면 플릿 선택 UI 숨김

세부 규칙:

- 플릿 레벨 역할 + 플릿 1개 선택
  - 저장 가능
- 플릿 레벨 역할 + 플릿 여러 개 선택
  - 저장 가능
- 회사 레벨 역할
  - 플릿 선택 UI 없음

### Downstream Context UI

정산/배차 등 회사-플릿 문맥 화면은 `scope_ui_mode`를 기준으로 분기한다.

- `company_selectable`
  - 회사/플릿 문맥 선택 UI 표시
- `fleet_fixed_single`
  - 회사/플릿 선택 UI 숨김
  - 고정된 fleet로 자동 동작
- `fleet_selectable_multi`
  - 플릿 선택 UI 표시
  - 회사는 고정, 플릿만 바꿀 수 있다

## Authorization Decision

이번 설계는 `allowed_nav_keys` authorization 모델을 바꾸지 않는다.

추가되는 것은 `resource scope`다.

- 메뉴 진입 권한: 기존 `allowed_nav_keys`
- 회사/플릿 데이터 범위: 새 `scope_level + fleet assignment`

즉 앞으로는 같은 `settlement_manager` 계열이라도 아래가 가능하다.

- 회사 전체 정산 담당자
- 단일 플릿 정산 담당자
- 다중 플릿 정산 담당자

## Validation Decision

서버는 아래를 강제한다.

1. `company_super_admin`는 `scope_level=company` 고정
2. 배정된 역할은 `scope_level` 변경 금지
3. `fleet` 레벨 역할 승인/변경 시 `fleet_ids` 1개 이상 필수
4. `company` 레벨 역할 승인/변경 시 `fleet_ids` 금지
5. 배정 fleet는 target company 소속이어야 한다
6. 하위 관리자라도 자기 company 밖 fleet는 배정할 수 없다

## Rollout Order

1. 설계 문서 고정
2. `service-account-access`
   - schema
   - serializer
   - service
   - auth session payload
   - tests
3. `front-web-console`
   - manager roles page
   - accounts page
   - downstream context consumers
4. migration / seed
5. verification

## Verification Matrix

필수 검증 케이스:

1. system admin
   - 회사 레벨 역할 생성
   - 플릿 레벨 역할 생성
   - 플릿 레벨 관리자 승인 with single fleet
   - 플릿 레벨 관리자 승인 with multi fleet
2. company super admin
   - 자기 회사 role 생성/수정
   - 자기 회사 관리자 승인/권한 변경
3. company-level manager session
   - 회사/플릿 문맥 선택 UI 보임
4. fleet-level manager single fleet session
   - 선택 UI 숨김
   - 고정 fleet로 동작
5. fleet-level manager multi fleet session
   - 플릿 선택 UI 보임

## Final Decision Summary

1. 역할은 `회사 레벨` 또는 `플릿 레벨`만 정의한다.
2. 실제 플릿 범위는 계정 승인/권한 변경 시점에 `ManagerAccountFleetAssignment`로 배정한다.
3. `플릿 레벨 역할`은 1개 이상의 fleet assignment가 필수다.
4. `회사 레벨 역할`은 fleet assignment를 가질 수 없다.
5. 세션과 관리자 계정 응답에는 `scope_ui_mode` 등 파생 메타데이터를 실어 프런트 분기 비용을 줄인다.
6. 직접 구현 repo는 `service-account-access`와 `front-web-console` 두 곳이다.
