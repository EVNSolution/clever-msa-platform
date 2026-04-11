# Driver List Operations Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배송원 목록 화면을 조밀한 운영형 리스트로 재구성하고, 상단 플릿 필터·검색과 하단 페이지네이션을 추가한다.

**Architecture:** `DriversPage`는 서버 API를 늘리지 않고 기존 목록 데이터를 한 번 로드한 뒤, 화면 상태로 플릿 필터·검색·페이지네이션을 처리한다. `PageLayout.filters`에 상단 필터를 배치하고, `styles.css`에 배송원 목록 전용 리스트 셸과 푸터 스타일을 추가해 뷰포트 높이를 자연스럽게 채우는 구조로 만든다.

**Tech Stack:** React, TypeScript, React Router, Vitest, Testing Library, Vite CSS

---

### Task 1: 테스트로 현재 요구를 고정

**Files:**
- Modify: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/pages/DriversPage.test.tsx`

- [ ] **Step 1: 플릿 필터, 검색, 페이지네이션 요구를 검증하는 failing test를 추가한다**

```tsx
it('filters drivers by fleet and search keyword, then paginates rows', async () => {
  // 12+ rows across two fleets
  // select fleet A
  // search for a driver by name or external_user_name
  // expect filtered count/meta and first page rows
  // move to page 2 and verify remaining rows
});

