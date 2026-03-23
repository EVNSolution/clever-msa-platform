# service-telemetry-hub

이 repo는 텔레메트리 수집과 정규화 `hub` runtime을 구현하는 서비스다.

현재 역할:
- raw ingest
- normalized timeseries
- latest snapshot / diagnostic API

미래 역할:
- MQTT 수집 주체 연결
- long-range analytics / history API 확장
- `service-vehicle-operations-view` 최신 telemetry 공급

현재 포함하지 않음:
- 긴 기간 시계열 조회 API
- analytics / anomaly detection
- broker consumer daemon 구현

아키텍처 정본:
- `../../docs/decisions/07-vehicle-terminal-telemetry-assignment-legacy-split.md`
- `../../docs/mappings/`
