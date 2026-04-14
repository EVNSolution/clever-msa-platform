# CLEVER Manager Navigation Policy (ABAC-lite)

## Purpose

이 문서는 시스템 관리자와 회사 관리자용 운영 콘솔에서 사용할 `관리자 네비게이션 정책`의 상위 설계를 고정한다.

이번 문서의 목표는 아래다.

1. 사이드바 탭 노출/미노출을 단순 UI 토글이 아니라 `속성 기반 접근 정책`으로 다룬다.
2. 현재 필요한 관리자 유형 기반 제어를 `ABAC-lite`로 정의한다.
3. 이후 회사별 정책 override와 사용자 배정까지 확장 가능한 구조를 먼저 고정한다.

이 문서는 구현 체크리스트가 아니라 권한/네비게이션 정책 상위 설계 문서다.

## Current Problem

현재 운영 콘솔의 사이드바 노출은 프론트 조건문과 역할 추정에 크게 의존한다.

이 상태의 문제는 아래다.

- 어떤 관리자 유형이 어떤 메뉴를 봐야 하는지 정책이 코드에 흩어진다.
- 프론트 노출과 백엔드 권한이 쉽게 분리된다.
- 회사별 관리자 요구가 생기면 하드코딩이 빠르게 증가한다.
- 메뉴 숨김만으로는 실제 권한 모델이 되지 못한다.

즉, 지금 필요한 것은 `탭 on/off` 기능이 아니라 `관리자 유형별 네비게이션 정책 모델`이다.

## Primary Decision

사이드바 메뉴 노출 제어는 `ABAC-lite` 모델로 설계한다.

이번 단계에서의 `ABAC-lite` 정의는 아래다.

- subject attributes: 현재 로그인한 관리자 계정의 속성
- resource attributes: 네비게이션 항목의 속성
- action: 현재는 `view` 중심
- policy evaluation: subject와 resource 속성을 비교해 허용 여부를 계산

이번 단계는 풀 ABAC 엔진이 아니다.

이번 단계의 초점은 아래다.

1. `manager_role` 기반 메뉴 노출 정책
2. 정책 조회/편집의 시스템 관리자 화면
3. 같은 정책 축을 이후 API 권한까지 확장 가능한 형태로 고정

## Why ABAC-lite Fits This Stage

### 1. 현재 요구는 이미 속성 기반이다

지금 사용자 요구는 아래다.

- 차량 관리자에게는 차량 관련 메뉴를 보여준다.
- 정산 관리자에게는 정산 관련 메뉴를 보여준다.
- 플릿 관리자에게는 플릿 관련 메뉴를 보여준다.

이 요구는 사실상 `manager_role`이라는 속성 기반 요구다.

### 2. 이후 회사별 운영 요구와 자연스럽게 연결된다

향후 요구는 아래 형태로 확장될 가능성이 높다.

- 회사 A는 플릿 관리자에게 배차 탭을 허용
- 회사 B는 같은 플릿 관리자라도 배차 탭을 숨김
- 시스템 관리자는 전역 기본 정책을 유지
- 회사 관리자는 자기 회사 범위에서만 override

이 확장은 RBAC만으로는 금방 불편해진다. `ABAC-lite`가 더 자연스럽다.

### 3. 프론트 노출과 API 권한을 같은 축에 올릴 수 있다

메뉴를 숨기는 것만으로는 권한이 아니다.

정책 모델이 있어야 아래를 함께 맞출 수 있다.

- 사이드바 노출
- 화면 진입 허용
- API action 허용

이번 단계는 사이드바 노출부터 시작하지만, 처음부터 같은 정책 축을 전제로 둔다.

## Scope

이번 문서의 범위는 아래다.

### Included in Scope

- 관리자 유형 기반 사이드바 메뉴 노출 정책
- 시스템 관리자용 정책 편집 화면
- 로그인 사용자 기준 허용 메뉴 조회
- 향후 회사별 정책 override 확장 경로

### Not Yet in Scope

- 임의 사용자 정의 속성 생성
- 회사 관리자의 자유 역할 생성
- 필드 단위 권한
- 데이터 row 단위 권한
- 완전한 정책 언어 또는 외부 정책 엔진

즉, 이번 단계는 `navigation policy for managers`에 집중한다.

## Subject Model

이번 단계에서 subject는 아래 속성으로 정의한다.

- `account_type`
- `manager_role`
- `is_system_admin`
- `company_id`

최소 요구는 `manager_role`이다.

예시:

- `manager_role = vehicle_manager`
- `manager_role = settlement_manager`
- `manager_role = fleet_manager`

향후 회사별 override를 위해 `company_id`는 subject 축에 남긴다.

## Resource Model

네비게이션 항목은 stable key를 가진 resource로 정의한다.

예시:

- `dashboard`
- `accounts`
- `companies`
- `regions`
- `drivers`
- `vehicles`
- `vehicle_assignments`
- `settlements`
- `payroll`
- `dispatch`
- `announcements`
- `support`

각 resource는 최소 아래 속성을 가진다.

- `nav_item_key`
- `resource_group`
- `visibility_default`

`resource_group`는 이후 정책 편집 UI에서 묶음 단위로 보여줄 때 쓴다.

## Action Model

이번 단계의 action은 `view`로 시작한다.

즉 현재 결정하는 것은 아래다.

- 이 관리자 유형이 이 메뉴를 볼 수 있는가

하지만 모델은 이후 아래 action으로 확장 가능한 형태를 전제로 한다.

- `edit`
- `approve`
- `export`
- `manage_policy`

## Policy Model

기본 정책은 아래 형태를 가진다.

- subject condition
- resource key
- action
- effect allow/deny

