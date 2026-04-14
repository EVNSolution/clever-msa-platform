# CLEVER MSA Platform Repo Map

이 문서는 `clever-msa-platform/development/` 아래의 target repo와 현재 source 위치를 연결하는 플랫폼 인덱스다.

원칙:
- 사람은 이 문서만 봐도 각 repo의 역할과 현재 상태를 이해할 수 있어야 한다.
- 코드 이동 전에도 이 문서가 정본이다.
- 실제 아키텍처 설명은 `docs/`에 있고, 여기서는 repo 경계와 migration 상태를 요약한다.

## Status Legend

- `direct-move`
  - 현재 폴더를 거의 그대로 독립 repo로 옮길 수 있음
- `migrated-target`
  - target 위치로 이미 이동했고 현재는 그 위치가 active source다
- `decompose-first`
  - 현재 폴더를 바로 승격하면 안 되고 분해 후 재배치해야 함
- `empty-shell`
  - target repo 디렉토리와 README만 생성됐고 runtime 구현은 아직 없음
- `planned-target`
  - target repo 경계와 문서 위치만 먼저 고정됐고 shell/runtime은 아직 생성되지 않음
- `scaffolded-target`
  - linked child repo와 reusable scaffold는 생성됐고 local 검증도 통과했지만 real runtime cutover는 아직 시작 전임

## Representation Note

- 현재 `development/*`의 active target repo는 root에서 모두 linked child repo로 노출된다.
- 루트를 새로 clone하거나 root pull 이후 child repo pointer가 바뀌면 `git submodule update --init --recursive`를 실행한다.
- 구현 변경은 child repo에서 수행하고, root는 repo map과 platform docs를 관리한다.

## Repo Index

