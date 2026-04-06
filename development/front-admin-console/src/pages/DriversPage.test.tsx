import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DriversPage } from './DriversPage';

const apiMocks = vi.hoisted(() => ({
  listDriverAccountLinks: vi.fn(),
  listManageableDriverAccounts: vi.fn(),
  createDriverAccountLink: vi.fn(),
  unlinkDriverAccountLink: vi.fn(),
  listDrivers: vi.fn(),
  createDriver: vi.fn(),
  deleteDriver: vi.fn(),
  updateDriver: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/driverAccountLinks', () => ({
  listDriverAccountLinks: apiMocks.listDriverAccountLinks,
  createDriverAccountLink: apiMocks.createDriverAccountLink,
  unlinkDriverAccountLink: apiMocks.unlinkDriverAccountLink,
}));

vi.mock('../api/driverAccounts', () => ({
  listManageableDriverAccounts: apiMocks.listManageableDriverAccounts,
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
  it('renders driver list with account link and unlink controls', async () => {
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '90000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Kim Driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
      },
      {
        driver_id: '90000000-0000-0000-0000-000000000002',
        route_no: 2,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Lee Driver',
        ev_id: 'EV-002',
        phone_number: '010-1234-9999',
        address: 'Busan',
      },
    ]);
    apiMocks.listDriverAccountLinks.mockResolvedValue([
      {
        driver_account_link_id: '21000000-0000-0000-0000-000000000001',
        driver_account_id: '20000000-0000-0000-0000-000000000001',
        driver_id: '90000000-0000-0000-0000-000000000001',
        identity_id: '22000000-0000-0000-0000-000000000001',
        identity_name: 'Kim Driver',
        email: 'driver@example.com',
        account_status: 'active',
        linked_at: '2026-04-01T00:00:00Z',
        unlinked_at: null,
      },
    ]);
    apiMocks.listManageableDriverAccounts.mockResolvedValue({
      accounts: [
        {
          driver_account_id: '20000000-0000-0000-0000-000000000001',
          identity: {
            identity_id: '22000000-0000-0000-0000-000000000001',
            name: 'Kim Driver',
            birth_date: '1990-01-01',
            status: 'active',
          },
          company_id: '30000000-0000-0000-0000-000000000001',
          status: 'active',
          created_at: '2026-04-01T00:00:00Z',
          active_driver_id: '90000000-0000-0000-0000-000000000001',
        },
        {
          driver_account_id: '20000000-0000-0000-0000-000000000002',
          identity: {
            identity_id: '22000000-0000-0000-0000-000000000002',
            name: 'Lee Driver Account',
            birth_date: '1991-01-01',
            status: 'active',
          },
          company_id: '30000000-0000-0000-0000-000000000001',
          status: 'active',
          created_at: '2026-04-01T00:10:00Z',
          active_driver_id: null,
        },
      ],
    });
    apiMocks.createDriverAccountLink.mockResolvedValue({
      driver_account_link_id: '21000000-0000-0000-0000-000000000002',
      driver_account_id: '20000000-0000-0000-0000-000000000002',
      driver_id: '90000000-0000-0000-0000-000000000002',
      identity_id: '22000000-0000-0000-0000-000000000002',
      identity_name: 'Lee Driver Account',
      email: 'lee-driver@example.com',
      account_status: 'active',
      linked_at: '2026-04-01T00:20:00Z',
      unlinked_at: null,
    });
    apiMocks.unlinkDriverAccountLink.mockResolvedValue({
      driver_account_link_id: '21000000-0000-0000-0000-000000000001',
      driver_account_id: '20000000-0000-0000-0000-000000000001',
      driver_id: '90000000-0000-0000-0000-000000000001',
      identity_id: '22000000-0000-0000-0000-000000000001',
      identity_name: 'Kim Driver',
      email: 'driver@example.com',
      account_status: 'active',
      linked_at: '2026-04-01T00:00:00Z',
      unlinked_at: '2026-04-01T00:30:00Z',
    });
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
        <DriversPage
          client={{ request: vi.fn() }}
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'admin@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000001',
              name: '관리자',
              birthDate: '1990-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000099',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'company_super_admin',
            },
            availableAccountTypes: ['manager'],
          }}
        />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /driver profile hr 관리자 조회/i });
    const row = screen.getByText('Kim Driver').closest('tr');
    expect(screen.getByRole('link', { name: /배송원 생성/i })).toHaveAttribute('href', '/drivers/new');
    expect(row).toHaveAttribute('data-detail-path', '/drivers/1');
    expect(screen.getByRole('button', { name: '연결 해제' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '계정 연결' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '보기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/이름/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/org unit id/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Lee Driver Account'), { target: { value: '20000000-0000-0000-0000-000000000002' } });
    fireEvent.click(screen.getByRole('button', { name: '계정 연결' }));
    await waitFor(() => {
      expect(apiMocks.createDriverAccountLink).toHaveBeenCalledWith(
        expect.anything(),
        '20000000-0000-0000-0000-000000000002',
        '90000000-0000-0000-0000-000000000002',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '연결 해제' }));
    await waitFor(() => {
      expect(apiMocks.unlinkDriverAccountLink).toHaveBeenCalledWith(
        expect.anything(),
        '21000000-0000-0000-0000-000000000001',
      );
    });
  });

  it('hides driver create action for vehicle managers', async () => {
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.listDriverAccountLinks.mockResolvedValue([]);
    apiMocks.listManageableDriverAccounts.mockResolvedValue({ accounts: [] });
    apiMocks.listCompanies.mockResolvedValue([]);
    apiMocks.listFleets.mockResolvedValue([]);

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <DriversPage
          client={{ request: vi.fn() }}
          session={{
            accessToken: 'token',
            sessionKind: 'normal',
            email: 'vehicle@example.com',
            identity: {
              identityId: '10000000-0000-0000-0000-000000000002',
              name: '차량 관리자',
              birthDate: '1990-01-01',
              status: 'active',
            },
            activeAccount: {
              accountType: 'manager',
              accountId: '20000000-0000-0000-0000-000000000100',
              companyId: '30000000-0000-0000-0000-000000000001',
              roleType: 'vehicle_manager',
            },
            availableAccountTypes: ['manager'],
          }}
        />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /driver profile hr 관리자 조회/i });
    expect(screen.queryByRole('link', { name: /배송원 생성/i })).not.toBeInTheDocument();
  });
});
