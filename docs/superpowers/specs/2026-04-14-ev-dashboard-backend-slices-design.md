# EV Dashboard Backend ECS Slice Sequencing Design

## Purpose

이 문서는 `ev-dashboard.com` 의 첫 ECS cutover 이후, **남은 backend graph를 어떤 slice 순서로 옮길지**를 근거와 함께 고정한다.

목표는 아래다.

1. 이미 성공한 `front-web-console + edge-api-gateway + service-account-access` 경로 위에 다음 이행 순서를 명확히 기록한다.
2. 각 slice의 범위, repo owner, gateway prefix, 성공 기준을 고정한다.
3. 이후 실행 계획과 실제 구현이 이 문서를 기준으로 같은 순서를 따르도록 만든다.

이 문서는 상위 설계 문서다. 구현 단계와 체크리스트는 별도 plan 문서에서 다룬다.

## Current Proven Baseline

2026-04-14 KST 기준 아래는 이미 ECS로 검증됐다.

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `infra-ev-dashboard-platform`

외부 검증 근거:

- `https://ev-dashboard.com` -> `200`
- `https://api.ev-dashboard.com/api/auth/health/` -> `200`
- `https://api.ev-dashboard.com/openapi.yaml` -> `200`
- `https://api.ev-dashboard.com/swagger/` -> `200`
- `https://api.ev-dashboard.com/admin/account-access/` -> `302`

즉, 현재 ECS 기준선은 아래다.

```text
front-web-console
-> edge-api-gateway
-> service-account-access
```

여기서 중요한 것은 **전체 backend graph가 아니라 entry slice만 이미 새 runtime으로 검증됐다**는 점이다.

## Evidence Used To Decide The Next Order

### 1. Gateway contract is already grouped by business prefixes

현재 gateway는 아래 식으로 backend를 business prefix 단위로 묶고 있다.

- `/api/org/` -> `organization-master-api`
- `/api/drivers/` -> `driver-profile-api`
- `/api/personnel-documents/` -> `personnel-document-registry-api`
- `/api/vehicles/` -> `vehicle-asset-api`
- `/api/driver-vehicle-assignments/` -> `driver-vehicle-assignment-api`
- `/api/dispatch/` -> `dispatch-registry-api`
- `/api/delivery-record/` -> `delivery-record-api`
- `/api/attendance/` -> `attendance-registry-api`
- `/api/dispatch-ops/` -> `dispatch-ops-api`
- `/api/driver-ops/` -> `driver-ops-api`
- `/api/vehicle-ops/` -> `vehicle-ops-api`
- `/api/settlement-registry/` -> `settlement-registry-api`
- `/api/settlements/` -> `settlement-payroll-api`
- `/api/settlement-ops/` -> `settlement-ops-api`
- `/api/regions/` -> `region-registry-api`
- `/api/region-analytics/` -> `region-analytics-api`
- `/api/announcements/` -> `announcement-registry-api`
- `/api/ticket/` -> `support-registry-api`
- `/api/notifications/` -> `notification-hub-api`
- `/api/terminals/` -> `terminal-registry-api`
- `/api/telemetry/` -> `telemetry-hub-api`
- `/api/telemetry-dead-letters/` -> `telemetry-dead-letter-api`

즉, slice는 repo가 아니라 **gateway prefix 묶음**으로 정의하는 것이 운영상 가장 자연스럽다.

### 2. Front usage pressure points favor organization first

`front-web-console` 의 non-test import 기준에서 `organization` API 모듈 사용 빈도는 가장 높다.

- `organization`: `62`
- `drivers`: `32`
- `vehicles`: `18`
- `dispatchRegistry`: `13`
- `deliveryRecords`: `12`
- `managerRoles`: `8`

여기에 이미 ECS로 올라간 `service-account-access` 가 `managerRoles`, `managerAccounts`, `authRequests` 를 담당하고 있으므로, 다음 slice를 `service-organization-registry` 로 잡으면 아래 UI를 같이 닫을 수 있다.

- 회사/플릿 목록/상세/CRUD
- 계정 승인
- 매니저 역할/권한 관리

즉 `organization + account-access` 조합이 **가장 작은 추가 비용으로 가장 넓은 운영 surface** 를 닫는다.

### 3. Lessons require one boundary at a time

현재 root `lesson.md` 기준으로 이미 고정된 원칙은 아래다.

- 한 번에 한 boundary만 옮긴다.
- runtime 이름과 포트를 유지한다.
- public smoke로 성공을 증명한다.
- old self-mutating runtime은 새 경로가 증명된 직후 제거한다.