| Target repo | Category | Current role | Future role | Current source | Status |
| --- | --- | --- | --- | --- | --- |
| `integration-local-stack` | integration | 현재 compose, env, seed, smoke 자산을 한곳에서 관리 | 분리된 repo들을 로컬에서 묶는 통합 실행 셸 | `development/integration-local-stack/` | `migrated-target` |
| `infra-ev-dashboard-platform` | infra | `ev-dashboard.com` ECS/CDK cutover용 shared runtime infra owner | `front-web-console`, `edge-api-gateway`, `service-account-access` slice의 ALB, ECS, ACM, Route53, deploy workflow 전용 infra repo | `development/infra-ev-dashboard-platform/` | `migrated-target` |
| `infra-clever-hub-platform` | infra | 다음 canonical public surface `hub.evnlogistics.com` ECS/CDK cutover용 scaffolded infra owner | `hub.evnlogistics.com` / `candidate.hub.evnlogistics.com` shared ALB, ECS, ACM, Route53, deploy workflow 전용 infra repo | `development/infra-clever-hub-platform/` | `scaffolded-target` |
| `edge-api-gateway` | edge | gateway routing과 reverse proxy | 다중 서비스의 단일 진입 edge | `development/edge-api-gateway/` | `migrated-target` |
| `front-web-console` | front | surviving 단일 웹 콘솔 | 권한 기반 통합 웹 UI 정본 | `development/front-web-console/` | `migrated-target` |
| `service-organization-registry` | service | 회사/플릿 정본 | 조직 기준 마스터 registry | `development/service-organization-registry/` | `migrated-target` |
| `service-account-access` | service | 계정, 인증, 토큰, 접근 제어 | 계정 출입구와 접근 제어의 정본 | `development/service-account-access/` | `migrated-target` |
| `service-driver-profile` | service | 배송원 기본 프로필 정본 | 배송원 기본정보와 계정 연결 참조 | `development/service-driver-profile/` | `migrated-target` |
| `service-vehicle-registry` | service | 차량 기본 정보 bootstrap | `vehicle_master + vehicle_operator_access`를 가진 차량 registry | `development/service-vehicle-registry/` | `migrated-target` |
| `service-vehicle-assignment` | service | 운영사가 배송원을 차량에 붙이는 정본 | 배정, 해제, 이후 handover workflow의 중심축 | `development/service-vehicle-assignment/` | `migrated-target` |
| `service-vehicle-operations-view` | service | 차량 운영 조회 read model | 차량 registry, assignment, terminal, telemetry, organization을 조합하는 운영 조회 서비스 | `development/service-vehicle-operations-view/` | `migrated-target` |
| `service-driver-operations-view` | service | 배송원 운영 조회 read model | driver profile, account, settlement, assignment를 조합하는 운영 조회 서비스 | `development/service-driver-operations-view/` | `migrated-target` |
| `service-terminal-registry` | service | 단말/장치 registry와 현재 장착 관계 runtime | 단말/장치 registry와 장착 관계 정본 | `development/service-terminal-registry/` | `migrated-target` |
| `service-telemetry-hub` | service | raw ingest API, normalized timeseries, latest snapshot, latest diagnostic runtime | raw ingest, 정규화, snapshot, diagnostic 중심 축 | `development/service-telemetry-hub/` | `migrated-target` |
| `service-telemetry-listener` | service | MQTT ingress worker runtime | MQTT subscribe, payload forwarding, retry/dead-letter 확장 ingress worker | `development/service-telemetry-listener/` | `migrated-target` |
| `service-telemetry-dead-letter` | service | failed telemetry payload append-only storage와 admin read runtime | append-only dead-letter 저장, admin read, 수동 재처리 출발점 | `development/service-telemetry-dead-letter/` | `migrated-target` |
| `service-settlement-registry` | service | 전역 정산 설정, 회사·플릿 단가표, legacy 정책 호환 surface runtime | 정산 기준 registry, 전역 계산 규칙, 회사·플릿 운영 단가표 | `development/service-settlement-registry/` | `migrated-target` |
| `service-attendance-registry` | service | `기사 x 일자` 근태 truth runtime | dispatch-derived signal을 daily attendance truth로 해석하는 registry | `development/service-attendance-registry/` | `migrated-target` |
| `service-delivery-record` | service | 배송 원천 기록과 일별 집계 입력 snapshot runtime | 배송원별 원천 기록과 집계 입력 | `development/service-delivery-record/` | `migrated-target` |
| `service-settlement-payroll` | service | 정산 write owner runtime, `SettlementRun` / `SettlementItem` write | 정산 결과 write owner, `deduction` / `incentive` / `payout_status` 정본 | `development/service-settlement-payroll/` | `migrated-target` |
| `service-settlement-operations-view` | service | 정산 read-only operations-view runtime | 정산 결과와 운영 조회용 read model | `development/service-settlement-operations-view/` | `migrated-target` |
| `service-dispatch-registry` | service | `dispatch_plan`, `vehicle_schedule`, `dispatch_assignment` 1차 runtime 구현 완료 | 배차 정본, 물량 계획, 회차/플릿 기준 배차 입력 | `development/service-dispatch-registry/` | `migrated-target` |
| `service-dispatch-operations-view` | service | 배차 운영 조회 read model runtime | 배차 운영 조회와 계획 상황판 | `development/service-dispatch-operations-view/` | `migrated-target` |
| `service-personnel-document-registry` | service | 기사 인사문서 메타데이터 runtime, admin CRUD와 seed 구현 완료 | 계약/증빙/계좌/사업자/소속 문서 메타데이터 정본 | `development/service-personnel-document-registry/` | `migrated-target` |
| `service-region-registry` | service | 권역 기준 정본 runtime, polygon/difficulty CRUD와 seed 제공 | 권역 polygon, 난이도, 권역 기준 마스터 | `development/service-region-registry/` | `migrated-target` |
| `service-region-analytics` | service | 권역 일별 통계와 성과 요약 runtime, admin CRUD와 seed 제공 | 권역별 배송 통계와 권역 성과 분석 | `development/service-region-analytics/` | `migrated-target` |
| `service-notification-hub` | service | 알림 채널 runtime, token/inbox/log CRUD와 simulated send 제공 | 푸시 토큰, 발송, 발송 로그, 일반 알림함 | `development/service-notification-hub/` | `migrated-target` |
| `service-announcement-registry` | service | 공지 게시 정본 runtime, publish/exposure CRUD와 seed 제공 | 공지 게시 정본 | `development/service-announcement-registry/` | `migrated-target` |
| `service-support-registry` | service | 지원 정본 runtime, ticket/response/status CRUD와 seed 제공 | 문의, 티켓, 응답, 처리 상태 정본 | `development/service-support-registry/` | `migrated-target` |

