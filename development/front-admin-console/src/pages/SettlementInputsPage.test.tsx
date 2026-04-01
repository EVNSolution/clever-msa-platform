import { render, screen } from '@testing-library/react';
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
  updateDailyDeliveryInputSnapshot: vi.fn(),
  deleteDailyDeliveryInputSnapshot: vi.fn(),
}));

describe('SettlementInputsPage', () => {
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
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <SettlementFlowProvider client={{ request: vi.fn() }}>
          <SettlementInputsPage client={{ request: vi.fn() }} />
        </SettlementFlowProvider>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '엑셀 업로드' });
    expect(screen.getByText('검증 요약')).toBeInTheDocument();
    expect(screen.getByText(/수동 입력은 예외 보정/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /정산 실행으로 이동/i })).toBeInTheDocument();
  });
});
