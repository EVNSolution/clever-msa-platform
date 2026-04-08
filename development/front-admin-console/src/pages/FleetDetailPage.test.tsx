import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { FleetDetailPage } from './FleetDetailPage';

const apiMocks = vi.hoisted(() => ({
  getCompany: vi.fn(),
  getFleet: vi.fn(),
  deleteFleet: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  getCompany: apiMocks.getCompany,
  getFleet: apiMocks.getFleet,
  deleteFleet: apiMocks.deleteFleet,
}));

describe('FleetDetailPage', () => {
  it('renders fleet detail inside the shared page layout', async () => {
    apiMocks.getCompany.mockResolvedValue({
      company_id: '30000000-0000-0000-0000-000000000001',
      route_no: 1,
      name: 'Seed Company',
    });
    apiMocks.getFleet.mockResolvedValue({
      fleet_id: '40000000-0000-0000-0000-000000000001',
      route_no: 7,
      company_id: '30000000-0000-0000-0000-000000000001',
      name: 'Seed Fleet',
    });

    render(
      <MemoryRouter initialEntries={['/companies/1/fleets/7']}>
        <Routes>
          <Route path="/companies/:companyRef/fleets/:fleetRef" element={<FleetDetailPage client={{ request: vi.fn() }} />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Seed Fleet' });
    expect(screen.getByText('회사 문맥과 플릿 연결 상태를 함께 확인합니다.')).toBeInTheDocument();
    expect(screen.getByText('플릿 문맥')).toBeInTheDocument();
    expect(screen.getAllByText('Seed Company').length).toBeGreaterThan(0);
  });
});
