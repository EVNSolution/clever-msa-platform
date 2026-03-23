# 05. EV Dashboard Server Domain Extraction Notes

## 문서 목적

이 문서는 `ev-dashboard-server`를 1:1로 분해하지 않고, 현재 로컬 MSA 부트스트랩의 4개 핵심 서비스로 어떤 책임을 재배치할지 정리하는 기준 문서다.

전환 원칙은 다음과 같다.

1. 레거시 앱 경계를 그대로 서비스 경계로 쓰지 않는다.
2. 레거시 모델의 결합은 안티패턴으로 보고, 의미 있는 정본 책임만 추출한다.
3. 교차 서비스 참조는 UUID 기반 외부 식별자로만 유지하고, 직접 FK/조인을 만들지 않는다.

## 레거시에서 확인한 핵심 안티패턴

### 1. User와 Driver 책임이 강하게 뒤섞여 있다

- `core.models.User`는 주석상 인증/권한 전용이라고 말하지만 실제로는 `company`, `fleet`, `delivery_user`, `phone_number`, `status`를 함께 가진다.
- `documents.models.Document`는 기사 프로필, 계약, 자격, 조직, 계좌, 사업자 정보까지 모두 품는다.
- `core.services.sync_service.sync_user_with_driver()`는 `user_id == phone_number` 규칙으로 User와 Document를 직접 결합한다.
- `core.services.user_status.UserStatusService`는 User 상태를 Document 완성도에 종속시킨다.

### 2. Organization 경계가 Fleet / Group 이중 구조로 오염돼 있다

- `core.models.Fleet`와 `documents.models.Group`가 사실상 같은 배치 개념을 양방향 동기화한다.
- 이 구조 때문에 Driver, Settlement, Dashboard가 `group`과 `fleet`를 혼용한다.

### 3. Settlement가 HR 문맥과 운영 입력에 과도하게 결합돼 있다

- `documents.models.settlement_models`에 `DailySettlement`, `MonthlySettlement`, `GroupSettlement`, `SettlementPolicy`, `SystemConfig`가 함께 있다.
- 동시에 `documents`에는 `Attendance`, `EvDeliveryLog`, `ClaimList`, `AdditionalAdjustment`, `VehicleRentalFee`, `OutsourcingHistory`까지 붙어 있다.
- 즉 정산 결과 모델과 정산 입력 이벤트/조정 항목/기사 마스터가 하나의 앱에 섞여 있다.

### 4. 상태 전환과 반려 흐름이 User API와 Document API에 중복된다

- `core.views.user.UserViewSet`와 `documents.views.document_views.DocumentViewSet` 모두 `tabs`, `missing-fields`, `reject`, `unreject`를 가진다.
- 승인 상태의 정본이 무엇인지 API 계층에서조차 분리돼 있지 않다.

## 목표 서비스별 재배치

### 1. Organization Master

레거시에서 다음 책임만 가져온다.

- `core.models.Company`
- `core.models.Fleet`

로컬 부트스트랩의 다음 구현 항목:

1. `Company/Fleet`만 정본으로 유지
2. seed와 프런트가 `Company/Fleet`만 바라보도록 정리
3. 다른 서비스는 이 둘만 외부 식별자로 참조하게 고정

이번 전환에서 버릴 것:

- `BusinessUnit/Department/Position`
- `ContractType`
- `OrgUnit` 같은 별도 조직 계층
- `Group`를 Organization 정본으로 보는 해석
- `Group <-> Fleet` 자동 동기화 구조

### 2. Account / Auth

레거시에서 다음 책임만 가져온다.

- 로그인 자격증명
- role/permission
- token 발급
- 비밀번호 변경
- 계정 잠금(lockout)
- 내 계정 조회

레거시 참고 경로:

- `auth.views`
- `core.views.user.CustomObtainAuthToken`
- `core.serializers.user.CustomAuthTokenSerializer`
- `core.account_lockout`

로컬 부트스트랩의 다음 구현 항목:

1. `change-password`를 현재 API surface에 맞게 추가
2. lockout 정책을 Redis 기반으로 추가
3. account-driver linking helper를 참조 수준으로만 추가
4. role은 현재 `admin/user` 두 단계 유지

이번 전환에서 버릴 것:

- `User.delivery_user`, `User.company`, `User.fleet`를 Account/Auth 정본으로 두지 않는다
- 계정 상태를 기사 서류 완성도에 직접 종속시키지 않는다

### 3. Driver Profile HR

레거시에서 실제 SSOT는 `documents.models.Document`다. 다만 이번 전환에서 가져오는 범위는 기사 기본정보로 제한한다.

- `name`
- `ev_id`
- `phone_number`
- `address`
- `company`
- `fleet`
- `linked_account_id` 또는 그에 준하는 계정 연결 참조

로컬 부트스트랩의 다음 구현 항목:

