# Folder Refactor Phase 3 Design

## Goal

phase 3의 목표는 phase 2에서 surviving runtime으로 남은 웹 repo의 naming debt를 실제 current truth 기준으로 정리하는 것이다.

이번 단계의 핵심은 아래 네 가지다.

1. surviving web repo path를 historical 이름인 `front-admin-console`에서 role-neutral 이름으로 바꾼다.
2. compose service, image/build context, env entry 이름도 같은 naming set으로 같이 맞춘다.
3. repo-local package/app naming은 current truth 기준으로 점검하고, stale surface만 정리한다.
4. active docs와 local tooling이 새 naming set을 source of truth로 삼게 만든다.

즉 이번 단계의 성공은 "deprecated repo를 치운다"가 아니라, "남은 단일 웹 runtime의 이름을 현재 구조에 맞게 닫는다"는 데 있다.

## Current Context

phase 2가 끝난 현재 상태는 아래와 같다.

- `development/front-operator-console/`는 제거됐다.
- surviving web runtime은 `development/front-admin-console/` 하나다.
- compose/runtime naming은 아직 historical naming을 담고 있다.
  - repo path: `front-admin-console`
  - compose service: `admin-front`
  - e2e service: `admin-front-e2e`
  - env file: `admin-front.env.example`
- 반면 repo-local package/app naming 일부는 이미 current truth에 가깝다.
  - `package.json` name: `clever-web-console`
  - browser title: `CLEVER 통합 웹 콘솔`

즉 현재 문제는 기능이나 경계가 아니라 naming layer가 두 겹으로 갈라져 있다는 점이다.

- runtime path/service 이름은 과거 `admin` 중심 naming을 유지
- package/title/user-facing wording은 이미 `web console` 기준으로 이동

이 상태를 계속 두면 아래 문제가 남는다.

- 신규 참여자가 repo path와 product truth를 서로 다른 것으로 읽는다.
- compose/build/test 명령이 여전히 historical 이름을 중심으로 남는다.
- current-runtime inventory와 실제 폴더 naming 사이에 drift가 유지된다.
- phase 2에서 정리한 single-web truth가 개발자 경험 차원에서는 끝까지 닫히지 않는다.

## Options

### 1. Repo path만 rename

예:

- `development/front-admin-console` -> `development/front-web-console`
- 나머지 compose service, env file, helper script wording은 나중에 정리

장점:

- 변경량이 제일 작다.

단점:

- repo path와 compose/runtime 이름이 다시 어긋난다.
- 이번 단계가 half-done 상태로 남는다.

### 2. Repo path + compose/service/docs naming만 같이 rename

예:

- repo path: `front-web-console`
- compose service: `web-console`
- e2e service: `web-console-e2e`
- env example: `web-console.env.example`
- active docs와 smoke helper wording 동기화

장점:

- single web runtime naming truth가 개발자-facing surface에서 일관된다.
- gateway prefix나 product contract는 안 건드리면서도 drift를 크게 줄인다.

단점:

- helper script, compose, README, inventory, tests까지 같이 만져야 한다.

### 3. 2번 + gateway/API/product surface rename

예:

- internal naming rename에 더해 gateway prefix, URL, product wording까지 동시 정리

장점:

- 겉으로는 가장 완결돼 보인다.

단점:

- 이번 단계가 naming cleanup이 아니라 contract migration으로 커진다.
- gateway prefix와 external route는 이번 문제의 root cause가 아니다.
- 리스크가 불필요하게 커진다.

## Selected Approach

이번 phase 3는 2번을 택한다.

한 줄로 줄이면:

`front-admin-console`를 `front-web-console`로 바꾸고, compose service/image/env/docs naming도 같은 naming set으로 정리하되, gateway prefix와 외부 URL contract는 건드리지 않는다.

## Naming Decision

이번 단계에서 고정할 naming set은 아래와 같다.

### Repo Path

- from: `development/front-admin-console/`
- to: `development/front-web-console/`

선정 이유:

- `front-*` prefix를 유지해 repo category가 바로 드러난다.
- `admin` role-specific naming을 제거한다.
- `web-console`은 현재 단일 웹 current truth와 직접 맞는다.

### Compose Service

- from: `admin-front`
- to: `web-console`

### Compose E2E Service

- from: `admin-front-e2e`
- to: `web-console-e2e`

