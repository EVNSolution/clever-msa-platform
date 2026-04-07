# CLEVER Runtime and Repository Naming Cleanup

## Purpose

이 문서는 현재 프론트 canonical naming과 실제 배포/문서/카탈로그 naming이 어긋나 있는 상태를 정리하기 위한 상위 naming cleanup 설계를 고정한다.

이번 문서의 범위는 아래다.

- 프론트 canonical naming 정렬
- 배포 target/catalog naming 정렬
- compose/runtime inventory/document naming 정렬
- rename cutover 시점의 운영 게이트 정리

이번 문서는 실제 rename 수행 절차가 아니라, 무엇을 어떤 원칙으로 정리할지 고정하는 설계 문서다.

## Current Naming Problem

현재 naming 문제는 아래처럼 층위가 나뉘어 있다.

### 1. Front canonical vs deploy alias mismatch

- canonical source of truth: `front-web-console`
- current deploy alias: `front-admin-console`
- legacy line: `front-operator-console`

즉, 실제 정본과 실제 배포 이름이 다르다.

### 2. Runtime and deployment naming drift

현재 프론트 rename는 단순 repo 이름 문제만이 아니다.

아래 자산들이 함께 엮여 있다.

- GitHub repository 이름
- `development/` 디렉토리 이름
- `integration-local-stack` compose build path
- `clever-deploy-control`의 deploy target/catalog
- `docs/mappings/current-runtime-inventory.md`
- `WORKSPACE.md`
- `repo-map.md`
- rollout/runbook 문서

즉, 한 군데만 rename하면 drift가 더 커진다.

## Primary Decision

이번 naming cleanup의 canonical 기준은 아래로 고정한다.

- canonical frontend runtime/repo name: `front-web-console`

아래 이름은 canonical로 유지하지 않는다.

- `front-admin-console`
- `front-operator-console`

단, 현재 운영 안정성을 위해 `front-admin-console`은 rename cutover 전까지 temporary deploy alias로 허용한다.

## Naming Principles

### 1. Canonical naming은 실제 정본과 일치해야 한다

이름은 현재 살아남을 runtime source of truth를 가리켜야 한다.

즉, 더 이상 살아남지 않을 UI line이나 임시 deploy alias를 canonical naming으로 유지하지 않는다.

### 2. Repo, runtime, deploy target, docs 이름은 결국 하나로 수렴해야 한다

장기적으로는 아래가 같은 이름 집합을 따라야 한다.

- GitHub repo
- `development/` 디렉토리
- compose build path
- deploy target/catalog key
- runtime inventory
- 문서 naming

### 3. 운영 중인 구조는 단계적으로 옮긴다

지금은 배포가 이미 살아 있다.

따라서 naming 정리는 “한 번에 전부 바꾸기”보다, 문서 기준을 먼저 고정하고 실제 cutover는 별도 plan으로 진행한다.

## Canonical Naming Set

이번 문서 승인 이후 프론트 영역의 canonical naming set은 아래다.

- canonical frontend: `front-web-console`
- temporary deploy alias until cutover: `front-admin-console`
- legacy line to retire: `front-operator-console`

의미:

- `front-web-console`만이 최종으로 남을 대표 이름이다.
- `front-admin-console`은 현재 배포가 연결된 임시 alias다.
- `front-operator-console`은 legacy로 취급한다.

## Cleanup Scope

이번 naming cleanup spec이 포괄하는 실제 영향 범위는 아래다.

### A. Repository Layer

- GitHub repo 이름
- local `development/` 디렉토리 이름
- repo README와 내부 self-description

### B. Runtime Layer

- compose build context path
- compose service가 참조하는 프론트 경로
- gateway 문서에서 설명하는 front runtime 이름

### C. Deployment Layer

- `clever-deploy-control` catalog target key
- deploy workflow input 이름
- rollout/runbook에서 쓰는 target naming

### D. Documentation Layer

- `WORKSPACE.md`
- `repo-map.md`
- `docs/mappings/current-runtime-inventory.md`
- 관련 rollout/decision/spec 문서

## Chosen Cleanup Strategy

