import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

const apiMocks = vi.hoisted(() => ({
  getMe: vi.fn(),
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listOrgUnits: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  getMe: apiMocks.getMe,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
  listOrgUnits: apiMocks.listOrgUnits,
}));

describe('DashboardPage', () => {
  it('loads only company and fleet summaries for the trimmed organization scope', async () => {
    apiMocks.getMe.mockResolvedValue({
      account_id: '10000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      role: 'admin',
      is_active: true,
    });
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
      <DashboardPage
        account={{
          account_id: '10000000-0000-0000-0000-000000000001',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true,
        }}
        client={{ request: vi.fn() }}
      />,
    );

    await screen.findByText('Seed Company');
    await waitFor(() => {
      expect(apiMocks.listOrgUnits).not.toHaveBeenCalled();
    });
    expect(screen.queryByText(/org units/i)).not.toBeInTheDocument();
  });
});
