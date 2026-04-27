import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleDetailPage } from './VehicleDetailPage';

const apiMocks = vi.hoisted(() => ({
  getVehicleOps: vi.fn(),
  listVehicleOperatorAccesses: vi.fn(),
  updateVehicleOperatorAccess: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/vehicles', () => ({
  listVehicleOperatorAccesses: apiMocks.listVehicleOperatorAccesses,
  updateVehicleOperatorAccess: apiMocks.updateVehicleOperatorAccess,
}));

vi.mock('../api/vehicleOps', () => ({
  getVehicleOps: apiMocks.getVehicleOps,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

describe('VehicleDetailPage', () => {
  function makeVehicle() {
    return {
      vehicle_id: '50000000-0000-0000-0000-000000000001',
      route_no: 1,
      plate_number: '12가3456',
      vin: 'VIN-000000000000001',
      vehicle_status: 'active',
      manufacturer_company: {
        company_id: '30000000-0000-0000-0000-000000000001',
        company_name: 'Seed Company',
      },
      active_operator_company: {
        company_id: '30000000-0000-0000-0000-000000000002',
        company_name: '운영사 회사',
        access_status: 'active',
      },
      current_assignment: {
        driver_vehicle_assignment_id: '60000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        assignment_status: 'assigned',
        assigned_at: '2026-03-20T00:00:00Z',
      },
      current_terminal: {
        terminal_id: '70000000-0000-0000-0000-000000000001',
        installation_status: 'installed',
        installed_at: '2026-03-21T09:00:00Z',
        imei: '356123456789012',
        iccid: '8982123456789012345',
        firmware_version: '1.0.0',
        protocol_version: '2.1',
        app_version: '3.4.5',
      },
      telemetry: {
        latest_location: {
          lat: 37.5665,
          lng: 126.978,
          captured_at: '2026-03-21T09:05:00Z',
          snapshot_status: 'fresh',
        },
        latest_diagnostic: {
          event_code: 'BAT_LOW',
          severity: 'warning',
          event_status: 'open',
          captured_at: '2026-03-21T09:04:00Z',
        },
      },
      warnings: ['current_terminal_unavailable'],
    };
  }

  it('renders vehicle detail with terminal and live telemetry blocks', async () => {
    apiMocks.getVehicleOps.mockResolvedValue(makeVehicle());
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
    expect(screen.getByText('차량 정본, 운영사 접근, 단말 상태를 함께 확인합니다.')).toBeInTheDocument();
    expect(apiMocks.getVehicleOps).toHaveBeenCalledWith(expect.anything(), '1');
    expect(screen.getByText('Seed Company')).toBeInTheDocument();
    expect(screen.getAllByText('운영사 회사').length).toBeGreaterThan(0);
    expect(screen.getByText('설치됨')).toBeInTheDocument();
    expect(screen.getByText('2026-03-21T09:00:00Z')).toBeInTheDocument();
    expect(screen.getByText('2.1')).toBeInTheDocument();
    expect(screen.getByText('3.4.5')).toBeInTheDocument();
    expect(screen.getByText('37.5665, 126.978')).toBeInTheDocument();
    expect(screen.getByText('정상')).toBeInTheDocument();
    expect(screen.getByText('BAT_LOW')).toBeInTheDocument();
    expect(screen.getByText('current_terminal_unavailable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /운영사 접근 생성/i })).toHaveAttribute(
      'href',
      '/vehicles/1/accesses/new',
    );
    expect(screen.queryByText('IMEI')).not.toBeInTheDocument();
    expect(screen.queryByText('ICCID')).not.toBeInTheDocument();
    expect(screen.queryByText('단말기 ID')).not.toBeInTheDocument();
  });
});
