# Service Repo Template Audit Matrix

이 문서는 service repo template baseline에 대해 현재 repo들이 어디까지 맞춰져 있는지 보는 living matrix다.

기준 설계:
- [2026-04-15-service-repo-template-baseline-design.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-15-service-repo-template-baseline-design.md)
- [2026-04-15-service-repo-template-rollout-implementation-plan.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/plans/2026-04-15-service-repo-template-rollout-implementation-plan.md)

상태 표기:
- `yes`: baseline 충족
- `partial`: 파일은 있지만 섹션/내용 정렬이 더 필요
- `no`: baseline 부재
- `n/a`: 해당 archetype에는 비적용

## Batch 1

| Repo | Archetype | `.gitignore` | `README.md` baseline | `lesson.md` | `Dockerfile` | Build workflow | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `front-web-console` | frontend | `yes` | `yes` | `yes` | `yes` | `yes` | README에 runtime, remote proxy safety, build workflow, verification command surface를 명시함 |
| `edge-api-gateway` | gateway | `yes` | `yes` | `yes` | `yes` | `yes` | README에 route ownership, ECS image contract, unittest entrypoints를 명시함 |
| `service-account-access` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README에 auth/docs/admin runtime contract, env note, verification commands를 명시함 |
| `integration-local-stack` | orchestration | `yes` | `yes` | `yes` | `n/a` | `n/a` | README 상단에 orchestration baseline sections를 추가하고 local/deploy boundary를 명시함 |

## Batch 2 Candidates

| Repo | Archetype | `.gitignore` | `README.md` baseline | `lesson.md` | `Dockerfile` | Build workflow | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `service-organization-registry` | django service | `yes` | `partial` | `yes` | `yes` | `yes` | Batch 2 write/registry group 시작점으로 적합 |
| `service-driver-profile` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-personnel-document-registry` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-attendance-registry` | django service | `yes` | `partial` | `yes` | `yes` | `yes` | README section baseline 재정렬 필요 |
| `service-delivery-record` | django service | `yes` | `partial` | `yes` | `yes` | `yes` | README section baseline 재정렬 필요 |
| `service-settlement-payroll` | django service | `yes` | `partial` | `yes` | `yes` | `yes` | settlement write owner archetype |
| `service-settlement-registry` | django service | `yes` | `partial` | `yes` | `yes` | `yes` | registry archetype |
| `service-vehicle-registry` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-vehicle-assignment` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-dispatch-registry` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-region-registry` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-announcement-registry` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-support-registry` | django service | `yes` | `partial` | `no` | `yes` | `yes` | `lesson.md` baseline 미추가 |
| `service-terminal-registry` | django service | `yes` | `partial` | `yes` | `yes` | `yes` | terminal/asset registry special notes 가능성 있음 |

## Batch 3 Candidates

| Repo | Archetype | `.gitignore` | `README.md` baseline | `lesson.md` | `Dockerfile` | Build workflow | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `service-settlement-operations-view` | read-model service | `yes` | `partial` | `yes` | `yes` | `yes` | read-model baseline에 맞춘 section 정렬 필요 |
| `service-driver-operations-view` | read-model service | `yes` | `partial` | `yes` | `yes` | `yes` | read-model baseline에 맞춘 section 정렬 필요 |
| `service-vehicle-operations-view` | read-model service | `yes` | `partial` | `yes` | `yes` | `yes` | read-model baseline에 맞춘 section 정렬 필요 |
| `service-dispatch-operations-view` | read-model service | `yes` | `partial` | `yes` | `yes` | `yes` | read-model baseline에 맞춘 section 정렬 필요 |
| `service-region-analytics` | read-model service | `yes` | `partial` | `no` | `yes` | `yes` | analytics read service, `lesson.md` baseline 미추가 |

## Batch 4 Candidates

| Repo | Archetype | `.gitignore` | `README.md` baseline | `lesson.md` | `Dockerfile` | Build workflow | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `service-notification-hub` | special runtime | `yes` | `partial` | `no` | `yes` | `yes` | channel/logging 특성 때문에 별도 guidance 필요 가능 |
| `service-telemetry-hub` | special runtime | `yes` | `partial` | `yes` | `yes` | `yes` | ingest/snapshot runtime |
| `service-telemetry-dead-letter` | special runtime | `yes` | `partial` | `yes` | `yes` | `yes` | dead-letter runtime |
| `service-telemetry-listener` | special runtime | `yes` | `partial` | `yes` | `yes` | `yes` | internal worker, public route 없음 |

## Rollout Rule

1. 이 matrix는 batch rollout 중에 계속 갱신한다.
2. business-internal folder tree는 이 표에서 평가하지 않는다.
3. 이 표는 deploy-facing repo surface만 다룬다.
