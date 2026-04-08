# Ops-Derived Local Fixture Design

## 목적

운영 DB의 실제 관계와 분포를 그대로 복제하지 않고, 읽기 전용으로 최소 분포만 추출해 로컬 Docker 스택에서 반복 가능한 더미 fixture로 재생성한다.

핵심 원칙은 세 가지다.
- 운영 DB에는 읽기 전용으로만 접근한다.
- 개인정보와 식별 가능한 운영 식별자는 모두 가명화한다.
- 로컬 주입은 integration-local-stack이 오케스트레이션하고, 실제 쓰기는 각 서비스 repo의 management command가 수행한다.

## 읽기 범위

운영 DB에서 직접 읽는 범위는 아래 최소 테이블로 고정한다.
- 회사/플릿 분포: core_client, core_fleet
- 기사/배송 분포: documents_dailysettlement, documents_evdeliverylog
- 차량/배차 분포: schedule_drivervehiclematch, schedule_vehicleschedule

1차에서는 아래를 읽지 않는다.
- 개인정보 상세 컬럼
- 파일/문서 바이너리
- 알림/지원/공지 본문
- 인증 계정 비밀번호/토큰류

## 로컬 fixture가 소유할 도메인

1차 fixture는 아래 로컬 서비스만 대상으로 한다.
- organization
- driver-profile
- vehicle-registry
- vehicle-assignment
- dispatch-registry
- delivery-record
- settlement-payroll

announcement, support, notification, telemetry, personnel-document는 기존 deterministic seed를 유지한다.

## 정제 규칙

### 이름/식별자
- 회사명은 운영 이름을 그대로 쓰지 않고 `Ops Company A`, `Ops Company B`처럼 재기명한다.
- 플릿명은 `Ops Fleet A-1` 형식으로 재기명한다.
- 기사명은 `Ops Driver 01` 형식으로 재기명한다.
- 전화번호는 `010-9000-xxxx` 규칙으로 재생성한다.
- 차량번호는 실제 번호판을 쓰지 않고 `12가34xx` 형식으로 재생성한다.
- source reference, 외부 route 값, upload id는 전부 synthetic 문자열로 바꾼다.

### 분포 보존
- 회사/플릿의 상대적 규모 순서는 유지한다.
- 최근 배송량, 기사 수, 차량 수의 비율은 최대한 유지하되 로컬 규모로 축소한다.
- 로컬 규모 상한:
  - 회사 최대 3개
  - 플릿 최대 6개
  - 플릿당 기사 최대 12명
  - 플릿당 차량 최대 8대
  - 플릿당 dispatch unit 최대 8개

### 날짜/수량
- 날짜는 현재 로컬 테스트 시점 기준 최근 7일 안으로 재배치한다.
- 박스 수, 가구 수, 금액은 운영 분포를 비율만 참고해 축소한다.
- settlement 금액은 원단위 반올림한 synthetic 수치로 저장한다.

## Fixture JSON 계약

파일 위치:
- development/integration-local-stack/fixtures/ops-derived-sample.json

상위 구조:
- source_summary
- organizations
- drivers
- vehicles
- assignments
- dispatch
- delivery_records
- settlements

필드 원칙:
- 각 항목은 로컬 UUID를 정본으로 가진다.
- production legacy id는 `source_summary`의 참고 메타 또는 각 항목의 `source_key` 수준으로만 남긴다.
- 서비스 import command는 자기 도메인 섹션만 읽는다.

## 생성 절차

1. Dev EC2를 경유해 운영 DB read-only 쿼리를 실행한다.
2. 최소 분포를 JSON intermediate 형태로 수집한다.
3. 로컬 fixture generator가 가명화/축소/UUID 부여를 수행한다.
4. 생성된 fixture JSON을 integration-local-stack 아래에 저장한다.
5. seed-runner는 opt-in 모드에서 기본 seed 후 fixture import command들을 순차 실행한다.

## 주입 절차

기본 seed는 그대로 유지한다.
fixture import는 별도 opt-in 환경 변수로 켠다.

예상 흐름:
1. migrate + 기존 deterministic seed
2. fixture import organization
3. fixture import drivers
4. fixture import vehicles
5. fixture import assignments
6. fixture import dispatch
7. fixture import delivery_records
8. fixture import settlements

## 검증 기준

로컬 검증은 아래를 만족해야 한다.
- 웹 콘솔에서 회사/플릿/기사/차량/배차/정산 목록이 단건 seed가 아니라 다건 분포로 보인다.
- gateway route smoke가 통과한다.
- import command는 재실행 시 중복을 만들지 않는다.
- 운영 실명, 실제 전화번호, 실제 차량번호가 fixture에 남지 않는다.
