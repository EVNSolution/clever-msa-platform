# Telemetry Dead Letter 디자인

## 목적

이 문서는 `service-telemetry-dead-letter`의 1차 경계와 역할을 고정하기 위한 설계 문서다.

이번 설계의 목표는 세 가지다.

1. telemetry ingest 실패 payload를 `service-telemetry-listener`와 분리된 저장 경계로 보관한다.
2. 실패 증거를 append-only로 남겨 운영자가 수동 재처리를 시작할 기준점을 만든다.
3. replay/status workflow를 1차에서 들이지 않고도 실패 분류와 원본 payload 보관을 보장한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-telemetry-dead-letter`의 서비스 경계
2. dead-letter 저장 데이터 계약
3. internal write / admin read 권한 규칙
4. failure class 기준
5. `service-telemetry-listener`, `service-telemetry-hub`와의 관계

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. 자동 replay queue
2. replay status
3. reviewed / ignored / replayed workflow
4. broker DLQ topic 관리
5. telemetry raw/timeseries/snapshot 정본 저장
6. operator-facing repair UI
7. vehicle / terminal / assignment 정본 수정

이 설계는 `service-telemetry-listener` 1차 설계를 덮어쓰는 것이 아니라, 그 다음 단계에서 붙는 후속 축이다.

- `service-telemetry-listener` 1차 완료 기준은 여전히 `hub ingest only`다.
- dead-letter 저장은 phase 2에서 `service-telemetry-dead-letter`를 추가해 확장한다.

## 선택된 접근

이번 설계에서 선택한 구조는 `service-telemetry-dead-letter` 별도 서비스다.

핵심 원칙은 아래와 같다.

1. `service-telemetry-listener`는 ingress worker로 유지한다.
2. 실패 payload 보관은 별도 `service-telemetry-dead-letter`가 맡는다.
3. `service-telemetry-hub`는 telemetry 정본 저장만 유지한다.
4. dead-letter는 상태 없이 append-only로 쌓는다.
5. 수동 재처리는 아직 API가 아니라 운영자 수동 절차로 시작한다.

이 접근을 고른 이유는 아래와 같다.

1. listener가 ingress worker에서 운영 저장소까지 비대해지는 것을 막을 수 있다.
2. 실패 증거 보관과 telemetry 정본 저장을 분리해 경계를 선명하게 유지할 수 있다.
3. 이후 replay/status/workflow를 붙여도 dead-letter 축만 독립적으로 확장할 수 있다.

## 서비스 경계

### 1. service-telemetry-dead-letter

`service-telemetry-dead-letter`는 실패 telemetry payload 보관소다.

소유 책임:

- 실패 payload append-only 저장
- failure class 기록
- 마지막 오류 문자열 기록
- admin-only 조회

이 서비스가 답하는 질문:

1. 어떤 payload가 실패했는가
2. 어디서 왔는가
3. 왜 실패했는가
4. 나중에 수동 재처리할 만큼 정보가 남아 있는가

이 서비스가 답하지 않는 질문:

1. payload를 자동으로 다시 보낼 것인가
2. 이 레코드가 reviewed 상태인가
3. telemetry 정본 저장이 성공했는가
4. vehicle / terminal / assignment 정본이 무엇인가

### 2. listener / hub 와의 관계

관계는 아래처럼 고정한다.

- `service-telemetry-listener`
  - MQTT subscribe
  - parse
  - hub forward
  - retry / drop 판단
- `service-telemetry-dead-letter`
  - 실패 payload append-only 저장
  - admin 조회
- `service-telemetry-hub`
  - raw ingest 정본
  - normalized timeseries
  - latest snapshot
  - diagnostic event

dead-letter는 telemetry 정본이 아니라 실패 증거 보관소다.

## 데이터 계약

1차는 단일 append-only 테이블 `telemetry_dead_letter`로 간다.

필드:

- `telemetry_dead_letter_id`
- `source_service`
- `message_topic`
- `source_terminal_id?`
- `source_vehicle_id?`
- `message_type?`
- `payload_json`
- `received_at`
- `failure_class`
- `error_message`
- `retry_attempts`
- `failure_fingerprint`
- `failed_at`

의미는 아래와 같다.

- `source_service`
  - 현재는 `service-telemetry-listener`
  - 이후 필요 시 `service-telemetry-hub` 같은 내부 생산자도 허용 가능
- `payload_json`
  - 실패 당시 재처리에 필요한 원본 payload 전체
- `received_at`
  - listener가 broker에서 payload를 받은 시각
- `error_message`
  - 마지막 실패 사유 요약 문자열
- `retry_attempts`
  - dead-letter로 떨어질 때까지 시도한 횟수
- `failure_fingerprint`
  - 동일 실패를 묶어 볼 수 있는 dedupe/추적용 fingerprint
- `failed_at`
  - dead-letter 저장 시각

참고:

- MQTT는 Kafka처럼 `partition` / `offset`을 제공하지 않으므로 1차 계약에 넣지 않는다.
- 1차 추적 기준은 `message_topic + received_at + failure_fingerprint` 조합으로 본다.

## Failure Class

1차 failure class는 아래 다섯 개로 고정한다.

- `parse_error`
- `hub_4xx`
- `hub_5xx_retry_exhausted`
- `connection_failure_retry_exhausted`
- `timeout_retry_exhausted`

의미는 아래와 같다.

- `parse_error`
  - listener가 payload를 hub ingest envelope로 만들지 못한 경우
- `hub_4xx`
  - hub가 payload 구조나 validation 문제로 drop한 경우
- `hub_5xx_retry_exhausted`
  - hub 5xx가 반복돼 retry 한도를 넘긴 경우
- `connection_failure_retry_exhausted`
  - hub 연결 실패가 반복돼 retry 한도를 넘긴 경우
- `timeout_retry_exhausted`
  - hub timeout이 반복돼 retry 한도를 넘긴 경우

## 쓰기 권한

1차 write는 내부 호출만 허용한다.

- `POST /api/telemetry-dead-letters/ingest/`
  - `service-telemetry-listener` internal key 허용
  - 이후 필요 시 `service-telemetry-hub` internal key 허용

원칙:

1. end-user JWT로 dead-letter write를 열지 않는다.
2. listener는 DB를 직접 쓰지 않고 dead-letter ingest API만 호출한다.
3. hub도 dead-letter DB를 직접 쓰지 않는다.

1차 internal auth 계약:

- header 이름: `X-Telemetry-Dead-Letter-Key`
- 값: env-configured shared secret
- end-user JWT와 분리된 내부 서비스 간 인증만 허용
- producer service별로 별도 key를 둔다
- 1차는 static shared secret + internal network trust 모델로 시작한다
- key rotation은 dual-key overlap 또는 rolling restart 가능한 구조를 구현 계획에서 고정한다
- request signing, nonce, body-level replay mitigation은 1차 범위 밖이다

## 조회 권한

1차 read는 admin-only로 둔다.

- `GET /api/telemetry-dead-letters/health/`
- `GET /api/telemetry-dead-letters/`
- `GET /api/telemetry-dead-letters/{telemetry_dead_letter_id}/`

일반 운영 사용자와 외부 시스템에는 열지 않는다.

추가 원칙:

- `health`는 기존 플랫폼 health 관례를 따라 unauthenticated 로 고정한다.
- 목록 endpoint는 pagination을 기본값으로 둔다.
- 목록 정렬은 `failed_at desc`를 기본으로 둔다.
- 1차 filter는 `failure_class`, `source_service`, `failed_at from/to` 정도만 허용한다.

## 처리 흐름

현재 1차 흐름은 아래처럼 고정한다.

1. MQTT broker에서 메시지 수신
2. `service-telemetry-listener`가 parse / hub forward 시도
3. 성공하면 종료
4. `parse_error`, `hub_4xx`, `retry exhausted`면 `service-telemetry-dead-letter`에 저장
5. 운영자는 dead-letter를 조회한다
6. 재처리는 아직 수동 절차로만 시작한다

핵심은 listener가 실패 payload를 버리지 않고 별도 증거 보관소에 남긴다는 점이다.

운영 guardrail:

- append-only는 무기한 무제한 저장을 뜻하지 않는다.
- 1차 구현은 config-driven `retention_days`와 `max_payload_bytes`를 가져야 한다.
- 기본 운영 정책과 archive 절차는 구현 계획에서 고정한다.

## 수동 재처리 원칙

1차에서는 replay API를 열지 않는다.

대신 운영자는:

1. dead-letter detail에서 원본 payload와 실패 사유를 본다
2. 필요하면 payload를 복사한다
3. management command나 운영자 수동 호출로 재처리를 시작한다

즉 dead-letter는 자동 복구기가 아니라 수동 복구 출발점이다.

## 금지 규칙

1. dead-letter가 telemetry raw/timeseries/snapshot 정본을 소유하면 안 된다.
2. dead-letter가 replay status workflow를 1차에 들이면 안 된다.
3. dead-letter가 broker 관리나 retry 정책을 직접 실행하면 안 된다.
4. dead-letter가 vehicle / terminal / assignment 정본을 수정하면 안 된다.
5. listener와 hub가 dead-letter DB를 직접 쓰면 안 된다.

## 완료 기준

1. `service-telemetry-dead-letter`의 별도 repo/service 경계가 플랫폼 문서에 고정된다.
2. 실패 payload는 append-only로 저장된다.
3. `received_at`, `retry_attempts`, `failure_fingerprint`, `failure_class`, `error_message`가 남는다.
4. write는 internal-only, read는 admin-only로 제한된다.
5. 수동 재처리 시작점은 제공하지만 자동 replay/status workflow는 아직 들이지 않는다.
