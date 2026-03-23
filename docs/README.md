# Docs

이 폴더는 `clever-msa-platform`의 문서 정본이다.

## Start Here

- 플랫폼 전체 구조와 작업 원칙: [../WORKSPACE.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/WORKSPACE.md)
- target repo와 migration 상태: [../repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/repo-map.md)
- 현재 코드에서 target repo로 가는 이동표: [mappings/current-to-target-repo-map.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/current-to-target-repo-map.md)
- repo별 책임 경계: [mappings/repo-responsibility-matrix.md](/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/mappings/repo-responsibility-matrix.md)

- `goals/`: 플랫폼의 목표 상태와 상위 방향
- `boundaries/`: 서비스 경계와 소유 데이터
- `mappings/`: 현재 구조와 목표 구조 사이의 이동표
- `contracts/`: 공통 ID, 상태, read model, integration contract
- `decisions/`: 왜 이런 구조를 택했는지에 대한 결정 기록과 spec
- `rollout/`: 이행 순서, 계획, handoff, checklist
- `archive/`: 더 이상 정본이 아닌 문서 보관

실행 코드, compose, env, seed script는 이 폴더에 두지 않는다.
