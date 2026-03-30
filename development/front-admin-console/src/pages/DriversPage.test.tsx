import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DriversPage } from './DriversPage';

const apiMocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  listDrivers: vi.fn(),
  createDriver: vi.fn(),
  deleteDriver: vi.fn(),
  updateDriver: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/accounts', () => ({
  listAccounts: apiMocks.listAccounts,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
  createDriver: apiMocks.createDriver,
  deleteDriver: apiMocks.deleteDriver,
  updateDriver: apiMocks.updateDriver,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

describe('Admin DriversPage', () => {
  it('renders driver list with separated view and edit routes', async () => {
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '90000000-0000-0000-0000-000000000001',
        route_no: 1,
        account_id: '20000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Kim Driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
    ]);
    apiMocks.listAccounts.mockResolvedValue([
      {
        account_id: '20000000-0000-0000-0000-000000000001',
        email: 'driver@example.com',
        role: 'user',
        is_active: true,
      },
    ]);
    apiMocks.listCompanies.mockResolvedValue([{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' }]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <DriversPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /driver profile hr 관리자 조회/i });
    const row = screen.getByText('Kim Driver').closest('tr');
    expect(screen.getByRole('link', { name: /배송원 생성/i })).toHaveAttribute('href', '/drivers/new');
    expect(row).toHaveAttribute('data-detail-path', '/drivers/1');
    expect(screen.queryByRole('link', { name: '보기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/이름/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/org unit id/i)).not.toBeInTheDocument();
  });
});
