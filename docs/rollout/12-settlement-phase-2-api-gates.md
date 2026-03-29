# 12. Settlement Phase 2 API Gates

## 문서 목적

이 문서는 settlement 기능을 phase 2 topology로 고정했을 때, 현재 runtime에서 어떤 gateway prefix를 settlement 연결 gate로 써야 하는지 정리한다.

질문이 아래와 같다면 historical plan보다 이 문서를 먼저 본다.

1. 정산 write는 어느 gate로 붙어야 하는가
2. 정산 read는 어느 gate로 붙어야 하는가
3. 정책 registry와 delivery source input은 어느 gate로 붙어야 하는가
4. 어떤 direct call이 금지되는가

## 고정 전제

1. settlement는 `registry + delivery-record + payroll + operations-view` 4축으로 유지한다.
2. write gate와 read gate를 다시 섞지 않는다.
3. 신규 연결에서 legacy `/api/documents/*` settlement path는 사용하지 않는다.
4. read consumer는 `service-settlement-payroll`을 직접 보지 않는다.

## 외부 settlement gate

| Gate | Owner service | 용도 | 연결 대상 |
| --- | --- | --- | --- |
| `/api/settlements/` | `service-settlement-payroll` | 정산 결과, 항목, 지급 상태 write | write client, admin command, batch write |
| `/api/settlement-ops/` | `service-settlement-operations-view` | 정산 운영 조회, 기사별 latest settlement, read summary | 운영 화면, read consumer, driver scoped query |
| `/api/settlement-registry/` | `service-settlement-registry` | 정산 정책, 정책 버전, assignment registry | 정책 관리 UI, policy admin flow |
| `/api/delivery-record/` | `service-delivery-record` | delivery source record, 일별 집계 입력 snapshot | 집계 입력, 원천 기록 적재, 계산 입력 확보 |

## settlement 연결에 필요한 upstream gate

| Gate | Owner service | settlement 쪽 사용 이유 |
| --- | --- | --- |
| `/api/drivers/` | `service-driver-profile` | settlement read summary에 기사 기본 정보가 필요할 수 있다 |
| `/api/org/` | `service-organization-registry` | company, fleet 기준 정보와 assignment scope 확인에 필요하다 |
| `/api/auth/` | `service-account-access` | settlement 화면과 admin flow의 인증 진입점이다 |

## 연결 규칙

1. 상태를 바꾸는 요청은 `/api/settlements/`로만 보낸다.
2. 운영 조회와 화면 summary는 `/api/settlement-ops/`로만 읽는다.
3. 정책 기준과 적용 assignment는 `/api/settlement-registry/`로만 관리한다.
4. 계산 입력 원천과 일별 입력 snapshot은 `/api/delivery-record/`로만 읽거나 적재한다.
5. `driver-ops`, `driver-360` 같은 read consumer는 payroll direct read 대신 `/api/settlement-ops/`를 쓴다.
6. `service-settlement-operations-view`는 필요 시 `/api/settlements/`, `/api/delivery-record/`, `/api/drivers/`, `/api/org/` upstream을 fan-out으로 읽을 수 있다.

## 금지 연결

1. 신규 settlement 연결에서 `/api/documents/daily-settlement/*`를 다시 사용하지 않는다.
2. 신규 settlement 연결에서 `/api/documents/monthly-settlement/*`를 다시 사용하지 않는다.
3. 신규 settlement 연결에서 `/api/documents/group-settlement/*`를 다시 사용하지 않는다.
4. 신규 settlement 연결에서 `/api/documents/settlement-policy/*`를 다시 사용하지 않는다.
5. read consumer가 `/api/settlements/`를 직접 읽지 않는다.
6. `service-delivery-record`를 정산 결과 정본처럼 취급하지 않는다.
7. `service-settlement-registry`를 payout/result write owner처럼 취급하지 않는다.

## consumer gate 기준

1. 정산 실행, 결과 확정, 지급 상태 변경: `/api/settlements/`
2. 정산 운영 조회, 기사별 최신 정산, read board: `/api/settlement-ops/`
3. 정산 정책 CRUD, 버전 관리, 회사/플릿 assignment: `/api/settlement-registry/`
4. delivery source 적재, 일별 입력 snapshot 확보: `/api/delivery-record/`

## 현재 runtime truth 연결

현재 active runtime inventory 기준 settlement gate는 아래 compose service와 1:1로 연결된다.

1. `/api/settlements/` -> `settlement-payroll-api`
2. `/api/settlement-ops/` -> `settlement-ops-api`
3. `/api/settlement-registry/` -> `settlement-registry-api`
4. `/api/delivery-record/` -> `delivery-record-api`

## 연결 문서

- `../decisions/specs/2026-03-23-settlement-phase-2-decomposition-design.md`
- `../mappings/current-runtime-inventory.md`
- `../mappings/repo-responsibility-matrix.md`
- `../contracts/09-integration-rules.md`
- `13-account-driver-settlement-compose-simulation.md`
