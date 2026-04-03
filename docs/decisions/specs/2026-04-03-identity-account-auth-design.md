# Identity Account Auth Design

## 목적

이 문서는 CLEVER의 사람, 로그인, 제품 계정, 회사 소속, 배송원 연결 경계를 current truth로 고정한다.

이번 결정의 목적은 아래와 같다.

1. 로그인 수단과 제품 계정을 분리한다.
2. 관리자 계정과 배송원 계정을 분리한다.
3. 회사 소속은 사람이 아니라 제품 계정이 가지게 한다.
4. 가입 신청, 승인, 회사 변경, 배송원 연결 흐름을 같은 모델 위에서 정리한다.

## 현재 문제

기존 구조는 아래 해석이 섞여 있었다.

1. `account`가 로그인 주체인지, 제품 계정인지가 불분명했다.
2. 관리자와 배송원을 같은 계정 축에서 풀지, 분리할지가 고정되지 않았다.
3. 회사 소속을 어디에 둘지 고정되지 않았다.
4. 소셜 로그인, 회사 변경, 배송원 연결, 관리자 승인 흐름이 한 모델에서 함께 설명되지 않았다.

이 상태로 구현을 시작하면 인증과 도메인 경계가 함께 흔들린다.

## 선택된 접근

이번 결정은 `identity 상위 + account 분리 + request workflow`를 current truth로 고정한다.

핵심 원칙은 아래와 같다.

1. `identity`는 사람 단일 원천이다.
2. 로그인 수단은 `identity_login_method`에만 붙는다.
3. 제품 계정은 `system_admin_account`, `manager_account`, `driver_account`로 분리한다.
4. 회사 소속은 `manager_account`, `driver_account`가 직접 가진다.
5. 배송원 연결은 `driver_account_link`가 별도로 가진다.
6. 가입 신청은 `identity_signup_request`에서 workflow로 관리한다.

## 엔티티 계층

### 1. identity

- 사람 단일 원천
- 회사에 속하지 않는다
- 상태는 `active`, `archived`

### 2. identity_login_method

- `identity`의 로그인 수단
- `email`, `phone`, `social`을 같은 계층에서 다룬다
- 같은 로그인 수단은 `identity` 하나에만 연결된다
- 웹과 앱은 같은 로그인 수단을 공용으로 쓴다

### 3. system_admin_account

- `identity`에 속한 플랫폼 운영 계정
- 회사 경계 밖 계정이다
- 모든 회사 request와 account를 보고 직접 관리할 수 있다
- `signup_request`로 생성하지 않는다
- 기존 `system_admin_account`가 직접 부여한다

### 4. manager_account

- `identity`에 속한 회사 소속 관리자 계정
- `company_id`를 직접 가진다
- 웹은 이 계정만 사용한다
- 앱에서도 사용 가능하다
- 관리자 역할은 정확히 하나다
  - `company_super_admin`
  - `vehicle_manager`
  - `settlement_manager`

### 5. driver_account

- `identity`에 속한 회사 소속 배송원용 계정
- `company_id`를 직접 가진다
- 앱에서만 사용한다
- 웹 권한은 없다

### 6. identity_signup_request

- `identity`의 가입/계정 개설 workflow 기록
- 정본 사람 데이터가 아니라 신청 기록이다
- `request 1개 = 목적 1개`로 고정한다
- 같은 `identity`에 여러 개의 `pending` request가 동시에 존재할 수 있다
- 종류는 아래 두 개다
  - `manager_account_create`
  - `driver_account_create`

### 7. identity_account_link

- `identity`와 각 account의 연결 이력
- 사람과 제품 계정의 연결 관계를 기록한다
- 정본 연결이 아니라 감사/이력용 테이블이다
- 현재 account의 소유 identity는 각 account의 `identity_id`로 직접 판단한다

### 8. driver_account_link

- `driver_account`와 `driver`의 연결 이력
- 배송원 업무 주체 연결은 이 테이블에서만 표현한다