따라서 남은 backend도 한 번에 올리지 않고, **역할이 닫히는 capability slice** 로 나눠서 옮기는 것이 맞다.

## Primary Decision

남은 backend graph는 아래 순서로 옮긴다.

1. `Company Governance`
2. `People And Assets`
3. `Dispatch Inputs`
4. `Dispatch Read Models`
5. `Settlement`
6. `Support Surface`
7. `Terminal And Telemetry`

이 순서는 아래 원칙을 동시에 만족한다.

- front-web-console 사용 압력이 높은 영역부터 닫는다.
- gateway prefix 묶음과 repo owner를 그대로 보존한다.
- 각 slice가 외부 smoke로 독립적으로 증명될 수 있다.
- later slice가 earlier slice의 정본을 재사용하게 만든다.

## Slice Catalog

### Slice 0. Completed Entry Slice

이미 완료된 기준 slice다.

- repos:
  - `front-web-console`
  - `edge-api-gateway`
  - `service-account-access`
  - `infra-ev-dashboard-platform`
- public scope:
  - `https://ev-dashboard.com`
  - `https://api.ev-dashboard.com/api/auth/*`
  - `https://api.ev-dashboard.com/openapi.yaml`
  - `https://api.ev-dashboard.com/swagger/`
  - `https://api.ev-dashboard.com/admin/account-access/`

이 slice는 이후 모든 backend 이행의 기반이 된다.

### Slice 1. Company Governance

#### Repos

- `service-organization-registry`
- `service-account-access`
- `edge-api-gateway`
- `infra-ev-dashboard-platform`

#### Gateway scope

- `/api/org/*`
- `/api/auth/company-manager-roles/*`
- `/api/auth/manager-accounts/*`
- `/api/auth/identity-signup-requests/manage/*`

#### UI scope

- public company bootstrap
- 회사/플릿 목록/상세/CRUD
- 계정 승인/반려
- 매니저 역할 관리
- 회사별 manager navigation policy

#### Why first

- `organization` API 사용 압력이 가장 높다.
- `managerRoles`, `managerAccounts`, `authRequests` 는 이미 `service-account-access` 에 있다.
- 새로 올릴 정본은 사실상 `service-organization-registry` 하나가 핵심이다.
- 가장 적은 추가 repo로 가장 많은 운영 화면을 닫는다.

#### Success criteria

- `/api/org/companies/public/` `200`
- `/api/org/companies/` `200`
- `/api/org/fleets/` `200`
- `/api/auth/company-manager-roles/` `200`
- `/api/auth/manager-accounts/manage/` `200`
- `/api/auth/identity-signup-requests/manage/` `200`
- `AccountsPage`, `CompaniesPage`, `CompanyDetailPage`, `FleetDetailPage`, `ManagerRolesPage` 외부 smoke 성공

### Slice 2. People And Assets

#### Repos

- `service-driver-profile`
- `service-personnel-document-registry`
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `edge-api-gateway`
- `infra-ev-dashboard-platform`

#### Gateway scope

- `/api/drivers/*`
- `/api/personnel-documents/*`
- `/api/vehicles/*`
- `/api/driver-vehicle-assignments/*`

#### Why second

- 기사/차량/배정은 운영 도메인에서 하나의 CRUD 묶음으로 움직인다.
- 이후 dispatch 와 settlement 가 모두 이 정본들을 전제로 한다.
- `front-web-console` 의 다음 사용 압력도 `drivers`, `vehicles`, `assignments` 에 있다.

#### Success criteria

- Drivers / Vehicles / Vehicle Assignments / Personnel Documents 화면 CRUD smoke 성공
- service-connect 이름 `driver-profile-api`, `vehicle-asset-api`, `driver-vehicle-assignment-api`, `personnel-document-registry-api` 유지

### Slice 3. Dispatch Inputs

#### Repos

- `service-dispatch-registry`
- `service-delivery-record`
- `service-attendance-registry`
- `edge-api-gateway`
- `infra-ev-dashboard-platform`

#### Gateway scope

- `/api/dispatch/*`
- `/api/delivery-record/*`
- `/api/attendance/*`

#### Why third

- 배차 입력, 일별 snapshot, attendance truth 는 write-side 묶음이다.
- dispatch read model 과 settlement 는 이 세 서비스 위에서만 의미가 생긴다.

#### Success criteria

- Dispatch upload / dispatch plan / delivery snapshot / attendance endpoints smoke 성공
- `DispatchUploadsPage`, `DispatchPlanFormPage`, `DispatchBoardsPage` 의 입력계열 동작 확인

### Slice 4. Dispatch Read Models

