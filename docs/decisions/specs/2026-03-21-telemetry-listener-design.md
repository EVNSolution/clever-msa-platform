# Telemetry Listener 디자인

## 목적

이 문서는 `service-telemetry-listener`의 1차 경계와 역할을 고정하기 위한 설계 문서다.

이번 설계의 목표는 세 가지다.

1. MQTT 수신 책임을 `service-telemetry-hub` 정본 저장 책임과 분리한다.
2. listener를 `broker subscribe + payload forwarding` 전용 ingress worker로 고정한다.
3. raw payload는 source identity 해석 실패 여부와 무관하게 항상 저장 시도하도록 규칙을 고정한다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-telemetry-listener`의 서비스 경계
2. MQTT message 처리 흐름
3. `service-telemetry-hub` HTTP ingest 연동 규칙
4. source identity 처리 원칙
5. retry / drop / logging 규칙
6. 1차 runtime 형태

## 비스코프

이번 설계에 일부러 포함하지 않는 것은 아래와 같다.

1. RabbitMQ bridge
2. dead-letter queue 실제 구현
3. listener DB 저장소
4. long-term local buffer
5. analytics / anomaly detection
6. operator-facing API
7. vehicle / terminal 정본 수정
8. timeseries query API

## 선택된 접근

이번 설계에서 선택한 구조는 `Listener -> Hub HTTP Ingest`다.

핵심 원칙은 아래와 같다.

1. `service-telemetry-listener`는 MQTT broker 연결과 수신만 담당한다.
2. raw 저장, 정규화, snapshot, diagnostic 갱신은 모두 `service-telemetry-hub`가 담당한다.
3. listener는 `service-telemetry-hub`의 `POST /api/telemetry/ingest/raw/`만 호출한다.
4. listener는 DB를 직접 쓰지 않는다.
5. listener는 hub 내부 코드를 import하지 않는다.

이 접근을 고른 이유는 아래와 같다.

1. telemetry 정본 쓰기 경계를 hub로 유지할 수 있다.
2. listener를 stateless ingress worker로 유지할 수 있다.
3. broker 연결 장애와 hub 저장 장애를 분리해서 다룰 수 있다.
4. 이후 재처리나 dead-letter 확장 시 listener를 독립적으로 키울 수 있다.

## 서비스 경계

### 1. service-telemetry-listener

`service-telemetry-listener`는 MQTT ingress worker다.

소유 책임:

- broker 연결
- topic subscribe
- payload 수신
- hub ingest HTTP 호출
- retry
- error logging

이 서비스가 답하는 질문:

1. 어떤 topic에서 어떤 payload를 받았는가
2. 이 payload를 hub ingest에 성공적으로 전달했는가
3. 재시도해야 하는 실패인가, drop해야 하는 실패인가

이 서비스가 답하지 않는 질문:

1. raw payload가 최종적으로 어떻게 저장되는가
2. timeseries가 어떻게 정규화되는가
3. latest snapshot이 어떻게 갱신되는가
4. diagnostic event가 어떻게 저장되는가
5. vehicle / terminal 정본이 무엇인가

### 2. service-telemetry-hub 와의 관계

관계는 아래처럼 고정한다.

- `service-telemetry-listener`
  - MQTT subscribe
  - message forwarding
- `service-telemetry-hub`
  - raw ingest 저장
  - normalized timeseries 저장
  - latest snapshot 갱신
  - diagnostic event 저장

listener의 성공 기준은 hub ingest 호출 성공까지다. 이후 raw 저장과 정규화 성공 여부는 hub 응답으로 판단한다.

## 메시지 처리 흐름

1. MQTT broker에서 메시지 수신
2. listener가 topic, payload, 수신 시각을 읽는다
3. 가능한 경우 `terminal_id`, `vehicle_id`, `message_type`를 추출한다
4. listener가 `POST /api/telemetry/ingest/raw/`를 호출한다
5. hub가 raw 저장 후 정규화와 snapshot / diagnostic 갱신을 처리한다
6. listener는 성공/실패 결과를 로그로 남긴다

핵심은 listener가 payload를 해석하더라도, 정본 쓰기와 도메인 제약 검증은 hub가 맡는다는 점이다.

## Source Identity 원칙

source identity 규칙은 아래처럼 고정한다.

1. `terminal_id`나 `vehicle_id`를 즉시 해석하지 못해도 raw 저장 요청은 항상 보낸다.
2. identity를 일부만 해석할 수 있으면 가능한 값만 채워서 ingest 요청을 보낸다.
3. source identity가 모두 비어 있더라도 raw payload 보관 시도는 유지한다.
4. identity 해석 실패는 listener의 fatal error가 아니라 partial parse로 취급한다.

즉 `raw first`가 원칙이다. 나중에 재처리나 오류 분석을 쉽게 하기 위해서다.

## Retry 와 Drop 규칙

1차 retry 규칙은 단순하게 둔다.

- `timeout`, `connection failure`, `hub 5xx` -> retry
- `hub 4xx` -> drop + error log
- `hub 2xx` -> success log 후 ack 처리

추가 원칙:

1. retry는 listener 내부 정책으로만 처리한다.
2. 장기 보관 queue나 dead-letter 저장은 이번 범위에 넣지 않는다.
3. retry 횟수 초과 시 payload 요약과 실패 사유를 로그에 남긴다.
4. `hub 4xx`는 payload 구조나 허브 validation 문제로 보고 재시도하지 않는다.

후속 확장 메모:

- dead-letter 저장 자체는 이번 listener 1차 범위에 넣지 않는다.
- phase 2에서는 별도 `service-telemetry-dead-letter`가 생기고, listener는 retry exhausted / drop payload를 그 서비스로 전달한다.
- 이때도 listener는 여전히 dead-letter DB를 직접 쓰지 않고 service-to-service API만 호출한다.

## Runtime 형태

1차 runtime은 별도 repo, 별도 컨테이너로 둔다.

- repo 이름: `service-telemetry-listener`
- runtime 성격: stateless worker
- 저장소: 없음
- 외부 의존:
  - MQTT broker
  - `service-telemetry-hub` ingest endpoint

이 선택으로 broker 연결 재시작과 hub API 재시작을 독립적으로 다룰 수 있다.

## 쓰기 권한

listener는 외부 사용자용 write API를 갖지 않는다.

쓰기 성격의 동작은 아래 하나뿐이다.

- `service-telemetry-hub` ingest endpoint 호출

즉 listener는 end-user service가 아니라 infra-facing ingest worker다.

## 금지 규칙

1. listener가 telemetry DB를 직접 쓰면 안 된다.
2. listener가 hub 내부 모듈을 직접 import하면 안 된다.
3. listener가 vehicle / terminal / assignment 정본을 수정하면 안 된다.
4. listener가 analytics나 운영 조회 API를 제공하면 안 된다.
5. listener가 장기 저장 buffer를 자체 구현하면 안 된다.

## 1차 범위 포함

1. MQTT broker 연결
2. topic subscribe
3. payload 수신
4. hub ingest client
5. retry / logging
6. 환경변수 기반 topic / broker 설정

## 1차 범위 제외

1. RabbitMQ bridge
2. dead-letter queue 실제 구현
3. long-term local buffer
4. DB 저장
5. analytics
6. operator-facing API
7. broker 관리 화면

## 완료 기준

1. `service-telemetry-listener`는 MQTT ingress 전용 repo로 분리된다.
2. listener는 hub ingest API만 호출하고 다른 저장 경로를 만들지 않는다.
3. source identity 해석 실패와 무관하게 raw 저장 시도 규칙이 유지된다.
4. retry / drop 규칙이 문서와 구현에서 일치한다.
5. `service-telemetry-hub`의 정본 경계가 listener 도입 후에도 유지된다.
