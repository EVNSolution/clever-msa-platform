# Current To Target Repo Map

이 문서는 현재 `MSA-Server` 혼합 구조에서 `clever-msa-platform` 목표 구조로 이동할 때의 정본 매핑표다.

읽는 법:
- `current source`는 지금 실제로 존재하는 경로다.
- `target destination`은 새 플랫폼 안의 목표 위치다.
- `migration mode`는 어떻게 옮겨야 하는지를 뜻한다.

## Migration Modes

- `direct-move`
  - 거의 그대로 독립 repo나 새 docs 위치로 옮길 수 있다.
- `copy-then-retire`
  - 먼저 새 정본 위치로 복사하고, 기존 위치는 legacy로 남긴 뒤 나중에 retire한다.
- `decompose-first`
  - 현재 경로를 그대로 승격하지 말고, 분해 후 여러 target으로 재배치해야 한다.
- `empty-shell`
  - target repo 디렉토리와 README는 생성됐고 runtime 구현은 아직 없다.
- `planned-target`
  - target repo 경계와 문서 위치만 먼저 고정했고 shell/runtime 생성은 후속이다.

## Runtime And Integration Map

| Current source | Target destination | Type | Migration mode | Note |
| --- | --- | --- | --- | --- |
| `gateway/` | `development/edge-api-gateway/` | runtime repo | `direct-move` | gateway route와 proxy 규칙만 소유 |
| `front/` | `development/front-operator-console/` | runtime repo | `direct-move` | 운영자/현장 front |
| `admin-front/` | `development/front-admin-console/` | runtime repo | `direct-move` | 관리자 front |
| `services/organization-master/` | `development/service-organization-registry/` | runtime repo | `direct-move` | 이동 완료, 현재 active source는 target repo |
| `services/account-auth/` | `development/service-account-access/` | runtime repo | `direct-move` | 이동 완료, 현재 active source는 target repo |
| `services/driver-profile/` | `development/service-driver-profile/` | runtime repo | `direct-move` | 이동 완료, 현재 active source는 target repo |
| `services/vehicle-asset/` | `development/service-vehicle-registry/` | runtime repo | `direct-move` | 이동 완료, 현재 active source는 target repo |
| `services/driver-vehicle-assignment/` | `development/service-vehicle-assignment/` | runtime repo | `direct-move` | 이동 완료, 현재 active source는 target repo |
| `services/vehicle-ops/` | `development/service-vehicle-operations-view/` | runtime repo | `direct-move` | 이동 완료, 현재 active source는 target repo |
| `services/driver-360/` | `development/service-driver-operations-view/` | runtime repo | `direct-move` | 이동 완료, 현재 active source는 target repo |
| `compose/` | `development/integration-local-stack/compose/` | integration repo | `direct-move` | 로컬 compose 자산 |
| `infra/` | `development/integration-local-stack/infra/` | integration repo | `direct-move` | 로컬 env, Docker 보조 자산 |
| `docker-compose.account-driver-settlement.yml` | `development/integration-local-stack/docker-compose.account-driver-settlement.yml` | integration repo | `direct-move` | 로컬 통합 실행 진입점 |
| `services/settlement/` | `development/service-settlement-registry/` | runtime repo | `decompose-first` | phase 1 registry runtime 구현 완료, 현재 active source는 target repo |
| `services/settlement/` | `development/service-delivery-record/` | runtime repo | `decompose-first` | empty shell 생성 완료, runtime 분해는 후속 |
| `services/settlement/` | `development/service-settlement-payroll/` | runtime repo | `decompose-first` | phase 2 write owner split, `SettlementRun` / `SettlementItem` ownership 이동 |
| `services/settlement/` | `development/service-settlement-operations-view/` | runtime repo | `decompose-first` | 이동 완료, 현재 active source는 target repo |
| 없음 | `development/service-terminal-registry/` | runtime repo | `direct-move` | target repo가 active runtime source이며 terminal registry 구현 완료 |
| 없음 | `development/service-telemetry-hub/` | runtime repo | `direct-move` | target repo가 active runtime source이며 telemetry hub 구현 완료 |
| 없음 | `development/service-telemetry-listener/` | runtime repo | `direct-move` | target repo가 active runtime source이며 MQTT ingress worker만 소유 |
| 없음 | `development/service-telemetry-dead-letter/` | runtime repo | `direct-move` | target repo가 active runtime source이며 dead-letter phase 1 구현 완료 |
| 없음 | `development/service-dispatch-registry/` | runtime repo | `direct-move` | target repo가 active runtime source이며 dispatch registry 1차 구현 완료 |
| 없음 | `development/service-dispatch-operations-view/` | runtime repo | `direct-move` | target repo가 active runtime source이며 dispatch operations view 1차 구현 완료 |
| 없음 | `development/service-personnel-document-registry/` | runtime repo | `empty-shell` | shell 디렉토리와 README 생성 완료, runtime은 후속 |
| 없음 | `development/service-region-registry/` | runtime repo | `empty-shell` | shell 디렉토리와 README 생성 완료, runtime은 후속 |
| 없음 | `development/service-region-analytics/` | runtime repo | `empty-shell` | shell 디렉토리와 README 생성 완료, runtime은 후속 |
| 없음 | `development/service-notification-hub/` | runtime repo | `empty-shell` | shell 디렉토리와 README 생성 완료, runtime은 후속 |
| 없음 | `development/service-announcement-registry/` | runtime repo | `empty-shell` | shell 디렉토리와 README 생성 완료, runtime은 후속 |
| 없음 | `development/service-support-registry/` | runtime repo | `empty-shell` | shell 디렉토리와 README 생성 완료, runtime은 후속 |

