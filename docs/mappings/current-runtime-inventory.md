# Current Runtime Inventory

이 문서는 현재 active runtime repo, compose service, gateway prefix를 한 번에 보는 living inventory다.

질문이 아래와 같다면 historical rollout plan보다 이 문서를 먼저 본다.

1. 지금 실제로 떠 있는 service repo는 무엇인가
2. compose service 이름은 무엇인가
3. gateway prefix는 무엇인가
4. 아직 empty shell인 repo는 무엇인가

## Active Runtime Repos

| Target repo | Compose service | Gateway prefix | Status | Role summary |
| --- | --- | --- | --- | --- |
| `edge-api-gateway` | `gateway` | external entrypoint | `active runtime` | front와 backend API를 하나의 edge에서 라우팅한다 |
| `front-operator-console` | `front` | `/` | `active runtime` | 운영자 메인 UI |
| `front-admin-console` | `admin-front` | `/admin/` | `active runtime` | 관리자 UI |
| `service-account-access` | `account-auth-api` | `/api/auth/` | `active runtime` | 계정, 로그인, 토큰, 접근 제어 |
| `service-organization-registry` | `organization-master-api` | `/api/org/` | `active runtime` | 회사와 플릿 마스터 |
| `service-driver-profile` | `driver-profile-api` | `/api/drivers/` | `active runtime` | 기사 기본 프로필 정본 |
| `service-delivery-record` | `delivery-record-api` | `/api/delivery-record/` | `active runtime` | 배송 원천 기록과 일별 집계 입력 snapshot 정본 |
| `service-settlement-payroll` | `settlement-payroll-api` | `/api/settlements/` | `active runtime` | 정산 결과 write owner |
| `service-settlement-registry` | `settlement-registry-api` | `/api/settlement-registry/` | `active runtime` | 정산 정책, 버전, assignment registry |
| `service-settlement-operations-view` | `settlement-ops-api` | `/api/settlement-ops/` | `active runtime` | 정산 read-only operations view |
| `service-driver-operations-view` | `driver-ops-api` | `/api/driver-ops/` | `active runtime` | 기사 운영 summary query |
| `service-vehicle-registry` | `vehicle-asset-api` | `/api/vehicles/` | `active runtime` | 차량 자산 정본 |
| `service-vehicle-assignment` | `driver-vehicle-assignment-api` | `/api/driver-vehicle-assignments/` | `active runtime` | 기사-차량 배정 정본 |
| `service-vehicle-operations-view` | `vehicle-ops-api` | `/api/vehicle-ops/` | `active runtime` | 차량 운영 조회 read model |
| `service-dispatch-registry` | `dispatch-registry-api` | `/api/dispatch/` | `active runtime` | 배차 계획 정본 |
| `service-dispatch-operations-view` | `dispatch-ops-api` | `/api/dispatch-ops/` | `active runtime` | 배차 운영 상황판 read model |
| `service-terminal-registry` | `terminal-registry-api` | `/api/terminals/` | `active runtime` | 단말 자산과 설치 관계 정본 |
| `service-telemetry-hub` | `telemetry-hub-api` | `/api/telemetry/` | `active runtime` | raw ingest, latest snapshot, diagnostics |
| `service-telemetry-dead-letter` | `telemetry-dead-letter-api` | `/api/telemetry-dead-letters/` | `active runtime` | 실패 텔레메트리 append-only 저장과 admin read |
| `service-telemetry-listener` | `telemetry-listener` | internal-only | `active runtime` | MQTT subscribe와 hub forward만 담당하는 worker |

## Current Empty Shell Repos

| Target repo | Compose service | Gateway prefix | Status | Role summary |
| --- | --- | --- | --- | --- |
| `service-personnel-document-registry` | none | none | `empty shell` | 계약, 증빙, 계좌, 소속 문서 정본 |
| `service-region-registry` | none | none | `empty shell` | 권역 기준 마스터 |
| `service-region-analytics` | none | none | `empty shell` | 권역별 통계와 성과 분석 |
| `service-notification-hub` | none | none | `empty shell` | 푸시 발송과 일반 알림함 |
| `service-announcement-registry` | none | none | `empty shell` | 공지 게시 정본 |
| `service-support-registry` | none | none | `empty shell` | 문의와 티켓 정본 |

## Notes

1. runtime naming truth는 repo 이름이 아니라 현재 compose service와 gateway prefix까지 같이 본다.
2. naming drift나 route 변경이 생기면 historical rollout plan을 소급 수정하는 대신 이 문서와 current living docs를 먼저 갱신한다.
3. `integration-local-stack`, `seed-runner`, `mqtt-broker`, DB 컨테이너는 local stack support component이며 위 표의 target repo inventory에는 넣지 않는다.
