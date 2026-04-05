# Dispatch Admin Board Design

## 목적

이 문서는 배차 1차를 `front-admin-console` 기준으로 다시 정의하고, 계획 정본과 실제 운영 보드를 어떻게 나눌지 current truth로 고정한다.

이번 결정의 목적은 아래와 같다.

1. 배차 1차 범위를 `admin web` 기준으로 고정한다.
2. `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment`를 계속 정본으로 유지한다.
3. 실제 운영은 날짜 기준 `dispatch_unit board` 레이어에서 다루되, read-model/broker로만 해석한다.
4. `용차 기사`, `예상 물량`, `날짜별 근무 예외`를 배차 1차 범위 안에서 최소한으로 정리한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. 배차 1차의 상위 컨텍스트
2. 정본 레이어와 운영 보드 레이어의 분리
3. `dispatch_unit` 해석
4. `예상 물량`과 `용차 기사`의 위치
5. `휴무`, `특근` 날짜 예외의 위치
6. 관리자 역할 해석
7. admin web 1차 화면 목표

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. operator 전용 배차 웹
2. 배송원 앱/웹 배차 UX
3. terminal / telemetry 세부 반영
4. 권역 / 목적지 세부 배차 규칙
5. 외부 배송인력풀의 독립 정본 서비스
6. 배차 정산 엔진 상세
7. auth/runtime 구현 상세

## 선택된 접근

이번 설계에서 선택한 구조는 `Truth Snapshot + Dispatch Unit Board`다.

핵심 원칙은 아래와 같다.

1. 배차 정본은 계속 `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment`에 남긴다.
2. 실제 운영은 `dispatch_unit board`가 담당한다.
3. `dispatch_unit board`는 새 정본 서비스가 아니라, 정본을 재조립해 운영 액션을 중개하는 논리적 read-model/broker 레이어다.
4. `service-dispatch-operations-view`는 계속 read service이며, write truth를 소유하지 않는다.
5. 실제 write는 기존 truth 서비스와 각 소유 서비스로 흘러가야 한다.

## 상위 컨텍스트

배차 1차의 상위 컨텍스트는 아래처럼 고정한다.

- `company + fleet + dispatch_date`

이 원칙을 선택한 이유는 아래와 같다.

1. 배차 계획은 `fleet`에 종속된다.
2. `fleet`는 단순 필터가 아니라 `dispatch_plan`의 상위 계획 축이다.
3. 날짜를 먼저 고정해야, 그 날짜에 유효한 차량-배송원 결합체를 자연스럽게 해석할 수 있다.

## 정본 레이어

### 1. dispatch_plan

- `fleet + dispatch_date`의 계획 정본
- `예상 물량`은 이 엔티티의 일부다
- 원청 예상 물량은 미리 들어오고, 전날까지 계속 수정될 수 있다

### 2. vehicle_schedule

- 특정 날짜의 차량 운행 슬롯 스냅샷 정본
- 배차 보드가 다루는 최소 차량 축을 제공한다

### 3. dispatch_assignment

- 특정 날짜/슬롯에 계획상 어떤 배송원이 붙었는지 남기는 스냅샷 정본
- 실제 운영상 재배정이 일어나더라도 기록은 정본에 남아야 한다

## 운영 보드 레이어

### 1. dispatch_unit board

`dispatch_unit board`는 날짜 기준으로 유효한 `vehicle + driver` 결합체를 운영 단위로 보는 보드다.

이 보드는 아래 source를 재조립한다.

1. `dispatch_plan`
2. `vehicle_schedule`
3. `dispatch_assignment`
4. 날짜 기준 유효한 `vehicle_assignment`
5. 차량/배송원 read 정보
6. 외부 배송인력 입력
7. 날짜별 근무 예외 입력

### 2. dispatch_unit

배차 1차의 화면 row 기준은 `vehicle` 단독이 아니라 `dispatch_unit`이다.

`dispatch_unit`은 아래를 함께 보는 운영 단위다.

1. `dispatch_date`
2. `vehicle`
3. 해당 날짜에 붙는 `driver`

즉 사용자는 `차량 조건`과 `배송원 조건`을 같이 본다.

### 3. broker 원칙

이 보드 레이어는 아래 원칙을 따른다.

1. 정본을 새로 소유하지 않는다.
2. write 요청을 적절한 truth write로 분해해 중개한다.
3. `service-dispatch-operations-view`를 master처럼 취급하지 않는다.
4. admin web가 실제 운영 보드 owner이며, backend 쪽 broker/read-model은 이를 뒷받침하는 레이어로만 본다.

## 예상 물량

1. 원청 예상 물량은 `dispatch_plan`의 일부다.
2. 각 `fleet` 담당자는 매일 바뀌는 값을 시스템에 저장할 수 있어야 한다.
3. 이 값은 배차 보드의 입력 기준이지만, 별도 planning data가 아니라 plan 정본의 일부로 본다.
4. 1차 구현에서는 `planned_volume` 단일 값으로 유지한다.

## 용차 기사

### 1. 기본 원칙

1차에서 `용차 기사`는 `driver` 정본으로 올리지 않는다.

이유는 아래와 같다.

1. 회사 소속 배송원과 같은 수준의 정보를 관리하게 되면 과도하게 무거워진다.
2. 배차와 정산에서만 필요한 외부 배송인력으로 보는 것이 1차 범위에 맞다.

### 2. 해석

