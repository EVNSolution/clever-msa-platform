# Settlement Navigation Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 좌측 정산 네비게이션을 `정산 조회`와 `정산 처리`로 분리하고, `정산 처리` 안에서는 `기준 > 입력 > 실행 > 결과` 가로 탭 흐름만 유지한다.

**Architecture:** route namespace와 `settlements` 권한 key는 그대로 유지한다. `front-web-console`에서 좌측 네비게이션 entry만 둘로 나누고, `/settlements/overview`는 독립 화면으로, `/settlements/criteria|inputs|runs|results`는 기존 `SettlementSectionLayout` 아래의 처리 흐름으로 재구성한다.

**Tech Stack:** React, TypeScript, React Router v6, Vitest, Playwright, existing `front-web-console` layout/navigation system

---

## File Map

### Frontend: `development/front-web-console/`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts`
  - 좌측 메인 네비게이션을 `정산 조회` / `정산 처리` 2개 링크로 분리
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/Layout.test.tsx`
  - 좌측 링크 분리와 권한별 노출 기대값 갱신
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
  - `overview`와 `process` route tree 분리
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx`
  - `/settlements/overview`, `/settlements/criteria`, `/settlements` redirect 계약 테스트 추가
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SettlementSectionLayout.tsx`
  - `정산 처리` 전용 레이아웃으로 정리, 탭을 `기준 > 입력 > 실행 > 결과`만 유지
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SettlementSectionLayout.test.tsx`
  - process-only 탭 및 문맥 유지 테스트로 갱신
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/settlement-navigation.spec.ts`
  - 좌측 `정산 조회` / `정산 처리` 진입과 process 탭 노출 검증
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/ops-fixture-console.spec.ts`
  - 기존 `정산` 링크 클릭을 `정산 조회` 또는 `정산 처리` 기준으로 갱신

### Docs
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/18-single-web-console-screen-map.md`
  - settlement route entry가 `조회`와 `처리`로 분리됐음을 반영

## Task 0: Preflight And Guardrails

**Files:**
- Read only: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts`
- Read only: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
- Read only: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SettlementSectionLayout.tsx`

- [ ] **Step 1: GitNexus impact analysis를 먼저 실행한다**
- `gitnexus_impact({target: "navigationGroups", direction: "upstream"})`
- `gitnexus_impact({target: "App", direction: "upstream"})`
- `gitnexus_impact({target: "SettlementSectionLayout", direction: "upstream"})`
- direct caller, affected process, risk level을 기록한다.
- HIGH 또는 CRITICAL이면 구현 전에 사용자에게 다시 알린다.

- [ ] **Step 2: 현재 테스트 baseline을 저장한다**

Run:

```bash
npm test -- src/components/Layout.test.tsx src/components/SettlementSectionLayout.test.tsx src/App.test.tsx src/pages/SettlementOverviewPage.test.tsx
```

Expected:
- 현재 기준 PASS
- 이후 RED 단계에서 어떤 테스트가 새로 실패했는지 구분 가능

- [ ] **Step 3: 현재 e2e baseline을 확인한다**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:e2e -- e2e/settlement-navigation.spec.ts
```

Expected:
- 현재 기준 PASS 또는 기존 selector 기준 FAIL
- FAIL이면 왜 깨지는지 기록하고 Task 3에서 갱신한다