### Env Example

- from: `infra/env/admin-front.env.example`
- to: `infra/env/web-console.env.example`

### Compose Image / Build Context

- `build.context`는 `../front-admin-console`에서 `../front-web-console`로 바뀐다.
- explicit compose `image:` key를 새로 도입하지 않는다.
- local derived image naming은 renamed service 이름을 따라간다.

### Package/App Naming

아래는 이미 current truth에 가깝기 때문에 유지한다.

- package name: `clever-web-console`
- browser title: `CLEVER 통합 웹 콘솔`

즉 phase 3의 package/app naming 범위는 "전면 rename"이 아니라 "stale admin naming surface 제거"다.

## Scope

이번 phase 3는 아래를 포함한다.

1. `development/front-admin-console/` -> `development/front-web-console/` repo path rename
2. `integration-local-stack` compose service/image/build context/env naming 정리
3. bootstrap/smoke helper, README, inventory 문서의 `admin-front`/`front-admin-console` active reference 정리
4. repo-local README와 package-adjacent naming surface 점검 및 stale admin wording 정리
5. active docs에서 surviving runtime naming을 `front-web-console` / `web-console` 기준으로 동기화
6. rename 이후에도 `verify_ops_fixture_stack.py --skip-build`, web smoke, front build/test가 green인지 재검증

여기서 active docs는 archive 밖에서 현재 runtime 이름, compose entrypoint, current working mode를 설명하는 non-archive 문서를 뜻한다.

- `docs/archive/**`는 rename 대상이 아니다.
- legacy source map처럼 historical note가 필요한 경우는 남길 수 있다.
- 하지만 non-archive living docs가 old name을 current truth처럼 유지하는 것은 허용하지 않는다.

## Out Of Scope

이번 phase 3는 아래를 하지 않는다.

1. gateway prefix 변경
2. browser route 또는 external URL contract 변경
3. backend service rename
4. archive 전체 rewrite
5. package name `clever-web-console`를 다른 이름으로 다시 바꾸기
6. product branding 자체 변경

## Design Principles

### 1. One Naming Set Per Active Runtime

active runtime 하나에는 repo path, compose service, local entry docs가 하나의 naming set으로 읽혀야 한다.

이번 단계 이후에는 아래가 같은 뜻을 가리켜야 한다.

- surviving web repo
- local compose service
- local e2e runner
- current runtime inventory

### 2. Change Technical Identifiers, Not Product Contract

이번 rename은 기술 식별자 정리다.

바꾸는 것:

- repo path
- compose service
- gateway 내부 upstream host literal
- build context
- env example filename
- active docs/current inventory naming

안 바꾸는 것:

- gateway prefix `/`
- API path
- browser route
- user-facing domain concept

즉 gateway는 외부 contract를 바꾸지 않고, 내부 upstream service literal만 새 compose naming에 맞춘다.

### 3. Keep The Already-Correct Surface

이미 current truth에 맞는 surface는 굳이 다시 흔들지 않는다.

예:

- `clever-web-console`
- `CLEVER 통합 웹 콘솔`

phase 3는 rename를 위한 rename이 아니라 stale surface 제거다.

### 4. Archive Stays Historical

archive 문서는 대량 rewrite하지 않는다.

필요하면 active doc에서 새 naming truth를 설명하고, archive는 당시 상태를 보존한다.

## Target State

phase 3가 끝나면 아래 상태가 된다.

### Workspace

- surviving web repo는 `development/front-web-console/` 하나다.
- `front-admin-console` path는 active workspace에서 사라진다.

### Local Stack

- compose service는 `web-console`
- e2e service는 `web-console-e2e`
- env example은 `web-console.env.example`
- gateway 내부 upstream host literal은 `web-console:5174` 기준으로 정리된다.
- helper script와 README는 새 이름을 기본 진입점으로 사용한다.

### Docs

- `WORKSPACE.md`, `repo-map.md`, `current-runtime-inventory.md`는 surviving web runtime을 `front-web-console`로 적는다.
- active docs는 더 이상 `front-admin-console`를 current runtime 이름으로 쓰지 않는다.
- historical 문서에서의 `front-admin-console` 언급은 남을 수 있지만, active guidance로 승격되지 않는다.

### Verification

- `front-web-console` test/build green
- stack bootstrap/verify green
- Playwright smoke green

