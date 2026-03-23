# Account / Driver / Settlement MSA 재설계 디자인

## 목적

기존 서버 서비스를 한 번에 전체 MSA로 쪼개는 대신, 이번 설계는 `계정(Account/Auth)`, `배송원(Driver Profile HR)`, `정산(Settlement Payroll)`을 동등 병렬 축으로 다시 정의하는 데 목적이 있다.

이때 세 도메인이 공통으로 의존하는 `회사/플릿/조직` 기준정보는 별도 정본 축으로 최소한만 포함해 `Organization Master`로 정의한다.

이번 문서는 구현 계획이 아니라, 이후 구현 계획이 흔들리지 않도록 서비스 경계와 소유 데이터를 먼저 고정하는 설계 문서다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. Account / Auth 도메인 경계
2. Driver Profile HR 도메인 경계
3. Settlement Payroll 도메인 경계
4. 최소 수준의 Organization Master 경계
5. 도메인별 소유 데이터와 참조 데이터 구분
6. 식별자와 관계 규칙
7. 로컬 Docker Compose 수준의 시뮬레이션 토폴로지

## 비스코프

이번 설계에서는 아래 항목을 일부러 다루지 않는다.

1. 읽기 모델 통합 조회 설계
2. API 상세 계약
3. 이벤트 계약과 브로커 기술 선택
4. 자동 테스트 시나리오
5. 실서비스 배포 토폴로지
6. 실제 DB 스키마와 테이블 설계

## 선택된 접근

사용자가 승인한 접근은 `A. Parallel Core Domains`다.

이 접근의 의미는 아래와 같다.

1. Account, Driver, Settlement를 종속 관계가 아니라 동등한 1차 도메인으로 본다.
2. Organization Master는 세 도메인이 공통 참조하는 최소 정본으로만 둔다.
3. 로그인 주체와 업무 주체를 절대 같은 모델로 합치지 않는다.
4. 정산은 결과와 재무 상태만 소유하고, 사람/조직의 정본을 소유하지 않는다.

## 목표 서비스 경계

### 1. Organization Master

역할:

- 회사, 플릿, 조직 단위 기준정보의 정본
- 세 도메인이 공통으로 참조하는 조직 식별자와 기준 축 제공

직접 소유:

- `company`
- `fleet`
- `org_unit`
- `org_membership_policy`
- `affiliation_reference_dictionary`

소유하지 않음:

- 로그인 계정과 자격 정보
- 배송원 프로필과 재직 상태
- 정산 결과와 지급 상태

### 2. Account / Auth

역할:

- 로그인 가능한 주체 관리
- 자격 검증, 세션, 토큰, 계정 상태 관리

직접 소유:

- `account`
- `login_identifier`
- `password_hash`
- `otp_secret`
- `social_auth`
- `session`
- `refresh_token`
- `access_policy`
- `account_status`

참조만 함:

- `driver_id`
- `company_id`
- `fleet_id`

소유하지 않음:

- 배송원 프로필
- 재직 상태
- 정산 결과

### 3. Driver Profile HR

역할:

- 배송원 업무 주체 모델 관리
- 프로필, 자격, 재직 상태, 조직 소속 참조 관리

직접 소유:

- `driver`
- `driver_profile`
- `employment_status`
- `qualification_status`
- `driver_affiliation_ref`

참조만 함:

- `account_id`
- `company_id`
- `fleet_id`
- `org_unit_id`

소유하지 않음:

- 비밀번호, OTP, 세션
- 정산 원장과 지급 상태

### 4. Settlement Payroll

역할:

- 정산 계산 결과와 지급 전후 상태 관리
- 공제, 인센티브, 정산 실행 단위 관리

직접 소유:

- `settlement_run`
- `settlement_item`
- `deduction`
- `incentive`
- `payout_status`

참조만 함:

- `driver_id`
- `company_id`
- `fleet_id`
- 정산 계산에 필요한 상위 업무 입력값

소유하지 않음:

- 계정 자격 정보
- 배송원 마스터 프로필
- 조직 기준정보 정본

## 식별자와 관계 규칙

### 핵심 식별자

- `account_id`: 로그인과 인증 주체 식별자
- `driver_id`: 배송원 업무 주체 식별자
- `company_id`, `fleet_id`, `org_unit_id`: 조직 마스터 식별자
- `settlement_run_id`, `settlement_item_id`: 정산 전용 식별자

### 관계 규칙