it('supports the all page-size option', async () => {
  // select "전체"
  // expect all filtered rows to render
  // expect single-page pagination state
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm test -- src/pages/DriversPage.test.tsx --run`

Expected: 신규 필터/검색/페이지네이션 UI를 찾지 못해 FAIL

- [ ] **Step 3: 기존 계정 연결 이름 표시와 상세 이동 assertions는 유지한다**

```tsx
expect(screen.getByText('김기사 계정')).toBeInTheDocument();
expect(screen.getByText('Kim Driver').closest('tr')).toHaveAttribute('data-detail-path', '/drivers/1');
```

- [ ] **Step 4: 테스트 파일만 다시 실행해 실패 상태를 고정한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm test -- src/pages/DriversPage.test.tsx --run`

Expected: 새 케이스 FAIL, 기존 케이스 PASS 또는 유지

- [ ] **Step 5: 커밋한다**

```bash
cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout
git add src/pages/DriversPage.test.tsx
git commit -m "test: cover driver list filters and pagination"
```

### Task 2: DriversPage 상태와 파생 목록 로직 추가

**Files:**
- Modify: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/pages/DriversPage.tsx`
- Reference: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/types.ts`

- [ ] **Step 1: 필터/검색/페이지네이션 상태를 추가한다**

```tsx
const PAGE_SIZE_OPTIONS = [10, 25, 50, 'all'] as const;
const [selectedFleetId, setSelectedFleetId] = useState('all');
const [searchTerm, setSearchTerm] = useState('');
const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
const [currentPage, setCurrentPage] = useState(1);
```

- [ ] **Step 2: 파생 목록 계산을 추가한다**

```tsx
const normalizedSearchTerm = searchTerm.trim().toLowerCase();
const filteredDrivers = drivers.filter((driver) => {
  const matchesFleet = selectedFleetId === 'all' || driver.fleet_id === selectedFleetId;
  const matchesSearch =
    normalizedSearchTerm.length === 0 ||
    driver.name.toLowerCase().includes(normalizedSearchTerm) ||
    (driver.external_user_name ?? '').toLowerCase().includes(normalizedSearchTerm);
  return matchesFleet && matchesSearch;
});
```

- [ ] **Step 3: 페이지 계산과 페이지 리셋 로직을 추가한다**

```tsx
useEffect(() => {
  setCurrentPage(1);
}, [selectedFleetId, searchTerm, pageSize]);

const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(filteredDrivers.length / pageSize));
const pagedDrivers =
  pageSize === 'all'
    ? filteredDrivers
    : filteredDrivers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
```

- [ ] **Step 4: 상세 이동, 회사/플릿 표시, 계정 연결 이름 표시가 새 파생 목록에서도 유지되게 바꾼다**

```tsx
{pagedDrivers.map((driver) => {
  const activeLink = getActiveDriverAccountLink(driver.driver_id);
  // keep detailPath, company/fleet names, activeLink identity_name
})}
```

- [ ] **Step 5: 테스트를 실행해 로직이 통과하는지 확인한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm test -- src/pages/DriversPage.test.tsx --run`

Expected: 로직 관련 테스트 PASS, 스타일/마크업 관련 일부 케이스는 아직 FAIL 가능

- [ ] **Step 6: 커밋한다**

```bash
cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout
git add src/pages/DriversPage.tsx src/pages/DriversPage.test.tsx
git commit -m "feat: add driver list filtering and pagination state"
```

### Task 3: 상단 필터와 하단 페이지네이션 UI 추가

**Files:**
- Modify: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/pages/DriversPage.tsx`

- [ ] **Step 1: `PageLayout.filters`에 플릿 드롭다운과 검색 입력을 추가한다**

```tsx
const filters = (
  <>
    <label className="field-inline">
      <span>플릿</span>
      <select value={selectedFleetId} onChange={(event) => setSelectedFleetId(event.target.value)}>
        <option value="all">전체</option>
        {fleets.map((fleet) => (
          <option key={fleet.fleet_id} value={fleet.fleet_id}>{fleet.name}</option>
        ))}
      </select>
    </label>
    <label className="field-inline grow">
      <span>검색</span>
      <input
        type="search"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        placeholder="배송원 이름 또는 원청 앱 사용자명"
      />
    </label>
    <span className="table-meta">{filteredDrivers.length}명</span>
  </>
);
```

- [ ] **Step 2: 리스트 카드 하단에 페이지 크기 셀렉트와 페이지 번호 버튼을 추가한다**

```tsx
<footer className="driver-list-footer">
  <label>
    <span>노출 수</span>
    <select value={String(pageSize)}>{/* 10 25 50 all */}</select>
  </label>
  <div className="driver-list-pagination">
    {Array.from({ length: totalPages }, (_, index) => (
      <button key={index + 1} type="button">{index + 1}</button>
    ))}
  </div>
</footer>
```

- [ ] **Step 3: 필터 결과가 없을 때 리스트 본문 안에서 빈 상태를 보여주게 바꾼다**

```tsx
{pagedDrivers.length === 0 ? (
  <p className="empty-state">조건에 맞는 배송원이 없습니다.</p>
) : (
  <table className="table compact">...</table>
)}
```

- [ ] **Step 4: 테스트를 실행해 UI 요구가 통과하는지 확인한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm test -- src/pages/DriversPage.test.tsx --run`

Expected: 새 필터/페이지네이션 테스트 PASS

- [ ] **Step 5: 커밋한다**

```bash
cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout
git add src/pages/DriversPage.tsx src/pages/DriversPage.test.tsx
git commit -m "feat: add driver list filter toolbar and footer controls"
```

### Task 4: 운영형 리스트 레이아웃과 조밀한 스타일 적용

**Files:**
- Modify: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/styles.css`
- Modify: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/pages/DriversPage.tsx`

- [ ] **Step 1: DriversPage 전용 셸 클래스를 추가한다**

```tsx
<PageLayout
  contentClassName="driver-list-page"
  filters={filters}
  ...
>
  <section className="panel driver-list-shell">...</section>
</PageLayout>
```

- [ ] **Step 2: 리스트 카드가 본문 높이를 채우는 CSS를 추가한다**

```css
.driver-list-page {
  min-height: 0;
}

.driver-list-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: calc(100vh - 16rem);
}
```

- [ ] **Step 3: 행 밀도와 열 폭을 줄이는 스타일을 추가한다**

```css
.driver-list-table th,
.driver-list-table td {
  padding: 0.6rem 0.55rem;
  font-size: 0.92rem;
}

.driver-list-table td {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 4: 모바일에서 필터와 푸터가 2줄로 정리되도록 반응형 스타일을 추가한다**

```css
@media (max-width: 960px) {
  .driver-list-toolbar,
  .driver-list-footer {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 5: 관련 테스트와 빌드를 실행한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm test -- src/pages/DriversPage.test.tsx src/pages/DriverDetailPage.test.tsx --run`

Expected: PASS

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm run build`

Expected: PASS with existing bundle-size warning only

- [ ] **Step 6: 커밋한다**

```bash
cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout
git add src/pages/DriversPage.tsx src/styles.css src/pages/DriversPage.test.tsx
git commit -m "feat: restyle driver list as responsive operations view"
```

### Task 5: 최종 검증과 정리

**Files:**
- Verify only: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/pages/DriversPage.tsx`
- Verify only: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/styles.css`
- Verify only: `/Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout/src/pages/DriversPage.test.tsx`
- Reference spec: `/Users/jiin/Documents/Files/02_EVnSolution/00_Source_code/CLEVER/clever-msa-platform/docs/superpowers/specs/2026-04-11-driver-list-operations-layout-design.md`

- [ ] **Step 1: 최종 테스트 세트를 실행한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm test -- src/pages/DriversPage.test.tsx src/pages/DriverDetailPage.test.tsx --run`

Expected: PASS

- [ ] **Step 2: 프로덕션 빌드를 실행한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && npm run build`

Expected: PASS

- [ ] **Step 3: 워크트리 상태를 확인한다**

Run: `cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout && git status --short`

Expected: 의도한 파일만 변경

- [ ] **Step 4: 최종 커밋을 정리한다**

```bash
cd /Users/jiin/.config/superpowers/worktrees/front-web-console/codex-driver-list-operations-layout
git add src/pages/DriversPage.tsx src/styles.css src/pages/DriversPage.test.tsx
git commit -m "feat: redesign driver list operations layout"
```
