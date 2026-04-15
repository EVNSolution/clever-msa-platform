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

## Rollout Rule

1. 이 matrix는 batch rollout 중에 계속 갱신한다.
2. business-internal folder tree는 이 표에서 평가하지 않는다.
3. 이 표는 deploy-facing repo surface만 다룬다.
