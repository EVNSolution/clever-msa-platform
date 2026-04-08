import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SettlementFlowProvider } from '../components/SettlementFlowContext';
import { SettlementRunsPage } from './SettlementRunsPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listSettlementRuns: vi.fn(),
  listDeliveryRecords: vi.fn(),
  listDailyDeliveryInputSnapshots: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/deliveryRecords', () => ({
  listDeliveryRecords: apiMocks.listDeliveryRecords,
  listDailyDeliveryInputSnapshots: apiMocks.listDailyDeliveryInputSnapshots,
}));

vi.mock('../api/settlements', () => ({
  listSettlementRuns: apiMocks.listSettlementRuns,
  createSettlementRun: vi.fn(),
  updateSettlementRun: vi.fn(),
  deleteSettlementRun: vi.fn(),
  listSettlementItems: vi.fn(),
  createSettlementItem: vi.fn(),
  updateSettlementItem: vi.fn(),
  deleteSettlementItem: vi.fn(),
}));

describe('SettlementRunsPage', () => {
  it('shows execution readiness and handoff to results for the selected context', async () => {
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
    apiMocks.listDeliveryRecords.mockResolvedValue([
      {
        delivery_record_id: 'd1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-31',
        source_reference: 'sheet-row-1',
        delivery_count: 3,
        distance_km: '10.50',
        base_amount: '20000.00',
        status: 'confirmed',
        payload: {},
      },
    ]);
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([
      {
        daily_delivery_input_snapshot_id: 's-draft',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-31',
        delivery_count: 0,
        total_distance_km: '0.00',
        total_base_amount: '0.00',
        source_record_count: 0,
        status: 'draft',
      },
      {
        daily_delivery_input_snapshot_id: 's1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-31',
        delivery_count: 3,
        total_distance_km: '10.50',
        total_base_amount: '20000.00',
        source_record_count: 1,
        status: 'active',
      },
    ]);
    apiMocks.listSettlementRuns.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }}>
          <SettlementRunsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '정산 실행 요약' });
    expect(screen.queryByText('유효한 입력')).not.toBeInTheDocument();
    const activeSnapshotMetric = screen.getByText('Active Snapshot').closest('article') as HTMLElement;
    expect(activeSnapshotMetric).toBeTruthy();
    expect(within(activeSnapshotMetric).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /정산 결과로 이동/i })).toBeInTheDocument();
  });
});
