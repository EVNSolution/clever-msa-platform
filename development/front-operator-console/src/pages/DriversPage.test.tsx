import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DriversPage } from './DriversPage';

const apiMocks = vi.hoisted(() => ({
  listDrivers: vi.fn(),
  createDriver: vi.fn(),
  updateDriver: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
  createDriver: apiMocks.createDriver,
  updateDriver: apiMocks.updateDriver,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

describe('DriversPage', () => {
  it('renders only the basic driver profile fields', async () => {
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '90000000-0000-0000-0000-000000000001',
        account_id: '10000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Kim Driver',
        ev_id: 'EV-001',
        phone_number: '010-1234-5678',
        address: 'Seoul',
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
        <DriversPage
          account={{
            account_id: '10000000-0000-0000-0000-000000000001',
            email: 'user@example.com',
            role: 'user',
            is_active: true,
          }}
          client={{ request: vi.fn() }}
        />
      </MemoryRouter>,
    );

    await screen.findByText(/배송원 등록/i);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /보기/i })).toHaveAttribute(
        'href',
        '/drivers/90000000-0000-0000-0000-000000000001',
      );
    });
    expect(screen.getByLabelText(/이름/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ev id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/연락처/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/주소/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/org unit id/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/employment status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/qualification status/i)).not.toBeInTheDocument();
  });
});