## Docs Map

| Current source | Target destination | Type | Migration mode | Note |
| --- | --- | --- | --- | --- |
| `goal/01-target-system-fragmentation-map.md` | `docs/goals/01-target-system-fragmentation-map.md` | docs | `copy-then-retire` | 상위 목표 문서 |
| `goal/02-target-service-structure-and-join-risk-map.md` | `docs/boundaries/02-target-service-structure-and-join-risk-map.md` | docs | `copy-then-retire` | 경계 및 join risk |
| `goal/03-roadmap.md` | `docs/rollout/03-roadmap.md` | docs | `copy-then-retire` | 단계별 실행 방향 |
| `goal/04-driver-360-read-model.md` | `docs/contracts/04-driver-360-read-model.md` | docs | `copy-then-retire` | read model contract |
| `goal/05-vehicle-ops-read-model.md` | `docs/contracts/05-vehicle-ops-read-model.md` | docs | `copy-then-retire` | read model contract |
| `goal/06-id-and-state-dictionary.md` | `docs/contracts/06-id-and-state-dictionary.md` | docs | `copy-then-retire` | ID/state contract |
| `goal/07-legacy-api-mapping.md` | `docs/mappings/07-legacy-api-mapping.md` | docs | `copy-then-retire` | legacy API map |
| `goal/08-rollout-order.md` | `docs/rollout/08-rollout-order.md` | docs | `copy-then-retire` | rollout sequence |
| `goal/09-integration-rules.md` | `docs/contracts/09-integration-rules.md` | docs | `copy-then-retire` | cross-service integration rules |
| `goal/10-target-account-auth-layer-plan.md` | `docs/decisions/10-target-account-auth-layer-plan.md` | docs | `copy-then-retire` | account/auth decision note |
| `goal/11-account-driver-settlement-boundary-map.md` | `docs/boundaries/11-account-driver-settlement-boundary-map.md` | docs | `copy-then-retire` | domain boundary note |
| `goal/12-account-driver-settlement-owned-data-matrix.md` | `docs/boundaries/12-account-driver-settlement-owned-data-matrix.md` | docs | `copy-then-retire` | owned-data truth |
| `goal/13-account-driver-settlement-compose-simulation.md` | `docs/rollout/13-account-driver-settlement-compose-simulation.md` | docs | `copy-then-retire` | local simulation guide |
| `reference/01-current-api-inventory-and-overlap.md` | `docs/mappings/01-current-api-inventory-and-overlap.md` | docs | `copy-then-retire` | current API inventory |
| `reference/02-current-api-consumer-reference.md` | `docs/mappings/02-current-api-consumer-reference.md` | docs | `copy-then-retire` | consumer impact map |
| `reference/03-account-driver-settlement-legacy-cut-map.md` | `docs/mappings/03-account-driver-settlement-legacy-cut-map.md` | docs | `copy-then-retire` | legacy cut guidance |
| `reference/04-account-driver-settlement-source-index.md` | `docs/mappings/04-account-driver-settlement-source-index.md` | docs | `copy-then-retire` | source index |
| `reference/05-ev-dashboard-server-domain-extraction-notes.md` | `docs/decisions/05-ev-dashboard-server-domain-extraction-notes.md` | docs | `copy-then-retire` | legacy 해체 근거 |
| `reference/06-settlement-process-note.md` | `docs/decisions/06-settlement-process-note.md` | docs | `copy-then-retire` | settlement process note |
| `reference/07-vehicle-terminal-telemetry-assignment-legacy-split.md` | `docs/decisions/07-vehicle-terminal-telemetry-assignment-legacy-split.md` | docs | `copy-then-retire` | vehicle/terminal/telemetry split rationale |
| `docs/superpowers/specs/*.md` | `docs/decisions/specs/` | docs | `copy-then-retire` | validated design specs |
| `docs/superpowers/plans/*.md` | `docs/rollout/plans/` | docs | `copy-then-retire` | implementation and migration plans |

## First Migration Order

1. `docs/` 정본 복사
2. `integration-local-stack` 분리
3. direct-move runtime repo 분리
4. `settlement` 분해 후 재배치
5. `service-terminal-registry` runtime 승격
6. `service-telemetry-hub` runtime 승격
7. `service-telemetry-listener` runtime 승격
8. `service-telemetry-dead-letter` shell 생성 및 phase 1 구현
9. old `MSA-Server`를 legacy workspace로 표시

## Guardrails

- `services/settlement/`를 단일 repo로 승격하지 않는다.
- `service-vehicle-registry`는 현재 `vehicle_master + vehicle_operator_access`를 같이 가진다.
- `docs/archive/`는 문서 전용이다.
- old 경로는 새 정본이 안정화될 때까지 유지하되, active truth로 간주하지 않는다.