## Execution Shape

phase 3는 아래 순서로 가는 것이 안전하다.

### 1. Rename Surface Inventory

먼저 아래를 전수 확인한다.

- repo path references
- compose service names
- Docker build contexts
- env filenames
- helper script literals
- active docs/current inventory

### 2. Repo Path Rename

그 다음 git-aware move로 repo path를 바꾼다.

- `development/front-admin-console/`
- `development/front-web-console/`

원칙:

- 내부 코드 논리는 건드리지 않는다.
- import path가 없다면 naming reference만 따라간다.

### 3. Compose And Tooling Rename

같이 정리해야 하는 표면은 아래다.

- `admin-front` -> `web-console`
- `admin-front-e2e` -> `web-console-e2e`
- gateway 내부 upstream host literal `admin-front:5174` -> `web-console:5174`
- env example filename
- helper script/service literals
- README command examples
- build context path

### 4. Active Docs Rename

다음 문서군을 current truth 기준으로 같이 수정한다.

- `WORKSPACE.md`
- `repo-map.md`
- `docs/mappings/current-runtime-inventory.md`
- `docs/mappings/current-to-target-repo-map.md`
- `development/integration-local-stack/README.md`
- `development/integration-local-stack/compose/README.md`
- active contract/spec/rollout 문서 중 current runtime 이름, compose entrypoint, current working mode를 직접 적는 non-archive 문서 전부

### 5. Verification

반드시 아래를 fresh run한다.

- `front-web-console` test
- `front-web-console` build
- `verify_ops_fixture_stack.py --skip-build`
- 필요 시 `bootstrap_ops_fixture_stack.py --fresh`
- final grep for stale `front-admin-console` / `admin-front`

## File Groups To Touch

### High Priority

- `development/front-admin-console/` -> `development/front-web-console/`
- `development/integration-local-stack/docker-compose.account-driver-settlement.yml`
- `development/integration-local-stack/README.md`
- `development/integration-local-stack/compose/README.md`
- `development/integration-local-stack/scripts/verify_ops_fixture_stack.py`
- `development/integration-local-stack/tests/test_verify_ops_fixture_stack.py`
- `docs/mappings/current-runtime-inventory.md`
- `WORKSPACE.md`
- `repo-map.md`

### Medium Priority

- repo-local README in surviving web repo
- env example rename consumers
- non-archive docs 중 rename scope 확인이 필요한 historical/source-map note

### Low Priority / Defer

- archive docs
- purely historical rollout plans
- product-facing wording already aligned with `web console`

## Success Criteria

아래가 충족되면 phase 3는 완료다.

1. surviving web repo path가 `front-web-console`로 바뀐다.
2. compose service와 helper script가 `web-console` naming을 쓴다.
3. active docs/current inventory가 새 이름을 current truth로 적는다.
4. `clever-web-console` package/app surface와 기술 naming이 충돌하지 않는다.
5. stack smoke와 web smoke가 rename 후에도 green이다.

## Risks

### Risk 1. Compose/Helper Literal 누락

설명:

- service rename이 compose, helper script, README, test fixture에 흩어져 있다.

대응:

- rename inventory를 먼저 만든다.
- final grep을 `front-admin-console|admin-front` 기준으로 강하게 돈다.

### Risk 2. Historical Doc와 Active Doc 혼선

설명:

- archive 문서까지 같은 턴에 고치려 하면 범위가 커진다.

대응:

- active docs만 current truth로 맞춘다.
- archive는 historical note로 둔다.

### Risk 3. Repo Rename과 Product Contract Rename의 혼합

설명:

- gateway prefix나 URL까지 만지기 시작하면 rename cleanup이 아니라 contract migration이 된다.

대응:

- phase 3 scope를 technical naming에 한정한다.
- gateway/API prefix는 phase 3에서 금지한다.

## Recommendation

phase 3는 `front-web-console / web-console` naming set으로 surviving runtime을 닫는 단계로 가져가는 게 맞다.

핵심은 아래다.

- repo path
- compose service
- env/build context
- active docs

를 한 번에 묶고, 이미 맞는 package/app naming은 유지한다.

즉 이번 단계의 성공은 "이름을 많이 바꾸는 것"이 아니라, "남은 단일 웹 runtime의 기술 식별자가 current truth와 같은 방향을 보게 만드는 것"이다.
