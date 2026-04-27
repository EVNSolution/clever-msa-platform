import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleAssignmentsPage } from './VehicleAssignmentsPage';

const apiMocks = vi.hoisted(() => ({
  listAssignments: vi.fn(),
  listDrivers: vi.fn(),
  listVehicleMasters: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/assignments', () => ({
  listAssignments: apiMocks.listAssignments,
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

describe('VehicleAssignmentsPage', () => {
  it('renders assignment list without inline create form', async () => {
    apiMocks.listAssignments.mockResolvedValue([
      {
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
      },
    ]);
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
      <MemoryRouter>
        <VehicleAssignmentsPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByText('Seed Driver');
    expect(screen.getByRole('heading', { name: '차량 배정' })).toBeInTheDocument();
    expect(screen.getByText('배송원-차량 배정 상태를 같은 화면에서 운영합니다.')).toBeInTheDocument();
    const row = screen.getByText('Seed Driver').closest('tr');

    expect(screen.getByRole('link', { name: /배정 생성/i })).toHaveAttribute(
      'href',
      '/vehicle-assignments/new',
    );
    expect(row).toHaveAttribute('data-detail-path', '/vehicle-assignments/1');
    expect(screen.queryByLabelText(/^배송원$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^차량$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/운영사 회사/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /배정 해제/i })).not.toBeInTheDocument();
  });
});
