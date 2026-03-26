# Region Analytics Phase 1 Activation 디자인

## 목적

이 문서는 `service-region-analytics`를 empty shell에서 1차 runtime으로 승격하기 위한 최소 경계와 구현 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-region-analytics`를 권역별 배송 통계와 성과 분석 runtime으로 활성화한다.
2. `service-region-registry`의 기준 마스터와 `service-region-analytics`의 분석 snapshot 경계를 실제 runtime 구조로 내린다.
3. 자동 집계 fan-in 없이도 local stack, gateway, API docs에서 읽을 수 있는 최소 analytics runtime을 연다.
4. `service-notification-hub`만 남는 상태로 empty-shell backlog를 줄인다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-region-analytics` 1차 runtime의 역할 정의
2. 권역 일별 통계 / 성과 요약 엔티티 2종의 ownership과 최소 필드 정의
3. 외부 route, compose service naming, auth 기준 정의
4. local seed와 최소 검증 기준 정의
5. API docs 반영 기준 정의

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. region master writes
2. delivery / dispatch service의 실시간 fan-in 집계
3. route recommendation
4. 지도 / 추천 기능 연결
5. ranking 전용 read endpoint
6. public analytics API

## 현재 상태

현재 문서 기준 사실은 아래와 같다.

1. `service-region-analytics`는 `empty shell` 상태다.
2. 이 repo의 현재 역할은 `권역별 배송 통계와 성과 분석`이다.
3. `service-region-registry`는 이미 active runtime이며 `권역 분석의 입력 축`으로 정의돼 있다.
4. `service-region-analytics`는 `region master writes`, `telemetry ingest`, `planning truth writes`를 소유하지 않는다.
5. legacy route는 `region analytics` 전용 namespace를 제공하지 않는다.

즉 지금 필요한 것은 권역 분석 결과를 저장하고 읽는 최소 runtime 활성화이지, region-registry 또는 delivery/dispatch를 다시 비대화하는 것이 아니다.

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `service-region-analytics`는 `RegionDailyStatistic`, `RegionPerformanceSummary` 두 aggregate로 시작한다.
2. 외부 route는 새 namespace로 `/api/region-analytics/`를 사용한다.
3. phase 1 데이터는 external fan-in 없이 analytics snapshot truth로 직접 관리한다.
4. 모든 read/write API는 admin-authenticated management API로 시작한다.
5. region-registry / delivery / dispatch consumer는 후속 단계로 남긴다.

이 접근을 선택한 이유는 아래와 같다.

1. 현재 문서가 요구하는 핵심은 `권역별 통계`와 `권역 성과 분석` 경계의 runtime화다.
2. region-registry와 analytics를 분리한 현재 문서 경계를 그대로 지킬 수 있다.
3. legacy 전용 route가 없으므로 새 namespace를 열어도 기존 route와 충돌하지 않는다.
4. 자동 집계 fan-in을 같이 넣으면 외부 계약이 필요해지고, 현재 empty-shell 제거 범위를 넘는다.

## 서비스 경계

### `service-region-analytics`가 직접 소유하는 것

1. 권역 일별 배송 통계 snapshot
2. 권역 기간별 성과 요약 snapshot
3. 분석 결과 lifecycle을 위한 region code / difficulty snapshot 필드

### `service-region-analytics`가 소유하지 않는 것

1. 권역 기준 마스터 쓰기
2. dispatch planning truth
3. delivery source truth
4. telemetry ingest
5. route recommendation
6. 지도 / 추천 기능

## 엔티티 구조

### 1. `RegionDailyStatistic`

역할:

1. 권역 일별 운영 통계 snapshot
2. 성과 요약의 입력이 되는 기본 analytics dataset

최소 필드 방향:

1. `region_daily_statistic_id`
2. `region_id`
3. `region_code_snapshot`
4. `service_date`
5. `delivery_count`
6. `completed_delivery_count`
7. `exception_delivery_count`
8. `total_distance_km`
9. `total_base_amount`
10. `average_delivery_minutes`

필드 규칙:

1. `region_id + service_date`는 unique다.
2. `completed_delivery_count`는 `delivery_count`보다 클 수 없다.
3. `exception_delivery_count`는 `delivery_count`보다 클 수 없다.
4. `completed_delivery_count + exception_delivery_count`는 `delivery_count`보다 클 수 없다.

