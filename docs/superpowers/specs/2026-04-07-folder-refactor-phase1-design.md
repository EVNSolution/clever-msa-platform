# Folder Refactor Phase 1 Design

## Goal

플랫폼 루트와 `development/` 아래 repo 묶음이 현재 어떤 것이 active source인지, 어떤 것이 deprecated candidate인지, 어떤 것이 reference/legacy인지 더 명확하게 드러나도록 정리한다.

이번 단계는 위험한 이동이 아니라 `구조 정리 기준`을 고정하는 단계다. 실제 repo rename, gateway prefix 전면 변경, compose service 대량 rename은 이번 범위에 포함하지 않는다.

## Current Context

현재 플랫폼은 아래 상태다.

- 플랫폼 정본은 `docs/`
- 실제 구현은 `development/` 아래 독립 repo
- surviving web runtime은 `front-admin-console` 하나
- `front-operator-console`는 historical/deprecated candidate 성격이 강하지만 폴더는 아직 남아 있음
- `integration-local-stack`은 compose, bootstrap, smoke, seed glue를 소유
- 운영 유래 fixture bootstrap과 smoke는 이미 로컬 재현 가능

문제는 이름보다 `정리 기준`이 먼저라는 점이다.

- active repo와 deprecated repo가 문서/README에서 같은 무게로 보임
- 루트 안내 문서와 integration README에 과거 표현이 일부 남아 있음
- 단일 웹으로 바뀐 current truth와 과거 멀티-web 설명이 완전히 분리돼 있지 않음
- 삭제 가능한 후보와 아직 유지해야 하는 대상을 한 번에 판단하기 어려움

## Scope

이번 1차는 아래만 포함한다.

1. `docs/` 기준 active/deprecated/reference 분류를 명확히 문서화
2. `WORKSPACE.md`, `repo-map.md`, 관련 README의 현재 truth 동기화
3. `integration-local-stack` 진입점 문서와 smoke/bootstrap 설명 정리
4. 삭제 후보 목록과 보류 이유를 문서로 분리
5. surviving web 기준의 naming/current truth를 문서와 실행 안내에서 일관되게 맞춤

## Out Of Scope

이번 1차는 아래를 하지 않는다.

1. 실제 repo 폴더 rename
2. `front-admin-console`를 다른 이름으로 물리 이동
3. compose service name 대량 변경
4. gateway API prefix rename
5. 서비스 경계 재설계
6. archive로 runtime code 이동

## Principles

### 1. Docs First

정리 기준은 코드보다 먼저 `docs/`에 잠근다.

- active source는 어디인가
- deprecated candidate는 무엇인가
- reference-only는 무엇인가
- 아직 rename하지 않는 이유는 무엇인가

이 판단을 문서 정본에 먼저 남긴 뒤에만 후속 물리 이동을 논의한다.

### 2. No Runtime Boundary Change

이번 1차는 경계 변경이 아니다.

- 서비스 import 관계는 건드리지 않음
- compose glue의 위치는 유지
- read-model/service ownership은 유지

즉 이번 단계는 “설명과 분류의 정리”이지 “도메인 구조 변경”이 아니다.

### 3. Single Web Current Truth

웹 관련 설명은 단일 웹 기준으로 통일한다.

- surviving runtime은 `front-admin-console`
- base URL은 `/`
- `front-operator-console`는 active runtime이 아님
- 역할 분기는 경로 분리가 아니라 UI 노출/권한으로 처리

단, 실제 repo 폴더는 phase 1에서 바꾸지 않는다.

### 4. Safe Cleanup Before Rename

실제 폴더 rename은 phase 2 이상으로 미룬다.

그 전에 먼저 해야 할 것은:

- 문서 정리
- README 정리
- bootstrap/smoke 진입점 정리
- deprecated candidate 목록 정리
- 삭제/보관 판단 기준 고정

## Target Information Architecture

### Platform Root

플랫폼 루트는 세 층으로 설명되어야 한다.

