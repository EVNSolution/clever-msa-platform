import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { CompanyDetailPage } from './CompanyDetailPage';

const apiMocks = vi.hoisted(() => ({
  getCompany: vi.fn(),
  listFleets: vi.fn(),
  deleteCompany: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  getCompany: apiMocks.getCompany,
  listFleets: apiMocks.listFleets,
  deleteCompany: apiMocks.deleteCompany,
}));

describe('CompanyDetailPage', () => {
  it('renders only fleets that belong to the selected company', async () => {
    apiMocks.getCompany.mockResolvedValue({
      company_id: '30000000-0000-0000-0000-000000000001',
      route_no: 1,
      name: 'Seed Company',
    });
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
      {
        fleet_id: '40000000-0000-0000-0000-000000000002',
        route_no: 2,
        company_id: '30000000-0000-0000-0000-000000000002',
        name: 'Other Fleet',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/companies/1']}>
        <Routes>
          <Route path="/companies/:companyRef" element={<CompanyDetailPage client={{ request: vi.fn() }} />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Seed Company' });
    const row = screen.getByText('Seed Fleet').closest('tr');
    expect(screen.getByText('Seed Fleet')).toBeInTheDocument();
    expect(screen.queryByText('Other Fleet')).not.toBeInTheDocument();
    expect(row).toHaveAttribute('data-detail-path', '/companies/1/fleets/1');
    expect(screen.queryByRole('link', { name: '보기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /플릿 생성/i })).toHaveAttribute(
      'href',
      '/companies/1/fleets/new',
    );
  });
});
