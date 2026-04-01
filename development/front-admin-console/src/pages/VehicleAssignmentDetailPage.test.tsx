import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleAssignmentDetailPage } from './VehicleAssignmentDetailPage';

const apiMocks = vi.hoisted(() => ({
  getAssignment: vi.fn(),
  updateAssignment: vi.fn(),
  listDrivers: vi.fn(),
  listVehicleMasters: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/assignments', () => ({
  getAssignment: apiMocks.getAssignment,
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

describe('VehicleAssignmentDetailPage', () => {
  it('renders detail and unassigns only from detail page', async () => {
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
    apiMocks.updateAssignment.mockResolvedValue({
      driver_vehicle_assignment_id: '60000000-0000-0000-0000-000000000001',
      route_no: 1,
      driver_id: '10000000-0000-0000-0000-000000000001',
      vehicle_id: '50000000-0000-0000-0000-000000000001',
      operator_company_id: '30000000-0000-0000-0000-000000000001',
      assignment_status: 'unassigned',
      assigned_at: '2026-03-20T00:00:00Z',
      unassigned_at: '2026-03-21T00:00:00Z',
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-21T00:00:00Z',
    });
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

    render(
      <MemoryRouter initialEntries={['/vehicle-assignments/1']}>
        <Routes>
          <Route
            path="/vehicle-assignments/:assignmentRef"
            element={<VehicleAssignmentDetailPage client={{ request: vi.fn() }} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /배정 상세/i });
    expect(apiMocks.getAssignment).toHaveBeenCalledWith(expect.anything(), '1');
    expect(screen.getByText('Seed Driver')).toBeInTheDocument();
    expect(screen.getByText('12가3456')).toBeInTheDocument();
    expect(screen.getByText('Seed Company')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /배송원 상세/i })).toHaveAttribute('href', '/drivers/1');
    expect(screen.getByRole('link', { name: /차량 상세/i })).toHaveAttribute('href', '/vehicles/1');
    expect(screen.getByRole('link', { name: /배정 수정/i })).toHaveAttribute(
      'href',
      '/vehicle-assignments/1/edit',
    );

    fireEvent.click(screen.getByRole('button', { name: /배정 해제/i }));

    await waitFor(() => {
      expect(apiMocks.updateAssignment).toHaveBeenCalledWith(expect.anything(), '1', {
        assignment_status: 'unassigned',
      });
    });
  });
});
