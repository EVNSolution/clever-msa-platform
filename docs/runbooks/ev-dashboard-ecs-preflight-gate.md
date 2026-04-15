# ev-dashboard Runtime Preflight Gate

`ev-dashboard.com` canonical runtime deploy는 lesson을 읽는 것만으로 끝내지 않는다. deploy 전에 아래 gate를 실제로 통과한 뒤에만 `workflow_dispatch`로 넘어간다.

prod deploy 자체로 바로 들어가지 않는다. 기본 release 흐름은 아래다.

1. [ev-dashboard-preprod-release-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-preprod-release-gate.md) 로 temporary lane candidate proof를 수행한다.
2. 그 다음에만 이 문서의 prod deploy gate를 밟는다.

## Scope

이 gate는 `development/infra-ev-dashboard-platform`이 소유하는 shared runtime deploy에 적용한다.

- `front-web-console`
- `edge-api-gateway`
- `service-account-access`
- `service-organization-registry`
- `service-driver-profile`
- `service-personnel-document-registry`
- `service-vehicle-registry`
- `service-vehicle-assignment`
- `service-dispatch-registry`
- `service-delivery-record`
- `service-attendance-registry`
- `service-dispatch-operations-view`
- `service-driver-operations-view`
- `service-vehicle-operations-view`
- `service-settlement-registry`
- `service-settlement-payroll`
- `service-settlement-operations-view`

## 용어 정리

이 문서에서는 workflow 값은 그대로 쓰되, 의미는 아래처럼 읽는다.

- `run_profile=bootstrap-proof`
  - 핵심 진입면 검증
  - `front-web-console + edge-api-gateway + service-account-access + service-organization-registry`
- `run_profile=full`
  - 전체 서비스 검증
  - 핵심 진입면 + 나머지 업무 서비스 전부
- `run_profile=smoke-only`
  - 상태 재확인
  - 이미 떠 있는 lane에 대한 public smoke만 다시 본다

문서에서는 핵심 진입면을 뺀 나머지 런타임을 `나머지 업무 서비스`로 통일해 부른다.

## Mandatory Order

1. root [lesson.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/lesson.md)와 대상 repo `lesson.md`를 읽는다.
2. deploy에 쓸 image URI와 desired count를 확정한다.
3. 아래 gate를 로컬에서 실행한다.

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npm run preflight
npm test -- --runInBand
npx cdk synth
```

4. deploy 의도를 먼저 고른다.
   - `full` = 전체 서비스 검증: `preflight -> unit tests -> synth -> deploy -> smoke`
   - `bootstrap-proof` = 핵심 진입면 검증: `synth -> deploy -> smoke`
   - `smoke-only` = 상태 재확인: `smoke`
5. 여기까지 모두 통과했을 때만 `Deploy ev-dashboard runtime platform` workflow를 실행한다.
6. deploy 중에는 [ev-dashboard-ecs-deploy-operator-loop.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md)의 phase table과 decision table만 본다. 조급한 재시도는 하지 않는다.
7. workflow 안의 automatic post-deploy public smoke까지 통과하면 lesson을 바로 갱신한다.

## Before This Gate

이 문서는 prod deploy 바로 전 gate다. candidate 단계의 비용/도메인/공유 데이터 경계는 아래 문서를 먼저 따른다.

- [ev-dashboard-preprod-release-gate.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-preprod-release-gate.md)

## What `npm run preflight` Must Block

- 누락된 deploy env
- `:latest` 같은 mutable image tag
- 환경과 domain mismatch
- 선행 slice 없이 뒤 slice만 켜는 desired count 조합
- API slice가 켜져 있는데 `edge-api-gateway` desired count가 `0`인 조합

## What `run_profile=bootstrap-proof` Must Prove

여기서 `bootstrap-proof`는 별도 실험 이름이 아니라, `핵심 진입면 검증` 모드다.

- current stack template가 synth 가능한지
- app/data host replacement or update가 실제로 성공하는지
- public shell/auth/company-governance surface가 expected `200/302/400`를 주는지

이 profile은 bootstrap correctness를 별도 더미 gate로 증명하지 않는다. bootstrap correctness는 실제 stack update와 targeted smoke 안에서 증명한다.

## During Deploy

preflight 이후의 wait pattern, timing baseline, `502/401/404/500` 해석은 이 문서에 중복해서 길게 적지 않는다. operator는 deploy 중에 아래 문서 하나만 기준으로 본다.

- [ev-dashboard-ecs-deploy-operator-loop.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
