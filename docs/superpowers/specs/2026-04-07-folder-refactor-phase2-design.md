# Folder Refactor Phase 2 Design

## Goal

phase 2의 목표는 `front-operator-console`를 실제 active workspace 흐름에서 제거하고, phase 1에서 남겨 둔 cleanup candidate를 문서/경로/검증 체계에서 정리하는 것이다.

이번 단계의 핵심은 아래 세 가지다.

1. `development/front-operator-console/`를 실제 제거 대상으로 확정한다.
2. active docs와 local entry path에서 `front-operator-console`를 더 이상 current runtime처럼 보이지 않게 만든다.
3. surviving runtime rename은 미루고, 단일 웹 current truth를 더 단단하게 만든다.

즉 이번 단계의 성공은 "이름을 더 예쁘게 바꾸는 것"이 아니라, "deprecated repo를 active platform flow에서 실제로 걷어내는 것"이다.

## Current Context

phase 1이 끝난 현재 상태는 아래와 같다.

- `front-admin-console`는 surviving single web runtime으로 문서에 고정됐다.
- `front-operator-console`는 deprecated candidate로 재분류됐다.
- `integration-local-stack` README와 root docs는 single web current truth를 먼저 보여준다.
- ops-derived fixture bootstrap과 smoke는 `front-admin-console` 기준으로 already green이다.

하지만 아직 아래 문제가 남아 있다.

- `development/front-operator-console/` repo 폴더는 실제로 남아 있다.
- active docs 일부는 `front-operator-console`를 migration context로 계속 언급한다.
- repo responsibility, screen map, rollout plan 일부는 cleanup 이후 상태보다 "이관 직전" 상태를 더 강하게 드러낸다.
- surviving runtime repo 이름(`front-admin-console`)은 여전히 historical naming을 담고 있지만, 이걸 지금 rename하면 영향 범위가 너무 커진다.

즉 phase 1은 "정리 기준 고정"이었고, phase 2는 "deprecated repo 실제 제거" 단계다.

## Options

### 1. phase 1 상태를 계속 유지

장점:

- 추가 리스크가 없다.

단점:

- cleanup candidate가 영구 보류 상태가 된다.
- active docs와 on-disk repo가 계속 mismatch를 만든다.
- 후속 rename work의 기준점이 흐려진다.

### 2. `front-operator-console` 제거 + active docs 정리만 수행

장점:

- 가장 큰 deprecated repo를 제거해 구조가 단순해진다.
- single web current truth가 실행 경로와 문서에서 같이 닫힌다.
- surviving runtime rename보다 안전하다.

단점:

- historical docs/plan의 reference cleanup 범위를 신중히 잘라야 한다.
- 살아남는 repo 이름은 그대로이므로 naming debt는 남는다.

### 3. `front-operator-console` 제거와 동시에 surviving repo rename까지 수행

장점:

- 겉으로는 가장 깔끔해 보인다.

단점:

- repo path rename, compose build context, CI, docs cross-reference, local workflows까지 한 번에 흔든다.
- phase 2 범위를 불필요하게 키운다.
- 실패 시 롤백 비용이 커진다.

## Selected Approach

이번 phase 2는 2번을 택한다.

한 줄로 줄이면:

`front-operator-console`를 실제 제거하고 active docs를 단일 웹 기준으로 정리하되, surviving repo rename은 phase 3로 미룬다.

## Scope

이번 phase 2는 아래를 포함한다.

1. `development/front-operator-console/` 제거
2. active docs, README, repo map, screen map, rollout current docs에서 `front-operator-console` active 표현 정리
3. archive와 historical 문서는 historical reference로만 유지
4. local stack, smoke, bootstrap, test entry가 `front-operator-console`를 전혀 기대하지 않도록 정리
5. surviving runtime이 `front-admin-console` 하나라는 사실을 현재 문서/검증 경로에 완전히 반영
6. 완료된 cutover implementation plan이 여전히 `front-operator-console` 제거를 미래 작업처럼 적고 있다면 archive로 이동하거나 active-plan 영역 밖으로 정리

## Out Of Scope

이번 phase 2는 아래를 하지 않는다.

1. `front-admin-console` repo rename
2. compose service rename
3. gateway prefix rename
4. front package rename의 추가 정리
5. backend service boundary 변경
6. archive 전체 재정리
7. active docs가 아닌 historical archive 문서의 전면 rewrite

## Design Principles

### 1. Remove The Deprecated Repo, Not The History

지우는 것은 deprecated runtime repo다.

남기는 것은 아래다.

- historical archive 문서
- 이미 종료된 rollout artifact
- migration traceability에 필요한 reference

즉 phase 2는 history를 삭제하는 작업이 아니라, active flow에서 deprecated repo를 제거하는 작업이다.

### 2. Active Docs Must Describe Only Active Reality

active docs는 더 이상 아래를 암시하면 안 된다.

- `front-operator-console`가 현재도 검토 대상 UI repo라는 느낌
- admin/operator split-web가 아직 의미 있는 active 구조라는 느낌
- local stack이나 smoke가 별도 operator web을 전제한다는 느낌

active docs는 현재 truth만 설명하고, 과거 설명은 archive로 물린다.

### 3. Rename Debt Is Separate From Cleanup Debt

`front-admin-console`라는 이름은 분명 naming debt다.

하지만 이건 cleanup debt와 같은 문제가 아니다.

- cleanup debt
  - deprecated repo가 active tree에 남아 있는 문제
- naming debt
  - surviving repo 이름이 historical naming을 담는 문제

phase 2는 cleanup debt만 다룬다.

## Target State