## Task 1: Sidebar Split For Settlement Overview And Process

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/Layout.test.tsx`

- [ ] **Step 1: 좌측 정산 링크 분리 테스트를 먼저 추가한다**
- `company_super_admin`, `settlement_manager`, `fleet_manager` 케이스에서 `정산 조회`와 `정산 처리`가 둘 다 보인다고 적는다.
- `vehicle_manager` 케이스에서는 둘 다 안 보인다고 적는다.
- 기존 `정산` 단일 링크 기대값은 제거한다.

- [ ] **Step 2: RED 확인**

Run:

```bash
npm test -- src/components/Layout.test.tsx
```

Expected:
- FAIL
- 기존 `정산` 단일 링크 기대값 또는 새 `정산 조회` / `정산 처리` 미구현 때문에 실패

- [ ] **Step 3: 최소 구현으로 좌측 네비게이션을 둘로 나눈다**
- `navigation.ts`에서 `settlements` 권한 key는 유지한다.
- 좌측 top-level link는 `정산 조회 -> /settlements/overview`, `정산 처리 -> /settlements/criteria`로 만든다.
- 둘 다 같은 `settlements` visibility gate를 사용한다.
- `정산 처리`의 `matchPrefixes`는 `/settlements/criteria`, `/settlements/inputs`, `/settlements/runs`, `/settlements/results`만 잡는다.
- `정산 조회`는 `/settlements/overview`만 잡는다.

- [ ] **Step 4: GREEN 확인**

Run:

```bash
npm test -- src/components/Layout.test.tsx
```

Expected:
- PASS
- 좌측 링크 2개가 모두 보이고 active path 분리가 맞다

- [ ] **Step 5: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/Layout.test.tsx
git commit -m "feat: split settlement sidebar navigation"
```

## Task 2: Split Overview Route From Process Layout

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SettlementSectionLayout.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SettlementSectionLayout.test.tsx`

- [ ] **Step 1: overview와 process layout 분리 테스트를 먼저 추가한다**
- `/settlements/overview` route test를 추가한다.
- expectation:
  - `정산 운영 요약` heading visible
  - process 탭 `정산 기준`, `정산 입력`, `정산 실행`, `정산 결과`는 안 보임
  - 회사/플릿 combobox도 안 보임
- `/settlements/criteria` route test를 추가한다.
- expectation:
  - `정산` heading visible
  - `정산 기준`, `정산 입력`, `정산 실행`, `정산 결과` 탭 visible
  - 회사/플릿 combobox visible
- `/settlements` base route는 여전히 `/settlements/overview`로 redirect되는지 적는다.

- [ ] **Step 2: RED 확인**

Run:

```bash
npm test -- src/App.test.tsx src/components/SettlementSectionLayout.test.tsx
```

Expected:
- FAIL
- overview가 현재 layout 안에 포함되기 때문에 탭/combobox 부재 expectation이 깨진다

- [ ] **Step 3: 최소 구현으로 route tree를 분리한다**
- `App.tsx`에서 `/settlements/overview`를 standalone settlement route로 뺀다.
- `SettlementSectionLayout`은 `criteria|inputs|runs|results`만 감싸는 process layout으로 남긴다.
- process 탭 배열에서 `정산 조회`를 제거하고 `정산 기준`부터 시작하게 한다.
- process 레이아웃 title은 `정산 처리` 또는 spec에 맞는 처리 맥락 copy로 정리한다.

- [ ] **Step 4: process 문맥 유지 테스트를 갱신한다**
- `SettlementSectionLayout.test.tsx` 초기 route를 `/settlements/criteria` 또는 `/settlements/inputs`로 유지한다.
- `정산 조회` 링크 expectation을 제거한다.
- `정산 실행` 이동 후 회사/플릿 유지 assertion은 그대로 살린다.

- [ ] **Step 5: GREEN 확인**

Run:

```bash
npm test -- src/App.test.tsx src/components/SettlementSectionLayout.test.tsx
```

Expected:
- PASS
- overview는 독립 화면, process는 탭+문맥 레이아웃으로 분리된다

- [ ] **Step 6: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.tsx /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SettlementSectionLayout.tsx /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/App.test.tsx /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/components/SettlementSectionLayout.test.tsx
git commit -m "refactor: separate settlement overview from process layout"
```

