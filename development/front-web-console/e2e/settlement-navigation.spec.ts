import { expect, test, type Page } from '@playwright/test';

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

async function signIn(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('clever.admin.session', JSON.stringify(session));
  }, sessionPayload);

  await page.route('**/api/auth/identity-navigation-policy/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        allowed_nav_keys: ['dashboard', 'settlements'],
        source: 'playwright',
      }),
    });
  });

  await page.route('**/api/org/companies/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          company_id: '30000000-0000-0000-0000-000000000001',
          route_no: 31,
          name: 'Seed Company',
        },
      ]),
    });
  });

  await page.route('**/api/org/fleets/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          fleet_id: '40000000-0000-0000-0000-000000000001',
          route_no: 41,
          company_id: '30000000-0000-0000-0000-000000000001',
          name: 'Seed Fleet',
        },
      ]),
    });
  });

  await page.route('**/api/drivers/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          driver_id: '10000000-0000-0000-0000-000000000001',
          route_no: 1,
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          name: 'Seed Driver',
          external_user_name: 'seed-driver-user',
          ev_id: 'EV-001',
          phone_number: '010-1234-5678',
          address: 'Seoul',
        },
      ]),
    });
  });

  await page.route('**/api/settlement-registry/settlement-config/metadata/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sections: [
          {
            key: 'tax_rates',
            title: '세율',
            description: '정산 산출에 적용되는 세율',
            fields: [
              {
                key: 'income_tax_rate',
                label: '소득세율',
                description: '과세 기준 소득세율',
                input_type: 'percent',
                unit: '%',
                min: '0',
                max: '100',
                decimal_precision: 4,
                required: true,
              },
            ],
          },
          {
            key: 'amounts',
            title: '기타 기준',
            description: '정산 기준',
            fields: [
              {
                key: 'meal_allowance',
                label: '식비',
                description: '운영 기본 식비 기준',
                input_type: 'currency',
                unit: '원',
                min: '0',
                max: '1000000',
                integer_only: true,
                required: true,
              },
            ],
          },
        ],
      }),
    });
  });

  await page.route('**/api/settlement-registry/settlement-config/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
      }),
    });
  });

  await page.route('**/api/settlement-registry/pricing-tables/', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          pricing_table_id: '91000000-0000-0000-0000-000000000001',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          box_sale_unit_price: '1000.00',
          box_purchase_unit_price: '800.00',
          overtime_fee: '20000.00',
        },
      ]),
    });
  });

  await page.route('**/api/delivery-record/records/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          delivery_record_id: 'record-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          driver_id: '10000000-0000-0000-0000-000000000001',
          service_date: '2026-03-24',
          source_reference: 'dispatch-upload-row:row-1',
          delivery_count: 42,
          distance_km: '0.00',
          base_amount: '0.00',
          status: 'confirmed',
          payload: {
            household_count: 12,
            small_region_text: '10H2',
            detailed_region_text: '10H2-가',
          },
        },
      ]),
    });
  });

  await page.route('**/api/delivery-record/daily-snapshots/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          daily_delivery_input_snapshot_id: 'snapshot-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          driver_id: '10000000-0000-0000-0000-000000000001',
          service_date: '2026-03-24',
          delivery_count: 42,
          total_distance_km: '0.00',
          total_base_amount: '0.00',
          source_record_count: 1,
          status: 'active',
        },
      ]),
    });
  });

  await page.route('**/api/settlement-ops/runs/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/settlement-ops/items/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: '로그아웃' })).toBeVisible({ timeout: 15_000 });
}

test('settlement splits sidebar navigation into overview and process entries', async ({ page }) => {
  await signIn(page);
  const mainNavigation = page.getByLabel('주 메뉴');

  await expect(mainNavigation.getByRole('button', { name: '정산' })).toBeVisible();
  await mainNavigation.getByRole('button', { name: '정산' }).click();

  await expect(mainNavigation.getByRole('link', { name: '정산 조회', exact: true })).toBeVisible();
  await expect(mainNavigation.getByRole('link', { name: '정산 처리', exact: true })).toBeVisible();

  await mainNavigation.getByRole('link', { name: '정산 조회', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/overview$/);
  await expect(page.getByRole('heading', { name: '정산 운영 요약' })).toBeVisible();
  await expect(page.getByRole('link', { name: '정산 기준', exact: true })).toHaveCount(0);

  await mainNavigation.getByRole('link', { name: '정산 처리', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/criteria$/);
  await expect(page.getByRole('heading', { name: '정산 처리' })).toBeVisible();
  await expect(page.getByRole('link', { name: '정산 기준' })).toBeVisible();
  await expect(page.getByRole('link', { name: '정산 실행' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '전역 정산 설정' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '회사·플릿 단가표' })).toBeVisible();
  await expect(page.locator('input[name="box_sale_unit_price"]')).toHaveValue('1000.00');

  await page.getByRole('link', { name: '정산 입력' }).click();
  await expect(page).toHaveURL(/\/settlements\/inputs$/);
  await expect(page.getByText('업로드 결과로 만들어진 정산 대상 snapshot을 먼저 검토하고, 필요한 예외만 수동 보정합니다.')).toBeVisible();
  await expect(page.getByRole('heading', { name: '업로드 기준 검토' })).toBeVisible();

  await page.getByRole('link', { name: '정산 실행', exact: true }).click();
  await expect(page).toHaveURL(/\/settlements\/runs$/);
  await expect(page.getByRole('heading', { name: '정산 실행 요약' })).toBeVisible();
});