이번 cleanup도 즉시 일괄 전환이 아니라 **문서 정렬 -> rename execution**의 2단계 구조를 따른다.

### Stage 1. Naming Truth Fix

먼저 문서와 설계에서 canonical naming을 고정한다.

이 단계의 목표:

- 무엇이 canonical인가를 명시한다.
- 어떤 자산이 rename 영향을 받는지 식별한다.
- cutover 전 임시 alias를 공식적으로 관리한다.

### Stage 2. Rename Execution

그 다음 실제 rename를 수행한다.

이 단계의 목표:

- repo/runtime/deploy target/docs 이름을 실제로 바꾼다.
- old alias와 legacy 이름을 제거한다.
- cutover 후 단일 naming set으로 수렴한다.

## Explicit User Gate: Read-Only Token Regeneration

현재 배포 계약은 아직 `host-side git`를 사용한다.

즉 app host는 private repo를 직접 clone/pull 한다. 이 구조에서는 GitHub read-only token scope가 rename 결과와 직접 연결된다.

따라서 rename cutover 직전에는 **사용자가 새로운 read-only token을 명시적으로 재발급해야 한다.**

이 문서는 이 요구를 필수 사용자 게이트로 고정한다.

### Why This Gate Exists

1. rename 이후 repo 접근 범위가 바뀔 수 있다
- old repo name 기준 token scope로는 새 repo clone/pull이 실패할 수 있다

2. 현재 host-side git 구조에서는 token이 runtime dependency다
- 배포 레이어만 고쳐도 host가 새 repo를 읽지 못하면 cutover는 실패한다

3. 이 작업은 자동으로 가정하면 안 된다
- 토큰 scope와 승인 절차는 사용자/조직 제어 하에 있다

### Required User Action

rename execution plan에 들어가기 전에 사용자에게 아래를 명시적으로 요청해야 한다.

- 새 GitHub fine-grained read-only token 재생성
- rename 후 canonical repo 이름 기준 접근 권한 포함
- AWS SSM의 GitHub read token 파라미터 갱신

즉, token regeneration은 선택이 아니라 cutover 선행조건이다.

## Risks

### 1. 문서만 바뀌고 runtime이 안 바뀔 수 있다

이 경우 canonical naming과 실제 deploy target naming이 다시 벌어진다.

따라서 Stage 1 이후 Stage 2를 너무 오래 미루면 안 된다.

### 2. 일부 자산만 rename할 수 있다

repo만 바꾸고 compose/catalog/docs를 안 바꾸면 drift가 더 심해진다.

즉 rename는 전체 영향 범위를 같이 봐야 한다.

### 3. token regeneration 누락

현재 구조에서 가장 현실적인 cutover 실패 원인이다.

repo rename는 끝났는데 host-side git이 새 repo를 못 읽으면 배포가 멈춘다.

### 4. legacy front 정리 미흡

`front-operator-console` 처리 방침이 모호하면, rename 후에도 개발자가 잘못된 repo를 정본으로 착각할 수 있다.

## Done Criteria

이 트랙의 완료 기준은 아래다.

### Stage 1 Done

- canonical naming set 문서화
- alias/legacy 상태 문서화
- rename 영향 범위 식별
- read-only token regeneration user gate 명시

### Stage 2 Done

- GitHub repo/runtime/deploy target/docs naming 정렬
- compose/catalog/runtime inventory 정렬
- `front-admin-console` alias 종료
- `front-operator-console` legacy 처리 완료
- 새 read-only token과 SSM 갱신 완료

## Decision Boundaries

이 문서는 아래를 아직 확정하지 않는다.

- 정확한 GitHub repo rename 순서
- `front-operator-console`를 archive할지 유지할지
- deploy-control catalog key의 최종 rename timing
- token rotation 운영 절차 상세

이 항목들은 별도 execution plan에서 다룬다.

## Follow-up Documents

다음 상세 문서는 아래 순서를 권장한다.

1. frontend rename and cutover implementation plan
- 실제 rename 순서, 영향 파일, rollback 포함

2. deploy catalog/runtime inventory update plan
- deploy-control과 docs naming 동기화

3. deployment contract migration spec
- host-side git 제거 전환과 token dependency 축소
