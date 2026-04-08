import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SettlementFlowProvider } from '../components/SettlementFlowContext';
import { SettlementInputsPage } from './SettlementInputsPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listDrivers: vi.fn(),
  listDeliveryRecords: vi.fn(),
  listDailyDeliveryInputSnapshots: vi.fn(),
  updateDailyDeliveryInputSnapshot: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

vi.mock('../api/deliveryRecords', () => ({
  listDeliveryRecords: apiMocks.listDeliveryRecords,
  listDailyDeliveryInputSnapshots: apiMocks.listDailyDeliveryInputSnapshots,
  createDeliveryRecord: vi.fn(),
  updateDeliveryRecord: vi.fn(),
  deleteDeliveryRecord: vi.fn(),
  createDailyDeliveryInputSnapshot: vi.fn(),
  updateDailyDeliveryInputSnapshot: apiMocks.updateDailyDeliveryInputSnapshot,
  deleteDailyDeliveryInputSnapshot: vi.fn(),
}));

describe('SettlementInputsPage', () => {
  it('allows draft snapshots to be activated from the list', async () => {
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
    ]);
    apiMocks.listDeliveryRecords.mockResolvedValue([]);
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([
      {
        daily_delivery_input_snapshot_id: 'snapshot-draft-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-30',
        delivery_count: 0,
        total_distance_km: '0.00',
        total_base_amount: '0.00',
        source_record_count: 0,
        status: 'draft',
      },
    ]);
    apiMocks.updateDailyDeliveryInputSnapshot.mockResolvedValue({
      daily_delivery_input_snapshot_id: 'snapshot-draft-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      driver_id: '10000000-0000-0000-0000-000000000001',
      service_date: '2026-03-30',
      delivery_count: 0,
      total_distance_km: '0.00',
      total_base_amount: '0.00',
      source_record_count: 0,
      status: 'active',
    });

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }}>
          <SettlementInputsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    const activateButton = await screen.findByRole('button', { name: '활성화' });
    fireEvent.click(activateButton);

    expect(apiMocks.updateDailyDeliveryInputSnapshot).toHaveBeenCalledWith(
      expect.anything(),
      'snapshot-draft-1',
      { status: 'active' },
    );
  });

  it('prioritizes upload and validation shells ahead of manual inputs', async () => {
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
    ]);
    apiMocks.listDeliveryRecords.mockResolvedValue([]);
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([
      {
        daily_delivery_input_snapshot_id: 'snapshot-draft-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        service_date: '2026-03-30',
        delivery_count: 0,
        total_distance_km: '0.00',
        total_base_amount: '0.00',
        source_record_count: 0,
        status: 'draft',
      },
    ]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }}>
          <SettlementInputsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '정산 입력 요약' });
    expect(screen.queryByText('검증 요약')).not.toBeInTheDocument();
    expect(screen.queryByText('업로드 흐름')).not.toBeInTheDocument();
    const draftSnapshotMetric = screen.getByText('Draft Snapshot').closest('article') as HTMLElement;
    expect(draftSnapshotMetric).toBeTruthy();
    expect(within(draftSnapshotMetric).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /정산 실행으로 이동/i })).toBeInTheDocument();
  });
});