## 상태 규칙

### identity

- `active`
- `archived`

`identity`가 `archived` 되면 연결된 `manager_account`, `driver_account`도 함께 `archived` 된다.

### system_admin_account

- `active`
- `archived`

### manager_account / driver_account

- `active`
- `banned`
- `archived`

두 account는 개별적으로 `banned`, `archived` 될 수 있다.

### identity_signup_request

- `pending`
- `approved`
- `rejected`

승인/반려된 request는 삭제하지 않고 이력으로 남긴다.

## 채널 규칙

1. 웹은 `manager_account`만 사용한다.
2. 앱은 `manager_account`, `driver_account` 둘 다 사용한다.
3. 같은 `identity` 아래 두 account가 모두 있으면 앱 로그인 후 `모드 선택`을 한다.
4. 마지막 사용 모드는 기억한다.
5. 설정 화면에서 같은 모드 선택 화면으로 다시 변경할 수 있다.
6. `banned`, `archived` 상태의 account는 앱 모드 선택에서 숨긴다.

## 관리자 권한 규칙

### system_admin_account

- 모든 회사의 `identity`, `request`, `manager_account`, `driver_account`, 각 link를 전부 관리한다
- 모든 회사 request를 직접 승인할 수 있다

### manager_account roles

`manager_account`는 아래 역할 중 정확히 하나만 가진다.

1. `company_super_admin`
2. `vehicle_manager`
3. `settlement_manager`

`company_super_admin`는 회사 안에서 최고 관리자다.  
`vehicle_manager`, `settlement_manager`는 회사 안의 도메인 관리자다.

## 도메인 권한 범위

### company_super_admin

- 현재 자기 회사의 account 또는 request를 가진 `identity`, `manager_account`, `driver_account`, 각 link를 관리할 수 있다
- 자기 회사 request를 승인할 수 있다

### vehicle_manager

- 자기 회사의 차량, 차량 배정, 단말기 정보를 수정할 수 있다
- 조직 정본은 조회만 가능하다
- 배송원 정본은 조회만 가능하다
- `driver_account_link` 연결/해제는 가능하다

### settlement_manager

- 자기 회사의 정산, 정산 규칙을 수정할 수 있다
- 조직 정본은 조회만 가능하다
- 배송원 정본은 생성/조회/수정할 수 있다
- `driver_account_link` 연결/해제는 가능하다

## 가입 신청 규칙

1. 사용자는 먼저 `identity`를 만든다.
2. 가입 신청은 `identity_signup_request`로 기록한다.
3. 가입 시 사용자가 고르는 것은 아래 두 개다.
   - 신청 목적
   - 회사
4. 신청 목적은 아래 둘 중 하나 또는 둘 다다.
   - `manager_account_create`
   - `driver_account_create`
5. 둘 다 필요하면 request는 2개로 나눈다.
6. 회사는 `활성 회사 검색`으로 선택한다.
7. 검색 결과는 `회사명 + 메타데이터 수준 보조 식별 정보`를 함께 보여준다.
8. 1차에서는 검색 결과에 있는 회사만 선택할 수 있다.

## 승인 규칙

1. `company_super_admin`은 자기 회사 request를 승인할 수 있다.
2. `system_admin_account`는 모든 회사 request를 직접 승인할 수 있다.
3. `manager_account_create` 승인 시 승인자가 아래 역할 중 하나를 정한다.
   - `company_super_admin`
   - `vehicle_manager`
   - `settlement_manager`
4. `driver_account_create` 승인 시 `driver_account`만 생성한다.
5. `driver` 연결은 승인 후 별도 단계다.

## 승인 대기 규칙

1. `identity`는 있지만 account가 아직 없으면 로그인은 가능하다.
2. 이 상태에서는 제품 진입 대신 `승인 대기 화면`만 보여준다.
3. 화면에는 아래를 보여준다.
   - 선택한 회사
   - 신청 종류
   - 상태
   - 반려 사유
