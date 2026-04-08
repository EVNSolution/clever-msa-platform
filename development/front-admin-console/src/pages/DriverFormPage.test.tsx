import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DriverFormPage } from './DriverFormPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

vi.mock('../api/drivers', () => ({
  createDriver: vi.fn(),
  getDriver: vi.fn(),
  updateDriver: vi.fn(),
}));

describe('DriverFormPage', () => {
  it('renders shared page header on create route', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/drivers/new']}>
        <Routes>
          <Route path="/drivers/new" element={<DriverFormPage client={{ request: vi.fn() }} mode="create" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiMocks.listCompanies).toHaveBeenCalled();
    });
    expect(screen.getByRole('heading', { name: '배송원 생성' })).toBeInTheDocument();
    expect(screen.getByText('배송원 정본과 소속 정보를 같은 입력 흐름에서 관리합니다.')).toBeInTheDocument();
  });
});
