# Personnel Document Registry Phase 1 Activation 디자인

## 목적

이 문서는 `service-personnel-document-registry`를 empty shell에서 1차 runtime으로 승격하기 위한 경계와 최소 구현 범위를 고정한다.

이번 설계의 목표는 아래와 같다.

1. `service-personnel-document-registry`를 기사 인사문서 메타데이터 정본 runtime으로 활성화한다.
2. `service-driver-profile`의 기본 프로필 truth와 문서성 aggregate를 분리한다.
3. 파일 업로드나 approval workflow 없이도 문서 lifecycle과 유효성 메타데이터를 관리할 수 있는 최소 CRUD 범위를 고정한다.
4. compose, gateway, seed, repo 문서가 shell 상태가 아닌 active runtime 상태를 반영하도록 기준을 만든다.

## 스코프

이번 설계에 포함하는 범위는 아래와 같다.

1. `service-personnel-document-registry` 1차 runtime의 역할 정의
2. 기사 인사문서 단일 aggregate ownership 정의
3. 외부 route, compose service naming, auth 기준 정의
4. local seed와 최소 검증 기준 정의
5. 문서와 인덱스 반영 기준 정의

## 비스코프

이번 설계에서는 아래 항목을 다루지 않는다.

1. 파일 바이너리 업로드와 저장소 연동
2. approval, review, 결재 workflow
3. 회사 단위 사업자/계좌 문서 aggregate
4. 연차, 근태, 소속 변경 workflow
5. 문서 OCR, 자동 만료 알림, webhook
6. public document download endpoint
7. bulk import

## 현재 상태

현재 `service-personnel-document-registry`는 shell만 있고 runtime, migration, API, seed가 없다.

문서상 경계는 이미 고정돼 있다.

1. 이 repo는 계약, 증빙, 계좌, 사업자, 소속 문서 aggregate 경계를 위한 자리다.
2. `service-driver-profile`의 기본 프로필 truth를 다시 비대화하지 않는 방향으로 분리해야 한다.
3. 지금 필요한 것은 파일 저장 시스템이 아니라 shell 제거와 문서 메타데이터 정본 경계 안정화다.

## 선택된 접근

이번 설계에서는 아래 접근을 선택한다.

1. `service-personnel-document-registry`는 기사 인사문서 메타데이터 CRUD만 구현한다.
2. 1차 엔티티는 `PersonnelDocument` 단일 aggregate로 제한한다.
3. 파일 자체는 저장하지 않고 문서 메타데이터와 lifecycle만 관리한다.
4. 문서 종류는 `contract`, `license_or_certificate`, `bank_account_proof`, `business_registration` 네 가지로 시작한다.
5. 모든 write와 read API는 admin-authenticated management API로 시작한다.
6. approval workflow와 파일 저장소 연동은 다음 라운드로 미룬다.

이 접근을 선택한 이유는 아래와 같다.

1. shell 제거에 필요한 최소 runtime만 올릴 수 있다.
2. 파일 업로드를 미뤄도 문서 종류, 상태, 유효기간, 참조 식별자 같은 핵심 메타데이터 정본을 확보할 수 있다.
3. `service-driver-profile`를 다시 문서성 필드로 비대화하지 않는다.
4. 이후 파일 저장소나 approval 축이 추가되더라도 aggregate 경계를 유지하기 쉽다.

## 서비스 경계

### `service-personnel-document-registry`가 직접 소유하는 것

1. 기사 인사문서 메타데이터 정본
2. 문서 종류와 문서 lifecycle 상태
3. 문서 유효기간, 발급 정보, 참조 번호, 메모
4. 해당 엔티티의 CRUD와 read API
5. 문서 메타데이터 seed

### `service-personnel-document-registry`가 소유하지 않는 것

1. 배송원 기본 프로필 truth
2. 계정 credential과 access rule
3. approval, 결재, reviewer assignment
4. 파일 바이너리와 object storage truth
5. 회사 단위 사업자/계좌 정본
6. 연차, 근태, 배차, 정산 계산 truth

## 엔티티 구조

### 1. `PersonnelDocument`

역할:

1. 기사 단위 인사문서 메타데이터 정본
2. 파일 업로드 이전 단계에서도 문서 lifecycle과 유효성 판단을 유지하는 aggregate

최소 필드 방향:

1. `personnel_document_id`
2. `driver_id`
3. `document_type`
4. `status`
5. `title`
6. `document_number`
7. `issuer_name`
8. `issued_on`
9. `expires_on`
10. `notes`
11. `external_reference`
12. `payload`

필드 해석 원칙:

1. `driver_id`는 `service-driver-profile`이 소유하는 reference key다.
2. `document_type`은 `contract`, `license_or_certificate`, `bank_account_proof`, `business_registration` 네 값으로 제한한다.
3. `status`는 `draft`, `active`, `expired`, `revoked` 네 값으로 시작한다.
4. `document_number`는 계약번호, 자격번호, 등록번호 같은 외부 식별자를 담는 선택 필드다.
5. `external_reference`는 향후 파일 저장소나 외부 문서 시스템 연결을 위한 참조 슬롯이다.
6. `payload`는 1차에서 문서 종류별 세부 메타데이터를 보존하는 JSON 저장소다.

