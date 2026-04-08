import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleAssignmentFormPage } from './VehicleAssignmentFormPage';

const apiMocks = vi.hoisted(() => ({
  getAssignment: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  listDrivers: vi.fn(),
  listVehicleMasters: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/assignments', () => ({
  getAssignment: apiMocks.getAssignment,
  createAssignment: apiMocks.createAssignment,
  updateAssignment: apiMocks.updateAssignment,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

vi.mock('../api/vehicles', () => ({
  listVehicleMasters: apiMocks.listVehicleMasters,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

describe('VehicleAssignmentFormPage', () => {
  it('loads assignment data on edit route', async () => {
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        account_id: '20000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        ev_id: 'EV-001',
        phone_number: '010-1111-2222',
        address: 'Seoul',
      },
    ]);
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
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    apiMocks.getAssignment.mockResolvedValue({
      driver_vehicle_assignment_id: '60000000-0000-0000-0000-000000000001',
      route_no: 1,
      driver_id: '10000000-0000-0000-0000-000000000001',
      vehicle_id: '50000000-0000-0000-0000-000000000001',
      operator_company_id: '30000000-0000-0000-0000-000000000001',
      assignment_status: 'assigned',
      assigned_at: '2026-03-20T00:00:00Z',
      unassigned_at: null,
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/vehicle-assignments/1/edit']}>
        <Routes>
          <Route
            path="/vehicle-assignments/:assignmentRef/edit"
            element={<VehicleAssignmentFormPage client={{ request: vi.fn() }} mode="edit" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiMocks.getAssignment).toHaveBeenCalledWith(expect.anything(), '1');
    });
    expect(screen.getByRole('heading', { name: '배정 수정' })).toBeInTheDocument();
    expect(screen.getByText('배송원과 차량 연결 상태를 같은 입력 흐름에서 관리합니다.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('assigned')).toBeInTheDocument();
  });

  it('creates assignment from dedicated create route', async () => {
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 1,
        account_id: '20000000-0000-0000-0000-000000000001',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: 'Seed Driver',
        ev_id: 'EV-001',
        phone_number: '010-1111-2222',
        address: 'Seoul',
      },
    ]);
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
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
    ]);
    apiMocks.createAssignment.mockResolvedValue({
      driver_vehicle_assignment_id: '60000000-0000-0000-0000-000000000001',
      route_no: 1,
      driver_id: '10000000-0000-0000-0000-000000000001',
      vehicle_id: '50000000-0000-0000-0000-000000000001',
      operator_company_id: '30000000-0000-0000-0000-000000000001',
      assignment_status: 'assigned',
      assigned_at: '2026-03-20T00:00:00Z',
      unassigned_at: null,
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/vehicle-assignments/new']}>
        <Routes>
          <Route
            path="/vehicle-assignments/new"
            element={<VehicleAssignmentFormPage client={{ request: vi.fn() }} mode="create" />}
          />
          <Route path="/vehicle-assignments/:assignmentRef" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /배정 생성/i });
    expect(screen.getByText('배송원과 차량 연결 상태를 같은 입력 흐름에서 관리합니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /배정 생성/i }));

    await waitFor(() => {
      expect(apiMocks.createAssignment).toHaveBeenCalledWith(expect.anything(), {
        driver_id: '10000000-0000-0000-0000-000000000001',
        vehicle_id: '50000000-0000-0000-0000-000000000001',
        operator_company_id: '30000000-0000-0000-0000-000000000001',
        assignment_status: 'assigned',
        assigned_at: expect.any(String),
        unassigned_at: null,
      });
    });
  });
});