## Boundary Notes

### `service-vehicle-registry`
- 현재는 `vehicle_master`와 `vehicle_operator_access`를 같이 둔다.
- 지금 단계에서는 둘 다 제조사 측 lifecycle에 묶여 있다고 본다.

### `service-vehicle-assignment`
- 이름은 엔티티 나열이 아니라 업무 의미 기준이다.
- 운영사가 자기 배송원을 차량에 배정하는 행위를 소유한다.

### `service-vehicle-operations-view`
- 조회 서비스이므로 다소 넓은 조합은 허용한다.
- 하지만 정본 데이터를 직접 쓰지 않는다.

### `service-driver-operations-view`
- 기존 `driver-360`의 target 이름이다.
- 배송원 운영 관점의 조합 조회에 집중한다.

### `service-dispatch-operations-view`
- 배차 계획과 현재 배정 truth를 비교하는 read-model runtime이다.
- 배차 정본 쓰기나 현재 배정 정본 쓰기를 소유하지 않는다.

### `infra-ev-dashboard-platform`
- `ev-dashboard.com` / `api.ev-dashboard.com` entry slice 전용 infra repo다.
- shared ALB, ECS services, ACM, Route53 alias, deploy workflow를 소유한다.
- app code, shared library, full-platform catch-all infra repo로 확장하지 않는다.
- 생성 시점부터 linked child repo로 등록해야 한다.

### `infra-clever-hub-platform`
- `hub.evnlogistics.com` canonical public surface 전용 planned infra repo다.
- `candidate.hub.evnlogistics.com` pre-prod gate lane도 이 repo가 소유한다.
- `front-web-console`, `edge-api-gateway`, `service-account-access` shell/auth first slice를 starting point 로 한다.
- `ev-dashboard` 와 같은 pattern 을 재사용하지만, 중앙 배포 전체를 대체하는 catch-all infra repo로 키우지 않는다.

### `service-settlement-payroll`
- 정산 결과 write owner다.
- `SettlementRun`, `SettlementItem`, `deduction`, `incentive`, `payout_status`를 소유한다.
- 정산 정책 registry와 delivery source input truth는 소유하지 않는다.

### `service-attendance-registry`
- `기사 x 일자` daily truth owner다.
- phase 1 active source는 dispatch 하나만 둔다.
- `00`은 payroll rule이 아니라 attendance 해석 규칙으로 처리한다.

### `service-telemetry-listener`
- MQTT ingress worker만 소유한다.
- telemetry DB 쓰기, 정규화, snapshot/diagnostic 저장은 `service-telemetry-hub`에 남긴다.

### `service-telemetry-dead-letter`
- listener와 hub의 실패 payload 보관 경계다.
- append-only 저장, internal write, admin read만 가진다.
- 자동 replay/status workflow는 아직 들이지 않는다.

### settlement 4축
- `service-attendance-registry`는 settlement 바깥의 upstream truth다.
- `service-settlement-registry`는 규칙과 기준만 소유한다.
- `service-delivery-record`는 source input만 소유한다.
- `service-settlement-payroll`는 result write owner다.
- `service-settlement-operations-view`는 read-only view다.
- 하나의 settlement repo 이름으로 다시 합치지 않는다.

## Docs Of Truth

아래 문서 군을 함께 봐야 이 repo map이 완전해진다.

- `docs/mappings/`
  - 현재 폴더와 target repo의 이동 근거
- `docs/mappings/current-runtime-inventory.md`
  - 현재 active runtime repo, compose service, gateway prefix 정본
