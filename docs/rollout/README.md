# Rollout

이 폴더는 이행 순서와 current rollout truth를 다룬다.

## 구성 원칙

- `docs/rollout/*.md`
  - living rollout truth
  - 현재 rollout order, current simulation guide, 현재도 유효한 transition note를 둔다
- `docs/rollout/plans/*.md`
  - active plan only
  - 아직 실행 전이거나 진행 중이거나 deferred execution gate가 살아 있는 계획만 둔다
- `docs/archive/historical/rollout/*.md`
  - completed implementation plan, checklist, handoff
  - 현재 runtime truth가 아니라 historical execution snapshot이다

## 사용 규칙

1. 현재 runtime naming, compose service, gateway prefix를 확인할 때는 historical rollout plan이 아니라 [../mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)를 먼저 본다.
2. plan이 구현 완료되면 `docs/rollout/plans/`에 남기지 않고 `docs/archive/historical/rollout/`로 이동한다.
3. archived rollout 문서는 당시 실행 기준을 보존하기 위한 문서이며, current truth로 인용하지 않는다.

## Start Here

- 현재 runtime/service/prefix inventory: [../mappings/current-runtime-inventory.md](../mappings/current-runtime-inventory.md)
- 플랫폼 전체 구조와 작업 원칙: [../../WORKSPACE.md](../../WORKSPACE.md)
- repo 상태와 active runtime / empty shell 구분: [../../repo-map.md](../../repo-map.md)
