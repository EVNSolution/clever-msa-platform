# 15. UI-First Working Mode

## 문서 목적

이 문서는 2026-03-31부터 적용하는 현재 작업 방식을 고정한다.

지금 단계에서는 신규 서비스 확장보다 UI 흐름 정의를 먼저 끝내고, 그 뒤 필요한 API gap만 메우는 방식을 current truth로 본다.

## 현재 작업 모드

1. 현재 모드는 `UI-first working mode`다.
2. 광범위한 신규 서비스 구현은 잠시 멈춘다.
3. 도메인별 화면 구조, 라우트, 입력 방식, shared read 범위를 먼저 고정한다.
4. 서비스/API 작업은 UI가 요구한 gap을 메우는 범위로만 다시 연다.

## 이 방식을 쓰는 이유

1. 서비스 경계와 계획이 명확해도 UI가 마음에 들지 않으면 화면 책임, 기능 분리, API shape가 다시 바뀐다.
2. 지금은 신규 서비스 뼈대보다 운영형 화면 흐름의 불확실성이 더 크다.
3. 이 시점에 backend를 먼저 깊게 만들면 되돌리는 비용이 커진다.
4. UI를 먼저 고정하면 서비스/API는 필요한 만큼만 구현하게 된다.

## 현재 기본 순서

1. `docs/contracts`에 화면 계약을 먼저 쓴다.
2. `front-web-console` 단일 웹에 shell UI를 만든다.
3. UI 기준으로 필요한 API gap을 문서화한다.
4. 그 gap만 해당 `service-*` repo에서 구현한다.
5. 다시 UI를 붙여 검증하고, 필요하면 계약 문서를 갱신한다.

## 도메인별 정의 단위

각 도메인은 아래를 먼저 정한다.

1. `admin / operator / shared` 소속
2. 목록 / 상세 / 생성 / 수정 구조
3. row click / modal / full-page form 규칙
4. 단계 흐름이 필요한지 여부
5. 어떤 값이 기본 화면에 보여야 하는지
6. 어떤 API가 부족한지

## 서비스/API 작업 제한

1. UI 계약 없이 backend 범위를 먼저 키우지 않는다.
2. 화면에서 아직 쓰지 않는 추정 API를 미리 만들지 않는다.
3. 정본 서비스 경계는 그대로 유지한다.
4. read-model은 UI 소비를 위해서만 확장한다.
5. UI blocking gap이 아닌 기능 확장은 `final phase` 후보로 남긴다.

## 문서 운영 방식

1. 이 문서는 `현재 활성 작업 방식`을 담는 living rollout 문서다.
2. 파일명은 날짜형이 아니라 순번형으로 유지한다.
3. 작은 조정은 이 문서를 직접 갱신한다.
4. 작업 방식이 크게 바뀌면, 기존 내용은 `docs/archive/historical/rollout/`로 옮기고 이 문서를 새 current truth로 다시 쓴다.
5. archive 파일명은 `YYYY-MM-DD-ui-first-working-mode.md` 형태를 사용한다.

## 현재 적용 범위

1. `정산` UI 흐름 정리
2. `단말기`, `차량 배정`, `차량`, `배송원` UI 정리
3. 권한 기반 뷰 구분과 shared read 범위 정리
4. route, modal, table, detail UX 정리

## 비스코프

1. 이 문서는 최종 도메인 로드맵 전체를 다시 쓰지 않는다.
2. 이 문서는 개별 서비스 구현 상세 설계를 대체하지 않는다.
3. 이 문서는 final phase 기능 확장 우선순위를 새로 정하지 않는다.

## 연결 문서

- [10-front-ui-rules.md](../contracts/10-front-ui-rules.md)
- [14-front-ui-rule-audit.md](14-front-ui-rule-audit.md)
- [11-final-phase-feature-backlog.md](11-final-phase-feature-backlog.md)