- `docs/boundaries/`
  - 각 서비스가 무엇을 소유하는지
- `docs/contracts/`
  - cross-service ID, 상태, read model contract
- `docs/rollout/`
  - living rollout docs와 active plan only 영역
- `docs/decisions/specs/2026-03-23-additional-business-domain-units-design.md`
  - active repo set 바깥에서 추가 계획 중인 큰 업무 단위
- `docs/decisions/specs/2026-03-23-planned-business-domain-skeleton-targets-design.md`
  - 추가 큰 업무 단위를 planned target repo 이름으로 내린 문서

## Repo-Local AGENTS Policy

- repo-local `AGENTS.md`는 모든 repo에 복제하지 않는다.
- 현재 유지 대상은 플랫폼 루트, `integration-local-stack`, `edge-api-gateway`만이다.
- 나머지 repo는 `README`와 `docs/` 정본으로 관리한다.
- 새 repo-local `AGENTS.md`는 경계 오염 위험이 높거나 접착 역할이 큰 repo에만 추가한다.

## Migration Priorities

1. `docs/`를 source of truth로 먼저 고정
2. `integration-local-stack` 분리 완료
3. `edge-api-gateway`, `front-web-console` 분리 완료
4. direct-move service repo 분리
   - `service-organization-registry` 이동 완료
   - `service-account-access` 이동 완료
   - `service-driver-profile` 이동 완료
   - `service-vehicle-registry` 이동 완료
   - `service-vehicle-assignment` 이동 완료
   - `service-vehicle-operations-view` 이동 완료
   - `service-driver-operations-view` 이동 완료
5. settlement 분해
   - `service-settlement-payroll` runtime 구현 완료, target repo 활성화 완료
   - `service-settlement-operations-view` read-only runtime으로 target repo 활성화 완료
   - `service-settlement-registry` runtime 구현 완료, target repo 활성화 완료
   - `service-delivery-record` runtime 구현 완료, target repo 활성화 완료
6. future/runtime repo 기동
   - `service-dispatch-registry` runtime 구현 완료, target repo 활성화 완료
   - `service-dispatch-operations-view` runtime 구현 완료, target repo 활성화 완료
   - `service-region-registry` runtime 구현 완료, target repo 활성화 완료
   - `service-region-analytics` runtime 구현 완료, target repo 활성화 완료
   - `service-notification-hub` runtime 구현 완료, target repo 활성화 완료
   - `service-announcement-registry` runtime 구현 완료, target repo 활성화 완료
   - `service-support-registry` runtime 구현 완료, target repo 활성화 완료
   - `service-terminal-registry` runtime 구현 완료, target repo 활성화 완료
   - `service-telemetry-hub` runtime 구현 완료, target repo 활성화 완료
   - `service-telemetry-listener` runtime 구현 완료, target repo 활성화 완료
   - `service-telemetry-dead-letter` runtime 구현 완료, target repo 활성화 완료

## Archive Rule

이 문서에서 빠진 과거 문서는 `docs/archive/`로 보낸다.

- `superseded`
  - 새 정본으로 대체됨
- `historical`
  - 지금은 안 쓰지만 이력상 보존
- `rejected`
  - 검토 후 버린 구조안

archive는 문서 전용이고, repo 후보나 runtime 코드를 보관하는 장소가 아니다.

추가 규칙:

1. `docs/rollout/plans/`는 active plan only다.
2. 완료된 implementation plan, checklist, handoff는 `docs/archive/historical/rollout/`로 이동한다.
3. current runtime naming과 route truth는 archived rollout plan이 아니라 `docs/mappings/current-runtime-inventory.md`에서 확인한다.

## Governance Note (2026-04-09)

- Every repo listed under `development/` is an independent implementation repo.
- The root `clever-msa-platform` workspace is the umbrella GitHub view for those repos, while runtime implementation ownership remains in each child repo.
- Root-level platform work should keep `development/*` repo visibility consistent and should not create selective exclusions for a single child repo.
- Active child repos are now consistently represented as linked child repos from the root.
