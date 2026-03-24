# Archive

이 폴더는 더 이상 정본이 아닌 문서를 보관한다.

archive는 문서 전용이다.
- 코드
- compose
- env
- seed script
- runtime artifact

위 항목은 archive로 보내지 않는다.

하위 분류:
- `superseded/`: 새 문서로 대체됨
- `historical/`: 현재는 안 쓰지만 이력상 보존
- `rejected/`: 검토 후 버린 접근안

## Rollout Artifact Rule

1. `docs/rollout/plans/`는 active plan only다.
2. 구현이 끝난 implementation plan, migration checklist, execution handoff는 `docs/archive/historical/rollout/`로 이동한다.
3. archived rollout 문서는 current runtime truth가 아니라 당시 실행 이력을 보존하는 historical snapshot이다.
4. current runtime naming, compose service, gateway prefix는 `docs/mappings/current-runtime-inventory.md`에서 확인한다.