상태 원칙:

1. `draft`는 아직 운영상 유효 문서로 보지 않는다.
2. `active`는 현재 사용 가능한 문서 상태다.
3. `expired`는 유효기간 경과를 의미한다.
4. `revoked`는 수동 비활성 또는 무효화를 의미한다.
5. 상태 전이의 세부 workflow는 이번 라운드에 강제하지 않고 CRUD 수준에서만 관리한다.

유효기간 원칙:

1. `issued_on`과 `expires_on`은 모두 nullable을 허용한다.
2. `expires_on`이 존재하면 `issued_on <= expires_on`을 만족해야 한다.
3. 자동 만료 배치는 포함하지 않지만, 상태와 날짜는 함께 관리한다.

## 참조 키와 validation 기준

`service-personnel-document-registry`는 아래 식별자를 reference key로만 사용한다.

1. `driver_id`

원칙:

1. 배송원 기본 프로필 정본은 `service-driver-profile`이 소유한다.
2. `service-personnel-document-registry`는 driver profile을 복제하거나 소유하지 않는다.
3. phase 1에서는 `driver_id`의 존재 여부만 upstream로 검증한다.
4. 회사, 플릿, 계정 연결 정합성 검증은 다음 라운드로 미룬다.

## API / Service Naming

1차 naming은 아래로 고정한다.

1. compose service: `personnel-document-registry-api`
2. gateway prefix: `/api/personnel-documents/`

최소 API shape는 아래와 같다.

1. `GET /api/personnel-documents/health/`
2. `GET/POST /api/personnel-documents/documents/`
3. `GET/PATCH /api/personnel-documents/documents/{personnel_document_id}/`

원칙:

1. delete는 1차에서 hard delete보다 status 기반 비활성화를 우선한다.
2. phase 1에서는 파일 다운로드나 presigned URL endpoint를 추가하지 않는다.
3. read-model summary endpoint를 추가하지 않는다.

## Auth / Permission 기준

1차 auth 기준은 아래와 같다.

1. `health`만 공개
2. CRUD API는 admin-authenticated management API
3. driver self-service, reviewer role, machine-auth는 이번 라운드에 포함하지 않는다

선택 이유:

1. 현재 목적은 shell 제거와 경계 안정화다.
2. self-service나 approval까지 같이 열면 scope가 급격히 커진다.

## Seed 기준

1차 seed는 최소 1세트를 제공한다.

포함:

1. seeded `driver_id`를 참조하는 `PersonnelDocument` 1건 이상
2. 서로 다른 `document_type` 예시 2건 이상

원칙:

1. integration-local-stack의 seeded driver 식별자를 재사용한다.
2. seed는 기사 인사문서 메타데이터 정본 역할을 보여 주는 최소 예시만 넣는다.
3. 실제 파일 데이터나 다운로드 링크는 넣지 않는다.

## 통합 영향

이번 1차 활성화에서 필요한 통합 반영은 아래와 같다.

1. `development/integration-local-stack/` compose에 `personnel-document-registry-api`와 전용 DB 추가
2. `development/edge-api-gateway/`에 `/api/personnel-documents/` route 추가
3. seed-runner에 migration과 seed wiring 추가
4. current runtime inventory에서 `service-personnel-document-registry`를 active runtime으로 승격
5. repo map과 responsibility matrix에서 shell 설명을 runtime 설명으로 갱신

이번 라운드에서 하지 않는 것:

1. 파일 object storage 연동
2. approval/결재 서비스 연동
3. dispatch, settlement, organization direct consumer wiring
4. 회사 단위 문서 aggregate 추가

## 문서 반영 원칙

최소한 아래 문서가 같이 갱신돼야 한다.

1. `WORKSPACE.md`
2. `repo-map.md`
3. `docs/mappings/current-to-target-repo-map.md`
4. `docs/mappings/current-runtime-inventory.md`
5. `docs/mappings/repo-responsibility-matrix.md`
6. `development/service-personnel-document-registry/README.md`
7. compose / gateway / seed 관련 local stack 문서

`docs/mappings/current-to-target-repo-map.md` 반영 기준:

1. `service-personnel-document-registry`의 current source 설명에서 empty shell 문구를 제거한다.
2. status는 runtime 활성화 이후 상태로 갱신한다.
3. 기사 인사문서 메타데이터 정본 runtime이 올라왔음을 명시한다.

핵심 반영 내용:

1. `service-personnel-document-registry`는 더 이상 empty shell이 아니다.
2. driver profile truth와 문서 메타데이터 truth의 경계를 유지한다.
3. 파일 저장소 없이도 문서 lifecycle 메타데이터를 관리하는 runtime이라는 점을 문서에 명시한다.

## 완료 기준

이번 설계가 구현으로 내려갈 준비가 됐다고 보는 기준은 아래와 같다.

1. `service-personnel-document-registry`의 기사 인사문서 경계가 문서상 명확하다.
2. 파일 바이너리, approval workflow, 회사 문서 aggregate가 이번 라운드 비스코프로 분리된다.
3. `PersonnelDocument` 단일 aggregate의 최소 ownership이 고정된다.
4. route와 compose naming이 문서상 고정된다.
5. 구현 계획이 이 설계를 직접 따라갈 수 있다.
