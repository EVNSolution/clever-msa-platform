import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { OrganizationPage } from './OrganizationPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
  listOrgUnits: vi.fn(),
  createCompany: vi.fn(),
  createFleet: vi.fn(),
  createOrgUnit: vi.fn(),
  deleteCompany: vi.fn(),
  deleteFleet: vi.fn(),
  deleteOrgUnit: vi.fn(),
  updateCompany: vi.fn(),
  updateFleet: vi.fn(),
  updateOrgUnit: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
  listOrgUnits: apiMocks.listOrgUnits,
  createCompany: apiMocks.createCompany,
  createFleet: apiMocks.createFleet,
  createOrgUnit: apiMocks.createOrgUnit,
  deleteCompany: apiMocks.deleteCompany,
  deleteFleet: apiMocks.deleteFleet,
  deleteOrgUnit: apiMocks.deleteOrgUnit,
  updateCompany: apiMocks.updateCompany,
  updateFleet: apiMocks.updateFleet,
  updateOrgUnit: apiMocks.updateOrgUnit,
}));

describe('OrganizationPage', () => {
  it('renders company and fleet management without org unit controls', async () => {
    apiMocks.listCompanies.mockResolvedValue([{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' }]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);
    apiMocks.listOrgUnits.mockResolvedValue([]);

    render(<OrganizationPage client={{ request: vi.fn() }} />);

    await screen.findByText(/master company registry/i);
    await waitFor(() => {
      expect(apiMocks.listOrgUnits).not.toHaveBeenCalled();
    });
    expect(screen.queryByText(/org units/i)).not.toBeInTheDocument();
    expect(screen.getByText(/fleet assignments/i)).toBeInTheDocument();
  });
});
