# CLEVER Frontend Source-of-Truth Alignment

## Purpose

이 문서는 현재 프론트엔드의 정본과 실제 배포 정본이 어긋나 있는 상태를 정리하기 위한 1차 설계를 고정한다.

이번 문서의 목표는 아래 두 가지다.

1. 어떤 프론트 repo/runtime 이름을 canonical source of truth로 볼지 고정한다.
2. 현재 dev 배포를 깨지 않으면서 naming과 배포 경로를 정리하는 2단계 cutover 방식을 고정한다.

이 문서는 구현 체크리스트가 아니다. 실제 rename와 cutover 절차는 이후 plan 문서로 내린다.

## Current State

현재 프론트 상태는 아래처럼 나뉘어 있다.

### 1. 현재 실제 정본

현재 가장 최신 정본으로 확인된 것은 `codex/web-layout-refresh` 브랜치의 `development/front-web-console`이다.

이 브랜치에는 아래가 포함되어 있다.

- surviving web console runtime rename
- active docs 동기화
- 로그인 SVG 복원

즉, 기능/디자인 기준의 최신 통합 프론트는 현재 `front-web-console` 쪽이다.

### 2. 현재 실제 배포 repo

현재 배포가 연결된 독립 repo는 `front-admin-console`이다.

dev에서는 이미 이 repo에 `front-web-console` 정본 스냅샷을 덮어써서 배포를 살린 상태다.

즉, 현재 런타임은 아래와 같다.

- 이름: `front-admin-console`
- 실제 내용: `front-web-console` 정본 스냅샷

### 3. 현재 문제

이 상태는 배포를 빠르게 복구하는 데는 적합했지만, 장기적으로는 아래 문제가 있다.

- 정본 이름과 배포 이름이 다르다.
- 누가 살아남는 canonical repo인지 직관적이지 않다.
- 이후 compose/catalog/docs/배포 target 정리가 꼬일 수 있다.

## Primary Decision

canonical frontend source of truth는 `front-web-console`으로 고정한다.

즉, 앞으로의 기준 이름은 아래다.

- canonical frontend repo/runtime name: `front-web-console`

현재 `front-admin-console`은 영구 이름이 아니라 **임시 deploy alias**로 취급한다.

## Rejected Alternatives

### 1. `front-admin-console` 유지

이 안은 채택하지 않는다.

이유:

1. 현재 실제 정본과 맞지 않는다.
2. 최신 통합 웹 콘솔 정체성이 `admin`으로 축소된다.
3. 현재 이미 내용과 이름이 어긋난 상태를 정당화하게 된다.

### 2. 즉시 일괄 rename

이 안도 이번 단계에서는 채택하지 않는다.

이유:

1. 지금 dev 배포가 이미 살아 있는 상태를 크게 흔들 수 있다.
2. compose, catalog, deploy-control, docs, GitHub repo를 한 번에 바꾸면 실패 지점 분리가 어렵다.
3. rename 자체보다 운영 안정성이 우선이다.

## Chosen Strategy: Two-Stage Cutover

이번 문서에서 채택하는 방식은 **2단계 cutover**다.

### Stage 1. Canonical Fix

먼저 문서와 설계 기준에서 canonical 이름을 `front-web-console`으로 고정한다.

이 단계에서 하는 일:

- `front-web-console`을 canonical source of truth로 선언
- `front-admin-console`을 temporary deploy alias로 명시
- rename 영향 범위를 전부 문서화

이 단계의 목적은 현재 배포를 깨지 않고 “무엇이 정본인가”를 먼저 닫는 것이다.

### Stage 2. Runtime and Repo Cutover

그 다음 실제 runtime/repo/deploy target rename를 수행한다.

이 단계에서 하는 일:

- 배포 repo 이름을 canonical naming으로 정렬
- compose와 deploy target을 `front-web-console` 기준으로 정리
- old alias `front-admin-console`을 제거하거나 종료
- 필요 시 `front-operator-console` legacy 처리

