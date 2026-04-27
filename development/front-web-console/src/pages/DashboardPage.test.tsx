import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DashboardPage } from './DashboardPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

describe('Admin DashboardPage', () => {
  it('loads company and fleet summaries for the unified home screen', async () => {
    apiMocks.listCompanies.mockResolvedValue([{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' }]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);

    render(
      <DashboardPage
        session={{
          accessToken: 'token',
          sessionKind: 'normal',
          email: 'manager@example.com',
          identity: {
            identityId: '10000000-0000-0000-0000-000000000001',
            name: '관리자',
            birthDate: '1990-01-01',
            status: 'active',
          },
          activeAccount: {
            accountType: 'manager',
            accountId: '20000000-0000-0000-0000-000000000001',
            companyId: '30000000-0000-0000-0000-000000000001',
            roleType: 'vehicle_manager',
            roleDisplayName: '차량 관리자',
          },
          availableAccountTypes: ['manager'],
        }}
        client={{ request: vi.fn() }}
      />,
    );

    await screen.findAllByText('Seed Company');
    expect(screen.getByText('운영 요약')).toBeInTheDocument();
    expect(screen.getByText('차량 관리자')).toBeInTheDocument();
    await waitFor(() => {
      expect(apiMocks.listCompanies).toHaveBeenCalledTimes(1);
      expect(apiMocks.listFleets).toHaveBeenCalledTimes(1);
    });
  });
});
