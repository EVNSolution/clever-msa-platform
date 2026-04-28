# Implementation Plan: Cheonha Driver App Minimum Phase-1 (Finalized)

이 계획은 `천하운수` 배송원 앱 최소 개발 범위를 위한 백엔드 및 앱 구현 단계를 정의합니다.

## 1. Status Summary (2026-04-21)

- [x] **설계 보완:** P1/P2 이슈(연락처, 자동 로그인, 관리자 UX, 연동 가이드) 반영 완료.
- [x] **백엔드(Auth):** tenant_code 기반 가입 및 PhoneCredential 자동 생성 구현 완료.
- [x] **백엔드(Read Model):** 업무기록 조합 API(`work-logs`) 구현 완료.
- [x] **백엔드(Settlement Read):** Track A `daily-settlements` + `me/settlement-calendar` 구현 완료.
- [ ] **앱 개발:** 진행 예정.

## 2. Completed Backend Tasks

### 2.1 service-account-access
- `IdentitySignupIntakeSerializer`가 `tenant_code`를 수용하여 `company_id`를 자동 해석하도록 수정.
- `SignupIntakeService`에서 `contact_phone_number`를 `PhoneCredential`로 저장.
- 프로필 조회 시 `contact_phone_number` 반환 로직 추가.
- `test_cheonha_signup.py`를 통한 검증 완료.

### 2.2 service-driver-operations-view
- `GET /api/driver-ops/me/work-logs/` 엔드포인트 신규 구현.
- `attendance-registry`와 `delivery-record` 데이터를 조합하여 날짜별 내림차순 카드 배열 반환.
- `test_work_logs.py`를 통한 검증 완료.

### 2.3 Track A Settlement Read
- `service-settlement-payroll`가 day-level settlement amount truth를 제공하도록 정리.
- `service-settlement-operations-view`가 payroll truth에 `daily_delivery_input_snapshot_id`를 enrich하는 외부 read owner로 구현.
- `service-driver-operations-view`가 `GET /api/driver-ops/me/settlement-calendar/` facade와 `needs_link` 상태를 구현.
- `edge-api-gateway` public OpenAPI 및 parity fixture 갱신 완료.

## 3. Remaining Frontend (App) Tasks

### Task 1: Auth & Signup Layout
- [ ] `tenant_code: "cheonha"` 고정 및 가입 요청 payload 구성.
- [ ] 연락처/생년월일 텍스트 마스킹 처리 (010-0000-0000 / YYYY-MM-DD).
- [ ] 자동 로그인 체크 여부에 따른 Cookie Persistent 설정.
- [ ] 로그인/회원가입 화면을 승인된 `Space Grotesk + Pretendard`, `lime accent`, `quiet ops` 톤으로 재구성.
- [ ] 회원가입 validation UX를 `입력 전 숨김 / 오류 시 빨간 경고문` 규칙으로 맞춤.

### Task 2: Work Logs View
- [ ] 승인된 `tight 7-column monthly grid` UI 구현.
- [ ] 각 날짜 셀에 `박스 수 + 금액` 노출 및 `일반(초록) / 특근(주황)` 네온 마커 적용.
- [ ] 상단 `month selector + legend`, 하단 `금월 실적 3카드 + 정산 문의하기` 구조 구현.
- [ ] `정산 금액 / 일반 / 특근` 표현은 `GET /api/driver-ops/me/settlement-calendar/`를 사용하고, `work-logs` 응답 의미와 섞지 않기.
- [ ] `needs_link` 상태일 경우 Blur 배경 및 "배송원 연동 필요" 안내 문구 노출.
- [ ] `needs_link` 상태에서 카드 내부 최하단 `계정 연동 요청` 버튼과 2열 상태/문의 메타 구조 적용.
- [ ] 데이터가 없는 날짜에 대한 빈 상태 처리.
- [ ] 로딩/오류 상태 화면을 승인된 별도 state surface로 정리.

### Task 3: MY Page & Admin Screen
- [ ] 기사 프로필 정보 표시 및 비밀번호 변경 UI.
- [ ] 시스템 관리자 계정 로그인 시 메뉴 없이 로그아웃만 있는 빈 화면 노출.
- [ ] `MY`를 승인된 `flat sections` 구조와 공통 typography/surface 규칙으로 재구성.

### Task 4: Settlement Inquiry Flow
- [ ] `정산 문의하기` 진입 시 단일 누적 채팅방 surface 구현.
- [ ] `정산 기준 첨부` 토글, 첨부 미리보기, `chat-only` / `chat + metadata` 전송 규칙 구현.
- [ ] `정산 문의 날짜 선택` 화면을 업무기록과 동일한 월간 그리드 규칙으로 구현.
- [ ] 날짜 선택 결과를 채팅 첨부 미리보기에 반영하고, 전송 시 `message + daily snapshot reference` 계약으로 연결 준비.
- [ ] 날짜 선택 및 첨부 요약은 `GET /api/driver-ops/me/settlement-calendar/`의 Track A 정본 필드를 사용하기.

## 4. Final Validation Plan

### 4.1 통합 테스트 시나리오
1. **가입:** `cheonha` 코드로 가입 후 즉시 승인되는지 확인.
2. **연동 전 조회:** 가입 직후 업무기록 화면에서 `연동 필요` 가이드가 정상적으로 뜨는지 확인.
3. **연동 후 조회:** (백엔드에서 수동 연동 후) 근태 및 배송 데이터가 날짜별로 잘 나오는지 확인.
4. **자동 로그인:** 앱 종료 후 재실행 시 세션이 유지되는지(체크 시) 확인.
5. **상태 화면:** `loading / empty / needs_link / error`가 승인된 surface와 액션 위치로 보이는지 확인.
6. **정산 문의:** 날짜 선택 후 첨부 preview가 채팅 화면에 반영되고, 첨부 ON/OFF에 따라 전송 payload가 달라지는지 확인.
