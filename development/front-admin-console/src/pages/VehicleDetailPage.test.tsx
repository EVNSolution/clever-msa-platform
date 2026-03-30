import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleDetailPage } from './VehicleDetailPage';

const apiMocks = vi.hoisted(() => ({
  getVehicleMaster: vi.fn(),
  listVehicleOperatorAccesses: vi.fn(),
  updateVehicleOperatorAccess: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/vehicles', () => ({
  getVehicleMaster: apiMocks.getVehicleMaster,
  listVehicleOperatorAccesses: apiMocks.listVehicleOperatorAccesses,
  updateVehicleOperatorAccess: apiMocks.updateVehicleOperatorAccess,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

describe('VehicleDetailPage', () => {
  it('renders only accesses that belong to the selected vehicle', async () => {
    apiMocks.getVehicleMaster.mockResolvedValue({
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
    });
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' },
      { company_id: '30000000-0000-0000-0000-000000000002', name: '운영사 회사' },
    ]);
    apiMocks.listVehicleOperatorAccesses.mockResolvedValue([
      {
        vehicle_operator_access_id: '51000000-0000-0000-0000-000000000001',
        vehicle_id: '50000000-0000-0000-0000-000000000001',
        operator_company_id: '30000000-0000-0000-0000-000000000002',
        access_status: 'active',
        started_at: '2026-03-20T00:00:00Z',
        ended_at: null,
        created_at: '2026-03-20T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/vehicles/1']}>
        <Routes>
          <Route path="/vehicles/:vehicleRef" element={<VehicleDetailPage client={{ request: vi.fn() }} />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '12가3456' });
    expect(screen.getByRole('link', { name: /운영사 접근 생성/i })).toHaveAttribute(
      'href',
      '/vehicles/1/accesses/new',
    );
    expect(screen.getByText('운영사 회사')).toBeInTheDocument();
  });
});