1. `docs/`
   - architecture, boundary, contract, rollout의 정본
2. `development/`
   - 독립 runtime repo 집합
3. `development/integration-local-stack/`
   - 로컬 glue, seed, smoke, bootstrap

### Repo Classification Model

`development/` 아래 repo는 문서상 최소 아래 세 범주로 분류한다.

1. `active runtime repo`
   - 현재 실제 source of implementation
2. `deprecated candidate`
   - 현재는 남아 있지만 runtime/current truth 기준으로 축소 또는 제거 후보
3. `reference/legacy`
   - active source가 아니고 historical/reference purpose만 있음

현재 known example:

- `front-admin-console` → active runtime repo
- `front-operator-console` → deprecated candidate
- `../MSA-Server` → reference/legacy

## Documentation Changes

이번 1차에서 기대하는 문서 결과물은 아래다.

### `WORKSPACE.md`

- platform root 역할 재강조
- single web current truth 반영
- repo rename은 아직 안 한다는 점 명시
- deprecated/reference 분류 규칙 추가

### `repo-map.md`

- active runtime repo / deprecated candidate / reference-only를 더 분명하게 표기
- `front-operator-console` current status를 현재 truth 기준으로 보정
- 각 repo의 “왜 지금은 유지되는지” 또는 “왜 후속 정리 대상인지”를 최소 메모로 남김

### `development/integration-local-stack/README.md`

- bootstrap / verify 진입점을 current truth 기준으로 단순화
- 단일 웹 기준 접속 설명 유지
- ops-derived fixture bootstrap과 smoke를 가장 위에 배치
- 로컬 재현 경로를 `fast rerun / fresh reset / rebuild`로 정리

### New Cleanup Note

새 문서를 추가해 아래를 고정한다.

- 삭제 후보
- 아직 지우지 않는 이유
- phase 2 조건

예상 내용:

- `front-operator-console`
- 과거 설명을 담은 문서 중 archive 이동 후보
- 더 이상 주 진입점이 아닌 보조 스크립트/설명

## Execution Plan Shape

이번 1차는 아래 순서로 실행하는 게 맞다.

1. current truth spec 확정
2. root docs 정리
3. repo map/status 문구 정리
4. integration README/bootstrap 설명 정리
5. cleanup candidate 문서 추가
6. 문서/README consistency check

## Success Criteria

아래가 충족되면 phase 1은 완료다.

1. 플랫폼 루트 문서만 봐도 active/deprecated/reference 구분이 보인다
2. single web current truth가 문서에서 일관된다
3. `integration-local-stack` README만 봐도 로컬 bootstrap/smoke 진입이 명확하다
4. 실제 repo rename 없이도 정리 방향과 보류 이유가 분명하다
5. 후속 phase 2 rename/move가 어떤 조건에서 가능한지 문서로 연결된다

## Risks

### Risk 1. “문서만 바꾸고 실제 상태와 어긋남”

대응:

- bootstrap/smoke 문서도 같이 갱신
- current runtime inventory와 충돌하지 않게 확인

### Risk 2. “deprecated candidate를 너무 빨리 지우려는 오해”

대응:

- 삭제가 아니라 `candidate`로만 명시
- phase 2 조건이 충족되기 전에는 물리 이동/삭제를 하지 않는다고 적음

### Risk 3. “rename을 안 해서 정리가 안 된 것처럼 느껴짐”

대응:

- 이번 단계의 목적이 안전한 구조 정리 기준 고정이라는 점을 문서 서두에 명시
- 위험한 rename은 별도 phase로 분리

## Recommendation

이번 1차는 반드시 `문서 정리 + 분류 체계 고정`까지만 한다.

가장 큰 가치는 아래다.

- current truth가 흔들리지 않는다
- 후속 rename/move가 안전해진다
- active runtime과 deprecated candidate를 혼동하지 않게 된다

즉 이번 단계의 성공은 “폴더 이름이 바뀌는 것”이 아니라 “정리 기준이 모두에게 같은 뜻으로 보이는 것”이다.
