# Identity Account Auth Design

## 목적

이 문서는 CLEVER의 사람, 로그인 수단, 제품 계정, 회사 소속, 배송원 연결 경계를 current truth로 고정한다.

이번 결정의 목적은 아래와 같다.

1. 사람과 로그인 수단과 제품 계정을 분리한다.
2. 시스템 관리자, 회사 관리자, 배송원 계정을 분리한다.
3. 회사 소속은 사람이 아니라 제품 계정이 가지게 한다.
4. 가입 신청, 승인, 회사 변경, 배송원 연결, 동의, 복구 흐름을 같은 모델 위에서 정리한다.

## 선택된 접근

이번 결정은 `identity 상위 + account 분리 + request workflow`를 current truth로 고정한다.

핵심 원칙은 아래와 같다.

1. `identity`는 사람 단일 원천이다.
2. 로그인 수단은 `identity_login_method`에 붙고, 실제 인증 데이터는 별도 credential 테이블로 분리한다.
3. 제품 계정은 `system_admin_account`, `manager_account`, `driver_account`로 분리한다.
4. 회사 소속은 `manager_account`, `driver_account`가 직접 가진다.
5. 배송원 연결은 `driver_account_link`가 별도로 가진다.
6. 가입 신청은 `identity_signup_request`에서 workflow로 관리한다.
7. 동의는 `identity` 축에서 관리한다.

## 엔티티 계층

### 1. identity

- 사람 단일 원천
- 회사에 속하지 않는다
- `name`, `birth_date`만 최소 프로필로 가진다
- 상태는 `active`, `archived`

### 2. identity_login_method

- `identity`의 로그인 수단 관계
- `email`, `phone`, `social`을 같은 계층에서 다룬다
- 같은 로그인 수단 값은 `identity` 하나에만 연결된다
- 웹과 앱은 같은 로그인 수단을 공용으로 쓴다
- `primary` 개념은 두지 않는다
- 실제 인증 데이터는 여기 두지 않는다

### 3. credential 계층

#### email_credential

- 이메일 값과 이메일 인증 정보를 가진다

#### phone_credential

- 전화번호 값과 문자 인증 정보를 가진다

#### social_credential

- provider 계정 식별값과 provider 인증 정보를 가진다

#### password_credential

- `identity` 기준 공통 비밀번호를 가진다
- `email + password`, `phone + password`는 같은 비밀번호 하나를 쓴다
- `social-only identity`는 `password_credential` 없이 존재할 수 있다

### 4. system_admin_account

- `identity`에 속한 플랫폼 운영 계정
- 회사 경계 밖 계정이다
- 모든 회사의 값과 request를 보고 직접 관리할 수 있다
- `signup_request`로 생성하지 않는다
- 기존 `system_admin_account`가 직접 부여한다
- 웹과 앱 둘 다 사용한다

### 4-1. system_admin bootstrap

- 최초 `system_admin_account` 1개는 일반 가입 흐름이 아니라 bootstrap으로 만든다
- 로컬/인스턴스/docker 환경에서는 runner로 생성할 수 있다
- 실제 배포에서는 최초 1회 수동 `direct create`로 만든다
- 최초 생성 입력은 `email + password`만 받는다
- 입력값은 `env/secret`로만 주입하고, 생성 후 원본 secret은 즉시 폐기한다
- 이미 `system_admin_account`가 하나라도 있으면 bootstrap runner는 생성 없이 종료한다
- bootstrap으로 만든 최초 `identity`는 아래 기본값을 사용한다
  - `name = System Admin`
  - `birth_date = 1970-01-01`
- bootstrap 시 `privacy_policy`, `location_policy` 동의는 자동 수집 처리한다
- 최초 bootstrap `identity`는 일반 `name + birth_date` self-recovery 예외이며, 기존 `system_admin_account`만 복구할 수 있다
- 최초 1명 이후의 `system_admin_account` 추가 생성은 기존 `system_admin_account`의 `direct create`만 허용한다

### 5. manager_account

- `identity`에 속한 회사 소속 관리자 계정
- `company_id`를 직접 가진다
- 웹은 이 계정만 사용한다
- 앱에서도 사용 가능하다
- 관리자 역할은 정확히 하나다
  - `company_super_admin`
  - `vehicle_manager`
  - `settlement_manager`

### 6. driver_account

- `identity`에 속한 회사 소속 배송원용 계정
- `company_id`를 직접 가진다
- 앱에서만 사용한다
- 웹 권한은 없다

