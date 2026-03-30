import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehiclesPage } from './VehiclesPage';
import { makeVehicle } from './VehicleTestData';

const apiMocks = vi.hoisted(() => ({
  listVehicleOps: vi.fn(),
}));

vi.mock('../api/vehicleOps', () => ({
  listVehicleOps: apiMocks.listVehicleOps,
}));

describe('VehiclesPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={['/vehicles']}
      >
        <Routes>
          <Route path="/vehicles" element={<VehiclesPage client={{ request: vi.fn() }} />} />
          <Route path="/vehicles/:vehicleRef" element={<div>차량 상세 라우트</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders a list-only vehicle table and routes row click by route_no', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
        routeNo: 1,
        plateNumber: '12가3456',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: '30000000-0000-0000-0000-000000000002',
        activeOperatorCompanyName: 'Operator Co',
        currentDriverId: '10000000-0000-0000-0000-000000000001',
        currentTerminal: {
          terminal_id: '70000000-0000-0000-0000-000000000001',
          installation_status: 'installed',
          installed_at: '2026-03-20T09:55:00Z',
          imei: '356123456789012',
          iccid: '8982123412341234123',
          firmware_version: '1.0.0',
          protocol_version: '2.1',
          app_version: '3.4.5',
        },
        warnings: [],
      }),
    ]);

    renderPage();

    const table = await screen.findByRole('table');
    const row = screen.getByText('12가3456').closest('tr');
    expect(row).not.toBeNull();
    expect(within(table).getByText('Manufacturer Co')).toBeInTheDocument();
    expect(within(table).getByText('Operator Co')).toBeInTheDocument();
    expect(within(table).getByText('배정됨')).toBeInTheDocument();
    expect(within(table).getByText('설치됨')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /차량 상세/i })).not.toBeInTheDocument();

    expect(row).toHaveAttribute('data-detail-path', '/vehicles/1');
    fireEvent.click(row!);

    expect(await screen.findByText('차량 상세 라우트')).toBeInTheDocument();
  });

  it('shows operator and assignment fallback labels in the list', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000002',
        routeNo: 2,
        plateNumber: '34나5678',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: null,
        activeOperatorCompanyName: null,
        currentDriverId: null,
        currentTerminal: null,
        locationStatus: null,
        warnings: [],
      }),
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000003',
        routeNo: 3,
        plateNumber: '56다7890',
        manufacturerCompanyName: null,
        activeOperatorCompanyId: '30000000-0000-0000-0000-000000000002',
        activeOperatorCompanyName: null,
        currentDriverId: '10000000-0000-0000-0000-000000000001',
        currentTerminal: null,
        warnings: ['active_operator_company_name_missing'],
      }),
    ]);

    renderPage();

    const table = await screen.findByRole('table');
    expect(within(table).getByText('제조사 미상')).toBeInTheDocument();
    expect(within(table).getAllByText('미배정').length).toBeGreaterThan(0);
    expect(within(table).getAllByText('미설치').length).toBeGreaterThan(0);
    expect(within(table).getByText('운영사 미상')).toBeInTheDocument();
  });

  it('shows a list error when the vehicle list fails to load', async () => {
    apiMocks.listVehicleOps.mockRejectedValue(new Error('vehicle backend down'));

    renderPage();

    expect(await screen.findByText('vehicle backend down')).toBeInTheDocument();
    expect(screen.queryByText(/등록된 차량이 없습니다/i)).not.toBeInTheDocument();
  });

  it('shows empty state when no vehicles are returned', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('등록된 차량이 없습니다.')).toBeInTheDocument();
  });

  it('does not navigate when route_no is missing', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000004',
        routeNo: undefined,
        plateNumber: '78라1234',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: null,
        activeOperatorCompanyName: null,
        currentDriverId: null,
        currentTerminal: null,
        warnings: [],
      }),
    ]);

    renderPage();

    const row = await waitFor(() => screen.getByText('78라1234').closest('tr'));
    expect(row).not.toBeNull();
    expect(row).not.toHaveAttribute('data-detail-path');

    fireEvent.click(row!);

    expect(screen.queryByText('차량 상세 라우트')).not.toBeInTheDocument();
  });
});