#### Repos

- `service-dispatch-operations-view`
- `service-driver-operations-view`
- `service-vehicle-operations-view`
- `edge-api-gateway`
- `infra-ev-dashboard-platform`

#### Gateway scope

- `/api/dispatch-ops/*`
- `/api/driver-ops/*`
- `/api/vehicle-ops/*`

#### Why fourth

- read model은 정본 write-side가 먼저 올라와야 운영적으로 의미가 있다.
- dispatch 상세/상황판, 기사/차량 운영 summary 는 입력 정본 없이는 false positive smoke 가 된다.

#### Success criteria

- Dispatch board detail / driver detail / vehicle detail 조회 화면 smoke 성공
- read model 서비스는 여전히 write owner가 아니라는 boundary 유지

### Slice 5. Settlement

#### Repos

- `service-settlement-registry`
- `service-settlement-payroll`
- `service-settlement-operations-view`
- `edge-api-gateway`
- `infra-ev-dashboard-platform`

#### Gateway scope

- `/api/settlement-registry/*`
- `/api/settlements/*`
- `/api/settlement-ops/*`

#### Why fifth

- settlement 는 organization, drivers, dispatch inputs, delivery record, attendance 를 모두 전제로 한다.
- 현재 repo boundary도 registry / payroll / ops view 로 이미 분리되어 있으므로, earlier slices 위에 올리는 것이 안전하다.

#### Success criteria

- Settlement criteria / inputs / runs / results / overview 화면 smoke 성공
- registry / payroll / read model 3축 boundary 유지

### Slice 6. Support Surface

#### Repos

- `service-region-registry`
- `service-region-analytics`
- `service-announcement-registry`
- `service-support-registry`
- `service-notification-hub`
- `edge-api-gateway`
- `infra-ev-dashboard-platform`

#### Gateway scope

- `/api/regions/*`
- `/api/region-analytics/*`
- `/api/announcements/*`
- `/api/ticket/*`
- `/api/notifications/*`

#### Why sixth

- 운영 보조 surface 이지만 핵심 entry slice 이후 독립적으로 붙이기 좋다.
- 앞선 핵심 write-side/dispatch/settlement 흐름을 막지 않는다.

#### Success criteria

- Regions / Announcements / Support / Notifications 화면 smoke 성공

### Slice 7. Terminal And Telemetry

#### Repos

- `service-terminal-registry`
- `service-telemetry-hub`
- `service-telemetry-dead-letter`
- `service-telemetry-listener`
- `edge-api-gateway`
- `infra-ev-dashboard-platform`

#### Gateway scope

- `/api/terminals/*`
- `/api/telemetry/*`
- `/api/telemetry-dead-letters/*`
- internal-only telemetry listener

#### Why last

- telemetry 는 ingress worker, state, read/admin surface가 같이 얽혀 있다.
- 단말/장치와 telemetry 는 다른 운영 slice보다 runtime 특성이 다르고, MQTT listener 까지 포함돼 smoke 설계가 더 복잡하다.
- 앞선 업무 surface보다 later-phase risk 가 더 높다.

#### Success criteria

- terminal CRUD smoke 성공
- telemetry ingest/health/admin read smoke 성공
- dead-letter path 와 internal listener contract 확인

## Migration Rules

모든 slice는 아래 규칙을 따른다.

1. 한 번에 한 slice만 deploy 한다.
2. 각 slice는 명시적 image URI 로만 deploy 한다.
3. gateway upstream 이름은 current runtime inventory 와 동일하게 유지한다.
4. route 공개 전에는 target group health 와 public smoke 둘 다 확인한다.
5. slice가 성공하면 root `lesson.md` 와 대상 repo `lesson.md` 를 즉시 갱신한다.
6. 이전 EC2 path 는 해당 slice의 ECS smoke 가 끝나기 전에는 제거하지 않는다.

## Out Of Scope

이 문서 범위 밖은 아래다.

- full-system one-shot migration
- current `clever-deploy-control` 폐기 시점 확정
- prod/stage 전체 rollout 일정
- telemetry timeseries storage 재설계
- cross-service schema redesign

## Done Condition For The Roadmap

아래가 되면 이 순차 roadmap 이 완료된 것으로 본다.

1. Slice 1 ~ 7이 모두 dev에서 external smoke 를 통과한다.
2. old EC2 path 의 대응 route 의존성이 제거된다.
3. `edge-api-gateway` 가 기대하는 backend short names 가 모두 ECS service discovery 로 충족된다.
4. lesson 과 rollout docs 가 최종 runtime truth 와 일치한다.
