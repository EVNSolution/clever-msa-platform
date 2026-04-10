# 13. Admin Vehicle And Assignment Pages

## 문서 목적

이 문서는 `front-web-console`의 `vehicle`, `vehicle-assignment` 화면을 current truth 기준으로 고정한다.

이번 문서는 아래를 먼저 결정한다.

1. browser에서 vehicle과 terminal 정보를 어떻게 묶어 보는가
2. vehicle list / detail / update의 책임이 어디에 있는가
3. terminal을 browser에서 별도 페이지로 둘지 여부
4. vehicle-assignment 화면의 기본 구조

## 적용 범위

- `front-web-console`
- `service-vehicle-registry`
- `service-vehicle-operations-view`
- `service-vehicle-assignment`
- `service-terminal-registry`
- `service-telemetry-hub`

## 기본 원칙

1. browser 정보 구조는 `vehicle 중심`이다.
2. terminal 정보는 `vehicle detail`의 하위 정보다.
3. browser에서 standalone `terminal` 관리 페이지를 target으로 두지 않는다.
4. vehicle list는 운영형 테이블 화면으로 유지한다.
5. vehicle update는 detail에서만 시작한다.

## 1. Vehicle 페이지 계약

### 1.1 콘솔 소속

1. `vehicle`은 `admin 전용` 관리 화면을 가진다.
2. operator는 별도의 read-only vehicle 화면을 가진다.

### 1.2 browser ownership

1. browser에서는 `vehicle`이 terminal 정보를 소유한다.
2. terminal은 vehicle과 별도 1차 리소스로 노출하지 않는다.
3. `service-terminal-registry`는 browser 정보 구조가 아니라 backend 구현 detail로 본다.

### 1.3 라우트

1. `/vehicles`
2. `/vehicles/:vehicleRef`
3. `/vehicles/:vehicleRef/edit`
4. `/vehicles/:vehicleRef/accesses/new`

## 1.4 화면 역할

1. `/vehicles`
   - vehicle list만 보여준다.
   - 이 화면이 `C/R/D`의 기본 진입점이다.
   - table row click으로 상세에 이동한다.
   - 생성 버튼과 삭제 진입은 이 문맥에서만 둔다.

2. `/vehicles/:vehicleRef`
   - vehicle detail 화면이다.
   - 기본 차량 정보, terminal 정보, live telemetry 상태를 함께 본다.
   - update 진입은 이 화면에서만 허용한다.

3. `/vehicles/:vehicleRef/edit`
   - vehicle 수정 1열 폼만 둔다.
   - 목록이나 다른 리소스 폼을 같이 두지 않는다.

4. `/vehicles/:vehicleRef/accesses/new`
   - 운영사 접근 생성 화면이다.
   - vehicle 문맥 안에서만 연다.

### 1.5 vehicle list 규칙

1. vehicle list는 UI 설계서의 table / row 규칙을 따른다.
2. row는 클릭으로 detail에만 이동한다.
3. 목록에 `수정` 버튼을 두지 않는다.
4. terminal 상태와 live freshness는 vehicle row 안에서 요약할 수 있어야 한다.
5. vehicle create와 delete는 list 문맥에서 시작한다.

### 1.6 vehicle detail 규칙

1. vehicle detail은 아래 블록을 같은 화면에 둔다.
   - 기본 정보
   - terminal 정보
   - live telemetry 정보
   - warning / freshness 요약
2. terminal 정보는 read-only block으로 둔다.
3. terminal 연결/해제를 위한 browser write action은 두지 않는다.
4. vehicle update 버튼만 이 화면에 둔다.

## 2. Terminal 연결 규칙

1. browser에서 terminal을 vehicle에 수동 설치하지 않는다.
2. browser에서 terminal 설치/해제 form을 만들지 않는다.
3. terminal과 vehicle의 연결은 MQTT ingress가 `vin`과 함께 들어온 결과를 시스템이 자동 연결하는 방식으로 본다.
4. UI는 그 연결 결과를 읽기만 한다.
5. terminal이 아직 연결되지 않았으면 `미연결` 상태를 분명히 보여준다.

