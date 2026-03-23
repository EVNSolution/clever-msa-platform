# service-telemetry-dead-letter

이 repo는 실패한 telemetry payload를 보관하는 `dead-letter` runtime shell이다.

현재 역할:
- failed telemetry payload append-only store
- internal write / admin read 경계의 서비스 shell
- health endpoint를 포함한 Django service scaffold

미래 역할:
- replay/status workflow의 출발점
- 운영자가 수동 재처리를 시작하는 관리 축

이 repo가 소유하지 않는 것:
- telemetry raw / timeseries / snapshot 정본
- 자동 replay
- broker retry 정책
- vehicle / terminal / assignment 정본 수정

의존 서비스:
- `service-telemetry-listener`
- `service-telemetry-hub`

아키텍처 정본:
- `../../docs/decisions/specs/2026-03-21-telemetry-dead-letter-design.md`
- `../../docs/mappings/`

