# Personnel Document Web First Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 단일 웹 콘솔에 인사문서 목록/상세/등록/수정 흐름을 추가해 `service-personnel-document-registry`를 운영 메뉴로 연결한다.

**Architecture:** `front-admin-console`에서 personnel document 전용 API client와 페이지 3개를 추가하고, 기존 `service-driver-profile` API를 read lookup으로 재사용해 기사명을 보강한다. 백엔드 정본 경계는 유지하고, 웹은 `driver_id` 필터와 권한별 UI 분기로만 연결한다.

**Tech Stack:** React, TypeScript, existing `front-admin-console` patterns, existing Django DRF services (`service-personnel-document-registry`, `service-driver-profile`)

---

### Task 1: Current Truth 문서 고정

**Files:**
- Create: `docs/decisions/specs/2026-04-06-personnel-document-web-first-slice-design.md`
- Create: `docs/contracts/20-admin-personnel-document-pages.md`
- Modify: `docs/contracts/README.md`
- Modify: `docs/rollout/16-web-first-platform-delivery-order.md`
- Test: `git diff --check`

- [ ] **Step 1: 설계 문서와 페이지 계약 문서를 작성한다**
- [ ] **Step 2: contracts/rollout 인덱스를 현재 truth에 맞게 갱신한다**
- [ ] **Step 3: `git diff --check`를 실행해 문서 포맷이 깨지지 않았는지 확인한다**
- [ ] **Step 4: 문서 변경만 먼저 커밋한다**

### Task 2: Frontend API와 타입 준비

**Files:**
- Modify: `development/front-admin-console/src/types.ts`
- Create: `development/front-admin-console/src/api/personnelDocuments.ts`
- Modify: `development/front-admin-console/src/api/drivers.ts` (필요 시 driver lookup helper만 추가)
- Test: `development/front-admin-console/src/api/personnelDocuments.test.ts` 또는 기존 페이지 테스트에서 간접 검증

- [ ] **Step 1: personnel document API shape를 타입으로 먼저 추가한다**
- [ ] **Step 2: 문서 목록/상세/생성/수정 API client 함수를 추가한다**
- [ ] **Step 3: 기사명 보강에 필요한 driver lookup helper를 최소 범위로 정리한다**
- [ ] **Step 4: 새 client를 사용하는 테스트 더블 준비가 되도록 export를 정리한다**

### Task 3: 인사문서 화면과 라우트 추가

**Files:**
- Modify: `development/front-admin-console/src/authScopes.ts`
- Modify: `development/front-admin-console/src/components/Layout.tsx`
- Modify: `development/front-admin-console/src/App.tsx`
- Create: `development/front-admin-console/src/pages/PersonnelDocumentsPage.tsx`
- Create: `development/front-admin-console/src/pages/PersonnelDocumentDetailPage.tsx`
- Create: `development/front-admin-console/src/pages/PersonnelDocumentFormPage.tsx`
- Modify: `development/front-admin-console/src/routeRefs.ts` (필요 시)
- Test:
  - `development/front-admin-console/src/components/Layout.test.tsx`
  - `development/front-admin-console/src/App.test.tsx`
  - `development/front-admin-console/src/pages/PersonnelDocumentsPage.test.tsx`
  - `development/front-admin-console/src/pages/PersonnelDocumentDetailPage.test.tsx`
  - `development/front-admin-console/src/pages/PersonnelDocumentFormPage.test.tsx`

- [ ] **Step 1: 메뉴에 `인사문서`를 추가하는 failing test를 먼저 쓴다**
- [ ] **Step 2: `/personnel-documents` 라우트가 보이도록 최소 구현을 추가한다**
- [ ] **Step 3: 목록 페이지 failing test를 작성한다**
- [ ] **Step 4: 문서 목록에서 기사명/기사 식별자/문서 상태가 보이도록 최소 구현한다**
- [ ] **Step 5: 상세 페이지 failing test를 작성한다**
- [ ] **Step 6: 상세 페이지에 기사 연결 정보와 문서 메타데이터를 노출하는 구현을 추가한다**
- [ ] **Step 7: 생성/수정 페이지 failing test를 작성한다**
- [ ] **Step 8: `driver_id` 필수 생성/수정 폼을 최소 구현한다**
- [ ] **Step 9: 권한별 read/write 분기 테스트를 추가한다**
- [ ] **Step 10: `system_admin/company_super_admin/settlement_manager/fleet_manager`만 저장 버튼이 보이도록 정리한다**

### Task 4: 전체 검증과 문서/구현 일치 확인

**Files:**
- Modify: 필요 시 `development/front-admin-console/README.md`
- Test:
  - `cd development/front-admin-console && npm test -- --run`
  - `cd development/front-admin-console && npm run build`
  - `cd development/service-personnel-document-registry && python manage.py test -v 2`
  - `git diff --check`

- [ ] **Step 1: `front-admin-console` 전체 테스트를 fresh run한다**
- [ ] **Step 2: `front-admin-console` build를 fresh run한다**
- [ ] **Step 3: `service-personnel-document-registry` 테스트를 fresh run한다**
- [ ] **Step 4: `git diff --check`를 다시 실행한다**
- [ ] **Step 5: 최종 구현 커밋을 만든다**