phase 2가 끝나면 아래 상태가 된다.

### Workspace

- `development/front-admin-console/`만 web runtime repo로 남는다.
- `development/front-operator-console/`는 on-disk tree에서 제거된다.

### Docs

- `WORKSPACE.md`와 `repo-map.md`는 `front-operator-console`를 active candidate처럼 다루지 않는다.
- active docs에서 이 repo를 언급해야 한다면 "phase 2에서 제거된 historical item" 수준의 짧은 note만 남긴다.
- active contracts/rollout/screen-map 문서는 single web current truth만 남긴다.
- historical rollout이나 archive 문서는 과거 기준을 그대로 보존할 수 있다.

### Local Stack

- compose/build/test/smoke 진입점에 `front-operator-console` reference가 없다.
- single web runtime bootstrap/smoke 경로만 남는다.

## Execution Order

phase 2는 아래 순서로 실행하는 것이 안전하다.

### 1. Reference Audit

먼저 아래를 전수 확인한다.

- active docs
- active rollout plans
- contract/screen map
- integration README
- local scripts
- CI/workflow references

분류는 세 가지로 자른다.

1. active doc에서 제거/수정
2. archive로 남김
3. runtime/test/build dependency 확인

### 2. Active Docs Cleanup

다음 문서군부터 정리한다.

- `WORKSPACE.md`
- `repo-map.md`
- `docs/mappings/current-runtime-inventory.md`
- `docs/mappings/current-to-target-repo-map.md`
- `docs/contracts/18-single-web-console-screen-map.md`
- `docs/mappings/repo-responsibility-matrix.md`
- active rollout docs 중 current truth를 설명하는 문서
- 완료됐지만 아직 `docs/rollout/plans/`에 남아 있는 single-web/auth cutover implementation plan

원칙:

- deprecated repo를 current option처럼 쓰지 않는다
- 완료된 cutover 결과만 남긴다
- archive에 있어야 할 implementation-plan context는 active doc에서 걷어낸다
- 완료된 rollout implementation plan이 active-plan 영역에 남아 있다면 archive 이동 후보로 분리한다

### 3. Runtime/Tooling Reference Cleanup

그 다음 아래를 정리한다.

- local scripts
- bootstrap/smoke helper
- compose/build context comments
- test docs
- README entry paths

### 4. Repo Removal

위 확인이 끝나면 `development/front-operator-console/`를 제거한다.

이 단계 전에는 반드시 아래가 green이어야 한다.

- single web bootstrap
- runtime smoke
- web smoke
- front-admin-console build/test
- active docs/workflows에서 `front-operator-console` reference가 더 이상 execution dependency가 아님을 확인하는 grep audit

### 5. Final Consistency Pass

마지막으로 아래를 확인한다.

- active docs에 `front-operator-console`가 runtime처럼 남아 있지 않은가
- archive 밖 문서에서 stale split-web wording이 남아 있지 않은가
- local entry path가 single web truth와 일치하는가

## File Groups To Touch

phase 2에서 수정 후보가 높은 파일군은 아래다.

### High Priority

- `WORKSPACE.md`
- `repo-map.md`
- `docs/mappings/current-runtime-inventory.md`
- `docs/mappings/current-to-target-repo-map.md`
- `docs/contracts/18-single-web-console-screen-map.md`
- `docs/mappings/repo-responsibility-matrix.md`
- `development/integration-local-stack/README.md`

### Medium Priority

- `docs/rollout/16-web-first-platform-delivery-order.md`
- `docs/decisions/specs/2026-04-06-single-web-console-cutover-design.md`
- active rollout plan 중 current truth와 충돌하는 문서
- local helper comments or README references

### Removal Target

- `development/front-operator-console/`

## Success Criteria

아래가 충족되면 phase 2는 완료다.

1. `development/front-operator-console/`가 제거된다.
2. active docs 어디에도 `front-operator-console`가 active runtime/candidate처럼 남지 않는다.
3. archive/historical 문서만 과거 split-web 맥락을 보존한다.
4. local bootstrap/smoke/build 경로가 단일 웹만 전제로 green이다.
5. surviving repo rename 없이도 folder cleanup이 완료됐다고 설명할 수 있다.
6. `docs/rollout/plans/` active 영역에 `front-operator-console` 제거를 미래 작업처럼 적은 completed plan이 남아 있지 않는다.

## Risks

### Risk 1. Archive와 Active Doc 경계가 섞임

대응:

- archive 밖 current-truth 문서만 수정 대상으로 우선 자른다.
- historical implementation-plan 문서는 archive로 남긴다.

### Risk 2. Repo 제거 후 숨어 있던 reference가 터짐

대응:

- phase 2 첫 단계에서 reference audit을 분리한다.
- repo removal 전에 bootstrap/smoke/build 경로를 다시 green으로 맞춘다.

### Risk 3. Rename 욕심이 같이 들어와 범위가 커짐

대응:

- `front-admin-console` rename은 명시적으로 phase 3로 분리한다.
- phase 2 문서에서 rename debt와 cleanup debt를 분리해 적는다.

## Recommendation

phase 2는 `front-operator-console` 제거와 active-doc cleanup까지만 묶는 것이 맞다.

이렇게 하면:

- single web current truth가 실제 tree와 문서에서 같이 닫히고
- cleanup candidate가 더 이상 영구 보류로 남지 않으며
- surviving runtime rename은 더 작은 별도 change set으로 안전하게 분리할 수 있다.

즉 이번 단계의 가장 올바른 결과는:

`deprecated repo를 제거하고, active tree를 단일 웹 기준으로 실제 정리하는 것`이다.