이 단계의 목적은 이름과 실제 배포 대상을 완전히 일치시키는 것이다.

## Why Two-Stage Cutover

### 1. 현재 배포를 깨지 않는다

이미 dev에서 프론트가 떠 있는 상태다.

이 시점에 repo/runtime naming을 한 번에 다 바꾸면, 문제 발생 시 어디서 깨졌는지 분리하기 어렵다.

### 2. 문서 정본과 운영 정본을 먼저 맞출 수 있다

현재 가장 큰 문제는 “무엇이 정본인가”의 혼란이다.

이 혼란은 실제 rename보다 먼저 문서에서 닫는 것이 안전하다.

### 3. rename 영향 범위를 분리할 수 있다

front rename은 아래 자산을 함께 건드릴 수 있다.

- GitHub repo
- compose build path
- central deploy target
- runtime inventory
- repo map
- gateway 문서
- rollout 문서

이를 한 번에 바꾸기보다, 먼저 영향 범위를 명시하고 나중에 execution plan으로 내리는 편이 낫다.

## Canonical Naming Rule

이번 문서 승인 이후 프론트 관련 canonical naming은 아래를 따른다.

- canonical frontend name: `front-web-console`
- temporary deploy alias: `front-admin-console`
- legacy/older UI line: `front-operator-console`

의미:

- `front-web-console`만이 앞으로 남길 대표 이름이다.
- `front-admin-console`은 현재 배포 계약 때문에 남아 있는 임시 이름이다.
- `front-operator-console`은 canonical target이 아니다.

## Scope of Future Rename

Stage 2에서 rename 영향 범위를 검토해야 하는 주요 대상은 아래다.

1. GitHub repository naming
2. `development/` 내 디렉토리 naming
3. `integration-local-stack` compose build path
4. `clever-deploy-control`의 catalog/deploy target naming
5. `docs/mappings/current-runtime-inventory.md`
6. `WORKSPACE.md`
7. `repo-map.md`
8. rollout/runbook 문서의 프론트 명칭

## Constraints

이번 결정은 아래 조건을 따른다.

1. dev의 현재 배포 성공 상태를 보존한다.
2. canonical naming을 먼저 고정하고 rename는 나중에 실행한다.
3. repo rename와 runtime rename는 별도 execution plan으로 관리한다.

## Risks

### 1. 임시 alias 상태가 잠시 공존한다

짧은 기간 동안은 아래 두 이름이 함께 존재한다.

- canonical: `front-web-console`
- deployed alias: `front-admin-console`

이 공존 기간 동안 문서 표기가 흔들리지 않도록 조심해야 한다.

### 2. legacy front와 혼동될 수 있다

`front-operator-console`가 계속 남아 있으면 “무엇이 최신인가”가 다시 흔들릴 수 있다.

따라서 rename plan에서는 legacy 처리 범위를 분명히 해야 한다.

### 3. deploy-control과 runtime inventory 갱신 누락 가능성

repo rename만 하고 catalog/runtime inventory를 안 바꾸면 운영 혼란이 커진다.

즉 rename는 문서, catalog, runtime을 함께 보는 방식으로 진행해야 한다.

## Done Criteria

이 트랙의 완료 기준은 아래다.

### Stage 1 Done

- `front-web-console`이 canonical 정본으로 문서에 고정됨
- `front-admin-console`이 temporary deploy alias로 문서화됨
- rename 영향 범위가 식별됨

### Stage 2 Done

- 실제 배포 repo와 canonical 이름이 일치함
- compose/catalog/runtime inventory naming이 정렬됨
- old alias `front-admin-console`이 제거되거나 종료됨
- legacy front 처리 방침이 완료됨

## Follow-up Documents

이 문서 다음으로 필요한 상세 문서는 아래다.

1. frontend rename and cutover implementation plan
- 실제 repo/runtime/deploy target rename 순서

2. runtime/repo naming cleanup spec
- 프론트 외 다른 naming 정리와의 결합 범위

3. deployment contract migration spec
- naming 정리 이후 배포 계약 전환 범위
