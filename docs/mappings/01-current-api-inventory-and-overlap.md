# 01. Current API Inventory

## 문서 목적

이 문서는 현재 운영 API와 소스코드 구조를 참조하기 위한 현행 상태 문서다.

이번 문서에서는 목표 구조를 정의하지 않고, 아래 사실만 기록한다.

1. 현재 시스템이 어떤 API namespace로 운영되는지
2. 어떤 모듈이 이미 과대해졌는지
3. 어떤 중복 진입점과 레거시 구조가 남아 있는지

## 기준 근거

분해 기준은 2026-03-17 시점의 아래 소스를 함께 사용했다.

- 운영 Swagger: https://api.evnlogistics.com/swagger/#/
- Swagger JSON 요약: 총 519개 path
- 서버 진입점: `ev-dashboard-server/src/ev_dashboard/urls.py`
- 서버 namespace URL 파일: `core`, `dashboard`, `documents`, `schedule`, `tip`, `delivery`, `vehicle`, `approval`, `driver_location`, `ticket`, `notifications`, `talentpool`, `map`, `auth`
- 웹 API 설정: `ev-dashboard-web-frontend/src/config/env.ts`
- 드라이버 앱 API 설정: `ev-driver-android/.env`, `.env.production`, `.env.development`
- IVI API 설정: `ev-application-ivi/app/src/main/java/com/evn/ev_ivi/core/services/NetworkService.kt`

## 현재 운영 API 인벤토리

Swagger 기준 상위 namespace 분포는 아래와 같다.

| Namespace | Path 수 | 현재 의미 |
|---|---:|---|
| /api/documents | 119 | 기사 문서, 근태, 정산, 정책, 조직성 메타 일부가 혼합된 대형 도메인 |
| /api/tip | 81 | 배송지 팁, 제한구역, 추천주차, 입구/출구, 즐겨찾기 |
| /api/dashboard | 71 | 터미널, 차량 단말, 트럭 데이터, 진단, 인수인계 |
| /api/schedule | 47 | 스케줄, 매칭, BLE, 카메라 로그, 출근 상세 |
| /api/core | 33 | 유저, 회사, 조직, 계약유형, 플릿 |
| /api/approval | 25 | 결재 워크플로우 |
| /api/talentpool | 25 | 인력 풀, 후보자, 상태, 타임라인 |
| /api/vehicle | 21 | 차량 카드, 정비비, 사고, AS 문의 |
| /api/notifications | 16 | 일반 알림, FCM 토큰, 푸시 로그/템플릿 |
| /api/email | 11 | 이메일 템플릿/로그 |
| /api/users | 11 | 사용자 조회 계열의 구형 진입점 |
| /api/auth | 10 | 토큰, OTP, 소셜 인증 |
| /api/delivery | 10 | 배송 리스트, 배송 로그, 배송지 완료 처리 |
| /api/driver-location | 8 | 기사 위치 기록 |
| /api/regions | 8 | 권역 상세 정보 |
| /api/company | 5 | 회사 조회 계열의 구형 진입점 |
| /api/delivery-plan | 5 | Swagger에는 있으나 현재 로컬 URL 진입점에서 즉시 확인되지 않음 |
| /api/map | 4 | 주차 추천 계열 |
| /api/ticket | 4 | 티켓/응답 |
| /api/announcements | 3 | 공지 |
| /api/mqtt | 2 | MQTT 수집 |

## 현재 구조의 핵심 문제

전체 시스템을 쪼개기 전에 먼저 고정해야 할 현실은 아래와 같다.

### 1. Namespace와 도메인 경계가 1대1이 아니다

- `documents` 안에 기사 문서, 근태, 일/월 정산, 정책, 계좌/사업자 정보, 팀/그룹 성격의 소속 데이터, 연차가 함께 있다.
- `dashboard` 안에 터미널 레지스트리, 트럭 데이터, 단말/진단, 인수인계가 함께 있다.
- `core`와 `/api/users`, `/api/company`가 중복 공존한다.

### 2. 채널별 소비 축이 namespace를 가로지른다

- Web은 `documents`, `dashboard`, `schedule`, `vehicle`, `approval`, `tip`, `ticket`, `notifications`, `talentpool`을 폭넓게 사용한다.
- Driver 앱은 `auth`, `users`, `delivery`, `tip`, `schedule`, `dashboard`, `vehicle`, `driver-location`, `ticket`, `approval`를 가로질러 사용한다.
- IVI는 `auth`, `users`, `schedule`, `dashboard`, `tip`, `map`을 조합해서 사용한다.

### 3. 이미 중복 진입점이 존재한다

- `/api/users` 와 `/api/core/users`
- `/api/company` 와 `/api/core/companies`
- `/api/dashboard/fleet` 와 `/api/core/fleets`

즉 MSA 전환은 단순히 Django app 이름 기준으로 자르는 작업이 아니라, 실제 소비 채널과 쓰기 책임 기준으로 다시 묶는 작업이어야 한다.

## 현재 중복/정리 필요 포인트

### A. 구형 진입점과 core 진입점 중복

- `/api/users` 와 `/api/core/users`
- `/api/company` 와 `/api/core/companies`

이 둘은 MSA 이전이라도 통합 기준을 잡아야 한다.

### B. documents의 과대 비대화

`documents`는 아래를 동시에 가진다.

- 기사 프로필
- 근태
- 정산
- 계좌/사업자 문서
- 회사/플릿 소속 참조
- 정책/설정

향후 가장 먼저 잘라야 할 모듈이다.

### C. dashboard의 역할 과밀

`dashboard`는 아래를 동시에 가진다.

- 터미널 자산
- 차량 단말 상태
- 인수인계
- 트럭 데이터
- 진단/고장 코드

운영 자산과 텔레메트리 수집을 분리할 여지가 크다.

### D. Swagger와 로컬 코드 차이

Swagger에는 `/api/delivery-plan` path가 보이지만 현재 로컬 URL 진입점에서는 즉시 확인되지 않았다.

이 항목은 이후 별도 점검 대상이다.

## 다음 참조 문서

- `02-current-api-consumer-reference.md`
