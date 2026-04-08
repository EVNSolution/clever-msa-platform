import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DriverDetailPage } from './DriverDetailPage';

const session = {
  accessToken: 'token',
  sessionKind: 'normal' as const,
  email: 'settlement@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000099',
    name: '정산 관리자',
    birthDate: '1990-01-01',
    status: 'active' as const,
  },
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000099',
    companyId: '20000000-0000-0000-0000-000000000001',
    roleType: 'settlement_manager' as const,
  },
  availableAccountTypes: ['manager'],
};

const apiMocks = vi.hoisted(() => ({
  deleteDriver: vi.fn(),
  getDriver: vi.fn(),
  getDriver360: vi.fn(),
  listCompanies: vi.fn(),
  listDriverAccountLinks: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/drivers', () => ({
  deleteDriver: apiMocks.deleteDriver,
  getDriver: apiMocks.getDriver,
}));

vi.mock('../api/driver360', () => ({
  getDriver360: apiMocks.getDriver360,
}));

vi.mock('../api/driverAccountLinks', () => ({
  listDriverAccountLinks: apiMocks.listDriverAccountLinks,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

describe('DriverDetailPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={['/drivers/1']}
      >
        <Routes>
          <Route path="/drivers/:driverRef" element={<DriverDetailPage client={{ request: vi.fn() }} session={session} />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders driver 360 summary panels when available', async () => {
    apiMocks.getDriver.mockResolvedValue({
      driver_id: '10000000-0000-0000-0000-000000000001',
      route_no: 1,
      company_id: '20000000-0000-0000-0000-000000000001',
      fleet_id: '30000000-0000-0000-0000-000000000001',
      name: 'Kim Driver',
      ev_id: 'EV-001',
      phone_number: '010-1234-5678',
      address: 'Seoul',
    });
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '20000000-0000-0000-0000-000000000001', name: 'EVN Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      { fleet_id: '30000000-0000-0000-0000-000000000001', company_id: '20000000-0000-0000-0000-000000000001', name: 'Central Fleet' },
    ]);
    apiMocks.listDriverAccountLinks.mockResolvedValue([]);
    apiMocks.getDriver360.mockResolvedValue({
      driver_id: '10000000-0000-0000-0000-000000000001',
      driver_name: 'Kim Driver',
      ev_id: 'EV-001',
      phone_number: '010-1234-5678',
      address: 'Seoul',
      company_id: '20000000-0000-0000-0000-000000000001',
      company_name: 'EVN Company',
      fleet_id: '30000000-0000-0000-0000-000000000001',
      fleet_name: 'Central Fleet',
      driver_account_link_id: '41000000-0000-0000-0000-000000000001',
      driver_account_id: '40000000-0000-0000-0000-000000000001',
      driver_account_identity_name: 'Kim Driver',
      driver_account_email: 'driver@example.com',
      driver_account_status: 'active',
      latest_settlement_run_id: '50000000-0000-0000-0000-000000000001',
      latest_settlement_period_start: '2026-03-01',
      latest_settlement_period_end: '2026-03-31',
      latest_settlement_status: 'closed',
      latest_payout_status: 'paid',
      latest_settlement_amount: '125000.50',
      warnings: [],
    });

    renderPage();

    await screen.findByRole('heading', { name: 'Kim Driver' });
    expect(screen.getByText('배송원 정본과 계정·정산 문맥을 함께 확인합니다.')).toBeInTheDocument();
    expect(screen.getByText('driver@example.com')).toBeInTheDocument();
    expect(screen.getByText(/driver@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/125000.50/i)).toBeInTheDocument();
    expect(screen.getByText(/주의 사항이 없습니다/i)).toBeInTheDocument();
  });

  it('renders empty settlement/account states when 360 summary is incomplete', async () => {
    apiMocks.getDriver.mockResolvedValue({
      driver_id: '10000000-0000-0000-0000-000000000001',
      route_no: 1,
      company_id: '20000000-0000-0000-0000-000000000001',
      fleet_id: '30000000-0000-0000-0000-000000000001',
      name: 'Kim Driver',
      ev_id: 'EV-001',
      phone_number: '010-1234-5678',
      address: 'Seoul',
    });
    apiMocks.listCompanies.mockResolvedValue([]);
    apiMocks.listFleets.mockResolvedValue([]);
    apiMocks.listDriverAccountLinks.mockResolvedValue([]);
    apiMocks.getDriver360.mockResolvedValue({
      driver_id: '10000000-0000-0000-0000-000000000001',
      driver_name: 'Kim Driver',
      ev_id: 'EV-001',
      phone_number: '010-1234-5678',
      address: 'Seoul',
      company_id: '20000000-0000-0000-0000-000000000001',
      company_name: null,
      fleet_id: '30000000-0000-0000-0000-000000000001',
      fleet_name: null,
      driver_account_link_id: null,
      driver_account_id: null,
      driver_account_identity_name: null,
      driver_account_email: null,
      driver_account_status: null,
      latest_settlement_run_id: null,
      latest_settlement_period_start: null,
      latest_settlement_period_end: null,
      latest_settlement_status: null,
      latest_payout_status: null,
      latest_settlement_amount: null,
      warnings: ['Company not found.'],
    });

    renderPage();

    await screen.findByRole('heading', { name: 'Kim Driver' });
    expect(await screen.findByText(/정산 정보가 없습니다/i)).toBeInTheDocument();
    expect(screen.getByText(/company not found/i)).toBeInTheDocument();
  });
});