### 7. identity_signup_request

- `identity`의 가입/계정 개설 workflow 기록
- 사람 정본이 아니라 신청 기록이다
- `request 1개 = 목적 1개`로 고정한다
- 종류는 아래 두 개다
  - `manager_account_create`
  - `driver_account_create`
- 회사 변경도 별도 타입을 만들지 않고, `재요청 표지`가 있는 같은 request로 처리한다

### 8. identity_account_link

- `identity`와 각 account의 연결 이력
- 정본 연결이 아니라 감사/이력용 테이블이다
- 현재 account의 소유 identity는 각 account의 `identity_id`로 직접 판단한다

### 9. driver_account_link

- `driver_account`와 `driver`의 연결 이력
- 배송원 업무 주체 연결은 이 테이블에서만 표현한다

### 10. identity_consent_current

- `identity` 기준 현재 동의 상태 정본
- 동의 종류는 1차에서 아래 둘만 가진다
  - `privacy_policy`
  - `location_policy`

### 11. identity_consent_history

- `identity` 기준 동의 변경 이력
- 어떤 동의를 언제 어떤 버전으로 바꿨는지 남긴다

### 12. identity_profile_history

- `identity.name`, `identity.birth_date` 변경 이력

## 상태 규칙

### identity

- `active`
- `archived`

`identity`가 `archived` 되면 연결된 아래도 함께 `archived` 된다.

1. `system_admin_account`
2. `manager_account`
3. `driver_account`

### system_admin_account / manager_account / driver_account

- `active`
- `archived`

`banned` 상태는 두지 않는다.  
임시 접근 차단은 상태가 아니라 세션/동의 검사로 처리한다.

### identity_signup_request

- `pending`
- `awaiting_setup`
- `approved`
- `rejected`

의미는 아래와 같다.

1. `pending`: 검토 중
2. `awaiting_setup`: 승인됐지만 회사 관리자 설정이 남아 있음
3. `approved`: account 생성까지 끝남
4. `rejected`: 반려

사용자 화면에는 내부 상태값을 직접 노출하지 않는다.  
대신 아래처럼 친절한 문구만 보여준다.

1. `검토 중입니다.`
2. `설정 중입니다.`

## 채널 규칙

1. 웹은 `system_admin_account` 또는 `manager_account`를 사용한다.
2. 웹에서 `driver_account`는 사용하지 않는다.
3. 앱은 `system_admin_account`, `manager_account`, `driver_account`를 사용한다.
4. 같은 `identity`에 `system_admin_account`가 있으면 웹/앱 모두 시스템 관리자 뷰로 우선 진입한다.
5. `system_admin_account`가 없고, 같은 `identity`에 `manager_account`, `driver_account`가 모두 있으면 앱에서 `모드 선택`을 한다.
6. 마지막 사용 모드는 기억한다.
7. 설정 화면에서 같은 모드 선택 화면으로 다시 변경할 수 있다.

## 관리자 권한 규칙

### system_admin_account

- 모든 회사의 `identity`, `request`, `manager_account`, `driver_account`, 각 link를 전부 관리한다
- 모든 회사 request를 직접 승인할 수 있다
- `archived identity`와 그 이력도 조회할 수 있다

### manager_account roles

`manager_account`는 아래 역할 중 정확히 하나만 가진다.

1. `company_super_admin`
2. `vehicle_manager`
3. `settlement_manager`

### company_super_admin

- 현재 자기 회사의 `active identity`, `active manager_account`, `active driver_account`, `active request`, 각 link를 관리할 수 있다
- 자기 회사 request를 승인할 수 있다
- 자기 자신과 하위 레벨만 관리할 수 있다
- 같은 회사의 다른 `company_super_admin`는 생성/변경/아카이브할 수 없다
- 자기 회사의 `vehicle_manager`, `settlement_manager`는 생성/변경/아카이브할 수 있다
- 마지막 남은 `company_super_admin`라도 자기 자신을 아카이브할 수 있다

### vehicle_manager

- 자기 자신과 자기 설정을 관리할 수 있다
- 자기 회사의 차량, 차량 배정, 단말기 정보를 수정할 수 있다
- 조직 정본은 조회만 가능하다
- 배송원 정본은 조회만 가능하다
- `driver_account_link` 연결/해제는 가능하다

### settlement_manager

- 자기 자신과 자기 설정을 관리할 수 있다
- 자기 회사의 정산, 정산 규칙을 수정할 수 있다
- 조직 정본은 조회만 가능하다
- 배송원 정본은 생성/조회/수정할 수 있다
- `driver_account_link` 연결/해제는 가능하다

