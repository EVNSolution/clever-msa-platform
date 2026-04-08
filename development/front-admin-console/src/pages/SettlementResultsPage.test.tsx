import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SettlementFlowProvider } from '../components/SettlementFlowContext';
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
        <SettlementFlowProvider client={{ request: vi.fn() }}>
          <SettlementResultsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '정산 결과 요약' });
    expect(screen.queryByText('예외 보정')).not.toBeInTheDocument();
    expect(screen.getByText('Seed Company / Seed Fleet')).toBeInTheDocument();
  });
});