1. `용차 기사`는 외부 배송인력이다.
2. `driver_account`, 앱, 배송원 정본 lifecycle과 연결하지 않는다.
3. 배차와 정산 참여자로만 등장한다.
4. 개념적으로는 상위 `배송인력풀`에 속한다고 볼 수 있지만, 1차에선 독립 정본 서비스를 만들지 않는다.

### 3. 최소 정보

1차에서 `용차 기사`는 아래 최소 정보만 가진다.

1. `이름`
2. `연락처`
3. `차량/차종 메모`
4. `메모`

`박스 수`, `가구 수` 같은 정산 기준값은 외부 배송인력 정본이 아니라 해당 날짜의 배차/실적/정산 입력에 붙는다.

### 4. 최소 저장 원칙

1. 1차에서도 `용차 기사`는 메모리 상태가 아니라 persisted entity로 저장되어야 한다.
2. 저장 문맥은 `dispatch_plan`이다.
3. 즉 같은 `company + fleet + dispatch_date` 계획 아래에서만 생성/수정/아카이브한다.
4. `dispatch_assignment`는 내부 `driver` 대신 이 persisted `용차 기사`를 참조할 수 있어야 한다.
5. `용차 기사`는 물리 삭제하지 않는다.
6. 정산 입력 스냅샷이 찍히기 전에는 아카이브할 수 없다.
7. 같은 날짜/플릿의 정산 입력 스냅샷이 존재할 때만 아카이브할 수 있다.
8. 여기서 말하는 스냅샷은 `service-delivery-record`가 소유하는 `daily input snapshot`이다.
9. dispatch는 이 handoff 완료까지만 보고 용차 기사 lifecycle을 판단한다.
10. settlement 결과/지급 상태는 `service-settlement-*`의 재무 도메인 상태이며, dispatch의 아카이브 조건으로 직접 참조하지 않는다.

## 날짜별 근무 예외

### 1. 기본 원칙

배차 1차는 일반 회사처럼 `기본 근무/휴무` 구조를 전제로 한다.

다만 배차 운영에는 아래 날짜 예외가 필요하다.

1. `휴무`
2. `특근`

일반적으로 쉬는 날은 별도 예외 입력 없이 `미표기`로 처리한다.
즉 날짜 예외는 평소 상태와 다른 경우에만 저장한다.

### 2. 규칙

1. `특근`은 특정 날짜의 배차와 정산에만 영향을 준다.
2. `휴무`, `특근`은 `driver`의 일반 스케줄 정본을 바꾸지 않는다.
3. 즉 날짜별 운영 예외일 뿐, 배송원 정본 스케줄 변경이 아니다.
4. 이 예외 상태는 `dispatch` 정본이 아니라 `배차 운영 입력`으로 둔다.
5. `한 배송원 + 한 날짜`에는 예외 상태를 하나만 둔다.
6. 해당 날짜에 계획된 내부 배송원이 없는 경우, 예외도 입력하지 않는다.
7. 날짜 예외 입력에서 선택 가능한 시스템 의미는 `휴무`, `특근`만이다. `출근`은 예외로 직접 입력하지 않는다.

### 3. 회사별 근무 규칙

1. 시스템은 `출근`, `휴무`, `특근`의 의미만 고정한다.
2. 회사 관리자는 자기 회사에서 사용할 근무 규칙명을 직접 만든다.
3. 각 회사 규칙은 반드시 시스템 의미 중 하나에 매핑된다.
4. 배차 1차에서는 이 회사 규칙과 날짜 예외 입력을 함께 사용한다.
5. 다만 일반 휴무일은 규칙을 생성하더라도 매일 명시 저장하지 않는다.
6. 저장 대상은 특정 날짜에 필요한 예외 입력뿐이다.
7. 회사 관리자는 규칙을 삭제할 수 있지만, 시스템 의미 매핑은 항상 유지되어야 한다.
8. 회사 관리자는 근무 규칙의 이름을 수정할 수 있다.
9. 같은 시스템 의미에 매핑되는 회사 규칙은 이름이 다르면 여러 개 둘 수 있다.

## 관리자 역할 해석

배차 1차에는 `fleet_manager`를 추가할 수 있다.

다만 구현 복잡성을 늘리지 않기 위해 아래처럼 해석한다.

1. `fleet_manager`는 새로운 독립 권한 모델이 아니다.
2. `settlement_manager`와 완전히 동일한 scope를 가진 별칭 역할이다.
3. 차이는 권한 이름과 업무 명칭만 다르다.
4. 배차 1차에서는 `예상 물량`과 `배차 운영`의 담당자를 설명하는 역할 이름으로 쓴다.

## admin web 1차 목표

배차 1차에서 admin web은 아래 세 화면으로 닫는다.

1. `배차 보드 목록`
2. `배차 보드 상세`
3. `예상 물량 입력/수정`

이 화면들 안에서 아래 운영 액션을 지원하는 것을 1차 목표로 본다.

1. 배차 CRUD
2. 예상 물량 수정
3. 용차 기사 추가/수정/아카이브
4. 차량-배송원 관리 화면으로 이동
5. 특정 날짜의 `휴무`, `특근` 예외 입력

## 연결 문서

- [2026-03-23-dispatch-registry-design.md](2026-03-23-dispatch-registry-design.md)
- [2026-03-23-dispatch-operations-view-design.md](2026-03-23-dispatch-operations-view-design.md)
- [../../contracts/10-front-ui-rules.md](../../contracts/10-front-ui-rules.md)
- [../../contracts/16-admin-dispatch-board-pages.md](../../contracts/16-admin-dispatch-board-pages.md)
- [../../rollout/16-web-first-platform-delivery-order.md](../../rollout/16-web-first-platform-delivery-order.md)
