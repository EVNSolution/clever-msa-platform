import { expect, test, type Page, type Route } from '@playwright/test';

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

const metadata = {
  sections: [
    {
      key: 'tax_rates',
      title: '세율',
      description: '정산 산출에 적용되는 세금율입니다.',
      fields: [
        {
          key: 'income_tax_rate',
          label: '소득세율',
          description: '과세 기준 소득세율',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
        {
          key: 'vat_tax_rate',
          label: '부가가치세율',
          description: '부가세 적용율',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
      ],
    },
    {
      key: 'reported_amount',
      title: '정산 반영 기준',
      description: '보고 금액 반영 및 산정 보정 계수입니다.',
      fields: [
        {
          key: 'reported_amount_rate',
          label: '보고 금액 반영률',
          description: '정산에서 반영되는 보고 금액의 비율',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
      ],
    },
    {
      key: 'insurance_rates',
      title: '보험료율',
      description: '4대 보험 및 산재/고용 관련 보험율입니다.',
      fields: [
        {
          key: 'national_pension_rate',
          label: '국민연금 보험료율',
          description: '국민연금 부담률',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
        {
          key: 'health_insurance_rate',
          label: '건강보험 보험료율',
          description: '건강보험 부담률',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
        {
          key: 'medical_insurance_rate',
          label: '장기요양보험료율',
          description: '건강보험료 기반 장기요양보험율',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
        {
          key: 'employment_insurance_rate',
          label: '고용보험 보험료율',
          description: '고용보험 부담률',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
        {
          key: 'industrial_accident_insurance_rate',
          label: '산재보험 보험료율',
          description: '산업재해보상보험 부담률',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
        {
          key: 'special_employment_insurance_rate',
          label: '특별고용보험 보험료율',
          description: '특별고용보험 부담률',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
        {
          key: 'special_industrial_accident_insurance_rate',
          label: '특별산재보험 보험료율',
          description: '특별산재보험 부담률',
          input_type: 'percent',
          unit: '%',
          min: '0.0000',
          max: '100.0000',
          decimal_precision: 4,
          required: true,
        },
      ],
    },
    {
      key: 'thresholds',
      title: '기타 기준',
      description: '정산 하한선 및 수고비 기준입니다.',
      fields: [
        {
          key: 'two_insurance_min_settlement_amount',
          label: '2대 보험 최소 정산금액',
          description: '2대 보험 산정의 하한 정산 금액',
          input_type: 'currency',
          unit: '원',
          min: '0.00',
          max: '1000000.00',
          integer_only: true,
          required: true,
        },
        {
          key: 'meal_allowance',
          label: '식비',
          description: '운영 기본 식비 기준',
          input_type: 'currency',
          unit: '원',
          min: '0.00',
          max: '1000000.00',
          integer_only: true,
          required: true,
        },
      ],
    },
  ],
} as const;

const config = {
  singleton_key: 'global',
  income_tax_rate: '0.0300',
  vat_tax_rate: '0.1000',
  reported_amount_rate: '100.0000',
  national_pension_rate: '4.5000',
  health_insurance_rate: '3.4300',
  medical_insurance_rate: '0.0000',
  employment_insurance_rate: '0.0000',
  industrial_accident_insurance_rate: '0.0000',
  special_employment_insurance_rate: '0.0000',
  special_industrial_accident_insurance_rate: '0.0000',
  two_insurance_min_settlement_amount: '0.00',
  meal_allowance: '20000',
} as const;

const pricingTables = [
  {
    pricing_table_id: '91000000-0000-0000-0000-000000000001',
    company_id: company.company_id,
    fleet_id: fleet.fleet_id,
    box_sale_unit_price: '1000.00',
    box_purchase_unit_price: '800.00',
    overtime_fee: '20000.00',
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

async function mockCriteriaApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    if (request.resourceType() !== 'fetch' && request.resourceType() !== 'xhr') {
      await route.fallback();
      return;
    }

    const url = new URL(request.url());
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

    if (path === '/api/settlement-registry/settlement-config/metadata/') {
      await mockJson(route, metadata);
      return;
    }

    if (path === '/api/settlement-registry/settlement-config/') {
      await mockJson(route, config);
      return;
    }

    if (path === '/api/settlement-registry/pricing-tables/') {
      await mockJson(route, pricingTables);
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

    throw new Error(`Unhandled API request in settlement criteria layout spec: ${request.method()} ${path}`);
  });
}

async function openSettlementCriteria(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await primeManagerSession(page);
  await mockCriteriaApis(page);
  await page.goto('/settlements/criteria');
  await expect(page.getByRole('heading', { name: '회사·플릿 단가표' })).toBeVisible();
}

async function collectCriteriaLayout(page: Page) {
  return page.evaluate(() => {
    const contextBar = document.querySelector('.settlement-context-bar') as HTMLElement | null;
    const workboard = document.querySelector('.settlement-criteria-workboard') as HTMLElement | null;
    const pricingCard = document.querySelector('.settlement-criteria-pricing-card') as HTMLElement | null;
    const insuranceCard = Array.from(document.querySelectorAll('.settlement-criteria-card')).find((card) =>
      card.querySelector('h3')?.textContent?.trim() === '보험료율',
    ) as HTMLElement | undefined;
    const insuranceBody = insuranceCard?.querySelector('.settlement-criteria-card-body') as HTMLElement | null;

    if (!contextBar || !workboard || !pricingCard || !insuranceBody) {
      return null;
    }

    const contextRect = contextBar.getBoundingClientRect();
    const workboardRect = workboard.getBoundingClientRect();

    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pageScrollHeight: document.documentElement.scrollHeight,
      contextLeft: contextRect.left,
      contextRight: contextRect.right,
      contextBottom: contextRect.bottom,
      workboardOverflowY: getComputedStyle(workboard).overflowY,
      workboardGridColumns: getComputedStyle(workboard).gridTemplateColumns,
      workboardClientHeight: workboard.clientHeight,
      workboardScrollHeight: workboard.scrollHeight,
      workboardLeft: workboardRect.left,
      workboardRight: workboardRect.right,
      workboardTop: workboardRect.top,
      pricingGridColumn: getComputedStyle(pricingCard).gridColumn,
      insuranceBodyOverflowY: getComputedStyle(insuranceBody).overflowY,
      insuranceBodyGridColumns: getComputedStyle(insuranceBody).gridTemplateColumns,
      insuranceBodyClientHeight: insuranceBody.clientHeight,
      insuranceBodyScrollHeight: insuranceBody.scrollHeight,
    };
  });
}

test('uses a single scrolling workboard container in the desktop-safe viewport branch', async ({ page }) => {
  await openSettlementCriteria(page, { width: 1280, height: 900 });

  const metrics = await collectCriteriaLayout(page);
  expect(metrics).not.toBeNull();
  expect(metrics?.workboardGridColumns.split(' ').length).toBe(2);
  expect(metrics?.workboardOverflowY).toBe('auto');
  expect(metrics?.pricingGridColumn).toBe('auto');
  expect(metrics?.insuranceBodyGridColumns.split(' ').length).toBe(2);
  expect(metrics?.insuranceBodyOverflowY).not.toBe('auto');
  expect(metrics?.workboardScrollHeight).toBeGreaterThan(metrics?.workboardClientHeight ?? 0);
  expect(metrics?.workboardClientHeight).toBeLessThanOrEqual(metrics?.viewportHeight ?? 0);
});

test('falls back to page scroll when the viewport height is below the safe branch threshold', async ({ page }) => {
  await openSettlementCriteria(page, { width: 1280, height: 770 });

  const metrics = await collectCriteriaLayout(page);
  expect(metrics).not.toBeNull();
  expect(metrics?.workboardGridColumns.split(' ').length).toBe(2);
  expect(metrics?.insuranceBodyGridColumns.split(' ').length).toBe(2);
  expect(metrics?.workboardOverflowY).toBe('visible');
  expect(metrics?.insuranceBodyOverflowY).not.toBe('auto');
  expect(metrics?.pageScrollHeight).toBeGreaterThan(metrics?.viewportHeight ?? 0);
});

test('drops to a single-column workboard below the desktop width threshold and keeps page scroll fallback', async ({ page }) => {
  await openSettlementCriteria(page, { width: 970, height: 900 });

  const metrics = await collectCriteriaLayout(page);
  expect(metrics).not.toBeNull();
  expect(metrics?.workboardGridColumns).not.toContain(' ');
  expect(metrics?.pricingGridColumn).toBe('auto');
  expect(metrics?.insuranceBodyGridColumns.split(' ').length).toBe(2);
  expect(metrics?.workboardOverflowY).toBe('visible');
  expect(metrics?.insuranceBodyOverflowY).not.toBe('auto');
  expect(metrics?.pageScrollHeight).toBeGreaterThan(metrics?.viewportHeight ?? 0);
});

test('keeps page scroll fallback and avoids inner-card scroll on a mobile low-height viewport', async ({ page }) => {
  await openSettlementCriteria(page, { width: 390, height: 700 });

  const metrics = await collectCriteriaLayout(page);
  expect(metrics).not.toBeNull();
  expect(metrics?.workboardGridColumns).not.toContain(' ');
  expect(metrics?.insuranceBodyGridColumns).not.toContain(' ');
  expect(metrics?.workboardOverflowY).toBe('visible');
  expect(metrics?.insuranceBodyOverflowY).not.toBe('auto');
  expect(Math.abs((metrics?.contextLeft ?? 0) - (metrics?.workboardLeft ?? 0))).toBeLessThanOrEqual(8);
  expect(Math.abs((metrics?.contextRight ?? 0) - (metrics?.workboardRight ?? 0))).toBeLessThanOrEqual(8);
  expect((metrics?.workboardTop ?? 0) - (metrics?.contextBottom ?? 0)).toBeLessThanOrEqual(12);
  expect(metrics?.pageScrollHeight).toBeGreaterThan(metrics?.viewportHeight ?? 0);
});
