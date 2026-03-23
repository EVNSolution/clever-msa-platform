# Settlement Phase 2 Decomposition 디자인

## 목적

이 문서는 settlement 분해 2차 라운드에서 `service-settlement-operations-view`의 placeholder write를 제거하고, 정산 결과 write owner를 별도 서비스로 분리하기 위한 경계와 전환 규칙을 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-settlement-operations-view`를 최종적으로 read-only 서비스로 못 박는다.
2. `service-settlement-registry`, `service-delivery-record`, `service-settlement-payroll`의 책임을 이름 규칙에 맞게 다시 정렬한다.
3. 기존 placeholder `SettlementRun`, `SettlementItem` CRUD를 `hard cut`으로 새 write owner에 이동시킨다.
4. gateway, compose, seed, consumer가 새 topology를 기준으로 다시 정렬되도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. settlement 4축 목표 서비스 정의
2. `SettlementRun`, `SettlementItem`의 최종 소유 서비스 결정
3. settlement 외부 route와 compose service naming 결정
4. `service-settlement-operations-view`의 read contract 방향
5. consumer 전환 원칙

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. 정산 계산 엔진 고도화
2. 이벤트 브로커나 projection 파이프라인 도입
3. payout 전용 후속 서비스 분리
4. 세부 DB 스키마와 migration 순서
5. 화면 상세 UI 변경

## 현재 상태

현재 settlement는 아래 상태다.

1. `service-settlement-operations-view`가 placeholder `SettlementRun`, `SettlementItem` CRUD를 임시 수용한다.
2. `service-settlement-registry`는 shell이지만 이름상 정책/기준 registry로 읽힌다.
3. `service-delivery-record`는 shell이지만 이름상 계산 전 입력 원천 정본으로 읽힌다.
4. 현재 placeholder 결과 엔티티를 `registry` 또는 `delivery-record`에 넣으면 naming과 책임이 깨진다.

## 선택된 접근

사용자가 승인한 접근은 아래와 같다.

1. `service-settlement-operations-view`를 완전 read-only로 고정한다.
2. 정산 결과 write owner는 새 서비스 `service-settlement-payroll`로 추가한다.
3. 전환은 `hard cut`으로 처리한다.
4. 외부 write route는 `/api/settlements/`를 유지하되 upstream owner를 `service-settlement-payroll`로 바꾼다.
5. read-only route는 `/api/settlement-ops/`로 분리한다.
6. `service-settlement-operations-view`는 `service-settlement-payroll`을 fan-out으로 읽는다.

## 목표 서비스 경계

### 1. `service-settlement-registry`

역할:

- 정산 기준, 정책, 버전, 적용기간 registry

직접 소유:

- 정산 기준표
- 정책 버전
- 적용기간 규칙

소유하지 않음:

- `settlement_run`
- `settlement_item`
- `payout_status`
- delivery 원천 기록

### 2. `service-delivery-record`

역할:

- 계산 전 입력 원천 정본

직접 소유:

- 배송원별 delivery 원천 기록
- 집계 입력
- 계산 입력값

소유하지 않음:

- 정산 정책 registry
- 정산 결과 장부
- 지급 상태

### 3. `service-settlement-payroll`

역할:

- 정산 결과와 지급 상태 write owner

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
- `service-delivery-record` 입력값
- `service-settlement-registry` 정책/기준 참조

소유하지 않음:

- 사람 정본
- 조직 정본
- read-model projection

### 4. `service-settlement-operations-view`

역할:

- settlement read-only operations view
- 정산 결과 조회와 운영 조회용 read API

직접 소유:

- read-only API contract
- 필요 시 경량 projection/summary

소유하지 않음:

- `SettlementRun`, `SettlementItem` write
- payout 상태 변경
- 정책 registry 정본
- delivery 입력 정본

## Route / Service Naming 원칙

phase 2 이후 naming은 아래로 고정한다.

- compose service `settlement-payroll-api`
- compose service `settlement-ops-api`
- gateway `/api/settlements/` -> `settlement-payroll-api`
- gateway `/api/settlement-ops/` -> `settlement-ops-api`

원칙:

1. 기존 settlement write prefix는 payroll write owner가 받는다.
2. read-only service는 별도 prefix를 사용한다.
3. read와 write를 같은 외부 prefix 아래에서 path-based 분기로 다시 섞지 않는다.

## Read Contract 방향

`service-settlement-operations-view`는 phase 2에서 아래 방향으로 간다.

1. 기존 `run/item` 개념은 read-only로 유지할 수 있다.
2. 운영 조회에 필요한 summary는 추가 가능하다.
3. 상세 정산 결과 정본 쓰기와 상태 변경은 모두 `service-settlement-payroll`로 이동한다.

즉, read-model은 `run/item` 조회를 제공할 수 있지만 정본 쓰기를 소유하지 않는다.

## Data Flow 원칙

phase 2의 read path는 fan-out 기반으로 고정한다.

1. `service-settlement-operations-view`는 `service-settlement-payroll`을 fan-out으로 읽는다.
2. 추가로 필요한 경우 `service-delivery-record`, `service-driver-profile`, `service-organization-registry`를 읽을 수 있다.
3. 이번 단계에서는 event-driven projection을 의무화하지 않는다.

이 선택의 이유는 아래와 같다.

1. 현재 read-model 서비스들의 구현 패턴과 맞다.
2. write owner와 read owner의 정본 책임이 명확하다.
3. phase 2 범위에서 과도한 projection 인프라를 도입하지 않아도 된다.

## Consumer 전환 원칙

기존 settlement 소비자는 아래 규칙으로 전환한다.

1. write client는 `/api/settlements/`를 사용한다.
2. read consumer는 `/api/settlement-ops/`를 사용한다.
3. `driver-360` 같은 read consumer는 `service-settlement-payroll`을 직접 보지 않고 `service-settlement-operations-view`를 본다.
4. env naming도 read consumer 기준으로 `SETTLEMENT_OPS_BASE_URL` 같은 이름으로 정리한다.

## Hard Cut 원칙

이번 전환은 compatibility proxy를 두지 않는다.

1. `service-settlement-operations-view`는 옛 write route를 프록시하지 않는다.
2. gateway는 read/write 혼합 분기를 하지 않는다.
3. write route owner 교체와 read route 분리를 같은 배치에서 끝낸다.

## 문서와 인덱스 영향

phase 2 구현 계획에서는 최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-to-target-repo-map.md`
4. `docs/mappings/repo-responsibility-matrix.md`
5. settlement 관련 compose / gateway / env 문서

핵심 반영 내용:

1. settlement 3축을 settlement 4축으로 수정
2. `service-settlement-payroll` 추가
3. `service-settlement-operations-view`를 read-only active runtime으로 재정의
4. `service-settlement-registry`와 `service-delivery-record`의 금지 책임을 더 명확히 표기

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. `SettlementRun`, `SettlementItem`의 write owner가 `service-settlement-payroll`로 고정된다.
2. `service-settlement-operations-view`의 read-only 성격이 문서상 명확하다.
3. route와 compose naming이 read/write 분리 방향으로 고정된다.
4. 기존 settlement consumer 전환 방향이 문서에 드러난다.
5. 구현 계획이 이 설계를 직접 따라갈 수 있다.
