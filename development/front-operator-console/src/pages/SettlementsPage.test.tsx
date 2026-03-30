import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettlementsPage } from './SettlementsPage';

const apiMocks = vi.hoisted(() => ({
  listSettlementReadRuns: vi.fn(),
  listSettlementReadItems: vi.fn(),
  getDriverLatestSettlement: vi.fn(),
  listDrivers: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/settlementOps', () => ({
  listSettlementReadRuns: apiMocks.listSettlementReadRuns,
  listSettlementReadItems: apiMocks.listSettlementReadItems,
  getDriverLatestSettlement: apiMocks.getDriverLatestSettlement,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

describe('SettlementsPage', () => {
  it('renders shared read-only settlement summary from settlement ops', async () => {
    apiMocks.listSettlementReadRuns.mockResolvedValue([
      {
        settlement_run_id: 'run-1',
        company_id: 'company-1',
        fleet_id: 'fleet-1',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        status: 'approved',
      },
    ]);
    apiMocks.listSettlementReadItems.mockResolvedValue([
      {
        settlement_item_id: 'item-1',
        settlement_run_id: 'run-1',
        driver_id: 'driver-1',
        amount: '125000.50',
        payout_status: 'pending',
      },
    ]);
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: 'driver-1',
        route_no: 1,
        account_id: null,
        company_id: 'company-1',
        fleet_id: 'fleet-1',
        name: 'Seed Driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);
    apiMocks.listCompanies.mockResolvedValue([{ company_id: 'company-1', name: 'Seed Company' }]);
    apiMocks.listFleets.mockResolvedValue([{ fleet_id: 'fleet-1', company_id: 'company-1', name: 'Seed Fleet' }]);
    apiMocks.getDriverLatestSettlement.mockResolvedValue({
      driver_id: 'driver-1',
      delivery_history_present: true,
      attendance_inferred_from_delivery_history: true,
      latest_settlement: {
        settlement_run_id: 'run-1',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        status: 'approved',
        payout_status: 'pending',
        amount: '125000.50',
      },
    });

    render(<SettlementsPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: '읽기 전용 정산 요약' });
    expect(screen.getByText('Seed Company')).toBeInTheDocument();
    expect(screen.getByText('Seed Fleet')).toBeInTheDocument();
    expect(screen.getAllByText('Seed Driver').length).toBeGreaterThan(0);
    expect(screen.getByText('승인됨')).toBeInTheDocument();
    expect(screen.getByText('125000.50')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /생성|수정|삭제/i })).not.toBeInTheDocument();
  });
});
