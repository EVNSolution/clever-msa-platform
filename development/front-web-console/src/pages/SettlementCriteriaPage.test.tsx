import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SettlementCriteriaPage } from './SettlementCriteriaPage';
import type { SessionPayload } from '../api/http';
import { SettlementFlowProvider } from '../components/SettlementFlowContext';

const apiMocks = vi.hoisted(() => ({
  createSettlementPricingTable: vi.fn(),
  getSettlementConfigMetadata: vi.fn(),
  getSettlementConfig: vi.fn(),
  listSettlementPricingTables: vi.fn(),
  updateSettlementConfig: vi.fn(),
  updateSettlementPricingTable: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/settlementRegistry', () => ({
  createSettlementPricingTable: apiMocks.createSettlementPricingTable,
  getSettlementConfigMetadata: apiMocks.getSettlementConfigMetadata,
  getSettlementConfig: apiMocks.getSettlementConfig,
  listSettlementPricingTables: apiMocks.listSettlementPricingTables,
  updateSettlementConfig: apiMocks.updateSettlementConfig,
  updateSettlementPricingTable: apiMocks.updateSettlementPricingTable,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

const metadataFixture = {
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
};

const configFixture = {
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
};

const pricingTableFixture = [
  {
    pricing_table_id: '91000000-0000-0000-0000-000000000001',
    company_id: '30000000-0000-0000-0000-000000000001',
    fleet_id: '40000000-0000-0000-0000-000000000001',
    box_sale_unit_price: '1000.00',
    box_purchase_unit_price: '800.00',
    overtime_fee: '20000.00',
  },
];

const systemAdminSession: SessionPayload = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'system@example.com',
  identity: {
    identityId: 'identity-1',
    name: '시스템 관리자',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'system_admin',
    accountId: 'system-admin-1',
  },
  availableAccountTypes: ['system_admin'],
};

const companySuperAdminSession: SessionPayload = {
  ...systemAdminSession,
  email: 'admin@example.com',
  activeAccount: {
    accountType: 'manager',
    accountId: 'manager-1',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'company_super_admin',
    roleDisplayName: '회사 총괄 관리자',
    roleScopeLevel: 'company',
    assignedFleetIds: [],
    scopeUiMode: 'company_selectable',
    defaultFleetId: null,
  },
  availableAccountTypes: ['manager'],
};

const settlementManagerSession: SessionPayload = {
  ...companySuperAdminSession,
  email: 'settlement@example.com',
  activeAccount: {
    ...companySuperAdminSession.activeAccount!,
    roleType: 'settlement_manager',
    roleDisplayName: '정산 관리자',
  },
};

const fleetManagerSingleSession: SessionPayload = {
  ...companySuperAdminSession,
  email: 'fleet-single@example.com',
  activeAccount: {
    ...companySuperAdminSession.activeAccount!,
    roleType: 'fleet_manager',
    roleDisplayName: '플릿 관리자',
    roleScopeLevel: 'fleet',
    assignedFleetIds: ['40000000-0000-0000-0000-000000000001'],
    scopeUiMode: 'fleet_fixed_single',
    defaultFleetId: '40000000-0000-0000-0000-000000000001',
  },
};

const fleetManagerMultiSession: SessionPayload = {
  ...companySuperAdminSession,
  email: 'fleet-multi@example.com',
  activeAccount: {
    ...companySuperAdminSession.activeAccount!,
    roleType: 'fleet_manager',
    roleDisplayName: '플릿 관리자',
    roleScopeLevel: 'fleet',
    assignedFleetIds: [
      '40000000-0000-0000-0000-000000000001',
      '40000000-0000-0000-0000-000000000002',
    ],
    scopeUiMode: 'fleet_selectable_multi',
    defaultFleetId: null,
  },
};

function arrangeSuccessfulLoad() {
  apiMocks.getSettlementConfigMetadata.mockResolvedValue(metadataFixture);
  apiMocks.getSettlementConfig.mockResolvedValue(configFixture);
  apiMocks.listSettlementPricingTables.mockResolvedValue(pricingTableFixture);
  apiMocks.listCompanies.mockResolvedValue([
    { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    { company_id: '30000000-0000-0000-0000-000000000002', route_no: 2, name: 'Ops Company' },
  ]);
  apiMocks.listFleets.mockResolvedValue([
    {
      fleet_id: '40000000-0000-0000-0000-000000000001',
      route_no: 1,
      company_id: '30000000-0000-0000-0000-000000000001',
      name: 'Seed Fleet',
    },
    {
      fleet_id: '40000000-0000-0000-0000-000000000002',
      route_no: 2,
      company_id: '30000000-0000-0000-0000-000000000001',
      name: 'Ops Fleet',
    },
  ]);
}

function renderPage(session: SessionPayload = systemAdminSession) {
  const client = { request: vi.fn() };
  return render(
    <SettlementFlowProvider client={client} session={session}>
      <SettlementCriteriaPage client={client} session={session} />
    </SettlementFlowProvider>,
  );
}

describe('SettlementCriteriaPage', () => {
  beforeEach(() => {
    Object.values(apiMocks).forEach((mock) => mock.mockReset());
  });

  it('renders the compact metadata-card workboard and removes the old helper copy', async () => {
    arrangeSuccessfulLoad();

    renderPage();

    await screen.findByRole('heading', { name: '회사·플릿 단가표' });
    expect(screen.queryByRole('heading', { name: '정산 기준' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      '회사·플릿 단가표',
      '정산 반영 기준',
      '세율',
      '기타 기준',
      '보험료율',
    ]);
    expect(screen.getByRole('heading', { name: '회사·플릿 단가표' })).toBeInTheDocument();

    expect(screen.queryByText('정산 설정')).not.toBeInTheDocument();
    expect(screen.queryByText('전역 정산 설정')).not.toBeInTheDocument();
    expect(screen.queryByText('정산 문맥')).not.toBeInTheDocument();
    expect(screen.queryByText(/회사\/플릿 구분 없이/)).not.toBeInTheDocument();
    expect(screen.queryByText(/현재 설정 항목:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '전역 설정 저장' })).not.toBeInTheDocument();
    metadataFixture.sections.forEach((section) => {
      expect(screen.queryByText(section.description)).not.toBeInTheDocument();
    });

    metadataFixture.sections.forEach((section) => {
      expect(screen.getByRole('button', { name: `${section.title} 저장` })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: '단가표 저장' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: /보고 금액 반영률/ })).toBeInTheDocument();
  });

  it('shows only fleet selection for company super admins', async () => {
    arrangeSuccessfulLoad();

    renderPage(companySuperAdminSession);

    expect(await screen.findByRole('heading', { name: '회사·플릿 단가표' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /회사/ })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /플릿/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '세율' })).toBeInTheDocument();
    expect(apiMocks.listCompanies).not.toHaveBeenCalled();
  });

  it('hides selectors and global cards for single-fleet managers', async () => {
    arrangeSuccessfulLoad();

    renderPage(fleetManagerSingleSession);

    expect(await screen.findByRole('heading', { name: '회사·플릿 단가표' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /회사/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /플릿/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '회사·플릿 단가표' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '세율' })).not.toBeInTheDocument();
    expect(apiMocks.listCompanies).not.toHaveBeenCalled();
  });

  it('shows only fleet selection for multi-fleet managers', async () => {
    arrangeSuccessfulLoad();

    renderPage(fleetManagerMultiSession);

    expect(await screen.findByRole('heading', { name: '회사·플릿 단가표' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /회사/ })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /플릿/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '세율' })).not.toBeInTheDocument();
    expect(apiMocks.listCompanies).not.toHaveBeenCalled();
  });

  it('saves only the selected metadata section fields instead of the whole config payload', async () => {
    arrangeSuccessfulLoad();
    apiMocks.updateSettlementConfig.mockResolvedValue({
      ...configFixture,
      income_tax_rate: '0.0350',
    });

    renderPage(systemAdminSession);

    await screen.findByRole('heading', { name: '세율' });
    fireEvent.change(screen.getByRole('textbox', { name: /보고 금액 반영률/ }), {
      target: { value: '90.0000' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: /소득세율/ }), {
      target: { value: '0.0350' },
    });
    fireEvent.click(screen.getByRole('button', { name: '세율 저장' }));

    await waitFor(() => {
      expect(apiMocks.updateSettlementConfig).toHaveBeenCalledTimes(1);
      expect(apiMocks.updateSettlementConfig).toHaveBeenCalledWith(
        { request: expect.any(Function) },
        {
          income_tax_rate: '0.0350',
          vat_tax_rate: '0.1000',
        },
      );
    });
    expect(screen.getByRole('textbox', { name: /보고 금액 반영률/ })).toHaveValue('90.0000');
  });

  it('preserves the current section values when the save response omits some section fields', async () => {
    arrangeSuccessfulLoad();
    apiMocks.updateSettlementConfig.mockResolvedValue({
      singleton_key: 'global',
      income_tax_rate: '0.0350',
    });

    renderPage(systemAdminSession);

    await screen.findByRole('heading', { name: '세율' });
    fireEvent.change(screen.getByRole('textbox', { name: /소득세율/ }), {
      target: { value: '0.0350' },
    });
    fireEvent.click(screen.getByRole('button', { name: '세율 저장' }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /소득세율/ })).toHaveValue('0.0350');
      expect(screen.getByRole('textbox', { name: /부가가치세율/ })).toHaveValue('0.1000');
    });
  });

  it('disables other metadata saves while one section save is in flight', async () => {
    arrangeSuccessfulLoad();
    let resolveSave: ((value: typeof configFixture) => void) | undefined;
    apiMocks.updateSettlementConfig.mockReturnValue(
      new Promise<typeof configFixture>((resolve) => {
        resolveSave = resolve;
      }),
    );

    renderPage(systemAdminSession);

    await screen.findByRole('heading', { name: '세율' });
    const incomeTaxInput = screen.getByRole('textbox', { name: /소득세율/ });
    const reportedAmountInput = screen.getByRole('textbox', { name: /보고 금액 반영률/ });
    const taxSaveButton = screen.getByRole('button', { name: '세율 저장' });
    const reportedAmountSaveButton = screen.getByRole('button', { name: '정산 반영 기준 저장' });
    fireEvent.click(taxSaveButton);

    expect(incomeTaxInput).toBeDisabled();
    expect(reportedAmountInput).not.toBeDisabled();
    expect(taxSaveButton).toBeDisabled();
    expect(reportedAmountSaveButton).toBeDisabled();

    resolveSave?.({
      ...configFixture,
      income_tax_rate: '0.0300',
    });

    await waitFor(() => {
      expect(incomeTaxInput).not.toBeDisabled();
      expect(taxSaveButton).not.toBeDisabled();
      expect(reportedAmountSaveButton).not.toBeDisabled();
    });
  });

  it('keeps the company-fleet pricing update flow unchanged', async () => {
    arrangeSuccessfulLoad();
    apiMocks.updateSettlementPricingTable.mockResolvedValue({
      ...pricingTableFixture[0],
      overtime_fee: '25000.00',
    });

    renderPage(systemAdminSession);

    fireEvent.change(await screen.findByLabelText('특근비'), { target: { value: '25000.00' } });
    fireEvent.click(screen.getByRole('button', { name: '단가표 저장' }));

    expect(apiMocks.createSettlementPricingTable).not.toHaveBeenCalled();
    expect(apiMocks.updateSettlementPricingTable).toHaveBeenCalledTimes(1);
    expect(apiMocks.updateSettlementPricingTable).toHaveBeenCalledWith(
      { request: expect.any(Function) },
      '91000000-0000-0000-0000-000000000001',
      expect.objectContaining({
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        overtime_fee: '25000.00',
      }),
    );
  });

  it('locks the pricing scope and inputs while a pricing save is in flight', async () => {
    arrangeSuccessfulLoad();
    let resolveSave: ((value: (typeof pricingTableFixture)[number]) => void) | undefined;
    apiMocks.updateSettlementPricingTable.mockReturnValue(
      new Promise<(typeof pricingTableFixture)[number]>((resolve) => {
        resolveSave = resolve;
      }),
    );

    renderPage();

    const companySelect = (await screen.findByRole('combobox', { name: /회사/ })) as HTMLSelectElement;
    const fleetSelect = screen.getByRole('combobox', { name: /플릿/ }) as HTMLSelectElement;
    const overtimeFeeInput = screen.getByLabelText('특근비') as HTMLInputElement;
    const pricingSaveButton = screen.getByRole('button', { name: '단가표 저장' });

    fireEvent.click(pricingSaveButton);

    expect(companySelect).toBeDisabled();
    expect(fleetSelect).toBeDisabled();
    expect(overtimeFeeInput).toBeDisabled();
    expect(pricingSaveButton).toBeDisabled();

    resolveSave?.({
      ...pricingTableFixture[0],
      overtime_fee: '20000.00',
    });

    await waitFor(() => {
      expect(companySelect).not.toBeDisabled();
      expect(fleetSelect).not.toBeDisabled();
      expect(overtimeFeeInput).not.toBeDisabled();
      expect(pricingSaveButton).not.toBeDisabled();
    });
  });

  it('disables the pricing save button when no selectable fleet scope exists', async () => {
    arrangeSuccessfulLoad();
    apiMocks.listFleets.mockResolvedValue([]);

    renderPage(systemAdminSession);

    expect(await screen.findByText('단가표를 연결할 회사 또는 플릿이 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '단가표 저장' })).toBeDisabled();
  });

  it('keeps the company-fleet pricing create flow unchanged when no row exists', async () => {
    arrangeSuccessfulLoad();
    apiMocks.listSettlementPricingTables.mockResolvedValue([]);
    apiMocks.createSettlementPricingTable.mockResolvedValue({
      pricing_table_id: '91000000-0000-0000-0000-000000000099',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      box_sale_unit_price: '1100.00',
      box_purchase_unit_price: '900.00',
      overtime_fee: '30000.00',
    });

    renderPage(systemAdminSession);

    fireEvent.change(await screen.findByLabelText('박스당 수신단가'), { target: { value: '1100.00' } });
    fireEvent.change(screen.getByLabelText('박스당 지급단가'), { target: { value: '900.00' } });
    fireEvent.change(screen.getByLabelText('특근비'), { target: { value: '30000.00' } });
    fireEvent.click(screen.getByRole('button', { name: '단가표 저장' }));

    expect(apiMocks.createSettlementPricingTable).toHaveBeenCalledWith(
      { request: expect.any(Function) },
      {
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        box_sale_unit_price: '1100.00',
        box_purchase_unit_price: '900.00',
        overtime_fee: '30000.00',
      },
    );
    expect(apiMocks.updateSettlementPricingTable).not.toHaveBeenCalled();
  });

  it('keeps only the pricing card for settlement managers and fixes company scope', async () => {
    arrangeSuccessfulLoad();

    renderPage(settlementManagerSession);

    expect(screen.getByRole('heading', { name: '회사·플릿 단가표' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '단가표 저장' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /회사/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: /플릿/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '세율' })).not.toBeInTheDocument();
    expect(apiMocks.listCompanies).not.toHaveBeenCalled();
    expect(apiMocks.listFleets).toHaveBeenCalled();
    expect(apiMocks.listSettlementPricingTables).toHaveBeenCalled();
  });
});
