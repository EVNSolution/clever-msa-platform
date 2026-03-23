# Telemetry Hub 디자인

## 목적

이 문서는 `service-telemetry-hub`의 1차 경계와 소유 데이터를 고정하기 위한 설계 문서다.

이번 설계의 목표는 세 가지다.

1. 텔레메트리를 `시계열 저장 전제 + snapshot 우선 API` 축으로 고정한다.
2. 위치, diagnostic, raw ingress를 `Terminal Registry`나 `Vehicle Registry` 밖으로 분리한다.
3. `Vehicle Ops`가 읽을 최신 상태의 기준점을 `Telemetry Hub`로 고정한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `telemetry_raw_ingest`
2. `telemetry_timeseries`
3. `vehicle_location_snapshot`
4. `diagnostic_event`
5. 상태값과 제약
6. 1차 API surface

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. 긴 기간 시계열 조회 API
2. 분석/통계 API
3. anomaly detection
4. vehicle master 수정
5. terminal registry 수정
6. driver assignment 수정
7. handover workflow
8. broker/MQTT consumer 구현 상세

## 선택된 접근

이번 설계에서 선택한 구조는 `시계열 저장 전제 + snapshot 우선 API`다.

핵심 원칙은 아래와 같다.

1. 내부 저장은 time-series 성격을 전제로 둔다.
2. 외부 1차 계약은 latest snapshot과 latest diagnostic 위주로 제한한다.
3. raw ingress와 정규화된 timeseries는 append-only로 유지한다.

## 서비스 경계

`service-telemetry-hub`는 아래 네 축을 소유한다.

- `telemetry_raw_ingest`
- `telemetry_timeseries`
- `vehicle_location_snapshot`
- `diagnostic_event`

이 서비스가 답하는 질문:

1. 최근 차량 위치는 무엇인가
2. 최근 수집 상태는 유효한가
3. 최근 diagnostic/fault 이벤트는 무엇인가
4. 원본 ingress와 정규화 시계열이 무엇인가

이 서비스가 답하지 않는 질문:

1. 차량 정본 정보가 무엇인가
2. terminal 자산 정본이 무엇인가
3. 현재 어떤 배송원이 배정돼 있는가
4. handover가 진행 중인가

## Terminal Registry 와의 관계

터미널은 위치를 보내는 source endpoint일 수 있지만, 위치 snapshot의 도메인 정본은 아니다.

관계는 아래처럼 고정한다.

- `service-terminal-registry`
  - 단말 자산 정본
  - 현재 차량 장착 관계
- `service-telemetry-hub`
  - 단말/차량이 보내는 관측 데이터
  - latest snapshot
  - diagnostic/fault

즉 `Telemetry Hub`는 source identity로 `terminal_id`, `vehicle_id`를 참조하지만, terminal 자산 자체를 소유하지 않는다.

## 테이블 초안

### 1. telemetry_raw_ingest

- `telemetry_raw_ingest_id`
- `source_terminal_id`
- `source_vehicle_id`
- `message_topic`
- `message_type`
- `payload_json`
- `received_at`

설명:

- raw ingress 보존용
- append-only

### 2. telemetry_timeseries

- `telemetry_timeseries_id`
- `source_terminal_id`
- `source_vehicle_id`
- `captured_at`
- `lat?`
- `lng?`
- `speed?`
- `battery_soc?`
- `key_status?`
- `payload_version?`

설명:

- 정규화된 시계열 저장
- internal storage는 TimescaleDB 같은 time-series 성격을 전제로 둔다

### 3. vehicle_location_snapshot

- `vehicle_id`
- `terminal_id`
- `lat`
- `lng`
- `captured_at`
- `snapshot_status`

설명:

- latest 위치/상태 조회용
- telemetry 도메인 안에서는 latest 조회 정본으로 본다

### 4. diagnostic_event

- `diagnostic_event_id`
- `vehicle_id`
- `terminal_id`
- `event_code`
- `severity`
- `event_message`
- `captured_at`
- `event_status`

설명:

- 장애/진단 이벤트 저장
- latest 조회와 open/cleared lifecycle을 함께 지원한다

## 상태값

### 1. vehicle_location_snapshot.snapshot_status

- `fresh`
- `stale`
- `unavailable`

의미:

- `fresh`: 최근 수집이 유효한 최신 위치
- `stale`: 마지막 위치는 있으나 최신성이 떨어짐
- `unavailable`: 현재 유효 위치 없음

### 2. diagnostic_event.severity

- `info`
- `warning`
- `critical`

### 3. diagnostic_event.event_status

- `open`
- `cleared`

## 제약

핵심 제약은 아래와 같다.

1. 차량당 latest snapshot은 1개
2. terminal당 latest snapshot도 1개
3. `captured_at`이 더 최신일 때만 snapshot 갱신
4. raw ingest는 append-only
5. timeseries도 append-only
6. snapshot은 latest 조회 최적화용이라 갱신형이다
7. `vehicle_id`, `terminal_id`가 모두 없으면 timeseries 저장 금지
8. 동일 `vehicle_id + event_code + captured_at` diagnostic는 중복 저장 금지

## 쓰기 권한

쓰기 주체는 아래로 제한한다.

- 제조사 연동 주체
- telemetry ingestion 주체

운영사는 아래만 가능하다.

- latest snapshot 조회
- latest diagnostic 조회

운영사는 raw/timeseries/snapshot/diagnostic를 직접 수정하지 않는다.

## 금지 규칙

1. `service-telemetry-hub`가 vehicle master를 수정하면 안 된다.
2. `service-telemetry-hub`가 terminal registry를 수정하면 안 된다.
3. `service-telemetry-hub`가 driver assignment를 수정하면 안 된다.
4. `service-telemetry-hub`가 handover workflow를 소유하면 안 된다.
5. `Vehicle Ops`가 telemetry 상태를 대신 계산해 정본처럼 저장하면 안 된다.

## API Surface

1차 최소 API는 아래와 같다.

- `GET /api/telemetry/health/`
- `GET /api/telemetry/vehicles/{vehicle_id}/latest-location/`
- `GET /api/telemetry/vehicles/{vehicle_id}/latest-diagnostics/`
- `GET /api/telemetry/terminals/{terminal_id}/latest-location/`
- `POST /api/telemetry/ingest/raw/`

내부용 정규화 ingest endpoint는 둘 수 있지만, 1차 공개 계약은 latest snapshot 우선으로 유지한다.

## 후속 확장 지점

현재는 일부러 제외하지만, 후속 후보는 아래와 같다.

1. 기간별 시계열 조회 API
2. 집계/분석 API
3. anomaly detection
4. replay/reprocess 흐름
5. `Vehicle Ops`와의 더 풍부한 상태 계약

## 요약

`service-telemetry-hub`의 1차 역할은 아래와 같다.

1. raw ingress를 보관한다
2. 정규화된 timeseries를 저장한다
3. latest 위치 snapshot을 제공한다
4. latest diagnostic/fault 이벤트를 제공한다

즉 이 서비스는 `흐르는 관측 데이터의 정본`이고, `단말 자산 정본`이나 `차량 정본`, `배정 정본`은 소유하지 않는다.