## 회사 운영 및 관리자 계층 규칙

1. `company`, `fleet`는 관리자 없이 먼저 존재할 수 있다.
2. `active company`면 `company_super_admin`가 없어도 가입 검색 결과에 노출한다.
3. 최초 회사 설정과 최초 `company_super_admin` 지정은 `system_admin_account`가 한다.
4. `company_super_admin`가 0명인 회사도 유지할 수 있다.
5. `company_super_admin`가 0명인 회사를 다시 여는 것도 `system_admin_account`가 한다.
6. 권한 관리는 `자기 자신 + 하위 레벨` 원칙으로 통일한다.
7. `system_admin_account`는 모든 레벨을 관리할 수 있다.
8. `company_super_admin`는 자기 자신과 하위 `vehicle_manager`, `settlement_manager`만 관리할 수 있다.
9. `vehicle_manager`, `settlement_manager`는 자기 자신과 자기 도메인 컨텐츠만 관리할 수 있다.
10. `driver`는 최하위이며, 자기 자신을 제외한 상위 관리자들이 `driver_account_link`를 관리할 수 있다.

## 가입 신청 규칙

1. 사용자는 먼저 `identity`를 만든다.
2. `identity` 생성 시 아래 동의를 둘 다 필수로 받는다.
   - `privacy_policy`
   - `location_policy`
3. 가입 신청은 `identity_signup_request`로 기록한다.
4. 가입 시 사용자가 고르는 것은 아래 두 개다.
   - 신청 목적
   - 회사
5. 신청 목적은 아래 둘 중 하나 또는 둘 다다.
   - `manager_account_create`
   - `driver_account_create`
6. 둘 다 필요하면 request는 2개로 나눈다.
7. 회사는 `활성 회사 검색`으로 선택한다.
8. 검색 결과는 `회사명 + 메타데이터 수준 보조 식별 정보`를 함께 보여준다.
9. 1차에서는 검색 결과에 있는 회사만 선택할 수 있다.

## request 제약

1. 같은 `identity + company_id + request_type` 조합에는 `pending` request가 하나만 존재할 수 있다.
2. 같은 회사에 같은 종류의 `active account`가 이미 있으면 신규 request는 금지한다.
3. 같은 회사에 같은 종류의 `archived account`만 있으면 재요청 가능하다.
4. 같은 `identity`는 동시에 여러 회사에 걸쳐 `active account`를 가질 수 없다.
5. 같은 `identity`에 `manager_account`, `driver_account`가 둘 다 있으면 둘은 항상 같은 회사여야 한다.

## 승인 규칙

1. `company_super_admin`은 자기 회사 request를 승인할 수 있다.
2. `system_admin_account`는 모든 회사 request를 직접 승인할 수 있다.
3. `manager_account_create` request는 `pending -> awaiting_setup -> approved`로 처리한다.
4. `driver_account_create` request는 `pending -> approved`로 처리한다.
5. `manager_account_create` request의 `awaiting_setup` 마무리는 아래 둘이 할 수 있다.
   - `새 회사 company_super_admin`
   - `system_admin_account`
6. `manager_account_create` 승인 시 실제 역할은 `awaiting_setup` 단계에서 정한다.
7. `driver_account_create` 승인 시 `driver_account`만 생성한다.
8. `driver` 연결은 승인 후 별도 단계다.
9. request는 수정하지 않는다.
10. 사용자는 승인 대기창에서 자기 `active request`를 취소할 수 있다.
11. 사용자 취소와 관리자 반려는 모두 `rejected`로 기록하고, 차이는 `reject_reason`으로만 남긴다.
12. 반려된 request는 같은 종류로 다시 신청할 수 있다.
13. 승인/반려된 request는 이력으로 남긴다.

## 승인 대기 규칙

1. `identity`는 있지만 account가 아직 없으면 로그인은 가능하다.
2. 이 상태에서는 제품 진입 대신 `승인 대기 화면`만 보여준다.
3. 화면에는 아래를 보여준다.
   - 선택한 회사
   - 신청 종류
   - 상태 문구
   - 반려 사유

## 배송원 연결 규칙

