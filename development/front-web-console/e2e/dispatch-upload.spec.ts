import { expect, test, type Page, type Route } from '@playwright/test';

const sampleUploadFile =
  '/Users/jiin/Downloads/배차현황_2026-02-13 02_29_07.xlsx';

const sessionPayload = {
  accessToken: 'playwright-token',
  sessionKind: 'manager',
  email: 'seed-admin@example.com',
  identity: {
    identityId: 'identity-1',
    name: 'System Admin',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'manager',
    accountId: 'manager-1',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'company_super_admin',
    roleDisplayName: '회사 총괄 관리자',
  },
  availableAccountTypes: ['manager'],
};

async function mockJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function primeConsoleSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('clever.admin.session', JSON.stringify(session));
  }, sessionPayload);
}

async function mockDispatchUploadApis(page: Page) {
  let confirmedBatch: Record<string, unknown> | null = null;

  await page.route('**/api/auth/identity-navigation-policy/', async (route) => {
    await mockJson(route, {
      allowed_nav_keys: ['dashboard', 'dispatch', 'settlements', 'drivers', 'vehicles'],
      source: 'playwright',
    });
  });

  await page.route('**/api/org/companies/', async (route) => {
    await mockJson(route, [
      {
        company_id: '30000000-0000-0000-0000-000000000001',
        route_no: 31,
        name: 'Seed Company',
      },
    ]);
  });

  await page.route('**/api/org/fleets/**', async (route) => {
    const url = route.request().url();
    if (url.match(/\/api\/org\/fleets\/[^/]+\/?$/)) {
      await mockJson(route, {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 41,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      });
      return;
    }

    await mockJson(route, [
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 41,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
  });

  await page.route('**/api/drivers/', async (route) => {
    await mockJson(route, [
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
        external_user_name: 'mock-external-user',
      },
    ]);
  });

  await page.route('**/api/vehicles/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/vehicle-masters/')) {
      await mockJson(route, []);
      return;
    }
    await mockJson(route, []);
  });

  await page.route('**/api/dispatch/plans/**', async (route) => {
    await mockJson(route, [
      {
        dispatch_plan_id: 'dispatch-plan-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        planned_volume: 120,
        dispatch_status: 'draft',
      },
    ]);
  });

  await page.route('**/api/dispatch-ops/summary/**', async (route) => {
    await mockJson(route, {
      dispatch_date: '2026-03-24',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      planned_volume: 120,
      planned_assignment_count: 1,
      matched_count: 1,
      not_started_count: 0,
      dispatch_unit_changed_count: 0,
      unplanned_current_count: 0,
    });
  });

  await page.route('**/api/dispatch-ops/board/**', async (route) => {
    await mockJson(route, []);
  });

  await page.route('**/api/dispatch/vehicle-schedules/**', async (route) => {
    await mockJson(route, []);
  });
  await page.route('**/api/dispatch/work-rules/**', async (route) => {
    await mockJson(route, []);
  });
  await page.route('**/api/dispatch/driver-day-exceptions/**', async (route) => {
    await mockJson(route, []);
  });
  await page.route('**/api/dispatch/outsourced-drivers/**', async (route) => {
    await mockJson(route, []);
  });
  await page.route('**/api/delivery-record/daily-snapshots/**', async (route) => {
    await mockJson(route, []);
  });

  await page.route('**/api/dispatch/upload-batches/preview/', async (route) => {
    const request = route.request().postDataJSON() as {
      dispatch_plan_id?: string | null;
      company_id: string;
      fleet_id: string;
      dispatch_date: string;
      source_filename?: string;
      rows: Array<{
        delivery_manager_name: string;
        small_region_text: string;
        detailed_region_text: string;
        box_count: number;
        household_count: number;
      }>;
    };

    const previewBatch = {
      upload_batch_id: 'upload-batch-1',
      dispatch_plan_id: request.dispatch_plan_id ?? null,
      company_id: request.company_id,
      fleet_id: request.fleet_id,
      dispatch_date: request.dispatch_date,
      source_filename: request.source_filename ?? 'dispatch.xlsx',
      upload_status: 'draft',
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T09:00:00Z',
      rows: request.rows.slice(0, 3).map((row, index) => ({
        upload_row_id: `upload-row-${index + 1}`,
        row_index: index + 1,
        external_user_name: row.delivery_manager_name,
        small_region_text: row.small_region_text,
        detailed_region_text: row.detailed_region_text,
        box_count: row.box_count,
        household_count: row.household_count,
        matched_driver_id: index === 0 ? '10000000-0000-0000-0000-000000000001' : null,
      })),
    };

    confirmedBatch = {
      ...previewBatch,
      upload_status: 'confirmed',
      updated_at: '2026-03-24T09:10:00Z',
    };

    await mockJson(route, previewBatch);
  });

  await page.route('**/api/dispatch/upload-batches/upload-batch-1/confirm/', async (route) => {
    await mockJson(route, confirmedBatch);
  });

  await page.route('**/api/dispatch/upload-batches/**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await mockJson(route, confirmedBatch ? [confirmedBatch] : []);
  });
}

test('dispatch upload page supports upload preview and confirm flow without a dispatch plan', async ({
  page,
}) => {
  await primeConsoleSession(page);
  await mockDispatchUploadApis(page);

  await page.goto('/dispatch/uploads');

  await expect(page.getByRole('heading', { name: '배차표 업로드', level: 1 })).toBeVisible();
  await expect(page.getByLabel('회사')).toHaveCount(0);
  await expect(page.getByLabel('플릿')).toBeVisible();
  await expect(page.getByLabel('배차일')).toBeVisible();

  await page.getByLabel('배차표 업로드').setInputFiles(sampleUploadFile);

  await expect(page.getByText('감지된 배차일 2026-02-13')).toBeVisible();
  await expect(page.getByRole('button', { name: '서버 검증' })).toBeDisabled();
  await page.getByRole('button', { name: '감지된 날짜 적용' }).click();
  await expect(page.getByLabel('배차일')).toHaveValue('2026-02-13');
  await expect(page.getByRole('button', { name: '서버 검증' })).toBeEnabled();

  await page.getByRole('button', { name: '서버 검증' }).click();
  await expect(page.getByText('검증 완료')).toBeVisible();
  await expect(page.getByRole('button', { name: '업로드 확정' })).toBeVisible();

  await page.getByRole('button', { name: '업로드 확정' }).click();

  await expect(page.getByText('확정 완료')).toBeVisible();
  await expect(page.getByRole('button', { name: '정산 시작' })).toBeVisible();
});
