# Manager Navigation Policy Screen Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/navigation-policy`를 역할별 정책 워크벤치로 재설계해 전역 관리자 메뉴 정책을 이해하고 수정하기 쉽게 만든다.

**Architecture:** 기존 정책 API는 최대한 유지하고, `front-web-console`에서 화면 정보 구조를 재구성한다. 역할 레일, 정책 편집 패널, 사이드바 미리보기의 3영역 구조를 만들고, 현재 역할 단위 편집 흐름으로 단순화한다.

**Tech Stack:** React, TypeScript, existing `front-web-console` routing/layout/components, existing `service-account-access` navigation policy APIs

---

## File Map

### Frontend: `development/front-web-console/`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
  - 화면 구조를 3영역 워크벤치로 재작성
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts`
  - 미리보기용 사이드바 데이터 재사용
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/authScopes.ts`
  - 기본 정책/역할 라벨 helper가 화면 정보 구조와 맞는지 조정
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
  - 새 레이아웃, 정책 카드, 미리보기 패널 스타일 추가
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/navigationPolicy.ts`
  - 현재 역할 단위 저장에 맞는 helper 보강 필요 시 수정
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`
  - 역할 전환, 편집, 미리보기, 저장 흐름 테스트 갱신

### Docs
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/manager-navigation-policy.md`
  - 새 화면 구조 기준 운영 절차 반영
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md`
  - 필요 시 화면 구조 변경 사항 연결

## Task 1: 역할 레일과 정책 메타데이터 구조 추가

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/authScopes.ts`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`

- [ ] **Step 1: 정책 화면 메타데이터 상수 정의**
- 역할별 설명, 메뉴 설명, 그룹, 메타 메뉴 제외 규칙을 한 곳에 모은다.

- [ ] **Step 2: 드롭다운 기반 선택을 역할 레일 기반 선택 구조로 바꾼다**
- 현재 선택 역할
- 허용 메뉴 개수
- 변경 여부
를 역할 카드에 표시한다.

- [ ] **Step 3: 테스트를 역할 레일 기준으로 갱신한다**
- 드롭다운 의존 assertion 제거
- 역할 카드 선택 흐름으로 변경

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/authScopes.ts /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx
git commit -m "refactor: redesign manager policy role selection"
```

## Task 2: 정책 편집 패널을 설명형 카드 구조로 재작성

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`

- [ ] **Step 1: 메뉴 항목 카드 컴포넌트 구조를 추가한다**
- 각 항목에 이름, 설명, key, 상태 배지, 체크 토글을 표시한다.

- [ ] **Step 2: 정책 관리 메타 메뉴를 일반 운영 메뉴 목록에서 제거한다**
- `manager_navigation_policy`
- `company_navigation_policy`
를 편집 대상에서 제외한다.

- [ ] **Step 3: 변경됨/기본값 사용 상태 계산을 추가한다**
- persisted vs draft 비교로 dirty 상태를 표시한다.

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx
git commit -m "feat: add descriptive policy item cards"
```

## Task 3: 실시간 사이드바 미리보기 추가

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`

- [ ] **Step 1: 선택 역할 + draft policy를 기준으로 미리보기용 허용 메뉴 집합을 계산한다**
- 저장 전 draft도 반영된다.

- [ ] **Step 2: 오른쪽 패널에 사이드바 미리보기를 추가한다**
- 실제 그룹 구조를 재사용해 렌더한다.
- 빈 그룹은 숨긴다.

- [ ] **Step 3: 테스트에서 토글 후 미리보기 반영을 검증한다**

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/navigation.ts /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx
git commit -m "feat: add sidebar preview to manager policy screen"
```

## Task 4: 저장 UX를 역할 단위로 단순화

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/navigationPolicy.ts`
- Test: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx`

- [ ] **Step 1: 현재 역할 draft만 저장하는 UX 문구와 payload 구성을 정리한다**
- 백엔드가 전체 정책 응답을 유지해도 프론트는 현재 역할 중심으로 동작한다.

- [ ] **Step 2: `기본 정책으로 되돌리기` 동작과 dirty 상태를 정리한다**
- 저장 후 dirty 해제
- 복원 후 상태 메시지 명확화

- [ ] **Step 3: 저장/복원 흐름 테스트를 갱신한다**

- [ ] **Step 4: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.tsx /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/api/navigationPolicy.ts /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/ManagerNavigationPolicyPage.test.tsx
git commit -m "refactor: simplify manager policy save flow"
```

## Task 5: 문서와 운영 절차 갱신

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/manager-navigation-policy.md`
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md`
- Create or reference: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-08-manager-navigation-policy-screen-redesign-design.md`

- [ ] **Step 1: runbook를 새 화면 구조 기준으로 갱신한다**
- 역할 레일
- 정책 카드
- 미리보기
- 역할 단위 저장

- [ ] **Step 2: 상위 spec과 화면 재설계 spec의 관계를 명시한다**
- 권한 모델은 유지, 화면 정보 구조만 재설계됨을 분명히 쓴다.

- [ ] **Step 3: Commit**

```bash
git add /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/runbooks/manager-navigation-policy.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-08-manager-navigation-policy-abac-design.md /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-08-manager-navigation-policy-screen-redesign-design.md
git commit -m "docs: redesign manager navigation policy screen"
```

## Task 6: Dev 배포

**Files:**
- Modify follow-up only if rollout fixes are needed in `front-web-console`

- [ ] **Step 1: `front-web-console` main push**

```bash
git -C /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console push origin main
```

- [ ] **Step 2: 중앙배포 실행**

```bash
gh workflow run "Central MSA Deploy Dispatch" \
  -R EVNSolution/clever-deploy-control \
  -f environment=dev \
  -f targets=front-web-console \
  -f dry_run=false
```

- [ ] **Step 3: 수동 확인**
- `/admin/navigation-policy`
- 역할 전환
- 메뉴 토글
- 미리보기
- 저장/복원

- [ ] **Step 4: Commit follow-up if needed**

```bash
git add ...
git commit -m "fix: polish manager navigation policy workspace"
```

## Rollout Notes

- 이번 작업은 정책 모델 변경이 아니라 화면 정보 구조 개선이다.
- `/company/navigation-policy`는 이번 구조가 안정되면 같은 패턴으로 재설계한다.
- 정책 메타 메뉴는 1차 편집 대상에서 제외해 혼란을 줄인다.
