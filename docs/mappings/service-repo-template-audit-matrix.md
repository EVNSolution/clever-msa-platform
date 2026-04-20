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

Build workflow baseline:
- image-owning repo의 `build-image.yml` 은 `role-to-assume: ${{ vars.ECR_BUILD_AWS_ROLE_ARN }}` 를 사용한다.
- shared region input은 `AWS_REGION` 으로 유지한다.
- active build workflow에 `GH_ACTIONS_ECR_BUILD_ROLE_ARN` 는 남기지 않는다.

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
| `service-organization-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README를 boundary/runtime/proof 기준으로 재정렬 |
| `service-driver-profile` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-personnel-document-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-attendance-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | dispatch-input slice proof 경로까지 README에 반영 |
| `service-delivery-record` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | delivery snapshot truth와 honest smoke 경로를 README에 반영 |
| `service-settlement-payroll` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | write-owner proof 규칙과 upstream contract를 baseline에 정렬 |
| `service-settlement-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | registry-only proof rule을 README에 반영 |
| `service-vehicle-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-vehicle-assignment` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-dispatch-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-region-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-announcement-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-support-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |
| `service-terminal-registry` | django service | `yes` | `yes` | `yes` | `yes` | `yes` | terminal registry proof를 telemetry proof와 분리해 명시 |

## Batch 3 Candidates

| Repo | Archetype | `.gitignore` | `README.md` baseline | `lesson.md` | `Dockerfile` | Build workflow | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `service-settlement-operations-view` | read-model service | `yes` | `yes` | `yes` | `yes` | `yes` | read-only fan-out boundary와 honest proof를 README에 반영 |
| `service-driver-operations-view` | read-model service | `yes` | `yes` | `yes` | `yes` | `yes` | upstream 404 preservation rule과 read-only contract를 README에 반영 |
| `service-vehicle-operations-view` | read-model service | `yes` | `yes` | `yes` | `yes` | `yes` | optional telemetry/terminal bridge rule을 README에 반영 |
| `service-dispatch-operations-view` | read-model service | `yes` | `yes` | `yes` | `yes` | `yes` | empty board/summary success semantics를 README에 반영 |
| `service-region-analytics` | read-model service | `yes` | `yes` | `yes` | `yes` | `yes` | README 정렬과 `lesson.md` baseline 추가 |

## Batch 4 Candidates

| Repo | Archetype | `.gitignore` | `README.md` baseline | `lesson.md` | `Dockerfile` | Build workflow | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `service-notification-hub` | special runtime | `yes` | `yes` | `yes` | `yes` | `yes` | inbox/log boundary와 honest proof를 README/lesson에 반영 |
| `service-telemetry-hub` | special runtime | `yes` | `yes` | `yes` | `yes` | `yes` | ingest hub proof와 listener boundary를 README에 반영 |
| `service-telemetry-dead-letter` | special runtime | `yes` | `yes` | `yes` | `yes` | `yes` | `7a` admin surface라는 점과 honest proof를 README에 반영 |
| `service-telemetry-listener` | special runtime | `yes` | `yes` | `yes` | `yes` | `yes` | worker-only runtime, no public route, `desired=0` default를 README에 반영 |

## Rollout Rule

1. 이 matrix는 batch rollout 중에 계속 갱신한다.
2. business-internal folder tree는 이 표에서 평가하지 않는다.
3. 이 표는 deploy-facing repo surface만 다룬다.
