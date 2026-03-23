# service-terminal-registry

이 repo는 단말과 장치 `registry` 정본 runtime을 구현하는 서비스다.

현재 역할:
- `terminal_registry`
- `terminal_installation`
- 단말 자산과 현재 차량 장착 관계 관리

아직 포함하지 않음:
- MQTT payload 처리
- 위치 snapshot
- diagnostic/fault
- 배송원 배정

아키텍처 정본:
- `../../docs/decisions/specs/2026-03-20-terminal-registry-design.md`
- `../../docs/mappings/`
