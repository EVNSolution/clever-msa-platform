# Vehicle-Centric Terminal UI Design

## 목적

이 문서는 browser 기준에서 `vehicle`과 `terminal` 정보를 어떻게 묶어 보여줄지 current truth를 고정한다.

이번 결정의 목적은 아래와 같다.

1. vehicle와 terminal의 browser ownership을 vehicle 중심으로 고정한다.
2. standalone terminal page를 target UI에서 제거한다.
3. MQTT + VIN 기반 자동 연결과 실시간 상태 반영을 UI 계약으로 끌어올린다.

## 현재 문제

기존 문서와 화면은 아래 해석을 함께 가지고 있었다.

1. terminal은 분리된 service와 분리된 browser page를 가진다.
2. browser에서 terminal 설치/해제 흐름을 직접 제공한다.
3. vehicle와 terminal의 운영 흐름이 끊겨 있다.

이 구조는 실제 운영 의도와 맞지 않는다.

## 선택된 접근

이번 결정은 아래를 current truth로 고정한다.

1. browser에서는 `vehicle`이 terminal 정보를 소유한다.
2. terminal 정보는 vehicle detail의 하위 블록으로만 본다.
3. browser에서 terminal을 vehicle에 수동 설치하지 않는다.
4. terminal과 vehicle의 연결은 MQTT ingress + `vin` 기준 시스템 자동 연결로 본다.
5. UI는 실시간 상태 반영을 보장해야 한다.

## browser ownership 규칙

1. vehicle list는 운영자가 보는 기본 index다.
2. vehicle detail은 기본 정보, terminal 정보, telemetry freshness를 같이 보여준다.
3. terminal은 browser navigation에서 독립 루트 리소스로 승격하지 않는다.
4. terminal 관련 write action은 browser 1차 흐름에서 제거한다.

## UI 흐름 규칙

1. vehicle의 `C/R/D`는 vehicle list 문맥에서 시작한다.
2. vehicle의 `U`는 vehicle detail에서만 시작한다.
3. vehicle row는 상세 진입만 담당한다.
4. vehicle detail만 update 진입을 가진다.

## terminal 연결 규칙

1. terminal은 MQTT broker를 통해 들어오는 ingress 이벤트와 함께 본다.
2. ingress에는 `vin`이 포함된다고 가정한다.
3. 시스템은 `vin`을 vehicle key로 사용해 terminal 상태를 vehicle에 연결한다.
4. browser는 그 연결 결과만 보여준다.

## 실시간 규칙

1. vehicle list와 vehicle detail은 수동 새로고침 없이 최신 terminal/telemetry 상태를 반영해야 한다.
2. 구현은 live subscription 또는 bounded auto-refresh 중 하나를 택할 수 있다.
3. UI는 아래를 항상 표시해야 한다.
   - latest captured time
   - freshness
   - 연결 여부
   - unavailable / stale 경고

## backend와의 관계

1. `service-terminal-registry`가 현재 active runtime인 사실은 유지된다.
2. 하지만 browser에서는 그 service를 독립 정보 구조로 직접 노출하지 않는다.
3. `service-terminal-registry`와 `service-telemetry-hub`는 vehicle detail을 채우는 source로만 본다.

## 결과

이번 결정으로 아래가 바뀐다.

1. `front-web-console`의 standalone terminal page는 target UI에서 빠진다.
2. `Vehicle Ops`와 admin vehicle detail contract는 terminal/live block을 핵심으로 가진다.
3. `terminal page를 어떻게 분리할지`보다 `vehicle detail에서 무엇을 어떻게 실시간으로 보여줄지`가 우선 과제가 된다.

## 연결 문서

- [../../contracts/05-vehicle-ops-read-model.md](../../contracts/05-vehicle-ops-read-model.md)
- [../../contracts/10-front-ui-rules.md](../../contracts/10-front-ui-rules.md)
- [../../contracts/13-admin-vehicle-and-assignment-pages.md](../../contracts/13-admin-vehicle-and-assignment-pages.md)
- [2026-03-20-terminal-registry-design.md](2026-03-20-terminal-registry-design.md)
