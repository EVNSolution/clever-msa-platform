# Implementation Plan: Cheonha Driver App Minimum Phase-1 (Finalized)

이 계획은 `천하운수` 배송원 앱 최소 개발 범위를 위한 백엔드 및 앱 구현 단계를 정의합니다.

## 1. Status Summary (2026-04-21)

- [x] **설계 보완:** P1/P2 이슈(연락처, 자동 로그인, 관리자 UX, 연동 가이드) 반영 완료.
- [x] **백엔드(Auth):** tenant_code 기반 가입 및 PhoneCredential 자동 생성 구현 완료.
- [x] **백엔드(Read Model):** 업무기록 조합 API(`work-logs`) 구현 완료.
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

## 3. Remaining Frontend (App) Tasks

### Task 1: Auth & Signup Layout
- [ ] `tenant_code: "cheonha"` 고정 및 가입 요청 payload 구성.
- [ ] 연락처/생년월일 텍스트 마스킹 처리 (010-0000-0000 / YYYY-MM-DD).
- [ ] 자동 로그인 체크 여부에 따른 Cookie Persistent 설정.

### Task 2: Work Logs View
- [ ] 일자별 카드 리스트 UI 구현.
- [ ] `needs_link` 상태일 경우 Blur 배경 및 "배송원 연동 필요" 안내 문구 노출.
- [ ] 데이터가 없는 날짜에 대한 빈 상태 처리.

### Task 3: MY Page & Admin Screen
- [ ] 기사 프로필 정보 표시 및 비밀번호 변경 UI.
- [ ] 시스템 관리자 계정 로그인 시 메뉴 없이 로그아웃만 있는 빈 화면 노출.

## 4. Final Validation Plan

### 4.1 통합 테스트 시나리오
1. **가입:** `cheonha` 코드로 가입 후 즉시 승인되는지 확인.
2. **연동 전 조회:** 가입 직후 업무기록 화면에서 `연동 필요` 가이드가 정상적으로 뜨는지 확인.
3. **연동 후 조회:** (백엔드에서 수동 연동 후) 근태 및 배송 데이터가 날짜별로 잘 나오는지 확인.
4. **자동 로그인:** 앱 종료 후 재실행 시 세션이 유지되는지(체크 시) 확인.
