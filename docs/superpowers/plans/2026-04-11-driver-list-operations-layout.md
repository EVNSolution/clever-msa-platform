# Driver List Operations Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배송원 목록 화면을 `배차표 업로드`형 표 중심 workbench로 재구성하고, 무외피 필터·저장식 페이지네이션·조밀한 테이블 밀도를 적용한다.

**Architecture:** 서버 API는 늘리지 않고 `DriversPage`가 기존 목록 데이터를 한 번 로드한 뒤, 화면 상태로 플릿 필터·검색·페이지네이션을 처리한다. 상단 필터는 `PageLayout.filters` 슬롯에 평평한 제어부로 렌더하고, 본문은 흰색 리스트 패널 하나가 높이를 채우도록 유지한다. 기존에 들어간 요약칩, 툴바 외피, 연녹색 강조는 제거하고, 회색 계열의 차분한 운영 화면으로 되돌린다.

**Tech Stack:** React, TypeScript, React Router, Vitest, Testing Library, Vite CSS

---

### Task 1: 테스트로 새 스타일 계약을 고정

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriversPage.test.tsx`

- [ ] **Step 1: 상단 필터와 하단 페이지네이션의 새 구조를 검증하는 failing test를 추가한다**

```tsx
it('renders flat filters without summary chips', async () => {
  renderDriversPage();
  expect(await screen.findByLabelText('플릿')).toBeInTheDocument();
  expect(screen.getByLabelText('검색')).toBeInTheDocument();
  expect(screen.getByText('3명')).toBeInTheDocument();
  expect(screen.queryByText(/검색어:/)).not.toBeInTheDocument();
});

it('keeps only footer-owned pagination metadata', async () => {
  renderDriversPage({ driverCount: 12 });
  expect(await screen.findByLabelText('노출 수')).toBeInTheDocument();
  expect(screen.getByLabelText('페이지 번호')).toBeInTheDocument();
  expect(screen.getAllByText(/1-10 \\/ 12|1-12 \\/ 12/).length).toBe(1);
});
```

- [ ] **Step 2: 검색과 플릿 필터, `전체` 페이지 크기 동작을 유지하는 테스트를 갱신한다**

```tsx
it('filters by fleet and search keyword', async () => {
  renderDriversPage();
  await user.selectOptions(screen.getByLabelText('플릿'), 'fleet-1');
  await user.type(screen.getByLabelText('검색'), 'kim');
  expect(screen.getByText('Kim Driver')).toBeInTheDocument();
});

it('supports the all page-size option', async () => {
  renderDriversPage({ driverCount: 12 });
  await user.selectOptions(screen.getByLabelText('노출 수'), 'all');
  expect(screen.getAllByRole('row')).toHaveLength(/* header + all rows */);
});
```

- [ ] **Step 3: 테스트를 실행해 실패를 확인한다**

Run: `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm test -- src/pages/DriversPage.test.tsx --run`

Expected: 새 구조 관련 테스트 FAIL

- [ ] **Step 4: 테스트 파일만 커밋한다**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/DriversPage.test.tsx
git commit -m "test: cover simplified driver list layout"
```

### Task 2: DriversPage 마크업을 표 중심 workbench로 정리

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriversPage.tsx`

- [ ] **Step 1: 상단 필터를 컨테이너 없는 평평한 제어부로 바꾼다**

```tsx
const filters = (
  <>
    <label className="driver-list-filter-inline">
      <span>플릿</span>
      <select aria-label="플릿" value={selectedFleetId} onChange={...}>...</select>
    </label>
    <label className="driver-list-filter-inline driver-list-filter-search">
      <span>검색</span>
      <input
        aria-label="검색"
        type="search"
        value={searchTerm}
        onChange={...}
        placeholder="배송원 이름 또는 원청 앱 사용자명"
      />
    </label>
    <span className="table-meta driver-list-count">{filteredDrivers.length}명</span>
  </>
);
```

- [ ] **Step 2: 상단 요약칩, 검색어칩, 중복 범위 표시를 제거한다**

```tsx
<div className="panel-header driver-list-shell-header">
  <div>
    <p className="panel-kicker">배송원</p>
    <h2>배송원 목록</h2>
  </div>
