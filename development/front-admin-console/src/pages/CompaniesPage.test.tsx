import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { CompaniesPage } from './CompaniesPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

describe('CompaniesPage', () => {
  it('renders company list and fleet counts without an inline form', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', public_ref: 'cmp_seedcompany01', name: 'Seed Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        public_ref: 'flt_seedfleet0001',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet A',
      },
      {
        fleet_id: '40000000-0000-0000-0000-000000000002',
        public_ref: 'flt_seedfleet0002',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet B',
      },
    ]);

    render(
      <MemoryRouter>
        <CompaniesPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByText(/회사 루트 목록/i);
    expect(screen.getByText('Seed Company')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /회사 생성/i })).toHaveAttribute('href', '/companies/new');
    expect(screen.getByRole('link', { name: '보기' })).toHaveAttribute('href', '/companies/cmp_seedcompany01');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
