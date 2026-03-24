# Docs Archive Governance And Current Truth 디자인

## 목적

이 문서는 `clever-msa-platform/docs/`에서 active truth와 historical rollout artifact가 섞여 보이는 문제를 정리하고, archive 규칙과 current runtime truth의 기준을 다시 고정한다.

이번 설계의 목표는 아래와 같다.

1. `docs/rollout/plans/`를 active plan 전용 공간으로 다시 정의한다.
2. 완료된 구현 계획과 handoff를 `docs/archive/historical/`로 이동시키는 기준을 고정한다.
3. 현재 runtime/service/gateway naming truth를 한 문서에서 바로 볼 수 있게 한다.
4. 루트 안내 문서, docs index, archive 규칙 문서가 같은 정책을 말하도록 정렬한다.

## 문제 정의

현재 문서 트리에는 아래 문제가 동시에 있다.

1. `docs/archive/`는 이미 존재하지만, 완료된 rollout plan 상당수가 여전히 `docs/rollout/plans/`에 남아 있다.
2. 다음 세션이 `docs/rollout/plans/`를 보면 active backlog와 historical execution snapshot을 구분하기 어렵다.
3. current runtime naming과 topology를 한 번에 보여 주는 단일 living doc이 부족하다.
4. 결과적으로 과거 implementation plan이 현재 truth처럼 오독될 수 있다.

대표 사례는 아래와 같다.

1. 이미 hard cut이 끝난 driver runtime naming 이전 plan이 active plan 디렉토리에 남아 있다.
2. settlement, telemetry, vehicle, dispatch 구현 계획 다수가 현재 runtime과 다른 과거 상태를 설명하지만 active tree에 그대로 있다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `docs/rollout/plans/`와 `docs/archive/`의 역할 재정의
2. 완료된 rollout plan / handoff의 초기 archive 이동 기준
3. current runtime inventory living doc 추가
4. `docs/README.md`, `docs/archive/README.md`, `WORKSPACE.md`, `repo-map.md` 같은 상위 안내 문서 동기화
5. 과거 docs reclassification map의 경로 보정

## 비스코프

이번 설계에서는 아래를 다루지 않는다.

1. 개별 서비스의 아키텍처 경계 변경
2. repo 이름, gateway prefix, API contract 변경
3. archive에 code/runtime asset을 넣는 구조
4. service repo 내부 README 전체 재분류
5. `docs/decisions/specs/` 자체의 archive 이동 규칙

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `docs/rollout/plans/`에는 active plan만 남긴다.
2. 완료된 구현 계획, migration checklist, handoff는 `docs/archive/historical/rollout/`로 이동한다.
3. current runtime truth는 별도 living doc `docs/mappings/current-runtime-inventory.md`로 고정한다.
4. `docs/rollout/README.md`를 추가해 rollout 영역의 living/historical 경계를 명시한다.

선택 이유는 아래와 같다.

1. 파일을 그대로 둔 채 배너만 붙이면 active tree 탐색만으로는 여전히 오독이 발생한다.
2. archive는 이미 존재하므로, 규칙을 새로 만드는 것이 아니라 실제 운영을 그 규칙에 맞추는 편이 맞다.
3. current runtime naming과 topology를 보는 목적은 historical implementation plan이 아니라 current inventory 문서가 맡아야 한다.

## 문서 분류 원칙

### 1. Active Living Docs

아래 문서는 active tree에 남긴다.

1. 현재 architecture truth
2. 현재 contract truth
3. 현재 repo/runtime inventory
4. 아직 실행 전이거나 진행 중인 rollout plan
5. deferred 상태지만 future gate가 살아 있는 transition plan

### 2. Historical Docs

아래 문서는 `docs/archive/historical/`로 이동한다.

1. 구현이 끝난 implementation plan
2. 완료된 migration checklist
3. 당시 handoff 기준을 보존해야 하는 execution handoff
4. 현재 truth와 다르지만 이력상 남겨야 하는 rollout artifact

### 3. Superseded Docs

아래 문서는 `docs/archive/superseded/` 대상이다.

1. 실행 전에 더 새 plan/spec로 대체된 문서
2. current truth로 보관할 필요가 없는 폐기 직전 초안

이번 배치에서는 completed rollout artifact 이동이 중심이므로, 초기 정리는 주로 `historical`로 처리한다.

## Rollout 영역 규칙

`docs/rollout/`은 아래처럼 나눈다.

1. `docs/rollout/*.md`
   - 현재 rollout order, current simulation guide 같은 living rollout docs
