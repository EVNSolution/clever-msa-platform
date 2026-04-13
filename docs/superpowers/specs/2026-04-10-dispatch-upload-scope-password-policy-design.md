# Dispatch Upload Scope And Password Policy Design

## Purpose

이 문서는 두 가지 서버 강제 규칙을 고정한다.

- `service-dispatch-registry`는 배차표 업로드 scope를 세션 회사 문맥으로 강제한다.
- `service-account-access`는 비밀번호 규칙을 생성/변경 경로에서 서버 강제한다.

이번 문서의 목표는 프런트 편의 로직을 서버 계약으로 올리고, 비밀번호 규칙을 UI 힌트 수준이 아니라 계정 정본 계약으로 승격하는 것이다.

## Decision 1: Dispatch Upload Scope Is Server-Owned

배차표 업로드의 회사 문맥은 프런트가 아니라 서버가 최종 결정한다.

### Rules

- `system_admin`
  - `company_id` 요청값을 그대로 사용할 수 있다.
- `manager`
  - `company_id`는 세션 토큰의 `company_id`로 강제한다.
  - body/query의 `company_id`가 다르면 validation error로 막는다.
- `fleet_manager`
  - `active_account_type`은 여전히 `manager`이므로 같은 회사 강제를 따른다.
  - `fleet_id`는 그 회사 소속인지 추가 검증한다.

### Affected API Surface

- `POST /upload-batches/preview/`
- `GET /upload-batches/`

필요하면 이후 `delivery-record` bootstrap 소비 경로도 같은 규칙을 재사용한다. 이번 단계에서는 dispatch upload entry surface를 우선 닫는다.

### Why

- 프런트에서 회사 선택을 숨기는 것만으로는 안전하지 않다.
- 실제 요청 위조나 stale client에서도 회사 경계를 유지해야 한다.
- 배차표 업로드는 정산 시작점이므로 회사 문맥이 흔들리면 이후 snapshot과 정산 계산이 같이 오염된다.

## Decision 2: Password Policy Is Enforced On Create/Change

비밀번호 규칙은 로그인 시점이 아니라 생성/변경 시점에 서버 강제한다.

### Required Rule

- 대문자 1개 이상
- 소문자 1개 이상
- 기호 1개 이상

현재 최소 길이 8자 규칙은 그대로 유지한다.

### Affected API Surface

- `POST /identity-signup-intake/`
- `POST /identity-recovery/`
- `PUT /identity-password/`

### Explicit Non-Goal

- `POST /identity-login/`에서 기존 약한 비밀번호 로그인을 차단하지 않는다.

### Why

- 로그인 단계에서 강제하면 기존 계정이 갑자기 막힐 수 있다.
- 생성/변경 경로에서만 강제하면 운영 중단 없이 정책을 강화할 수 있다.
- 프런트 힌트와 서버 검증을 같은 규칙으로 맞출 수 있다.

## Error Contract

### Dispatch Upload Scope

- manager가 다른 회사 `company_id`를 보내면 `400 validation_error`
- 메시지는 `company_id must match the authenticated company scope.` 수준으로 고정

### Password Policy

- 규칙 위반 시 `400 validation_error`
- 필드 키는 기존 serializer 규칙을 따라 `password` 또는 `new_password`
- 메시지는 사람이 읽을 수 있는 한 줄 규칙으로 반환

예:
- `Password must include at least one uppercase letter, one lowercase letter, and one symbol.`

## Test Strategy

### `service-dispatch-registry`

- system admin는 cross-company preview 가능
- manager는 body company_id가 달라도 세션 회사와 다르면 실패
- manager batch list도 query company_id를 다른 회사로 바꿔도 세션 회사로 제한

### `service-account-access`

- signup intake에서 약한 비밀번호 실패
- recovery에서 약한 비밀번호 실패
- identity password update에서 약한 새 비밀번호 실패
- 규칙 충족 비밀번호는 기존 흐름대로 성공

## Acceptance Criteria

- 일반 관리자는 배차표 업로드 API를 다른 회사로 실행할 수 없다.
- system admin는 기존처럼 회사 선택 기반 업로드가 가능하다.
- 약한 비밀번호는 signup/recovery/change 경로에서 서버가 거부한다.
- 현재 예시 seed 비밀번호 `ChangeMe123!`는 문제 없이 통과한다.
