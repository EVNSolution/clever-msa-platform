# Settlement Upload-First Shell UI Implementation Plan

**Goal:** `front-admin-console`의 `정산 입력 / 정산 실행 / 정산 결과`를 upload-first 운영 흐름 기준 shell UI로 다시 정리한다.

**Architecture:** 기존 settlement group route는 유지하고, `SettlementSectionLayout`이 `company / fleet` 문맥을 유지한다. 각 페이지는 현재 API를 그대로 읽으면서 `업로드 -> 검증 -> 실행 -> 결과` 흐름을 먼저 shell UI로 드러내고, 실제 업로드/검증 API는 gap으로 남긴다.

**Tech Stack:** React, React Router, Vitest, existing admin front API clients

---

## 범위

1. `SettlementSectionLayout`에 공통 문맥 bar를 추가한다.
2. `SettlementInputsPage`를 업로드-first shell로 바꾼다.
3. `SettlementRunsPage`에 실행 readiness / handoff를 넣는다.
4. `SettlementResultsPage`에 결과 요약 / 예외 shell을 넣는다.
5. 실제 업로드 API는 만들지 않는다.

## 작업 순서

1. 정산 shell UI 테스트를 먼저 추가한다.
2. layout context와 page shell을 최소 구현으로 맞춘다.
3. 전체 admin front 테스트와 build를 다시 검증한다.
4. docs audit를 shell 기준으로 갱신한다.
