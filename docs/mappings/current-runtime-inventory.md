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
| `front-web-console` | `web-console` | `/` | `active runtime` | 권한 기반 단일 웹 콘솔 |
| `service-account-access` | `account-auth-api` | `/api/auth/` | `active runtime` | 계정, 로그인, 토큰, 접근 제어 |
| `service-organization-registry` | `organization-master-api` | `/api/org/` | `active runtime` | 회사와 플릿 마스터 |
| `service-driver-profile` | `driver-profile-api` | `/api/drivers/` | `active runtime` | 기사 기본 프로필 정본 |
| `service-personnel-document-registry` | `personnel-document-registry-api` | `/api/personnel-documents/` | `active runtime` | 기사 인사문서 메타데이터 정본 |
| `service-attendance-registry` | `attendance-registry-api` | `/api/attendance/` | `active runtime` | 기사 x 일자 근태 truth와 dispatch-derived signal 해석 |
| `service-delivery-record` | `delivery-record-api` | `/api/delivery-record/` | `active runtime` | 배송 원천 기록과 일별 집계 입력 snapshot 정본 |
| `service-settlement-payroll` | `settlement-payroll-api` | `/api/settlements/` | `active runtime` | 정산 결과 write owner |
| `service-settlement-registry` | `settlement-registry-api` | `/api/settlement-registry/` | `active runtime` | 전역 정산 설정, 회사·플릿 단가표, 남아 있는 정책 호환 surface |
| `service-settlement-operations-view` | `settlement-ops-api` | `/api/settlement-ops/` | `active runtime` | 정산 read-only operations view |
| `service-driver-operations-view` | `driver-ops-api` | `/api/driver-ops/` | `active runtime` | 기사 운영 summary query |
| `service-vehicle-registry` | `vehicle-asset-api` | `/api/vehicles/` | `active runtime` | 차량 자산 정본 |
| `service-vehicle-assignment` | `driver-vehicle-assignment-api` | `/api/driver-vehicle-assignments/` | `active runtime` | 기사-차량 배정 정본 |
| `service-vehicle-operations-view` | `vehicle-ops-api` | `/api/vehicle-ops/` | `active runtime` | 차량 운영 조회 read model |
| `service-dispatch-registry` | `dispatch-registry-api` | `/api/dispatch/` | `active runtime` | 배차 계획 정본 |
| `service-dispatch-operations-view` | `dispatch-ops-api` | `/api/dispatch-ops/` | `active runtime` | 배차 운영 상황판 read model |
| `service-region-registry` | `region-registry-api` | `/api/regions/` | `active runtime` | 권역 기준 마스터와 polygon/difficulty registry |
| `service-region-analytics` | `region-analytics-api` | `/api/region-analytics/` | `active runtime` | 권역 일별 통계와 성과 요약 snapshot |
| `service-announcement-registry` | `announcement-registry-api` | `/api/announcements/` | `active runtime` | 공지 게시 정본과 publish/exposure registry |
| `service-support-registry` | `support-registry-api` | `/api/ticket/` | `active runtime` | 문의, 티켓, 응답, 처리 상태 정본 |
| `service-notification-hub` | `notification-hub-api` | `/api/notifications/` | `active runtime` | 푸시 토큰, 발송 로그, 일반 알림함 채널 |
| `service-terminal-registry` | `terminal-registry-api` | `/api/terminals/` | `active runtime` | 단말 자산과 설치 관계 정본 |
| `service-telemetry-hub` | `telemetry-hub-api` | `/api/telemetry/` | `active runtime` | raw ingest, latest snapshot, diagnostics |
| `service-telemetry-dead-letter` | `telemetry-dead-letter-api` | `/api/telemetry-dead-letters/` | `active runtime` | 실패 텔레메트리 append-only 저장과 admin read |
| `service-telemetry-listener` | `telemetry-listener` | internal-only | `runtime-ready, desired=0` | MQTT subscribe와 hub forward만 담당하는 worker. broker 확정 전까지 prod 비활성 |

## Active Runtime Control Plane Repos

- `runtime-prod-release`
  - active prod runtime rollout control plane
  - current minimal path:
    - release intent resolution
    - resolved rollout plan
    - GitHub OIDC auth
    - SSM dispatch to `tag:CleverHostGroup=evdash-msa`
- `runtime-prod-platform`
  - active prod runtime shape and canonical inventory owner
  - current canonical shape:
    - one EC2 host `EVDash-msa`
    - one host group `evdash-msa`
    - one attached EBS mounted at `/data`
    - host-local PostgreSQL and Redis

배포 구조 요약 다이어그램은 [prod-runtime-deployment-diagram.md](prod-runtime-deployment-diagram.md) 를 기준으로 본다.

## Notes

1. runtime naming truth는 repo 이름이 아니라 현재 compose service와 gateway prefix까지 같이 본다.
2. naming drift나 route 변경이 생기면 historical rollout plan을 소급 수정하는 대신 이 문서와 current living docs를 먼저 갱신한다.
3. seed-runner, broker helper, DB 컨테이너 같은 local support component는 root `development/` whitelist 바깥에서 관리한다. 위 표의 target repo inventory에는 넣지 않는다.
4. public entry slice는 planned slices 기준의 external production proof를 마쳤다. 예외는 internal worker `service-telemetry-listener` 뿐이며, 이 서비스는 broker 확인 전까지 `desired=0` 으로 유지한다.
5. 운영 절차는 rollout note보다 runbook 기준으로 본다.
   - prod 전 gate: [../runbooks/ev-dashboard-preprod-release-gate.md](../runbooks/ev-dashboard-preprod-release-gate.md)
   - deploy 전: [../runbooks/ev-dashboard-ecs-preflight-gate.md](../runbooks/ev-dashboard-ecs-preflight-gate.md)
   - deploy 중: [../runbooks/ev-dashboard-ecs-deploy-operator-loop.md](../runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
   - deploy 후: [../runbooks/ev-dashboard-ui-smoke-and-decommission.md](../runbooks/ev-dashboard-ui-smoke-and-decommission.md)
6. prod runtime reset target은 `runtime-prod-platform -> EVDash-msa(/data) -> runtime-prod-release` 이다. 기존 bridge/legacy deploy lane은 이 reset의 canonical source가 아니다.
7. legacy bridge reference는 historical evidence only 로 취급한다.
