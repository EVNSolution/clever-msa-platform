# Terminal Registry 디자인

## 목적

이 문서는 `service-terminal-registry`의 1차 경계와 소유 데이터를 고정하기 위한 설계 문서다.

이번 설계의 목표는 세 가지다.

1. 터미널을 차량 정본이나 텔레메트리 정본이 아니라 `단말 자산 정본`으로 고정한다.
2. 터미널 서비스가 소유하는 범위를 `단말 자산 + 현재 차량 장착 관계`까지만 제한한다.
3. 위치, fault, diagnostic, MQTT raw, 배송원 배정은 이 서비스 밖에 두고 후속 서비스로 분리한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `terminal_registry`와 `terminal_installation`의 경계
2. 필드 계약
3. 상태값과 제약
4. 쓰기 권한
5. 최소 API surface
6. `Telemetry`와의 관계

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. MQTT consumer 구현
2. diagnostic/fault 저장 구조
3. 위치 snapshot 저장 구조
4. handover workflow
5. 배송원 배정
6. terminal 교체/이력 상세 이벤트
7. 실제 migration 절차 상세
8. UI 상세

## 선택된 접근

이번 설계에서 선택한 구조는 `Terminal Asset + Current Installation`이다.

소유 범위는 아래 두 축만 둔다.

- `terminal_registry`
- `terminal_installation`

선택 이유는 아래와 같다.

1. 단말 자산 정본과 차량 장착 관계를 분리해서 다룰 수 있다.
2. 위치, 진단, MQTT를 끌어오지 않고도 실무적으로 필요한 현재 장착 상태를 표현할 수 있다.
3. 교체 이력이나 텔레메트리 파이프라인을 섞지 않고도 이후 확장 지점을 남길 수 있다.

## 서비스 경계

### 1. Terminal Registry

`service-terminal-registry`는 단말 자산 정본과 현재 차량 장착 관계만 소유한다.

소유 데이터:

- `terminal_registry`
- `terminal_installation`

이 서비스가 답하는 질문:

1. 이 단말은 무엇인가
2. 어떤 하드웨어 식별자를 가지는가
3. 현재 관리 가능한 활성 단말인가
4. 현재 어느 차량에 장착돼 있는가

이 서비스가 답하지 않는 질문:

1. 현재 위치가 어디인가
2. diagnostic/fault가 무엇인가
3. raw MQTT payload가 무엇인가
4. 어떤 배송원이 배정돼 있는가
5. handover가 진행 중인가

### 2. Telemetry 와의 관계

터미널은 위치를 보내는 장치일 수 있지만, 위치 snapshot의 도메인 정본은 아니다.

관계는 아래와 같이 고정한다.

- `service-terminal-registry`
  - 단말 자산
  - 현재 차량 장착 관계
- `service-telemetry-hub`
  - 단말/차량이 보내는 관측 데이터
  - 위치 snapshot
  - diagnostic/fault
  - raw ingress

즉 `service-terminal-registry`는 장치 identity와 장착 관계만 제공하고, 텔레메트리 데이터 자체는 저장하지 않는다.

## 테이블 초안

### 1. terminal_registry

- `terminal_id`
- `manufacturer_company_id`
- `imei`
- `iccid`
- `firmware_version`
- `protocol_version`
- `app_version`
- `terminal_status`
- `created_at`
- `updated_at`

설명:

- 단말 자산 정본
- `manufacturer_company_id`는 `Organization Registry`의 외부 참조 UUID다
- `imei`, `iccid`는 단말 자산 식별용 유니크 값이다

### 2. terminal_installation

- `terminal_installation_id`
- `terminal_id`
- `vehicle_id`
- `installation_status`
- `installed_at`
- `removed_at?`
- `created_at`
- `updated_at`

설명:

- 현재 차량 장착 관계
- `vehicle_id`는 `service-vehicle-registry`의 외부 UUID 참조다
- cross-service foreign key는 만들지 않는다

## 상태값

### 1. terminal_registry.terminal_status

- `active`
- `inactive`
- `retired`

의미:

- `active`: 관리 가능한 단말 자산
- `inactive`: 일시 비활성
- `retired`: 더 이상 쓰지 않는 단말

### 2. terminal_installation.installation_status

- `installed`
- `removed`

의미:

- `installed`: 현재 차량에 장착된 활성 관계
- `removed`: 장착 종료 기록

## 제약

핵심 제약은 아래와 같다.

1. 단말당 `installed` 상태는 최대 1개
2. 차량당 `installed` 상태도 최대 1개
3. `terminal_status != active`면 신규 장착 금지
4. `vehicle_registry`에서 활성 차량이 아니면 신규 장착 금지
5. `removed_at`은 `removed` 상태일 때만 채운다
6. `terminal_id`, `terminal_installation_id`는 모두 UUID 문자열
7. `imei`, `iccid`는 유니크

## 쓰기 권한

### 1. terminal_registry

제조사/관리자 측만 수정한다.

수정 가능:

- `imei`
- `iccid`
- `firmware_version`
- `protocol_version`
- `app_version`
- `terminal_status`

### 2. terminal_installation

제조사/관리자 측만 수정한다.

수정 가능:

- 어떤 `terminal_id`를 어떤 `vehicle_id`에 장착할지
- `installation_status`
- `installed_at`
- `removed_at`

### 3. 운영사 권한

운영사는 아래만 가능하다.

- terminal 자산 정보 조회
- 차량 장착 관계 조회

운영사는 아래를 할 수 없다.

- terminal 등록/수정
- terminal 장착/해제

## 금지 규칙

1. 운영사가 `terminal_registry`를 수정하면 안 된다.
2. 운영사가 `terminal_installation`을 직접 바꾸면 안 된다.
3. `service-terminal-registry`가 위치를 저장하면 안 된다.
4. `service-terminal-registry`가 fault/diagnostic를 저장하면 안 된다.
5. `service-terminal-registry`가 배송원 배정을 저장하면 안 된다.
6. `service-terminal-registry`가 handover workflow를 소유하면 안 된다.

## API Surface

1차 최소 API는 아래와 같다.

- `GET /api/terminals/health/`
- `GET /api/terminals/`
- `POST /api/terminals/`
- `GET /api/terminals/{terminal_id}/`
- `PATCH /api/terminals/{terminal_id}/`
- `GET /api/terminals/installations/`
- `POST /api/terminals/installations/`
- `GET /api/terminals/installations/{terminal_installation_id}/`
- `PATCH /api/terminals/installations/{terminal_installation_id}/`
- `GET /api/terminals/check-imei/?imei=...`

## 후속 확장 지점

현재는 일부러 제외하지만, 후속 후보는 아래와 같다.

1. terminal 교체 이력
2. installation history 상세 로그
3. terminal provisioning workflow
4. `Telemetry Hub`와의 source identity contract

## 요약

`service-terminal-registry`의 1차 역할은 `단말 자산 정본 + 현재 차량 장착 관계`까지만이다.

즉 이 서비스는 다음 둘만 소유한다.

1. 단말이 무엇인지
2. 현재 어느 차량에 붙어 있는지

그 외 위치, 진단, MQTT, 배송원 배정은 모두 이 서비스 밖에 둔다.
