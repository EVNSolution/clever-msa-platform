# Manager Navigation Policy API Authorization Design

## Goal

- 현재 구현된 `manager navigation policy`를 단순 사이드바 노출 제어에서 실제 API 접근 제어까지 확장한다.
- 시스템 관리자가 전역 정책을 바꾸거나 회사 전체 관리자가 회사 override를 바꾸면, 해당 정책이 이후 API 접근에도 적용되게 만든다.
- 서비스 간 공유 Python 패키지 없이, 각 서비스가 자기 경계 안에서 같은 권한 축을 해석하도록 만든다.

## Current Problem

현재 dev에는 아래 상태가 구현돼 있다.

- `service-account-access`가 현재 로그인 사용자의 `allowed_nav_keys`를 계산한다.
- `front-web-console`은 이 값을 읽어 사이드바를 필터링한다.
- 회사 전체 관리자는 자기 회사 범위에서 `manager_role -> allowed_nav_keys`를 override 할 수 있다.

하지만 아직 아래가 남아 있다.

- 메뉴가 숨겨져도 사용자가 URL을 직접 치면 화면 진입이 가능할 수 있다.
- 각 서비스 API는 기존 role check를 그대로 쓰고 있다.
- 정책 변경이 실제 backend authorization으로 이어지지 않는다.

## Decision

### 1. 같은 정책 축을 API authorization에도 사용한다

- `subject attributes`
  - `system_admin`
  - `manager_role`
  - `company_id`
- `resource`
  - `nav_item_key`
- `action`
  - 1차는 `view`만 사용

즉 1차에서는 아래 질문 하나에 답할 수 있으면 충분하다.

- `이 principal은 nav_item_key=X의 view 권한이 있는가?`

### 2. Backend가 최종 권한 판단 주체다

- 프론트는 계속 사이드바를 숨긴다.
- 하지만 최종 허용/거부는 각 API를 소유한 서비스가 결정한다.
- `탭 on/off`는 UX 힌트이고, `API authorization`이 진짜 enforcement다.

### 3. 권한 해석은 `service-account-access`가 계산하고, 결과는 세션 claim으로 전달한다

이 설계의 핵심은 **서비스 간 공유 패키지나 매 요청 원격 introspection 없이** 각 서비스가 자기 로컬에서 판단 가능하게 만드는 것이다.

선택한 방식:

- 로그인/refresh 시 `service-account-access`가 현재 principal의 effective navigation policy를 계산한다.
- 그 결과를 identity access token claim에 넣는다.
- 각 서비스는 자기 요청의 JWT claim에서 `allowed_nav_keys`를 읽어 로컬 helper로 허용/거부를 판정한다.

claim 예시:

```json
{
  "allowed_nav_keys": ["dashboard", "vehicles", "drivers"],
  "navigation_policy_source": "company_override"
}
```

### 4. 즉시성 모델은 2단계로 간다

1차:

- 정책 변경은 **다음 access token 발급 시점부터** API authorization에 반영된다.
- 현재 시스템은 access token refresh 흐름이 이미 있으므로, 사용자 재요청 또는 토큰 재발급 주기 안에서 수렴한다.

2차:

- 더 강한 즉시성이 필요하면 `policy_version` 또는 `token invalidation`을 추가 검토한다.

즉 1차 목표는 “정책 기반 API 차단”이지, “모든 활성 세션 즉시 강제 추방”은 아니다.

## Why This Design

### Rejected: 서비스가 매 요청마다 auth service를 HTTP introspection 한다

문제:

- `service-account-access` 가용성에 각 서비스 요청이 직접 묶인다.
- 네트워크 홉과 장애 면이 늘어난다.
- 각 서비스가 자기 권한 판단을 하지 못하고 원격에 매번 의존한다.

### Rejected: 루트 또는 공용 repo에 shared authorization package를 만든다

문제:

- 현재 경계 규칙과 충돌한다.
- 서비스 repo 간 강한 코드 결합을 다시 만든다.

### Chosen: claim-based local enforcement

장점:

