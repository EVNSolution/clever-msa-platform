import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleFormPage } from './VehicleFormPage';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  getVehicleMaster: vi.fn(),
  createVehicleMaster: vi.fn(),
  updateVehicleMaster: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

vi.mock('../api/vehicles', () => ({
  listVehicleOperatorAccesses: vi.fn(),
  getVehicleMaster: apiMocks.getVehicleMaster,
  createVehicleMaster: apiMocks.createVehicleMaster,
  updateVehicleMaster: apiMocks.updateVehicleMaster,
}));

describe('VehicleFormPage', () => {
  it('loads vehicle data on edit route', async () => {
    const client = { request: vi.fn() };
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' },
    ]);
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

    render(
      <MemoryRouter initialEntries={['/vehicles/1/edit']}>
        <Routes>
          <Route path="/vehicles/:vehicleRef/edit" element={<VehicleFormPage client={client} mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiMocks.getVehicleMaster).toHaveBeenCalledWith(client, '1');
    });
    expect(screen.getByRole('heading', { name: '차량 마스터 수정' })).toBeInTheDocument();
    expect(screen.getByText('차량 정본과 제조사 메타데이터를 같은 입력 흐름에서 관리합니다.')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('12가3456')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Model X')).toBeInTheDocument();
  });
});
