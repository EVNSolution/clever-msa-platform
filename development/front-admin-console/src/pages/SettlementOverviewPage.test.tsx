import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettlementOverviewPage } from './SettlementOverviewPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listSettlementReadRuns: vi.fn(),
  listSettlementReadItems: vi.fn(),
  listDrivers: vi.fn(),
  getDriverLatestSettlement: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/settlementOps', () => ({
  listSettlementReadRuns: apiMocks.listSettlementReadRuns,
  listSettlementReadItems: apiMocks.listSettlementReadItems,
  getDriverLatestSettlement: apiMocks.getDriverLatestSettlement,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

describe('SettlementOverviewPage', () => {
  it('renders summary strip and latest settlement context', async () => {
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
        driver_id: '10000000-0000-0000-0000-000000000002',
        route_no: 2,
        account_id: null,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Second Driver',
        ev_id: 'EV-002',
        phone_number: '010-2222-2222',
        address: 'Busan',
      },
    ]);
    apiMocks.listSettlementReadRuns.mockResolvedValue([
      {
        settlement_run_id: 'run-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        status: 'reviewed',
      },
    ]);
    apiMocks.listSettlementReadItems.mockResolvedValue([
      {
        settlement_item_id: 'item-1',
        settlement_run_id: 'run-1',
        driver_id: '10000000-0000-0000-0000-000000000001',
        amount: '20000.00',
        payout_status: 'pending',
      },
    ]);
    apiMocks.getDriverLatestSettlement
      .mockResolvedValueOnce({
        driver_id: '10000000-0000-0000-0000-000000000001',
        delivery_history_present: true,
        attendance_inferred_from_delivery_history: true,
        latest_settlement: {
          settlement_item_id: 'item-1',
          period_start: '2026-03-01',
          period_end: '2026-03-31',
          amount: '20000.00',
          status: 'reviewed',
          payout_status: 'pending',
        },
      })
      .mockResolvedValueOnce({
        driver_id: '10000000-0000-0000-0000-000000000002',
        delivery_history_present: false,
        attendance_inferred_from_delivery_history: false,
        latest_settlement: null,
      });

    render(<SettlementOverviewPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: '정산 운영 요약' });
    expect(await screen.findByText('Second Driver')).toBeInTheDocument();
    expect(await screen.findByText('최신 정산 조회 가능: 2명')).toBeInTheDocument();
    expect(screen.getByText('Settlement Runs')).toBeInTheDocument();
    expect(screen.getByText('Settlement Items')).toBeInTheDocument();
    expect(screen.getAllByText('Seed Driver').length).toBeGreaterThan(0);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'SMALL' &&
          (element.textContent ?? '').replace(/\s+/g, ' ').includes('최신 실행: Seed Company / Seed Fleet'),
      ),
    ).toBeInTheDocument();
  });
});