2. `docs/rollout/plans/*.md`
   - active plan only
3. `docs/archive/historical/rollout/*.md`
   - 완료된 implementation plan, checklist, handoff

규칙:

1. plan이 구현 완료되면 active plan 디렉토리에 계속 남기지 않는다.
2. current runtime를 설명해야 할 때는 historical rollout plan을 인용하지 않는다.
3. current runtime/service/prefix는 runtime inventory와 current rollout guide가 설명한다.

## Current Runtime Truth 문서

새 living doc은 아래 역할을 가진다.

- 파일: `docs/mappings/current-runtime-inventory.md`
- 목적: 현재 active runtime repo, compose service, gateway prefix, 역할 요약을 한 번에 보여 준다.

이 문서는 아래 질문에 답해야 한다.

1. 지금 active runtime repo는 무엇인가
2. compose service 이름은 무엇인가
3. gateway 외부 prefix는 무엇인가
4. empty shell과 active runtime은 어떻게 구분되는가

## 초기 Historical 이동 기준

이번 첫 정리 배치에서 아래 문서는 `docs/archive/historical/rollout/`로 이동한다.

1. `2026-03-19-account-driver-settlement-implementation-handoff.md`
2. `2026-03-19-account-driver-settlement-msa-master-plan.md`
3. `2026-03-19-driver-360-bootstrap-implementation-plan.md`
4. `2026-03-19-local-django-msa-bootstrap-implementation-plan.md`
5. `2026-03-19-trimmed-bootstrap-refactor-plan.md`
6. `2026-03-20-platform-restructure-and-repo-migration-plan.md`
7. `2026-03-20-settlement-phase-1-decomposition-implementation-plan.md`
8. `2026-03-20-telemetry-hub-implementation-plan.md`
9. `2026-03-20-terminal-registry-implementation-plan.md`
10. `2026-03-20-vehicle-asset-bootstrap-implementation-plan.md`
11. `2026-03-20-vehicle-asset-refactor-and-driver-vehicle-assignment-implementation-plan.md`
12. `2026-03-20-vehicle-ops-phase-1-implementation-plan.md`
13. `2026-03-21-telemetry-dead-letter-implementation-plan.md`
14. `2026-03-21-telemetry-listener-implementation-plan.md`
15. `2026-03-23-dispatch-operations-view-implementation-plan.md`
16. `2026-03-23-dispatch-registry-implementation-plan.md`
17. `2026-03-23-planned-business-domain-skeleton-shell-creation-plan.md`
18. `2026-03-23-settlement-phase-2-decomposition-implementation-plan.md`
19. `2026-03-23-settlement-scoped-driver-read-contract-implementation-plan.md`
20. `2026-03-24-driver-ops-runtime-naming-hard-cut-implementation-plan.md`

이 배치 이후 active plan으로 남길 대표 문서는 아래다.

1. `2026-03-23-document-ownership-transition-plan.md`
2. 아직 구현 전인 future plan
3. 현재 작업 중인 plan

## 상위 안내 문서 반영 원칙

아래 문서는 같은 정책을 말해야 한다.

1. `docs/README.md`
2. `docs/archive/README.md`
3. `WORKSPACE.md`
4. `repo-map.md`
5. `docs/mappings/2026-03-20-docs-reclassification-map.md`

핵심 반영 내용:

1. archive는 문서 전용이며 active truth가 아님
2. `docs/rollout/plans/`는 active plan only
3. completed rollout artifact는 `docs/archive/historical/rollout/`로 이동
4. current runtime truth는 `docs/mappings/current-runtime-inventory.md`를 우선 참조

## 검증 원칙

최소 검증 범위는 아래와 같다.

1. `docs/rollout/plans/`에 historical rollout file이 남지 않는다.
2. archive로 이동된 파일은 `docs/archive/historical/rollout/` 아래에서 확인된다.
3. `docs/README.md`, `docs/archive/README.md`, `WORKSPACE.md`, `repo-map.md`가 active/historical 구분을 명시한다.
4. current runtime inventory 문서가 active runtime repo와 gateway prefix를 한 곳에서 보여 준다.
5. active docs 안에서 moved plan reference가 깨지지 않는다.

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. archive 규칙이 문서상 존재하는 수준이 아니라 실제 파일 배치에 반영된다.
2. 다음 세션이 `docs/rollout/plans/`만 보고도 active plan 영역이라고 이해할 수 있다.
3. current runtime truth를 historical implementation plan 대신 inventory living doc에서 확인할 수 있다.
4. 루트 안내 문서와 docs index가 같은 규칙을 말한다.
