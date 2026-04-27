import { expect, test, type Locator, type Page, type Route } from '@playwright/test';

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
} as const;

const company = {
  company_id: '30000000-0000-0000-0000-000000000001',
  route_no: 31,
  name: 'Seed Company',
};

const fleet = {
  fleet_id: '40000000-0000-0000-0000-000000000001',
  route_no: 41,
  company_id: company.company_id,
  name: 'Seed Fleet',
};

const driver = {
  driver_id: '10000000-0000-0000-0000-000000000001',
  route_no: 1,
  company_id: company.company_id,
  fleet_id: fleet.fleet_id,
  name: 'Seed Driver',
  external_user_name: 'seed-driver-user',
  ev_id: 'EV-001',
  phone_number: '010-1234-5678',
  address: 'Seoul',
};

const dispatchPlan = {
  dispatch_plan_id: 'dispatch-plan-1',
  company_id: company.company_id,
  fleet_id: fleet.fleet_id,
  dispatch_date: '2026-03-24',
  planned_volume: 120,
  dispatch_status: 'draft',
  created_at: '2026-03-24T09:00:00Z',
  updated_at: '2026-03-24T09:00:00Z',
};

const dailySnapshot = {
  daily_delivery_input_snapshot_id: 'snapshot-1',
  company_id: company.company_id,
  fleet_id: fleet.fleet_id,
  driver_id: driver.driver_id,
  service_date: '2026-03-24',
  delivery_count: 42,
  total_distance_km: '0.00',
  total_base_amount: '0.00',
  source_record_count: 1,
  status: 'active',
};

const latestSettlement = {
  driver_id: driver.driver_id,
  delivery_history_present: true,
  attendance_inferred_from_delivery_history: true,
  latest_settlement: {
    settlement_run_id: 'run-1',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    status: 'completed',
    payout_status: 'pending',
    amount: '123456.00',
  },
};

const viewports = [
  { name: 'mobile-tall', width: 390, height: 844 },
  { name: 'mobile-short', width: 390, height: 700 },
] as const;

const smokePages: Array<{
  name: string;
  path: string;
  ready: (page: Page) => Locator;
}> = [
  {
    name: 'company registry',
    path: '/companies',
    ready: (page) => page.getByRole('heading', { name: '회사·플릿' }),
  },
  {
    name: 'driver registry',
    path: '/drivers',
    ready: (page) => page.getByRole('heading', { name: '배송원' }),
  },
  {
    name: 'dispatch boards',
    path: '/dispatch/boards',
    ready: (page) => page.getByRole('heading', { name: '배차 계획', exact: true }),
  },
  {
    name: 'dispatch uploads',
    path: '/dispatch/uploads',
    ready: (page) => page.getByRole('heading', { name: '배차표 업로드' }),
  },
  {
    name: 'settlement overview',
    path: '/settlements/overview',
    ready: (page) => page.getByRole('heading', { name: '정산 운영 요약' }),
  },
] as const;

function toRefreshPayload() {
  return {
    access_token: sessionPayload.accessToken,
    session_kind: sessionPayload.sessionKind,
    email: sessionPayload.email,
    identity: {
      identity_id: sessionPayload.identity.identityId,
      name: sessionPayload.identity.name,
      birth_date: sessionPayload.identity.birthDate,
      status: sessionPayload.identity.status,
    },
    active_account: {
      account_type: sessionPayload.activeAccount.accountType,
      account_id: sessionPayload.activeAccount.accountId,
      company_id: sessionPayload.activeAccount.companyId,
      role_type: sessionPayload.activeAccount.roleType,
      role_display_name: sessionPayload.activeAccount.roleDisplayName,
    },
    available_account_types: [...sessionPayload.availableAccountTypes],
  };
}

async function mockJson(route: Route, body: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function primeManagerSession(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('clever.admin.session', JSON.stringify(session));
  }, sessionPayload);
}

async function mockMobileSmokeApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr') {
      await route.fallback();
      return;
    }

    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === '/api/auth/identity-navigation-policy/') {
      await mockJson(route, {
        allowed_nav_keys: ['dashboard', 'companies', 'dispatch', 'drivers', 'settlements'],
        source: 'playwright',
      });
      return;
    }

    if (path === '/api/auth/identity-refresh/') {
      await mockJson(route, toRefreshPayload());
      return;
    }

    if (path === '/api/org/companies/') {
      await mockJson(route, [company]);
      return;
    }

    if (path === '/api/org/fleets/') {
      await mockJson(route, [fleet]);
      return;
    }

    if (path.startsWith('/api/org/fleets/')) {
      await mockJson(route, fleet);
      return;
    }

    if (path === '/api/drivers/') {
      await mockJson(route, [driver]);
      return;
    }

    if (path === '/api/dispatch/plans/') {
      await mockJson(route, [dispatchPlan]);
      return;
    }

    if (path === '/api/dispatch/upload-batches/') {
      await mockJson(route, []);
      return;
    }

    if (path === '/api/delivery-record/daily-snapshots/') {
      await mockJson(route, [dailySnapshot]);
      return;
    }

    if (path === '/api/settlement-ops/runs/') {
      await mockJson(route, []);
      return;
    }

    if (path === '/api/settlement-ops/items/') {
      await mockJson(route, []);
      return;
    }

    if (path === `/api/settlement-ops/drivers/${driver.driver_id}/latest-settlement/`) {
      await mockJson(route, latestSettlement);
      return;
    }

    await mockJson(route, []);
  });
}

async function collectLayoutMetrics(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const content = document.querySelector('.console-content') as HTMLElement | null;
    const title = document.querySelector('.page-layout-title, .panel-header h2') as HTMLElement | null;
    const titleRect = title?.getBoundingClientRect() ?? null;
    const styles = content ? window.getComputedStyle(content) : null;

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      horizontalOverflow: Math.max(0, root.scrollWidth - window.innerWidth),
      contentPaddingLeft: styles ? Number.parseFloat(styles.paddingLeft) : 0,
      contentPaddingRight: styles ? Number.parseFloat(styles.paddingRight) : 0,
      titleLeft: titleRect?.left ?? 0,
      titleRight: titleRect?.right ?? 0,
      titleTop: titleRect?.top ?? 0,
      titleBottom: titleRect?.bottom ?? 0,
    };
  });
}

for (const viewport of viewports) {
  for (const smokePage of smokePages) {
    test(`${viewport.name} keeps ${smokePage.name} within mobile width`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await primeManagerSession(page);
      await mockMobileSmokeApis(page);

      await page.goto(smokePage.path, { waitUntil: 'domcontentloaded' });
      await expect(smokePage.ready(page)).toBeVisible();

      const metrics = await collectLayoutMetrics(page);

      expect(metrics.horizontalOverflow).toBeLessThanOrEqual(1);
      expect(metrics.contentPaddingLeft).toBeGreaterThanOrEqual(12);
      expect(metrics.contentPaddingRight).toBeGreaterThanOrEqual(12);
      expect(metrics.titleLeft).toBeGreaterThanOrEqual(0);
      expect(metrics.titleRight).toBeLessThanOrEqual(metrics.innerWidth + 1);
      expect(metrics.titleTop).toBeGreaterThanOrEqual(0);
      expect(metrics.titleBottom).toBeLessThanOrEqual(metrics.innerHeight + 1);
    });
  }
}
