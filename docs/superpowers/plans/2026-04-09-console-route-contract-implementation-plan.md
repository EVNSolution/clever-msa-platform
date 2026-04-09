# Console Route Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹 콘솔의 self-service, admin, company 경계를 URL에 명확히 반영하고, legacy 경로를 안전한 redirect로 정리한다.

**Architecture:** `front-web-console`의 browser route를 subject-first namespace로 재구성한다. canonical path는 `/me`, `/admin/*`, `/company/*`로 고정하고, 기존 `/account`, `/accounts`, `/admin/navigation-policy`, `/company/navigation-policy`는 모두 legacy redirect로 유지한다. 사이드바 active 상태와 권한 redirect도 새 canonical path를 기준으로 재검증한다.

**Tech Stack:** React, React Router, Vitest, Testing Library

---

### Task 1: Canonical route와 legacy redirect 도입

**Files:**
- Modify: `development/front-web-console/src/App.tsx`
- Modify: `development/front-web-console/src/navigation.ts`
- Test: `development/front-web-console/src/App.test.tsx`

- [ ] **Step 1: Canonical path와 legacy redirect에 대한 failing test를 추가한다**

`development/front-web-console/src/App.test.tsx`에 아래 케이스를 추가한다.
- `/account` 접근 시 `/me`로 redirect
- `/accounts` 접근 시 `/admin/account-requests`로 redirect
- `/admin/navigation-policy` 접근 시 `/admin/menu-policy`로 redirect
- `/company/navigation-policy` 접근 시 `/company/menu-policy`로 redirect

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run: `npm test -- --run src/App.test.tsx`  
Expected: 새 canonical path 또는 redirect expectation이 아직 없어 FAIL

- [ ] **Step 3: App route tree를 canonical path 기준으로 수정한다**

`development/front-web-console/src/App.tsx`에서 아래를 반영한다.
- `AccountPage` route를 `/me`로 이동
- `AccountsPage` route를 `/admin/account-requests`로 이동
- `ManagerNavigationPolicyPage` route를 `/admin/menu-policy`로 이동
- `CompanyNavigationPolicyPage` route를 `/company/menu-policy`로 이동
- 위 legacy path들에는 `<Navigate replace>` redirect를 추가한다

- [ ] **Step 4: navigation item href와 match prefix를 canonical path로 변경한다**

`development/front-web-console/src/navigation.ts`에서 아래를 반영한다.
- `내 계정` -> `/me`
- `계정 요청` -> `/admin/account-requests`
- `메뉴 정책` -> `/admin/menu-policy`
- `회사 메뉴 정책` -> `/company/menu-policy`
- `matchPrefixes`도 새 canonical path 기준으로 정리한다

- [ ] **Step 5: 테스트를 다시 실행해 통과를 확인한다**

Run: `npm test -- --run src/App.test.tsx`  
Expected: PASS

- [ ] **Step 6: 커밋한다**

```bash
git add development/front-web-console/src/App.tsx development/front-web-console/src/navigation.ts development/front-web-console/src/App.test.tsx
git commit -m "refactor: adopt canonical console routes"
```

### Task 2: 사이드바 active 상태와 그룹 expansion을 새 route contract 기준으로 고정

**Files:**
- Modify: `development/front-web-console/src/components/Layout.tsx`
- Test: `development/front-web-console/src/components/Layout.test.tsx`

- [ ] **Step 1: failing test를 추가한다**

`development/front-web-console/src/components/Layout.test.tsx`에 아래를 추가한다.
- `/me`에서 `내 계정`만 active
- `/admin/account-requests`에서 `계정 요청`만 active
- `/admin/menu-policy`에서 `메뉴 정책`만 active
- `/company/menu-policy`에서 `회사 메뉴 정책`만 active
- 각 경로에서 해당 그룹만 자동 확장

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run: `npm test -- --run src/components/Layout.test.tsx`  
Expected: legacy prefix 또는 href 기대치 때문에 FAIL

- [ ] **Step 3: active-state와 expansion 로직을 canonical path 기준으로 정리한다**

`development/front-web-console/src/components/Layout.tsx`에서 아래를 확인/수정한다.
- default collapsed 정책 유지
- 현재 canonical path 기준으로만 그룹 auto-open
- legacy path redirect 이후에는 UI가 canonical path만 보도록 가정한다

- [ ] **Step 4: 테스트를 다시 실행해 통과를 확인한다**

Run: `npm test -- --run src/components/Layout.test.tsx`  
Expected: PASS

- [ ] **Step 5: 커밋한다**

```bash
git add development/front-web-console/src/components/Layout.tsx development/front-web-console/src/components/Layout.test.tsx
git commit -m "test: align sidebar state with canonical routes"
```

### Task 3: 화면 문서와 route contract 문서를 현재 구현 상태로 동기화

**Files:**
- Modify: `docs/contracts/18-single-web-console-screen-map.md`
- Modify: `docs/contracts/06-id-and-state-dictionary.md`
- Modify: `docs/superpowers/specs/2026-04-09-console-route-contract-design.md`

- [ ] **Step 1: route naming 관련 문서 expectation을 failing checklist로 정리한다**

문서 검토 기준:
- self-service는 `/me/*`
- admin governance는 `/admin/*`
- company governance는 `/company/*`
- legacy route는 canonical path가 아니라 redirect alias로만 기록

- [ ] **Step 2: screen map과 id/state dictionary를 수정한다**

반영 내용:
- `내 계정` 최종 경로를 `/me`로 변경
- `계정 요청`, `메뉴 정책`, `회사 메뉴 정책`의 canonical path를 문서에 명시
- URL naming 원칙에서 subject-first namespace를 추가

- [ ] **Step 3: spec 문서에 execution 결과와 redirect policy를 final wording으로 정리한다**

`docs/superpowers/specs/2026-04-09-console-route-contract-design.md`에서 아래를 점검한다.
- canonical path table
- redirect compatibility policy
- migration scope와 out-of-scope

- [ ] **Step 4: 문서 변경을 검토한다**

Run: `git diff -- docs/contracts/18-single-web-console-screen-map.md docs/contracts/06-id-and-state-dictionary.md docs/superpowers/specs/2026-04-09-console-route-contract-design.md`  
Expected: canonical route contract가 문서 전반에 일관되게 반영됨

- [ ] **Step 5: 커밋한다**

```bash
git add docs/contracts/18-single-web-console-screen-map.md docs/contracts/06-id-and-state-dictionary.md docs/superpowers/specs/2026-04-09-console-route-contract-design.md
git commit -m "docs: sync canonical console route contract"
```