4. request는 사용자가 직접 취소하지 않는다.
5. 반려된 request는 같은 종류로 다시 신청할 수 있다.
6. 같은 `identity`는 동시에 여러 request를 대기 상태로 가질 수 있다.

## 배송원 연결 규칙

1. `driver_account`와 `driver`는 선후가 아니라 연결 관계다.
2. `driver`가 먼저 있어도 되고 `driver_account`가 먼저 있어도 된다.
3. `driver_account_link`는 모든 관리자 권한이 연결/해제할 수 있다.
4. `driver_account.company_id`와 `driver.company_id`가 다르면 link는 자동 종료된다.
5. `driver_account`에 link가 없어도 앱 로그인은 된다.
6. 이 경우 앱에는 공통 배너로 `배송원 연결 필요`를 보여준다.
7. `driver` 문맥이 필요한 화면만 차단한다.

## 회사 소속 규칙

1. `identity`는 회사에 속하지 않는다.
2. `system_admin_account`도 회사에 속하지 않는다.
3. `manager_account`, `driver_account`는 `1회사 전속`이다.
4. 한 시점에 같은 `identity`는 활성 기준으로 `manager_account` 1개, `driver_account` 1개만 가진다.

## 회사 변경 규칙

1. 회사 변경은 같은 account의 `company_id`를 바꾸지 않는다.
2. 회사 변경은 `재요청 표지`가 있는 `identity_signup_request`로 처리한다.
3. 승인자는 `새 회사`의 `company_super_admin` 또는 `system_admin_account`다.
4. `이전 회사`에는 알림만 간다.
5. 승인되면 기존 account는 `archived` 되고, 새 회사 account를 새로 만든다.
6. `driver_account` 회사 변경 시 기존 `driver_account_link`도 종료된다.
7. 새 회사의 `driver`와는 별도 연결해야 한다.

## invite 규칙

1. 1차 기본 가입 흐름은 아니다.
2. 후속 확장으로 추가한다.
3. invite는 `1회용`, `12시간` 유효다.
4. 대상은 아래 둘만 허용한다.
   - `system_admin_account`
   - `company_super_admin`
5. invite는 별도 회원가입 경로를 연다.
6. 실제 회원가입과 신청이 완료될 때 `identity_signup_request`가 생성된다.

## 최소 필드 원칙

### identity

- `identity_id`
- `name`
- `status`

### identity_login_method

- `identity_login_method_id`
- `identity_id`
- `method_type`
- `method_value`
- `is_verified`
- `is_primary`

### identity_signup_request

- `identity_signup_request_id`
- `identity_id`
- `company_id`
- `request_type`
- `request_status`
- `is_re_request`
- `from_company_id`
- `reviewed_by_system_admin_account_id`
- `reviewed_by_manager_account_id`
- `reject_reason`

### system_admin_account

- `system_admin_account_id`
- `identity_id`
- `status`

### manager_account

- `manager_account_id`
- `identity_id`
- `company_id`
- `manager_role_type`
- `status`

### driver_account

- `driver_account_id`
- `identity_id`
- `company_id`
- `status`

### identity_account_link

- `identity_account_link_id`
- `identity_id`
- `account_type`
- `account_id`
- `linked_at`
- `unlinked_at`

### driver_account_link

- `driver_account_link_id`
- `driver_account_id`
- `driver_id`
- `linked_at`
- `unlinked_at`
- `unlink_reason`

## 제외 범위

이번 문서에서 아래는 고정하지 않는다.

1. 승인 완료 직후 앱 세션을 즉시 갱신할지, 재로그인을 요구할지에 대한 UX
2. invite의 상세 payload와 화면
3. account API와 토큰 payload의 최종 형태
4. 권한 체크의 세부 endpoint matrix

## 연결 문서

- [../../contracts/06-id-and-state-dictionary.md](../../contracts/06-id-and-state-dictionary.md)
- [2026-03-19-account-driver-settlement-msa-design.md](2026-03-19-account-driver-settlement-msa-design.md)