1. `account_id`와 `driver_id`는 절대 같은 개념으로 합치지 않는다.
2. Account는 `linked_driver_id`를 선택적으로 가질 수 있다.
3. Driver는 `account_id`를 참조할 수 있지만 로그인 주체를 소유하지 않는다.
4. Settlement는 `driver_id`와 조직 참조를 이용해 계산하지만, 사람/조직 정본을 소유하지 않는다.
5. 모든 도메인을 덮는 만능 공통 사용자 ID는 만들지 않는다.

### 허용 패턴

1. 배송원용 로그인 계정과 배송원 레코드의 1:1 링크
2. 세 도메인이 같은 `company_id`, `fleet_id`를 참조하는 구조
3. Settlement가 `driver_id`를 참조하지만 배송원 프로필은 소유하지 않는 구조

### 금지 패턴

1. Driver의 기본키를 `account_id`로 삼는 구조
2. 로그인 인증 주체를 `driver_id`로 직접 쓰는 구조
3. 정산 전용 ID를 사람 식별자처럼 외부 도메인에서 재사용하는 구조

## 소유 데이터 분할 원칙

### Account / Auth가 직접 소유하는 것

- 로그인 식별자
- 자격 증명
- 세션과 토큰
- 계정 상태
- 접근 정책

### Driver Profile HR가 직접 소유하는 것

- 배송원 프로필
- 재직 상태
- 자격 상태
- 업무 소속 참조

### Settlement Payroll이 직접 소유하는 것

- 정산 실행 단위
- 정산 결과 항목
- 공제와 인센티브
- 지급 상태

### Organization Master가 직접 소유하는 것

- 회사
- 플릿
- 조직 단위
- 소속 기준 사전

### 공통 원칙

1. 다른 도메인의 상태를 자기 테이블에 복제해 정본처럼 취급하지 않는다.
2. 참조는 식별자 수준으로만 연결한다.
3. 현재 monolith의 `documents` 같은 과대 도메인을 다시 만들지 않는다.
4. Organization Master는 공통 유틸 저장소가 아니라 조직 정본만 가진다.

## 로컬 Docker Compose 시뮬레이션 구조

이번 설계는 실제 테스트 자동화가 아니라, 경계가 섞이지 않는지 확인하기 위한 로컬 시뮬레이션 토폴로지만 정의한다.

### Edge 계층

- `web-front`
- `admin-front`
- `api-gateway`

역할:

- 브라우저 진입점과 API 라우팅 담당
- 도메인 정본 데이터는 소유하지 않음

### Domain 컨테이너

- `organization-master-api` + `org-db`
- `account-auth-api` + `account-db`
- `driver-profile-api` + `driver-db`
- `settlement-api` + `settlement-db`

원칙:

1. 서비스별 API와 서비스별 DB를 같이 분리한다.
2. 한 도메인이 다른 도메인의 DB를 직접 읽지 않는다.
3. 지금 단계에서는 이벤트 브로커를 넣지 않는다.

### Ops Helper 컨테이너

- `db-admin`
- `log-viewer`
- `seed-runner`

역할:

- 로컬 운영 보조용
- 어느 도메인의 정본도 소유하지 않음

## 마스터플랜 진행 순서

### Phase 0. 경계 고정

- Account / Driver / Settlement / Organization의 경계 문서 확정
- 소유 데이터와 금지 범위 확정

### Phase 1. 식별자와 링크 규칙 고정

- `account_id`, `driver_id`, 조직 ID, 정산 ID 체계 분리
- Account ↔ Driver 링크 규칙 확정

### Phase 2. 로컬 Compose 시뮬레이션 설계

- 서비스별 컨테이너 이름 고정
- 서비스별 DB 경계 고정
- Front와 Ops Helper를 주변 계층으로만 정의

### Phase 3. 후속 상세 설계로 분기

이후 단계에서 아래 문서로 분기한다.

1. API 계약
2. 읽기 모델
3. 이벤트 계약
4. 실제 분리 구현 계획

## 설계 성공 기준

아래 조건이 만족되면 이번 설계는 성공으로 본다.

1. Account가 Driver 프로필을 소유하지 않는다.
2. Driver가 자격 증명과 세션을 소유하지 않는다.
3. Settlement가 사람/조직 정본을 소유하지 않는다.
4. Organization Master가 공통 쓰레기통이 되지 않는다.
5. 로컬 Compose 시뮬레이션에서 서비스별 API와 DB 경계가 명확히 드러난다.

## 후속 계획에 넘길 결정사항

다음 구현 계획 단계에서는 아래를 이어서 상세화해야 한다.

1. Account ↔ Driver 링크 변경 절차
2. Driver 소속 변경 이력 처리 방식
3. Settlement 입력값 공급 경계
4. API Gateway 라우팅 구조
5. Front가 어느 서비스 API를 직접 호출하는지에 대한 계약