### 2. `RegionPerformanceSummary`

역할:

1. 기간 단위 권역 성과 요약 snapshot
2. 권역 비교 분석의 upstream summary dataset

최소 필드 방향:

1. `region_performance_summary_id`
2. `region_id`
3. `region_code_snapshot`
4. `difficulty_level_snapshot`
5. `period_start`
6. `period_end`
7. `delivery_count`
8. `completion_rate`
9. `productivity_score`
10. `cost_per_delivery`
11. `notes`

필드 규칙:

1. `region_id + period_start + period_end`는 unique다.
2. `period_end`는 `period_start`보다 빠를 수 없다.
3. `completion_rate`는 `0` 이상 `100` 이하로 제한한다.

## API / Service Naming

1차 naming은 아래로 고정한다.

1. compose service: `region-analytics-api`
2. gateway prefix: `/api/region-analytics/`

최소 API shape는 아래와 같다.

1. `GET /api/region-analytics/health/`
2. `GET/POST /api/region-analytics/daily-statistics/`
3. `GET/PATCH /api/region-analytics/daily-statistics/{region_daily_statistic_id}/`
4. `GET/POST /api/region-analytics/performance-summaries/`
5. `GET/PATCH /api/region-analytics/performance-summaries/{region_performance_summary_id}/`

원칙:

1. `GET /api/region-analytics/daily-statistics/`는 `region_id`, `region_code_snapshot`, `service_date` filter를 허용한다.
2. `GET /api/region-analytics/performance-summaries/`는 `region_id`, `region_code_snapshot`, `period_start`, `period_end`, `difficulty_level_snapshot` filter를 허용한다.
3. delete는 1차에서 제공하지 않는다.

## Auth / Permission 기준

1차 auth 기준은 아래와 같다.

1. `health`만 공개
2. analytics CRUD API는 admin-authenticated management API
3. operator-facing analytics read API는 이번 라운드에 포함하지 않는다

## Seed 기준

1차 seed는 최소 2세트를 제공한다.

포함:

1. region-registry seed와 맞는 region ID 2건
2. daily statistics 2건
3. performance summaries 2건

원칙:

1. seed는 analytics snapshot 예시만 보여 준다.
2. region master 데이터는 계속 `service-region-registry`가 소유한다.
3. dispatch / delivery 자동 fan-in은 넣지 않는다.

## API Docs 반영 기준

`service-region-analytics`가 active runtime이 되면 아래 조건을 같이 만족해야 한다.

1. 서비스 자체 OpenAPI export가 가능해야 한다.
2. unified OpenAPI refresh에서 이 서비스가 schema-backed service로 잡혀야 한다.
3. local Swagger preview에서 `/api/region-analytics/`가 보여야 한다.

## 통합 영향

이번 1차 활성화에서 필요한 통합 반영은 아래와 같다.

1. `development/integration-local-stack/` compose에 `region-analytics-api` 추가
2. compose용 env example 추가
3. `development/edge-api-gateway/`에 `/api/region-analytics/` route 추가
4. local seed-runner에 region analytics seed 단계 추가
5. current runtime inventory에서 `service-region-analytics`를 active runtime으로 승격
6. unified OpenAPI refresh 흐름에 region analytics service 반영

## 문서 반영 원칙

최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-to-target-repo-map.md`
4. `docs/mappings/current-runtime-inventory.md`
5. `docs/mappings/repo-responsibility-matrix.md`
6. `development/service-region-analytics/README.md`
7. local stack README
8. 남은 empty-shell 우선순위 문서

핵심 반영 내용:

1. `service-region-analytics`는 더 이상 empty shell이 아니다.
2. 이 repo는 region analytics snapshot만 소유한다.
3. `service-notification-hub`만 empty shell로 남는다.

## 검증 기준

최소 검증 범위는 아래와 같다.

1. `service-region-analytics` 단위 테스트 통과
2. compose config 검증 통과
3. local seed-runner에 region analytics seed가 정상 반영
4. gateway 경유 `/api/region-analytics/health/` 응답 확인
5. admin token으로 analytics list 확인
6. unified OpenAPI refresh와 verify 통과

