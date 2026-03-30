import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehiclesPage } from './VehiclesPage';

const apiMocks = vi.hoisted(() => ({
  listVehicleMasters: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/vehicles', () => ({
  listVehicleMasters: apiMocks.listVehicleMasters,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

describe('Admin VehiclesPage', () => {
  it('renders vehicle list with separated view and edit routes', async () => {
    apiMocks.listVehicleMasters.mockResolvedValue([
      {
        vehicle_id: '50000000-0000-0000-0000-000000000001',
        route_no: 1,
        manufacturer_company_id: '30000000-0000-0000-0000-000000000001',
        plate_number: '12가3456',
        vin: 'VIN-000000000000001',
        manufacturer_vehicle_code: 'MFG-001',
        model_name: 'Model X',
        vehicle_status: 'active',
        created_at: '2026-03-20T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      },
    ]);
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' },
    ]);

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <VehiclesPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /차량 마스터 관리자 조회/i });
    const row = screen.getByText('12가3456').closest('tr');
    expect(screen.getByRole('link', { name: /차량 생성/i })).toHaveAttribute('href', '/vehicles/new');
    expect(row).toHaveAttribute('data-detail-path', '/vehicles/1');
    expect(screen.queryByRole('link', { name: '보기' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '수정' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/번호판/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /운영사 접근 생성/i })).not.toBeInTheDocument();
  });
});