</div>
```

- [ ] **Step 3: 하단 푸터만 페이지네이션 메타를 가지도록 정리한다**

```tsx
<div className="driver-list-footer">
  <span className="table-meta">{visibleStart}-{visibleEnd} / {filteredDrivers.length}</span>
  <label className="driver-list-page-size">...</label>
  <div className="driver-list-pagination" aria-label="페이지 번호">...</div>
</div>
```

- [ ] **Step 4: 빈 상태와 상세 이동, 계정 연결 이름 표시는 그대로 유지한다**

```tsx
{activeLink?.identity_name ?? ''}
```

- [ ] **Step 5: 테스트를 실행해 마크업 요구가 통과하는지 확인한다**

Run: `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm test -- src/pages/DriversPage.test.tsx --run`

Expected: 새 구조 관련 테스트 PASS, 스타일 관련 검증은 아직 일부 미정

- [ ] **Step 6: 페이지 컴포넌트 변경을 커밋한다**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/DriversPage.tsx src/pages/DriversPage.test.tsx
git commit -m "feat: simplify driver list workbench structure"
```

### Task 3: CSS를 기준 화면 스타일에 맞게 재정렬

**Files:**
- Modify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: 툴바 외피, 요약칩, 연녹색 강조 스타일을 제거한다**

```css
.driver-list-toolbar-surface,
.driver-list-shell-summary,
.driver-list-summary-pill,
.driver-list-summary-range {
  /* remove usage and definitions */
}
```

- [ ] **Step 2: 필터를 평평한 inline control 형태로 다시 정의한다**

```css
.driver-list-page {
  grid-auto-rows: minmax(0, 1fr);
}

.driver-list-filter-row {
  display: flex;
  align-items: end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.driver-list-filter-inline {
  display: grid;
  gap: 0.28rem;
}
```

- [ ] **Step 3: 리스트 패널과 테이블을 차분한 회색 계열 workbench로 조정한다**

```css
.driver-list-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: calc(100vh - 15rem);
  padding: 0.95rem 1rem 0.85rem;
}

.driver-list-table-shell {
  overflow: auto;
  border: 1px solid rgba(28, 32, 43, 0.08);
  border-radius: 1rem;
  background: #fff;
  box-shadow: none;
}
```

- [ ] **Step 4: 테이블 행 밀도와 hover/focus를 더 차분하게 만든다**

```css
.driver-list-table th,
.driver-list-table td {
  padding: 0.5rem 0.6rem;
}

.driver-list-table tbody tr.interactive-row:hover,
.driver-list-table tbody tr.interactive-row:focus {
  background: rgba(28, 32, 43, 0.04);
}
```

- [ ] **Step 5: 푸터를 조용한 페이지네이션 바 형태로 정리한다**

```css
.driver-list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(28, 32, 43, 0.08);
  background: #fff;
}
```

- [ ] **Step 6: 모바일에서 필터와 푸터가 자연스럽게 줄바꿈되도록 정리한다**

```css
@media (max-width: 960px) {
  .driver-list-filter-row,
  .driver-list-footer {
    align-items: stretch;
  }
}
```

- [ ] **Step 7: 스타일과 페이지를 함께 검증한다**

Run: `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm test -- src/pages/DriversPage.test.tsx src/pages/DriverDetailPage.test.tsx --run`

Expected: PASS

- [ ] **Step 8: 스타일 변경을 커밋한다**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/styles.css src/pages/DriversPage.tsx src/pages/DriversPage.test.tsx
git commit -m "style: align driver list with operations workbench"
```

### Task 4: 최종 검증과 정리

**Files:**
- Verify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/pages/DriversPage.tsx`
- Verify: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console/src/styles.css`

- [ ] **Step 1: 관련 테스트를 최종 실행한다**

Run: `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm test -- src/pages/DriversPage.test.tsx src/pages/DriverDetailPage.test.tsx --run`

Expected: PASS

- [ ] **Step 2: 빌드를 실행한다**

Run: `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && npm run build`

Expected: build succeeds; existing chunk-size warning only if unchanged

- [ ] **Step 3: 변경 파일만 검토한다**

Run: `cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console && git diff -- src/pages/DriversPage.tsx src/pages/DriversPage.test.tsx src/styles.css`

Expected: only approved UI simplification changes

- [ ] **Step 4: 최종 커밋한다**

```bash
cd /Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/development/front-web-console
git add src/pages/DriversPage.tsx src/pages/DriversPage.test.tsx src/styles.css
git commit -m "feat: restyle driver list as operations table"
```
