# Repo Responsibility Matrix

이 문서는 `development/` 아래 target repo가 무엇을 소유하고, 무엇을 소유하지 않는지 빠르게 확인하기 위한 매트릭스다.

규칙:
- repo 이름만으로 부족한 경계를 여기서 보강한다.
- 구현 세부는 각 repo README에 둘 수 있지만, 경계 정본은 이 문서가 우선이다.

## Matrix

| Target repo | Owns | Does not own | Depends on |
| --- | --- | --- | --- |
| `integration-local-stack` | compose, local env examples, smoke scripts, seed orchestration | 도메인 모델, 서비스 내부 로직, 중앙 문서 정본 | 모든 runtime repo |
| `edge-api-gateway` | routing, reverse proxy, auth forwarding, edge profile | token 발급, 도메인 비즈니스 로직, front code | front repos, service repos |
| `front-web-console` | 권한 기반 단일 웹 콘솔 UI, CRUD 관리 화면, read/self-service 화면, API clients, page tests | gateway config, backend logic, separate operator runtime | `edge-api-gateway`, registry/assignment APIs |
| `service-organization-registry` | company, fleet registry | account, driver, assignment, settlement, gateway | `service-account-access` for auth only |
| `service-account-access` | account, credential, token, refresh, lockout, access rules | driver profile, organization, settlement policy, gateway routing | redis, auth consumers |
| `service-driver-profile` | driver basic profile, linked account reference | account credential, settlement result, vehicle assignment | `service-account-access`, `service-organization-registry` |
| `service-vehicle-registry` | `vehicle_master`, `vehicle_operator_access` | telemetry snapshot, current driver assignment, terminal registry | `service-organization-registry` |
| `service-vehicle-assignment` | operator-owned driver-to-vehicle assignment workflow | vehicle master mutation, telemetry, terminal registry | `service-driver-profile`, `service-vehicle-registry`, `service-account-access` |
| `service-vehicle-operations-view` | vehicle operations read model, composed summary | master writes, assignment writes, telemetry ingestion | `service-vehicle-registry`, `service-vehicle-assignment`, `service-telemetry-hub`, `service-organization-registry` |
| `service-driver-operations-view` | driver operations read model, composed summary | account writes, driver profile writes, settlement writes | `service-driver-profile`, `service-account-access`, `service-settlement-operations-view` |
| `service-terminal-registry` | terminal/device registry, install/link relation | telemetry ingestion, assignment workflow, vehicle master | `service-vehicle-registry` |
| `service-telemetry-hub` | raw ingest API, normalization, latest snapshot, diagnostic/fault flow | MQTT broker subscribe worker, terminal registry lifecycle, vehicle master mutation, assignment workflow | `service-terminal-registry`, `service-vehicle-registry` |
| `service-telemetry-listener` | MQTT ingress worker, topic subscribe, payload forwarding, retry/drop classification | telemetry DB writes, normalization, latest snapshot persistence, terminal/vehicle master mutation | `service-telemetry-hub`, `mqtt-broker` in `integration-local-stack` |
| `service-telemetry-dead-letter` | failed telemetry payload append-only storage, producer-key-auth internal ingest, admin read | telemetry raw/timeseries/snapshot truth, automatic replay workflow, vehicle/terminal master mutation | `service-telemetry-listener`, `service-telemetry-hub` later |
| `service-settlement-registry` | global settlement config, company/fleet pricing table, remaining settlement policy compatibility registry surface | settlement run/item writes, delivery source input, payout/result truth | `service-organization-registry`, `service-account-access` for auth only |
| `service-attendance-registry` | `기사 x 일자` attendance day truth, dispatch-derived signal resolution | dispatch plan truth, delivery raw record, settlement run/item, payout/result truth | `service-dispatch-registry` phase 1 producer, delivery/payroll consumer |
| `service-delivery-record` | source delivery record, daily aggregation input snapshot truth | settlement run/item writes, payout/result truth, attendance truth ownership, final operations view | `service-driver-profile`, `service-attendance-registry`, `service-vehicle-assignment` later |
| `service-settlement-payroll` | settlement run/item writes, deduction, incentive, payout_status, result truth | settlement policy registry, delivery source truth, attendance truth ownership, read-only operations view | `service-delivery-record`, `service-settlement-registry`, `service-attendance-registry`, `service-driver-profile` |
| `service-settlement-operations-view` | settlement result read model and operational read API | settlement run/item writes, payout/result truth, source truth ownership | `service-settlement-payroll`, `service-delivery-record` later |
| `service-dispatch-registry` | `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment`, volume plan, shift/fleet/date planning truth | current assignment truth, telemetry, terminal lifecycle | `service-driver-profile`, `service-vehicle-registry`, organization/personnel document services later |
| `service-dispatch-operations-view` | dispatch read model, planning status summary, planned-vs-current dispatch board runtime | dispatch truth writes, assignment writes, dedicated projection DB ownership | `service-dispatch-registry`, `service-vehicle-assignment`, `service-vehicle-registry`, `service-driver-profile` |
| `service-personnel-document-registry` | personnel document metadata, lifecycle, contract/proof/account/business-registration registry truth | basic driver profile truth, approval workflow truth, file binary storage truth | organization, account, driver profile later |
| `service-region-registry` | region polygon, difficulty, region master | delivery execution truth, telemetry truth, route recommendation logic, delivery tip / parking / entrance / exit | none for phase 1; analytics later |
| `service-region-analytics` | region daily statistics snapshot, region performance summary snapshot | region master writes, telemetry ingest, planning truth writes, route recommendation | region registry for phase 1; delivery/dispatch services later |
| `service-notification-hub` | token registry, push send, push logs, general inbox notifications | announcement truth, support ticket truth, approval truth | account-access and event producers later |
| `service-announcement-registry` | announcement posting truth, publish status, exposure scope | notification send channel, support workflow | account-access and notification hub later |
| `service-support-registry` | inquiry, ticket, response, handling status truth | notification channel truth, announcement posting truth | account-access and notification hub later |

## Strong Boundary Rules

### Shared Code
- shared code is forbidden by default
- if sharing becomes unavoidable, contract first, extraction later

### Cross-Service Imports
- one repo must not import another repo's application code
- integration happens through HTTP or future event contracts only

### Docs Ownership
- architecture truth lives in `docs/`
- repo-local README explains usage, not platform architecture

### Archive
- retired docs go to `docs/archive/`
- retired runtime code does not go to archive

## Immediate Practical Meaning

- 새 repo를 만들 때 먼저 이 문서에 한 줄을 추가한다.
- 한 repo가 다른 repo 역할까지 먹기 시작하면, 이 문서를 먼저 수정하고 나서 설계를 다시 본다.
- `settlement`는 이 문서에서도 4축으로 유지한다.

## Review Checklist

- repo 이름만 보고도 category가 드러나는가
- `owns`와 `does not own`가 겹치지 않는가
- read model repo가 write responsibility를 갖지 않는가
- `settlement`가 4축으로 분리되어 있는가
- `vehicle registry`가 telemetry나 assignment를 먹지 않았는가