실무 구현에서는 초기에는 아래 수준이면 충분하다.

- `manager_role -> allowed_nav_items[]`

예시:

- `vehicle_manager -> [dashboard, vehicles, vehicle_assignments]`
- `settlement_manager -> [dashboard, settlements, payroll]`
- `fleet_manager -> [dashboard, companies, drivers, dispatch]`

이 단순 표현을 내부적으로 `ABAC-lite` 정책의 첫 버전으로 본다.

## Policy Ownership Decision

정책 편집 권한은 두 단계로 나눈다.

### Phase 1

- 시스템 관리자가 전역 관리자 유형과 기본 네비게이션 정책을 관리한다.
- 회사 관리자는 아직 역할을 새로 만들지 않는다.
- 회사 관리자는 자기 회사 정책을 편집하지 않는다.

### Phase 2

- 시스템 관리자는 전역 기본 정책을 계속 관리한다.
- 회사 관리자는 자기 회사 범위에서 `override`만 조정한다.
- 회사 관리자는 새 관리자 유형을 자유 생성하지 않는다.

### Phase 3

- 필요성이 충분히 검증된 뒤에만 회사별 커스텀 관리자 유형 생성을 검토한다.
- 이 경우에도 아래가 전제다.
  - 허용 가능한 메뉴 집합 제한
  - 감사 로그
  - 시스템 관리자 override 가능

즉 초기 확장 방향은 `role creation`보다 `company override`가 먼저다.

## UI Decision

시스템 관리자 화면에는 `관리자 권한 정책` 영역을 둔다.

이 화면은 아래를 제공한다.

1. 관리자 유형 목록
2. 유형별 허용 메뉴 체크 편집
3. 저장 후 즉시 반영
4. 향후 회사별 override 진입점

이번 단계의 편집 UI는 아래가 적절하다.

- 왼쪽: 관리자 유형 선택
- 오른쪽: 메뉴 항목 체크박스 목록
- 필요 시 resource group별 섹션 분리

이 UI의 목적은 정책 편집이지, 단순 레이아웃 설정이 아니다.

## Backend Decision

백엔드는 로그인 사용자 기준 `allowed_nav_items`를 계산해 반환한다.

최소 요구 API는 아래다.

1. 현재 로그인 사용자 기준 허용 메뉴 조회
2. 시스템 관리자 기준 정책 조회
3. 시스템 관리자 기준 정책 수정

중요한 원칙은 아래다.

- 프론트는 허용 메뉴를 표시할 뿐, 정책의 source of truth는 백엔드다.
- 이후 API authorization도 같은 정책 축으로 이어져야 한다.

## Frontend Decision

프론트는 하드코딩된 역할 분기를 줄이고, 정책 조회 결과를 기준으로 메뉴를 노출한다.

즉 프론트의 역할은 아래다.

- 허용 메뉴 목록을 받아 sidebar filter 적용
- 허용되지 않은 화면 진입 시 사용자 친화적인 안내 제공
- 정책 편집 화면 제공

프론트가 권한 판단의 source가 되면 안 된다.

## Compatibility Decision

현재 이미 존재하는 관리자 유형과 메뉴 구조를 한 번에 폐기하지 않는다.

전환 원칙은 아래다.

1. 기존 역할 기반 메뉴 조건과 새 정책 조회를 병행 가능하게 만든다.
2. 정책 조회가 준비되면 프론트 하드코딩을 단계적으로 제거한다.
3. 사용자 경험이 흔들리지 않도록 초기 기본 정책은 현재 운영 콘솔 노출과 최대한 맞춘다.

## Security Decision

중요한 원칙은 아래다.

- `메뉴 숨김`은 권한의 전부가 아니다.
- 최종 목표는 `navigation policy`와 `API authorization policy`가 같은 모델로 수렴하는 것이다.

이번 단계에서는 메뉴 노출부터 시작하지만, 이후 API 권한도 이 축으로 확장한다.

즉 이번 정책 시스템은 단순 UI 기능이 아니라 권한 모델의 첫 관문이다.

## Data Evolution Path

이번 단계의 데이터 모델은 단순할수록 좋다.

추천 초기 형태는 아래다.

- `manager_role`
- `nav_item_key`
- `effect`

이후 아래 속성을 추가할 수 있다.

- `company_id`
- `resource_group`
- `action`
- `is_inherited`
- `updated_by`
- `updated_at`

즉 처음에는 단순한 허용 목록으로 시작하되, 확장 축은 미리 열어둔다.

## Rollout Strategy

권장 rollout은 아래다.

1. 메뉴 key 표준화
2. 기본 정책 테이블 또는 정책 저장소 추가
3. 현재 로그인 사용자 정책 조회 API 추가
4. 프론트 sidebar filter를 정책 조회 기반으로 전환
5. 시스템 관리자 편집 화면 추가
6. 이후 회사별 override 검토

이 순서를 벗어나면 화면과 백엔드 권한이 쉽게 어긋난다.

## Final Decision Summary

이번 단계의 최종 결정은 아래다.

1. 관리자별 사이드바 제어는 `ABAC-lite` 정책으로 설계한다.
2. 첫 subject attribute는 `manager_role`이다.
3. 첫 resource는 `nav_item_key`다.
4. 첫 action은 `view`다.
5. 시스템 관리자가 전역 정책을 관리한다.
6. 회사 관리자의 확장은 `역할 생성`보다 `회사별 override`부터 시작한다.
7. 프론트 노출과 이후 API 권한은 같은 정책 축으로 수렴한다.

즉, 이 기능은 단순한 탭 토글이 아니라 `관리자 네비게이션 정책 시스템`으로 다룬다.
