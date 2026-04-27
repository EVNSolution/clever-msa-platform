import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';

import { SettlementFlowProvider } from '../components/SettlementFlowContext';
import type { SessionPayload } from '../api/http';
import { SettlementResultsPage } from './SettlementResultsPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listSettlementRuns: vi.fn(),
  listSettlementItems: vi.fn(),
  listDrivers: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

vi.mock('../api/settlements', () => ({
  listSettlementRuns: apiMocks.listSettlementRuns,
  listSettlementItems: apiMocks.listSettlementItems,
  createSettlementRun: vi.fn(),
  updateSettlementRun: vi.fn(),
  deleteSettlementRun: vi.fn(),
  createSettlementItem: vi.fn(),
  updateSettlementItem: vi.fn(),
  deleteSettlementItem: vi.fn(),
}));

describe('SettlementResultsPage', () => {
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

  const fleetManagerSingleSession: SessionPayload = {
    ...systemAdminSession,
    email: 'fleet@example.com',
    activeAccount: {
      accountType: 'manager',
      accountId: 'manager-1',
      companyId: '30000000-0000-0000-0000-000000000001',
      roleType: 'fleet_manager',
      roleDisplayName: '플릿 관리자',
      roleScopeLevel: 'fleet',
      assignedFleetIds: ['40000000-0000-0000-0000-000000000001'],
      scopeUiMode: 'fleet_fixed_single',
      defaultFleetId: '40000000-0000-0000-0000-000000000001',
    },
    availableAccountTypes: ['manager'],
  };

  it('shows result summary for the selected company and fleet context', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    apiMocks.listSettlementRuns.mockResolvedValue([
      {
        settlement_run_id: 'run-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        status: 'calculated',
      },
    ]);
    apiMocks.listSettlementItems.mockResolvedValue([
      {
        settlement_item_id: 'item-1',
        settlement_run_id: 'run-1',
        driver_id: '10000000-0000-0000-0000-000000000001',
        amount: '20000.00',
        payout_status: 'pending',
      },
    ]);
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        account_id: null,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementResultsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '정산 결과 요약' });
    expect(screen.queryByText('예외 보정')).not.toBeInTheDocument();
    expect(await screen.findByText('Seed Company / Seed Fleet', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('limits settlement item creation choices to the current fixed fleet scope', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    apiMocks.listSettlementRuns.mockResolvedValue([
      {
        settlement_run_id: 'run-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        status: 'calculated',
      },
      {
        settlement_run_id: 'run-2',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000099',
        period_start: '2026-04-01',
        period_end: '2026-04-30',
        status: 'draft',
      },
    ]);
    apiMocks.listSettlementItems.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        account_id: null,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
      {
        driver_id: '10000000-0000-0000-0000-000000000099',
        route_no: 2,
        account_id: null,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000099',
        name: 'Other Driver',
        ev_id: 'EV-099',
        phone_number: '010-1111-2222',
        address: 'Seoul',
      },
    ]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }} session={fleetManagerSingleSession}>
          <SettlementResultsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '정산 항목 생성' }));

    const runSelect = screen.getByRole('combobox', { name: '정산 실행' });
    const driverSelect = screen.getByRole('combobox', { name: '배송원' });

    expect(screen.getByRole('option', { name: /Seed Company \/ Seed Fleet/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /2026-04-01/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Other Driver' })).not.toBeInTheDocument();
    expect(runSelect.querySelectorAll('option')).toHaveLength(1);
    expect(driverSelect.querySelectorAll('option')).toHaveLength(1);
  });
});