1. `driver_account`와 `driver`는 선후가 아니라 연결 관계다.
2. `driver`가 먼저 있어도 되고 `driver_account`가 먼저 있어도 된다.
3. `driver_account_link`는 모든 관리자 권한이 연결/해제할 수 있다.
4. `driver_account.company_id`와 `driver.company_id`가 다르면 link는 자동 종료된다.
5. `driver_account`에 link가 없어도 앱 로그인은 된다.
6. 이 경우 앱에는 공통 배너로 `배송원 연결 필요`를 보여준다.
7. `driver` 문맥이 필요한 화면만 차단한다.

## 회사 변경 규칙

1. 회사 변경은 같은 account의 `company_id`를 바꾸지 않는다.
2. 회사 변경은 `재요청 표지`가 있는 `identity_signup_request`로 처리한다.
3. 회사 변경 request는 사용자도 만들 수 있고 관리자도 만들 수 있다.
4. 사용자가 직접 만들 때도 `회사 검색 -> 새 회사 선택` 흐름으로 간다.
5. 회사 변경 request가 `pending`인 동안은 기존 회사 account를 계속 사용한다.
6. 회사 변경 `pending` 상태는 별도 배너 없이 request 화면에서만 확인한다.
7. 회사 변경 request가 `rejected`되면 기존 회사 account는 그대로 유지한다.
8. 승인자는 `새 회사`의 `company_super_admin` 또는 `system_admin_account`다.
9. `이전 회사`에는 알림만 간다.
10. 승인되면 기존 `manager_account`, `driver_account`는 즉시 `archived` 된다.
11. 승인되면 기존 웹/앱 세션도 즉시 종료된다.
12. 같은 `identity`가 `manager_account`, `driver_account`를 모두 가진 상태라면 회사 변경 request는 1개로 묶는다.
13. 위 경우 새 회사 쪽 처리는 아래처럼 나눈다.
    - `manager_account`: `awaiting_setup` 후 생성
    - `driver_account`: 승인 후 바로 생성
14. 새 `driver_account`는 `driver_account_link`가 없어도 기존 규칙대로 앱 진입 가능하다.
15. 새 `manager_account`는 `awaiting_setup` 동안 웹 로그인 불가이며, 사용자에게는 `설정 중입니다.`로 보인다.

## 동의 규칙

1. 동의는 `identity` 공통값이다.
2. 웹/앱/계정 종류별로 따로 두지 않는다.
3. 1차 동의 종류는 아래 둘만 쓴다.
   - `privacy_policy`
   - `location_policy`
4. 최초 `identity` 생성 시 두 동의를 모두 필수로 받는다.
5. 둘 중 하나라도 철회되면 전체 사용 차단이다.
6. 이 차단은 account 상태 변경이 아니라 세션 검사로 처리한다.
7. 차단 시에는 `consent_recovery session`을 발급한다.
8. 이 제한 세션에서는 아래만 허용한다.
   - 동의 복구 화면
   - 동의 제출
   - 로그아웃
9. 재동의가 완료되면 정상 세션을 다시 발급한다.
10. 동의 문서 버전 변경은 재동의 필수가 아니라 안내만 한다.

## identity 프로필 규칙

1. `identity` 최소 프로필은 `name`, `birth_date`다.
2. 본인은 마이페이지에서 `name`, `birth_date`를 즉시 수정할 수 있다.
3. 다른 사람의 `name`, `birth_date` 수정은 `system_admin_account`만 가능하다.
4. 변경 이력은 `identity_profile_history`로 남긴다.

## 로그인 수단 규칙

1. 같은 `identity`는 여러 로그인 수단을 동시에 가질 수 있다.
2. `identity_login_method`에는 `primary`를 두지 않는다.
3. 다른 `identity`에 이미 연결된 `email`, `phone`, `social account`는 추가할 수 없다.
4. 로그인 수단 추가/삭제는 본인만 할 수 있다.
5. `system_admin_account`는 다른 사람의 로그인 수단을 조회만 할 수 있다.
6. 회사 관리자는 다른 사람의 로그인 수단을 볼 수 없다.
7. 1차에서는 로그인한 상태에서만 로그인 수단을 추가할 수 있다.
8. `email`은 이메일 인증 후 verified 된다.
9. `phone`은 문자 인증 후 verified 된다.
10. `social`은 provider 인증 통과 시 바로 verified 된다.
11. `social-only identity`도 허용한다.
12. `social-only identity`는 이후 마이페이지에서 `email`, `phone`, `password`를 추가할 수 있다.
13. `password_credential`은 `identity` 기준 1개만 가진다.
14. `email + password`, `phone + password`는 같은 비밀번호를 쓴다.
15. 비밀번호 찾기/재설정은 `email` 또는 `phone`이 있을 때만 가능하다.
16. `email`, `phone` 어느 쪽으로 재설정하든 공통 비밀번호 하나가 바뀐다.
17. 마지막이 아닌 로그인 수단 삭제는 다른 verified 수단이 남아 있으면 세션을 유지한다.
18. 마지막 로그인 수단 삭제는 아래 조건을 모두 만족해야 한다.
    - 최종 확인 문구
    - 현재 로그인 수단 기준 재인증
