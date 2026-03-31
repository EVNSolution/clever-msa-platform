# 13. Admin Terminal And Assignment Pages

## 문서 목적

이 문서는 `front-admin-console`에서 아직 계약 기준을 만족하지 못한 `단말기`, `차량 배정` 화면의 목표 구조를 고정한다.

이번 문서의 목적은 아래 세 가지다.

1. 단말기와 차량 배정의 라우트 구조를 고정한다.
2. 목록 / 상세 / 생성 / 수정의 역할을 분리한다.
3. 어떤 관계 액션을 상세에서 처리할지 고정한다.

## 적용 범위

- `front-admin-console`
- `service-terminal-registry`
- `service-driver-vehicle-assignment`
- `service-vehicle-registry`
- `service-driver-profile`
- `service-organization-registry`

## 기본 원칙

1. `단말기`와 `차량 배정`은 `admin 전용` 화면이다.
2. 목록 화면에 생성 폼이나 수정 폼을 남기지 않는다.
3. 목록 로우 클릭은 상세 진입만 담당한다.
4. 생성과 수정은 별도 라우트에서 1열 폼으로 처리한다.
5. 상태 변경이나 관계 변경은 상세 화면에서만 시작한다.

## 1. 단말기 페이지 계약

### 1.1 콘솔 소속

1. `단말기`는 `admin 전용`이다.
2. operator 콘솔에는 단말기 레지스트리 관리 화면을 두지 않는다.

### 1.2 리소스 구조

1. `terminal`이 상위 리소스다.
2. `terminal-installation`은 `terminal` 하위 관계 리소스다.
3. 설치 이력은 독립 탭이 아니라, 단말기 상세 문맥에서 본다.

### 1.3 라우트

1. `/terminals`
2. `/terminals/new`
3. `/terminals/:terminalRef`
4. `/terminals/:terminalRef/edit`
5. `/terminals/:terminalRef/installations/new`
6. `/terminals/:terminalRef/installations/:installationRef`

### 1.4 화면 역할

1. `/terminals`
   - 단말기 목록만 보여준다.
   - 제조사 회사, 상태, 현재 설치 여부 정도만 요약한다.
   - row click으로 상세에 이동한다.

2. `/terminals/new`
   - 단말기 생성 1열 폼만 둔다.
   - 제조사 회사, IMEI, ICCID, firmware, protocol, app version, 상태만 다룬다.

3. `/terminals/:terminalRef`
   - 단말기 읽기 전용 요약 화면이다.
   - 현재 설치 상태와 설치 이력을 같이 본다.
   - 수정 버튼과 설치 생성 진입 버튼은 이 화면에만 둔다.

4. `/terminals/:terminalRef/edit`
   - 단말기 수정 1열 폼만 둔다.
   - 목록과 설치 목록을 같이 두지 않는다.

5. `/terminals/:terminalRef/installations/new`
   - 설치 생성 1열 폼만 둔다.
   - 현재 단말기는 이미 고정된 문맥으로 본다.
   - 선택 대상은 연결할 차량과 설치 시점이다.

6. `/terminals/:terminalRef/installations/:installationRef`
   - 설치 상세 화면이다.
   - 연결 차량, 설치 상태, 설치 시점, 해제 시점을 보여준다.
   - `설치 해제` 같은 상태 변경은 여기서만 시작한다.

### 1.5 상세 화면 규칙

1. 단말기 상세는 `terminal summary + installation relationship` 구조로 본다.
2. IMEI, ICCID는 기본값으로 전체 노출하지 않는다.
3. 현재 설치가 있으면 연결 차량으로 이동 링크를 둔다.
4. 설치 이력 표에는 `설치 상세` 진입만 남기고, 즉시 해제 버튼은 두지 않는다.

## 2. 차량 배정 페이지 계약

### 2.1 콘솔 소속

1. `차량 배정`은 `admin 전용`이다.
2. operator 콘솔에는 차량 배정 레지스트리 관리 화면을 두지 않는다.

### 2.2 리소스 구조

1. `driver-vehicle-assignment`를 단일 리소스로 본다.
2. `driver`, `vehicle`, `operator company`는 참조 대상이다.
3. 배정 해제는 assignment 상태 변경이다.

### 2.3 라우트

1. `/vehicle-assignments`
2. `/vehicle-assignments/new`
3. `/vehicle-assignments/:assignmentRef`
4. `/vehicle-assignments/:assignmentRef/edit`

### 2.4 화면 역할

1. `/vehicle-assignments`
   - 배정 목록만 보여준다.
   - 배송원, 차량, 운영사, 상태, 최근 배정 시점만 요약한다.
   - row click으로 상세에 이동한다.

2. `/vehicle-assignments/new`
   - 배정 생성 1열 폼만 둔다.
   - 배송원, 차량, 운영사, 배정 시점만 다룬다.

3. `/vehicle-assignments/:assignmentRef`
   - 배정 읽기 전용 상세 화면이다.
   - 배송원, 차량, 운영사, 상태, 배정/해제 시점을 보여준다.
   - 수정 버튼과 `배정 해제` 버튼은 이 화면에만 둔다.

4. `/vehicle-assignments/:assignmentRef/edit`
   - 배정 수정 1열 폼만 둔다.
   - 목록과 다른 배정 레코드를 같이 두지 않는다.

### 2.5 상태 변경 규칙

1. 목록 화면의 즉시 `배정 해제` 버튼은 제거한다.
2. `배정 해제`는 상세 화면에서만 시작한다.
3. 상세에서 상태 변경을 시작하더라도, 실행 UI는 confirm modal 또는 상태 변경 폼으로 연다.

## 3. 공통 액션 규칙

1. 목록 화면은 `보기`, `수정`, `해제` 같은 즉시 액션 버튼을 두지 않는다.
2. 목록 로우 클릭은 상세 이동만 담당한다.
3. 상세 화면만 `수정`, `관계 생성`, `상태 변경` 액션을 가진다.
4. 생성과 수정은 full-page form으로 유지한다.
5. destructive action은 상세 화면 또는 상세 하위 관계 화면에서만 시작한다.

## 4. route_no 규칙

1. 위 라우트의 `terminalRef`, `installationRef`, `assignmentRef`는 모두 `route_no`를 사용한다.
2. raw UUID는 브라우저 URL에 쓰지 않는다.
3. 상세 라우트를 열기 전에 정본 서비스가 `route_no`를 응답해야 한다.

## 5. 1차 구현 범위

1. 이번 단계는 라우트 분리와 화면 책임 분리까지만 본다.
2. 목록, 생성, 상세, 수정의 기본 구조가 나오면 1차 완료로 본다.
3. 설치 해제와 배정 해제는 상세 화면에서만 시작되게 바꾸면 1차 완료로 본다.
4. 대량 업로드, bulk action, timeline 강화는 후속 단계로 남긴다.

## 비스코프

1. 단말기 텔레메트리 상세 분석
2. 차량 배정 추천 로직
3. 대량 등록 / 대량 해제
4. 설치 이력 시각화

## 연결 문서

- [10-front-ui-rules.md](10-front-ui-rules.md)
- [06-id-and-state-dictionary.md](06-id-and-state-dictionary.md)
- [09-integration-rules.md](09-integration-rules.md)
- [../rollout/14-front-ui-rule-audit.md](../rollout/14-front-ui-rule-audit.md)
