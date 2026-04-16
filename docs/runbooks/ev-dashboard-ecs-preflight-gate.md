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
- `run_profile=warm-host-partial`
  - warm-host partial update
  - base stack은 유지하고, release manifest에 적힌 서비스만 고정 wave 순서로 반영한다
  - 신규 enable lane이 아니다
- `run_profile=smoke-only`
  - 상태 재확인
  - 이미 떠 있는 lane에 대한 public smoke만 다시 본다

문서에서는 핵심 진입면을 뺀 나머지 런타임을 `나머지 업무 서비스`로 통일해 부른다.
`impact` 는 partial release가 gateway/front를 같이 포함해야 하는지를 설명하는 release 영향 힌트다.

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
   - `warm-host-partial` = warm-host partial update: `preflight -> preview -> wave reconcile -> scoped smoke -> finalize/rollback`
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

`run_profile=warm-host-partial` 에서는 아래도 추가로 막아야 한다.

- `RELEASE_MANIFEST_PATH` 누락 또는 unreadable
- base EC2 stack 또는 app host 부재
- 신규 enable 시도
  - partial lane은 이미 warm runtime에 포함된 서비스의 update/remove만 허용한다
- `impact` 가 `gateway-required` 인데 `edge-api-gateway` 가 manifest에 없음
- `impact` 가 `front-required` 인데 `front-web-console` 이 manifest에 없음
- app host state가 `repairRequired=true`
- app host가 reconcile 시작 전에 drift를 감지함

## Warm-Host Partial Impact Rules

`warm-host-partial` 에서는 manifest `impact` 를 아래처럼 쓴다.

- backend-only
  - backend 내부 로직 변경만
  - route group 변화 없음
  - public contract 변화 없음
  - 결과: backend만 반영
- gateway-required
  - route group 추가/삭제/경로 변경
  - upstream 연결점 변화
  - 결과: backend + gateway 반영
- front-required
  - public contract 또는 shell 변화
  - 결과: backend + gateway + front 반영

애매하면 보수적으로 올린다.

- route ambiguity -> gateway 포함
- public contract ambiguity -> gateway + front 포함

로컬 gate에서는 preview까지 함께 본다.

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/infra-ev-dashboard-platform
npx ts-node bin/previewReleaseManifest.ts "$RELEASE_MANIFEST_PATH"
```

preview 출력에서 반드시 확인할 것:

- release impact classification
- requires gateway / requires front
- touched route groups
- fixed wave ordering

## What `run_profile=bootstrap-proof` Must Prove

여기서 `bootstrap-proof`는 별도 실험 이름이 아니라, `핵심 진입면 검증` 모드다.

- current stack template가 synth 가능한지
- app/data host replacement or update가 실제로 성공하는지
- public shell/auth/company-governance surface가 expected `200/302/400`를 주는지

이 profile은 bootstrap correctness를 별도 더미 gate로 증명하지 않는다. bootstrap correctness는 실제 stack update와 targeted smoke 안에서 증명한다.

## Drift, Repair, and Rollback Response

`warm-host-partial` 은 drift를 발견하면 숨기지 않고 막는다. 현재 정책은 broad self-heal이 아니라 block-first다.

예외는 아주 좁다.

- `current-state` 와 `last-known-good` 의 runtime spec 이 일치한다
- 컨테이너가 `missing` 또는 `stopped` 상태일 뿐이다
- image, port binding, env hash mismatch 는 없다

이 경우에만 host가 같은 runtime spec 으로 컨테이너를 다시 띄워 보고, 그 뒤에도 drift가 남으면 그대로 차단한다.

운영자 대응 순서는 고정한다.

1. `preview -> preflight` 가 fail 했으면 먼저 failure reason을 확인한다.
2. `repairRequired` 또는 drift가 보이면 다음 release를 강행하지 않는다.
3. app host의 `current-state`, `releases/<releaseId>.json`, `last-known-good` 를 확인한다.
4. 문제를 drift, wave failure, rollback failure 중 무엇인지 분류한다.
5. rollback이 성공했더라도 `repairRequired` 가 남아 있으면 host state를 먼저 정상화한다.
6. host state가 정상으로 돌아온 뒤에만 다시 `preview -> preflight -> warm-host-partial` 순서로 재시도한다.

## During Deploy

preflight 이후의 wait pattern, timing baseline, `502/401/404/500` 해석은 이 문서에 중복해서 길게 적지 않는다. operator는 deploy 중에 아래 문서 하나만 기준으로 본다.

- [ev-dashboard-ecs-deploy-operator-loop.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/ev-dashboard-ecs-deploy-operator-loop.md)