19. 마지막 로그인 수단이 삭제되면 아래가 동시에 일어난다.
    - `identity archived`
    - 연결된 모든 account archived
    - `driver_account_link` 종료
    - `identity_login_method`, 각 credential 완전 삭제

## identity 복구 규칙

1. 사용자는 스스로 `identity` 복구를 요청할 수 있다.
2. 복구 본인 확인 기준은 `name + birth_date`다.
3. 복구는 승인 없이 즉시 처리한다.
4. 복구 시 이전 로그인 수단은 복원하지 않는다.
5. 새 `email`, `phone`, `social` 로그인 수단을 다시 등록해야 한다.
6. 복구 후 `identity`만 `active`로 돌아온다.
7. 예전 `manager_account`, `driver_account`, `driver_account_link`는 자동 복구하지 않는다.
8. 복구 후에는 아래를 다시 해야 한다.
   - 회사 검색 후 선택
   - 신청 종류 선택
   - 필수 동의 재수집
   - 새 `signup_request` 생성
9. 기존 동의 이력은 남기고, 복구 시 새 동의 이력을 추가한다.
10. 기존 `signup_request` 이력은 조회용으로 남긴다.
11. 다만 최초 bootstrap으로 생성된 `system_admin identity`는 예외이며, 일반 self-recovery를 허용하지 않는다.

## archived 조회 규칙

1. `archived identity`의 `name`, `birth_date`는 남긴다.
2. `archived identity`와 그 request 이력은 `system_admin_account`만 조회할 수 있다.
3. `company_super_admin`, `vehicle_manager`, `settlement_manager`에게는 `archived identity`, `archived account`, archived request를 숨긴다.
4. 회사 관리자 화면에서는 `active identity`와 `active request`만 본다.

## 중복 identity 정리 규칙

1. 회원가입 완료 직후 `email`, `phone`, `social` 중 하나라도 같은 기존 `identity`가 있으면 자동 병합을 시도한다.
2. 두 쪽 중 하나라도 승인 완료된 product account가 있으면 병합하지 않는다.
3. 승인 완료된 product account가 하나도 없으면 자동 병합한다.
4. 병합 시 `나중에 가입한 identity`만 남긴다.
5. 로그인 수단과 request도 `나중 identity` 기준으로 하나만 남긴다.
6. 예전 `identity`는 archived로 남기지 않고 제거한다.

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
- `birth_date`
- `status`

### identity_login_method

- `identity_login_method_id`
- `identity_id`
- `method_type`
- `verified_at`
- `archived_at`

### email_credential

- `email_credential_id`
- `identity_login_method_id`
- `email`
- `verified_at`

### phone_credential

- `phone_credential_id`
- `identity_login_method_id`
- `phone_number`
- `verified_at`

### social_credential

- `social_credential_id`
- `identity_login_method_id`
- `provider_type`
- `provider_subject`
- `verified_at`

### password_credential

- `password_credential_id`
- `identity_id`
- `password_hash`
- `updated_at`

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

### identity_consent_current

- `identity_id`
- `privacy_policy_agreed`
- `privacy_policy_version`
- `location_policy_agreed`
- `location_policy_version`

### identity_consent_history

- `identity_consent_history_id`
- `identity_id`
- `consent_type`
- `consent_version`
- `agreed`
- `changed_at`

### identity_profile_history

- `identity_profile_history_id`
- `identity_id`
- `name`
- `birth_date`
- `changed_at`

## 제외 범위

- 상세 action log / audit schema
- debug context / impersonation

이번 문서에서 아래는 고정하지 않는다.

1. invite의 상세 payload와 화면
2. account API와 토큰 payload의 최종 형태
3. 권한 체크의 세부 endpoint matrix
4. 제한 세션 토큰의 상세 포맷

## 연결 문서

- [../../contracts/06-id-and-state-dictionary.md](../../contracts/06-id-and-state-dictionary.md)
- [2026-03-19-account-driver-settlement-msa-design.md](2026-03-19-account-driver-settlement-msa-design.md)
