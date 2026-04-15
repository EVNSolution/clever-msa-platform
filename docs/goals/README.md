# Goals

이 폴더는 플랫폼이 어디로 가는지 설명하는 상위 목표 문서를 둔다.

여기는 current runtime truth나 current rollout 절차를 적는 곳이 아니다. 지금 실제로 떠 있는 런타임, 현재 deploy 절차, 현재 operator 판단 기준은 `docs/mappings/`, `docs/runbooks/`, `docs/rollout/`에서 본다.

여기에는 아래 성격의 문서가 들어간다.
- 목표 아키텍처
- 전체 분해 방향
- 상위 서비스 구성 그림
- 플랫폼 차원의 공식 문서 delivery 목표

현재 문서:

- `01-target-system-fragmentation-map.md`
- `02-target-api-documentation-and-delivery.md`

여기에는 현재 코드 경로나 legacy 파일 추적표를 두지 않는다. 그런 문서는 `../mappings/`로 간다.

읽기 규칙:

1. 상위 목표나 north-star를 보고 싶으면 이 폴더를 본다.
2. 현재 runtime/service/prefix/deploy truth를 보고 싶으면 `../mappings/current-runtime-inventory.md` 와 `../runbooks/README.md`를 먼저 본다.
3. 완료된 목표 문서가 더 이상 north-star로 쓸 가치가 없으면 `docs/archive/`로 이동한다.