## Task 3: Update Local Browser And Playwright Flows

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/settlement-navigation.spec.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/ops-fixture-console.spec.ts`

- [ ] **Step 1: e2e expectations를 새 정보 구조 기준으로 먼저 갱신한다**
- `settlement-navigation.spec.ts`
  - 좌측에서 `정산 조회`, `정산 처리` 둘 다 보이는지
  - `정산 조회` 클릭 시 overview landing인지
  - `정산 처리` 클릭 시 criteria landing인지
  - process 화면에서만 `정산 기준`, `정산 입력`, `정산 실행`, `정산 결과` 탭이 보이는지
- `ops-fixture-console.spec.ts`
  - overview 성격 검증은 `정산 조회`로 진입
  - run/result 성격 검증은 `정산 처리` 또는 해당 process tab으로 진입

- [ ] **Step 2: RED 확인**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:e2e -- e2e/settlement-navigation.spec.ts e2e/ops-fixture-console.spec.ts
```

Expected:
- FAIL
- 기존 `정산` 단일 링크 selector가 더 이상 맞지 않아 실패

- [ ] **Step 3: 최소 수정으로 selector와 URL expectation을 맞춘다**
- `정산` 단일 링크 selector를 제거한다.
- overview와 process의 진입 경로 expectation을 새 구조 기준으로 나눈다.

- [ ] **Step 4: GREEN 확인**

Run:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:e2e -- e2e/settlement-navigation.spec.ts e2e/ops-fixture-console.spec.ts
```

Expected:
- PASS
- `localhost:8080`에서 좌측 entry 분리와 process 탭 유지가 검증된다

- [ ] **Step 5: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/settlement-navigation.spec.ts /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/e2e/ops-fixture-console.spec.ts
git commit -m "test: update settlement navigation e2e flows"
```

## Task 4: Contract Doc Sync And Final Verification

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/18-single-web-console-screen-map.md`
- Read for verification: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-09-settlement-navigation-split-design.md`

- [ ] **Step 1: single web screen map 문구를 새 구조에 맞게 수정한다**
- `SettlementsPage` 설명에서 `정산 조회`는 shared read entry, `정산 처리`는 process tabs entry라고 적는다.
- route map의 `/settlements` 설명도 `overview`와 `process`의 분리를 반영한다.

- [ ] **Step 2: focused unit test를 한 번에 돌린다**

Run:

```bash
npm test -- src/components/Layout.test.tsx src/components/SettlementSectionLayout.test.tsx src/App.test.tsx src/pages/SettlementOverviewPage.test.tsx src/pages/SettlementRunsPage.test.tsx src/pages/SettlementResultsPage.test.tsx src/pages/SettlementInputsPage.test.tsx
```

Expected:
- PASS
- settlement 관련 route/layout/page tests가 모두 green

- [ ] **Step 3: 로컬 수동 확인을 한다**
- 브라우저에서 `http://localhost:8080`
- 로그인 후 좌측 `정산 조회`, `정산 처리` 2개 링크 확인
- `정산 조회` 진입 시 탭/문맥 바 없음 확인
- `정산 처리` 진입 시 탭/문맥 바 있음 확인
- `정산 기준 -> 입력 -> 실행 -> 결과` 흐름이 자연스러운지 확인

- [ ] **Step 4: GitNexus 변경 감지를 실행한다**
- staged commit 전 `gitnexus_detect_changes({scope: "all"})` 또는 staged 기준으로 확인한다.
- settlement navigation split와 관련 없는 심볼이 잡히면 staging을 다시 정리한다.

- [ ] **Step 5: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/contracts/18-single-web-console-screen-map.md
git commit -m "docs: sync settlement navigation split contract"
```

## Execution Notes

- 이 작업은 권한 모델 변경이 아니다. `settlements` 단일 nav key를 유지한다.
- 현재 worktree에 unrelated changes가 많으므로, 반드시 plan에 적힌 파일만 선택적으로 stage한다.
- `SettlementSectionLayout` 심볼 이름을 바꾸고 싶다면, rename 전에 반드시 `gitnexus_rename(..., dry_run: true)`로 영향 범위를 확인한다.