1. `DriverProfile`를 기사 기본정보 모델로 축소
2. 필드는 `driver_id`, `account_id(optional)`, `company_id`, `fleet_id`, `name`, `ev_id`, `phone_number`, `address` 수준으로 제한
3. `check-ev-id` 같은 기본 중복검사만 두고, 승인/반려/상태 엔진은 들이지 않음
4. `sync_with_driver`는 자동 연결 규칙을 도메인 규칙으로 승격하지 않고, 필요 시 별도 유스케이스로 다룸

이번 전환에서 버릴 것:

- `employment_status`
- `qualification_status`
- `driver_type`, `contract_type_fk`, `shift_type`, `contract_date`, `quit_date`
- `business_unit`, `department_fk`, `position_fk`
- 자격/증빙 파일
- 지급 프로필(`AccountInformation`, `BusinessRegistrationInformation`)
- 승인/반려 상태 흐름 전체
- `user_id == phone_number` 영구 규칙

### 4. Settlement Payroll

레거시에서 가져오는 것은 계산 엔진 자체가 아니라 계산 과정에 대한 이해다.

- `DailySettlement`, `MonthlySettlement`, `GroupSettlement`는 용어와 단계 참고용
- `SettlementPolicy`, `SystemConfig`, `ClaimList`, `AdditionalAdjustment`, `VehicleRentalFee`, `OutsourcingHistory`는 레거시 계산 입력의 예시로만 읽는다

로컬 부트스트랩의 다음 구현 항목:

1. 현재 `SettlementRun`, `SettlementItem` 중심 구조는 유지
2. 레거시 계산 단계를 문서로만 남긴다
3. 실제 계산식, 보험료율, 세율, 공제 규칙은 구현하지 않는다
4. 새 정산 규칙이 필요해질 때 별도 설계로 다시 정의한다

이번 전환에서 버릴 것:

- 레거시 `SettlementPolicy` 이식
- 레거시 `SystemConfig` 이식
- 레거시 `DailySettlement/MonthlySettlement/GroupSettlement` 데이터 모델 이식
- 레거시 계산식과 세율/보험료 계산 로직 이식
- Settlement가 Driver master를 직접 FK로 소유하는 구조
- Settlement가 Attendance, DeliveryLog를 자기 도메인 모델로 흡수하는 구조

## 지금 로컬 부트스트랩에 바로 반영할 구현 우선순위

### Phase 1. Narrowed Scope 문서 고정

1. bootstrap spec/plan에서 `OrgUnit`, 기사 상태 필드, legacy settlement 확장 방향 제거
2. front/admin-front 소비 surface와 seed 제약까지 문서에 반영

### Phase 2. Organization/Driver trim

1. `Organization Master`를 `Company/Fleet`만 남기도록 정리
2. `Driver Profile HR`를 기사 기본 프로필만 남기도록 정리
3. front/admin-front가 이 변경과 같이 움직이도록 맞춤

### Phase 3. Settlement freeze

1. settlement process note 작성
2. `SettlementRun`, `SettlementItem` placeholder만 유지
3. 레거시 계산식 이식 금지 원칙을 코드/문서에 반영

### Phase 4. Account / Auth follow-up

1. lockout
2. change password
3. account-driver linking helper

### Phase 5. Driver 360 consumer domain

1. `front`가 source API를 직접 조합하지 않도록 `Driver 360` query service를 추가
2. `Driver Profile HR`, `Organization Master`, `Identity Access`, `Settlement Payroll` 요약을 한 contract로 합침
3. 이번 1차는 projection DB가 아니라 bounded fan-out query service로 구현

### Phase 6. Vehicle Ops consumer domain

1. `dashboard.Terminal`을 Vehicle Asset로 포팅하지 않는다. Vehicle Asset은 차량 마스터만 먼저 고정한다.
2. `Vehicle Ops` read model은 이후 단계에서 붙인다.
3. `Terminal Ops`, `Schedule Match`, `Telemetry`, `Vehicle Ops`는 모두 후속 phase다.
4. 후속 phase는 `goal/01-target-system-fragmentation-map.md`에 고정된 Vehicle Asset master (`vehicle_id`, `company_id`, `fleet_id?`, `plate_number`, `vin`, `vehicle_status`)를 기준으로 운영 projection만 추가한다.

### Phase 7. Dispatch Control prerequisite definitions

1. `Dispatch Control`은 아직 별도 런타임 서비스를 만들지 않음
2. 필요한 식별자, 이벤트, projection 요구만 문서로 선행 정의

## 현재 단계에서 명시적으로 보류할 것

다음은 레거시에 있어도 이번 4개 서비스의 2차 구현 범위에서는 바로 들이지 않는다.

- `tip`
- `map`
- `driver_location`
- `vehicle`
- `dashboard`
- `approval`
- `notifications`
- `ticket`
- `invoice`
- `schedule`
- `delivery_plan`
- `Terminal Ops`
- `Schedule Match`
- `Telemetry`
- `Vehicle Ops`

이 모듈들은 대부분 운영/가시화/read model/주변 채널 성격이므로, 먼저 정본 서비스 경계를 세운 뒤 소비자 또는 입력원으로 연결한다.
