import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SettlementOverviewPage } from './SettlementOverviewPage';
import { SettlementFlowProvider } from '../components/SettlementFlowContext';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listSettlementReadRuns: vi.fn(),
  listSettlementReadItems: vi.fn(),
  listPagedDriverLatestSettlements: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/settlementOps', () => ({
  listSettlementReadRuns: apiMocks.listSettlementReadRuns,
  listSettlementReadItems: apiMocks.listSettlementReadItems,
  listPagedDriverLatestSettlements: apiMocks.listPagedDriverLatestSettlements,
}));

describe('SettlementOverviewPage', () => {
  const client = { request: vi.fn() };

  it('renders summary strip and paged latest settlement context', async () => {
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
    apiMocks.listPagedDriverLatestSettlements.mockImplementation(async (_client, filters) => {
      if (filters?.page === 2) {
        return {
          count: 61,
          page: 2,
          page_size: 10,
          results: [
            {
              driver_id: '10000000-0000-0000-0000-000000000011',
              driver_name: 'Driver 11',
              delivery_history_present: true,
              attendance_inferred_from_delivery_history: true,
              latest_settlement: null,
            },
          ],
        };
      }

      return {
        count: 61,
        page: 1,
        page_size: 10,
        results: [
          {
            driver_id: '10000000-0000-0000-0000-000000000001',
            driver_name: 'Seed Driver',
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
          },
          {
            driver_id: '10000000-0000-0000-0000-000000000002',
            driver_name: 'Second Driver',
            delivery_history_present: false,
            attendance_inferred_from_delivery_history: false,
            latest_settlement: null,
          },
        ],
      };
    });

    render(
      <SettlementFlowProvider client={client}>
        <SettlementOverviewPage client={client} />
      </SettlementFlowProvider>,
    );

    await screen.findByRole('heading', { name: '정산 운영 요약' });
    await waitFor(() => {
      expect(apiMocks.listPagedDriverLatestSettlements).toHaveBeenCalled();
      expect(screen.getByText(/최신 정산 조회 가능:\s*61명/)).toBeInTheDocument();
      expect(screen.getByText('Second Driver')).toBeInTheDocument();
    });
    expect(await screen.findByText('Settlement Runs')).toBeInTheDocument();
    expect(await screen.findByText('Settlement Items')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText('Seed Driver').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument();
      expect(screen.getByText('...')).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === 'SMALL' &&
          (element.textContent ?? '').replace(/\s+/g, ' ').includes('최신 실행: Seed Company / Seed Fleet'),
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(await screen.findByText('Driver 11')).toBeInTheDocument();
    expect(apiMocks.listPagedDriverLatestSettlements).toHaveBeenLastCalledWith(expect.anything(), {
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      page: 2,
      page_size: 10,
    });
  });
});