- 서비스가 자기 경계에서 판단한다.
- 공유 패키지가 필요 없다.
- gateway나 다른 중앙 런타임에 권한 로직을 몰지 않아도 된다.
- 현재 identity session 모델과 자연스럽게 이어진다.

## Policy Resolution Contract

정책 해석 순서는 기존과 동일하다.

1. `system_admin` full allow
2. `company override`
3. `global policy`
4. `default fallback`

이 결과를 access token claim에 넣는다.

## Authorization Contract

각 서비스는 아래 형태의 local helper를 가진다.

```python
def require_nav_access(principal, nav_item_key: str, action: str = "view") -> None:
    ...
```

1차 규칙:

- `system_admin`은 항상 통과
- manager 계정은 claim의 `allowed_nav_keys`에 해당 key가 있으면 통과
- driver 또는 기타 계정은 기본적으로 거부

거부 시:

- HTTP `403`
- 메시지:
  - `"This API is not allowed by current navigation policy."`

## Initial `nav_item_key -> API` Mapping

1차는 `front-web-console`의 실제 섹션 단위로 묶는다.

- `accounts`
  - 계정 요청, 관리자 계정, 배송원 계정 관련 관리 API
- `companies`
  - 회사 관리 API
- `regions`
  - 권역 관리 API
- `drivers`
  - 배송원 프로필/조회 API
- `personnel_documents`
  - 인사문서 API
- `vehicles`
  - 차량 마스터/차량 운영 접근 API
- `vehicle_assignments`
  - 차량 배정 API
- `dispatch`
  - 배차 보드/배차 계획 API
- `settlements`
  - 정산 기준/입력/실행/결과 API
- `announcements`
  - 공지 API
- `support`
  - 지원 API

`dashboard`, `account`는 1차 API authorization 대상에서 제외한다.

이유:

- `dashboard`는 aggregate/read shell 성격이 강하다.
- `account`는 로그인 사용자의 자기 계정 관리이므로 별도 self-service 규칙으로 두는 편이 낫다.

## Service Boundary Rule

- 각 서비스는 자기 API에 필요한 `nav_item_key` 매핑만 로컬에 둔다.
- 다른 서비스 repo를 import 하지 않는다.
- 공통 개념은 문서 계약으로만 공유한다.

즉:

- `service-vehicle-registry`는 자기 API가 `vehicles`인지 `vehicle_assignments`인지 자기 repo 안에서 선언한다.
- `service-region-registry`는 자기 API가 `regions`인지 자기 repo 안에서 선언한다.
- backend notification API (`/api/notifications/*`)는 nav_item_key mapping이 아니라 backend/runtime capability로만 다룬다.

## Rollout Strategy

### Phase 1

- token claim에 `allowed_nav_keys` 추가
- `service-account-access`에 local authorization helper 추가
- 가장 먼저 `service-account-access` own management APIs에 적용

### Phase 2

- `service-organization-registry`
- `service-region-registry`
- `service-driver-profile`
- `service-personnel-document-registry`
- `service-vehicle-registry`
- `service-vehicle-assignment`

### Phase 3

- `service-dispatch-registry`
- settlement 계열
- announcement/support/notification 계열

## Risks

1. policy claim stale window
- 기존 access token이 살아있는 동안은 이전 권한으로 API 접근이 가능할 수 있다.

2. per-service mapping drift
- `nav_item_key`와 실제 API 매핑이 서비스마다 틀어질 수 있다.

3. view와 edit를 아직 분리하지 않음
- 1차는 `view` 액션만 본다.
- 생성/수정/승인/배정은 이후 세분화가 필요하다.

## Non-Goals

이번 단계에서 하지 않는 것:

- 완전한 즉시 revocation
- `edit`, `approve`, `assign` 같은 action 세분화
- driver/user ABAC 전면 도입
- 회사별 커스텀 role 생성

## Completion Criteria

- 시스템/회사 정책 변경이 이후 발급 토큰의 `allowed_nav_keys`에 반영된다.
- 선택된 서비스들이 자기 로컬 helper로 `403`을 반환한다.
- 프론트와 API가 같은 정책 축을 사용한다.
- 서비스 간 공유 패키지는 추가되지 않는다.
