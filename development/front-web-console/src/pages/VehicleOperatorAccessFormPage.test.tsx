import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleOperatorAccessFormPage } from './VehicleOperatorAccessFormPage';

const apiMocks = vi.hoisted(() => ({
  getVehicleMaster: vi.fn(),
  createVehicleOperatorAccess: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/vehicles', () => ({
  getVehicleMaster: apiMocks.getVehicleMaster,
  createVehicleOperatorAccess: apiMocks.createVehicleOperatorAccess,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

describe('VehicleOperatorAccessFormPage', () => {
  it('creates an operator access scoped to the selected vehicle route', async () => {
    const client = { request: vi.fn() };
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
    apiMocks.createVehicleOperatorAccess.mockResolvedValue({
      vehicle_operator_access_id: '51000000-0000-0000-0000-000000000001',
      vehicle_id: '50000000-0000-0000-0000-000000000001',
      operator_company_id: '30000000-0000-0000-0000-000000000002',
      access_status: 'active',
      started_at: '2026-03-20T00:00:00Z',
      ended_at: null,
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/vehicles/1/accesses/new']}>
        <Routes>
          <Route
            path="/vehicles/:vehicleRef/accesses/new"
            element={<VehicleOperatorAccessFormPage client={client} />}
          />
          <Route path="/vehicles/:vehicleRef" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('12가3456');
    expect(screen.getByText('차량 문맥을 유지한 채 운영사 접근을 추가합니다.')).toBeInTheDocument();
    expect(screen.getByText('입력 요약')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/운영사 회사/i), {
      target: { value: '30000000-0000-0000-0000-000000000002' },
    });
    fireEvent.click(screen.getByRole('button', { name: /운영사 접근 생성/i }));

    await waitFor(() => {
      expect(apiMocks.createVehicleOperatorAccess).toHaveBeenCalledWith(
        client,
        expect.objectContaining({
          vehicle_id: '50000000-0000-0000-0000-000000000001',
          operator_company_id: '30000000-0000-0000-0000-000000000002',
          access_status: 'active',
          ended_at: null,
        }),
      );
    });
  });
});
