import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DriversPage } from './DriversPage';

const apiMocks = vi.hoisted(() => ({
  listDrivers: vi.fn(),
  createDriver: vi.fn(),
  deleteDriver: vi.fn(),
  updateDriver: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listOrgUnits: vi.fn(),
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
  listOrgUnits: apiMocks.listOrgUnits,
}));

describe('Admin DriversPage', () => {
  it('renders only the trimmed driver profile fields', async () => {
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.listCompanies.mockResolvedValue([{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' }]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    apiMocks.listOrgUnits.mockResolvedValue([]);

    render(
      <DriversPage
        account={{
          account_id: '10000000-0000-0000-0000-000000000001',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true,
        }}
        client={{ request: vi.fn() }}
      />,
    );

    await screen.findByText(/driver admin/i);
    await waitFor(() => {
      expect(apiMocks.listOrgUnits).not.toHaveBeenCalled();
    });
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ev id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/org unit id/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/employment status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/qualification status/i)).not.toBeInTheDocument();
  });
});