## 3. Real-time UI 규칙

1. MQTT 브로커 업데이트는 실시간 입력으로 본다.
2. vehicle list와 vehicle detail은 수동 새로고침 없이 상태 변화를 반영해야 한다.
3. 구현 방식은 live subscription 또는 bounded auto-refresh 중 하나를 쓸 수 있다.
4. 어떤 방식이든 아래는 항상 보여야 한다.
   - 마지막 수집 시각
   - freshness 상태
   - 연결 여부
   - telemetry unavailable 경고

## 4. Vehicle Assignment 페이지 계약

### 4.1 콘솔 소속

1. `vehicle-assignment`는 `admin 전용`이다.

### 4.2 라우트

1. `/vehicle-assignments`
2. `/vehicle-assignments/new`
3. `/vehicle-assignments/:assignmentRef`
4. `/vehicle-assignments/:assignmentRef/edit`

### 4.3 화면 역할

1. `/vehicle-assignments`
   - 배정 목록만 보여준다.
   - row click으로 상세에 이동한다.
   - 생성 버튼만 둔다.
   - 인라인 생성 폼을 같이 두지 않는다.

2. `/vehicle-assignments/new`
   - 배정 생성 1열 폼만 둔다.
   - 저장과 취소만 둔다.

3. `/vehicle-assignments/:assignmentRef`
   - 배정 읽기 전용 상세 화면이다.
   - 수정 버튼과 `배정 해제` 진입은 이 화면에만 둔다.
   - driver, vehicle, operator company, assignment 상태, assigned_at, unassigned_at을 보여준다.
   - vehicle detail과 driver detail로 이동하는 링크를 둘 수 있다.

4. `/vehicle-assignments/:assignmentRef/edit`
   - 배정 수정 1열 폼만 둔다.
   - 목록이나 다른 입력 폼을 같이 두지 않는다.

### 4.4 상세와 소유권 경계

1. `vehicle detail`은 현재 배정 요약을 보여줄 수 있다.
2. 하지만 배정 write action은 `vehicle-assignment detail`에서만 연다.
3. `vehicle detail`은 `assignment detail`로 가는 링크만 가진다.
4. `driver detail`도 assignment write owner가 아니다.
5. assignment의 생성, 수정, 해제는 `vehicle-assignment` 화면이 소유한다.

## 5. route_no 규칙

1. `vehicleRef`와 `assignmentRef`는 `route_no`를 사용한다.
2. raw UUID는 브라우저 URL에 쓰지 않는다.
3. `service-vehicle-assignment`는 browser 라우트를 위해 `route_no`를 제공해야 한다.
4. assignment detail API는 `route_no`와 기존 UUID lookup을 둘 다 받아야 한다.

## 6. 현재 화면에서 제거할 것

1. standalone `/terminals` browser page
2. browser terminal 설치 생성 화면
3. browser terminal 설치 해제 즉시 액션
4. vehicle와 분리된 terminal 관리 흐름

## 7. 1차 구현 범위

1. vehicle detail이 terminal/live 정보를 함께 보여주게 만든다.
2. `/terminals` page를 browser target에서 제거한다.
3. vehicle list를 `C/R/D entry`, vehicle detail을 `U entry`로 고정한다.
4. vehicle-assignment는 `route_no`를 추가한 뒤 목록 / 생성 / 상세 / 수정 구조로 맞춘다.

## 비스코프

1. MQTT broker 내부 프로토콜 상세
2. telemetry raw schema 상세
3. terminal 자산 재고 관리 화면
4. 대량 vehicle 업로드

## 연결 문서

- [05-vehicle-ops-read-model.md](05-vehicle-ops-read-model.md)
- [10-front-ui-rules.md](10-front-ui-rules.md)
- [06-id-and-state-dictionary.md](06-id-and-state-dictionary.md)
- [../rollout/14-front-ui-rule-audit.md](../rollout/14-front-ui-rule-audit.md)
