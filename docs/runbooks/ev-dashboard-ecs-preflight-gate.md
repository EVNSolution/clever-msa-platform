# ev-dashboard ECS Preflight Gate

`ev-dashboard.com` ECS/CDK deploy는 lesson을 읽는 것만으로 끝내지 않는다. deploy 전에 아래 gate를 실제로 통과한 뒤에만 `workflow_dispatch`로 넘어간다.

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

4. 여기까지 모두 통과했을 때만 `Deploy ev-dashboard ECS platform` workflow를 실행한다.
5. deploy 중에는 wait pattern을 기준으로 본다. 조급한 재시도는 하지 않는다.
6. public smoke가 통과하면 lesson을 바로 갱신한다.

## What `npm run preflight` Must Block

- 누락된 deploy env
- `:latest` 같은 mutable image tag
- 환경과 domain mismatch
- 선행 slice 없이 뒤 slice만 켜는 desired count 조합
- API slice가 켜져 있는데 `edge-api-gateway` desired count가 `0`인 조합

## Wait Pattern

이 stack의 honest wait pattern은 아래 순서다.

1. `npm run preflight`, `npm test`, `npx cdk synth`
2. GitHub Actions가 `Deploy stack` 단계에 진입
3. stateful slice면 `RDS` create/update quiet period
4. backend ECS service steady state
5. 필요한 경우 늦은 `edge-api-gateway` rollout
6. public smoke 복구
7. 마지막 `ALB` target draining

`502`는 같은 의미가 아니다.

- 앞쪽 `502`: backend service가 아직 안 생긴 상태
- 뒤쪽 짧은 `502`: gateway가 새 Service Connect name을 아직 못 본 상태

둘 다 무조건 route bug로 보면 안 된다.
