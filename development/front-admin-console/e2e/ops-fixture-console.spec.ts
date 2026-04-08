import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/');
  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('change-me');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: '대시보드', exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

async function gotoAppPath(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

function uniqueSuffix() {
  return Date.now().toString(36);
}

test('ops-derived fixture company and fleet data is visible in registry pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '회사', exact: true }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(page.locator('.page-layout-title', { hasText: '회사·플릿' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('회사를 불러오는 중입니다...');
  const companyRows = page.locator('table tbody tr');
  await expect(companyRows.first()).toBeVisible();
  expect(await companyRows.count()).toBeGreaterThanOrEqual(4);
  const targetCompanyRow = page
    .getByRole('cell', { name: 'Ops Company A' })
    .first()
    .locator('xpath=ancestor::tr[1]');
  await expect(targetCompanyRow).toBeVisible();
  await targetCompanyRow.click();
  await expect(page).toHaveURL(/\/companies\/[^/]+$/);
  await expect(page.locator('.page-layout-title', { hasText: 'Ops Company A' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('heading', { name: '이 회사에 속한 플릿' })).toBeVisible({
    timeout: 15_000,
  });
  const targetFleetRow = page
    .getByRole('cell', { name: 'Ops Fleet A-1' })
    .first()
    .locator('xpath=ancestor::tr[1]');
  await expect(targetFleetRow).toBeVisible();
  await targetFleetRow.click();
  await expect(page).toHaveURL(/\/companies\/[^/]+\/fleets\/[^/]+$/);
  await expect(page.locator('.page-layout-title', { hasText: 'Ops Fleet A-1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '기본 정보' })).toBeVisible();
  await expect(page.locator('body')).toContainText('Ops Company A');
});

test('ops-derived fixture driver detail data is visible in registry pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '배송원', exact: true }).click();
  await expect(page).toHaveURL(/\/drivers$/);
  await expect(page.locator('.page-layout-title', { hasText: '배송원' })).toBeVisible();
  await expect(page.getByText('Ops Driver A1-01')).toBeVisible();
  const driverRows = page.locator('table tbody tr');
  await expect(driverRows.first()).toBeVisible();
  expect(await driverRows.count()).toBeGreaterThanOrEqual(19);
  const targetDriverRow = page
    .getByRole('cell', { name: 'Ops Driver A1-01' })
    .first()
    .locator('xpath=ancestor::tr[1]');
  await expect(targetDriverRow).toBeVisible();
  await targetDriverRow.click();
  await expect(page).toHaveURL(/\/drivers\/[^/]+$/);
  await expect(page.locator('.page-layout-title', { hasText: 'Ops Driver A1-01' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('heading', { name: '기본 프로필' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).toContainText('Ops Driver A1-01');
  await expect(page.locator('body')).toContainText('OPS-11-001');
  await expect(page.locator('body')).toContainText('010-9000-1101');
});

test('ops-derived fixture vehicle and assignment data is visible in registry pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '차량', exact: true }).click();
  await expect(page).toHaveURL(/\/vehicles$/);
  await expect(page.locator('.page-layout-title', { hasText: '차량' })).toBeVisible();
  await expect(page.getByText('12가3401')).toBeVisible();
  const vehicleRows = page.locator('table tbody tr');
  await expect(vehicleRows.first()).toBeVisible();
  expect(await vehicleRows.count()).toBeGreaterThanOrEqual(23);
  const targetVehicleRow = page
    .getByRole('cell', { name: '12가3401' })
    .first()
    .locator('xpath=ancestor::tr[1]');
  await expect(targetVehicleRow).toHaveAttribute('data-detail-path', /\/vehicles\/[^/]+$/);
  await expect(targetVehicleRow).toContainText('Ops Company A');

  await mainNavigation.getByRole('link', { name: '차량 배정', exact: true }).click();
  await expect(page).toHaveURL(/\/vehicle-assignments$/);
  await expect(page.locator('.page-layout-title', { hasText: '차량 배정' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '배정 목록' })).toBeVisible();
  const firstAssignmentRow = page.locator('table tbody tr').first();
  await expect(firstAssignmentRow).toBeVisible();
  expect(await page.locator('table tbody tr').count()).toBeGreaterThanOrEqual(12);
  const assignmentDetailPath = await firstAssignmentRow.getAttribute('data-detail-path');
  expect(assignmentDetailPath).toBeTruthy();
  await gotoAppPath(page, assignmentDetailPath!);
  await expect(page).toHaveURL(/\/vehicle-assignments\/[^/]+$/);
  await expect(page.locator('.page-layout-title', { hasText: '배정 상세' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '배정 요약' })).toBeVisible();
});

test('ops-derived fixture region data is visible in region pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '권역', exact: true }).click();
  await expect(page).toHaveURL(/\/regions$/);
  await expect(page.locator('.page-layout-title', { hasText: '권역' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('권역을 불러오는 중입니다...');
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  const targetRegionRow = page
    .getByRole('cell', { name: 'Ops Region A-1' })
    .first()
    .locator('xpath=ancestor::tr[1]');
  await expect(targetRegionRow).toBeVisible();
  await targetRegionRow.click();
  await expect(page).toHaveURL(/\/regions\/ops-region-a-1$/);
  await expect(page.locator('.page-layout-title', { hasText: 'Ops Region A-1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '권역 정본' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: '최신 배송 통계' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).toContainText('6412');
  await expect(page.locator('body')).toContainText('99.89%');
});

test('ops-derived fixture personnel document data is visible in personnel pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '인사문서', exact: true }).click();
  await expect(page).toHaveURL(/\/personnel-documents$/);
  await expect(page.locator('.page-layout-title', { hasText: '인사문서' })).toBeVisible();
  const documentRows = page.locator('table tbody tr');
  await expect(documentRows.first()).toBeVisible();
  const targetDocumentRow = documentRows
    .filter({ hasText: 'Ops Driver A1-01' })
    .filter({ hasText: '근로 계약서' })
    .first();
  await expect(targetDocumentRow).toBeVisible();
  await gotoAppPath(
    page,
    (await targetDocumentRow.getAttribute('data-detail-path'))!,
  );
  await expect(page).toHaveURL(/\/personnel-documents\/[^/]+$/);
  await expect(page.locator('.page-layout-title', { hasText: '인사문서 상세' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '기사 연결과 수명주기' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: '기본 문서 정보' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).toContainText('OPS-CONTRACT-A101-001');
  await expect(page.locator('body')).toContainText('Ops HR');
});

test('seeded announcement data is visible in console pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '공지', exact: true }).click();
  await expect(page).toHaveURL(/\/announcements$/);
  await expect(page.locator('.page-layout-title', { hasText: '공지' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '공지 목록' })).toBeVisible();
  await expect(page.getByText('Policy Update For Operators')).toBeVisible();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.getByRole('cell', { name: 'Policy Update For Operators' }).first().click();
  await expect(page).toHaveURL(/\/announcements\/ops-policy-update$/);
  await expect(page.locator('.page-layout-title', { hasText: 'Policy Update For Operators' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('heading', { name: '공지 내용' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Settlement review timing changed for operator workflow.')).toBeVisible();
});

test('administrator can create an announcement from console UI', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');
  const suffix = uniqueSuffix();
  const slug = `ops-ui-announcement-${suffix}`;
  const title = `Ops UI Announcement ${suffix}`;
  const body = `Ops UI body ${suffix}`;

  await mainNavigation.getByRole('link', { name: '공지', exact: true }).click();
  await expect(page).toHaveURL(/\/announcements$/);
  await page.getByRole('link', { name: '공지 생성' }).click();
  await expect(page).toHaveURL(/\/announcements\/new$/);

  await page.getByLabel('슬러그').fill(slug);
  await page.getByLabel('제목').fill(title);
  await page.getByLabel('본문').fill(body);
  await page.getByLabel('게시 상태').selectOption('draft');
  await page.getByLabel('노출 범위').selectOption('operator');
  await page.getByRole('button', { name: '저장' }).click();

  await expect(page).toHaveURL(new RegExp(`/announcements/${slug}$`));
  await expect(page.locator('.page-layout-title', { hasText: title })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(body)).toBeVisible();
});

test('seeded support data is visible in console pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '지원', exact: true }).click();
  await expect(page).toHaveURL(/\/support$/);
  await expect(page.getByText('Driver App Inquiry')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).toContainText('우선순위');
  await expect(page.locator('body')).toContainText('답변 내용');
});

test('administrator can create a support reply from console UI', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');
  const replyBody = `ops ui support reply ${uniqueSuffix()}`;

  await mainNavigation.getByRole('link', { name: '지원', exact: true }).click();
  await expect(page).toHaveURL(/\/support$/);
  const targetTicketRow = page.locator('table tbody tr').filter({ hasText: 'Driver App Inquiry' }).first();
  await expect(targetTicketRow).toBeVisible({ timeout: 15_000 });
  await targetTicketRow.click();
  await page.getByLabel('답변 내용').fill(replyBody);
  await page.getByRole('button', { name: '답변 등록' }).click();

  await expect(page.getByText(replyBody)).toBeVisible({ timeout: 15_000 });
});

test('seeded notification data is visible in console pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '알림', exact: true }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.locator('.page-layout-title', { hasText: '알림 관리' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '발송 입력' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '일반 알림' })).toBeVisible();
  await expect(page.locator('body')).toContainText('Operator Policy Updated', { timeout: 15_000 });
  await expect(page.locator('body')).toContainText('Support Ticket Closed', { timeout: 15_000 });
});

test('seeded administrator can access self-service page', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '내 계정' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.locator('.page-layout-title', { hasText: '내 계정' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '현재 웹 권한' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '필수 동의' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '로그인 수단 관리' })).toBeVisible();
});

test('seeded administrator can access account management page', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '계정 요청' }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.locator('.page-layout-title', { hasText: '계정 요청 관리' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '요청 처리' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '활성 관리자 계정' })).toBeVisible();
});

test('ops-derived fixture data is visible in dispatch pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '배차', exact: true }).click();
  await expect(page).toHaveURL(/\/dispatch\/boards$/);
  await expect(page.locator('.page-layout-title', { hasText: '배차 보드' })).toBeVisible();
  const dispatchTable = page.locator('table').first();
  const dispatchRows = page.locator('table tbody tr');
  await expect(dispatchRows.first()).toBeVisible({ timeout: 15_000 });
  expect(await dispatchRows.count()).toBeGreaterThanOrEqual(8);
  await expect(dispatchTable).toContainText('Ops Company A');
  await expect(dispatchTable).toContainText('Ops Fleet A-1');
  const targetBoardRow = dispatchTable.locator('tbody tr').filter({ hasText: 'Ops Company A' }).filter({
    hasText: 'Ops Fleet A-1',
  }).first();
  await targetBoardRow.getByRole('link', { name: '보드 열기' }).click();
  await expect(page).toHaveURL(/\/dispatch\/boards\/[^/]+\/\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByRole('heading', { name: '배차 문맥' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '차량-배송원 보드' })).toBeVisible();
  await expect(page.getByRole('button', { name: '정산 입력으로 넘기기' })).toBeVisible();
});

test('ops-derived fixture data is visible in settlement overview and input pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '정산', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/overview$/);
  await expect(page.getByRole('heading', { name: '정산 운영 요약' })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('body')).toContainText('Ops Driver A1-01', { timeout: 15_000 });
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 });

  await page.getByRole('link', { name: '정산 입력', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/inputs$/);
  await expect(page.getByRole('heading', { name: '정산 입력 요약' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '배송 원천 입력 목록' })).toBeVisible();
  await expect(page.getByLabel('회사')).toBeVisible();
  await expect(page.getByLabel('플릿')).toBeVisible();
  await expect(page.getByRole('button', { name: '원천 입력 생성' })).toBeVisible();
  await expect(page.getByRole('button', { name: '스냅샷 생성' })).toBeVisible();
});

test('ops-derived fixture data is visible in settlement run and result pages', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await mainNavigation.getByRole('link', { name: '정산', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/overview$/);

  await page.getByRole('link', { name: '정산 실행', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/runs$/);
  await expect(page.getByRole('heading', { name: '정산 실행 요약' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '정산 실행 목록' })).toBeVisible();
  await expect(page.getByRole('button', { name: '정산 실행 생성' })).toBeVisible();

  await page.getByRole('link', { name: '정산 결과', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/results$/);
  await expect(page.getByRole('heading', { name: '정산 결과 요약' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '정산 결과 목록' })).toBeVisible();
  await expect(page.getByRole('button', { name: '정산 항목 생성' })).toBeVisible();
});
