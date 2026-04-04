import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listOrgUnits: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
  listOrgUnits: apiMocks.listOrgUnits,
}));

describe('DashboardPage', () => {
  it('loads only company and fleet summaries for the trimmed organization scope', async () => {
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
        session={{
          accessToken: 'token',
          sessionKind: 'normal',
          email: 'manager@example.com',
          identity: {
            identityId: '10000000-0000-0000-0000-000000000001',
            name: '운영자',
            birthDate: '1990-01-01',
            status: 'active',
          },
          activeAccount: {
            accountType: 'manager',
            accountId: '20000000-0000-0000-0000-000000000001',
            companyId: '30000000-0000-0000-0000-000000000001',
            roleType: 'vehicle_manager',
          },
          availableAccountTypes: ['manager'],
        }}
        client={{ request: vi.fn() }}
      />,
    );

    await screen.findAllByText('Seed Company');
    await waitFor(() => {
      expect(apiMocks.listOrgUnits).not.toHaveBeenCalled();
    });
    expect(screen.queryByText(/org units/i)).not.toBeInTheDocument();
  });
});
