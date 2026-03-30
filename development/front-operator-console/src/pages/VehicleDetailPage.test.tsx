import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { VehicleDetailPage } from './VehicleDetailPage';
import { makeVehicle } from './VehicleTestData';

const apiMocks = vi.hoisted(() => ({
  getVehicleOps: vi.fn(),
}));

vi.mock('../api/vehicleOps', () => ({
  getVehicleOps: apiMocks.getVehicleOps,
}));

describe('VehicleDetailPage', () => {
  function renderPage(vehicleRef = '1') {
    return render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={[`/vehicles/${vehicleRef}`]}
      >
        <Routes>
          <Route path="/vehicles/:vehicleRef" element={<VehicleDetailPage client={{ request: vi.fn() }} />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders the vehicle summary detail contract', async () => {
    apiMocks.getVehicleOps.mockResolvedValue(
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
        warnings: ['active_operator_company_name_missing'],
      }),
    );

    renderPage();

    expect(await screen.findByRole('heading', { name: '12가3456' })).toBeInTheDocument();
    expect(apiMocks.getVehicleOps).toHaveBeenCalledWith(expect.anything(), '1');
    expect(screen.getByText('Manufacturer Co')).toBeInTheDocument();
    expect(screen.getByText('Operator Co')).toBeInTheDocument();
    expect(screen.getAllByText('배정됨').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('설치됨')).toBeInTheDocument();
    expect(screen.getByText('2026-03-20T09:55:00Z')).toBeInTheDocument();
    expect(screen.getByText('2.1')).toBeInTheDocument();
    expect(screen.getByText('3.4.5')).toBeInTheDocument();
    expect(screen.getByText('37.5665, 126.978')).toBeInTheDocument();
    expect(screen.getByText('정상')).toBeInTheDocument();
    expect(screen.getByText('BAT_LOW')).toBeInTheDocument();
    expect(screen.getByText('active_operator_company_name_missing')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /차량 목록/i })).toHaveAttribute('href', '/vehicles');
    expect(screen.queryByText('IMEI')).not.toBeInTheDocument();
    expect(screen.queryByText('ICCID')).not.toBeInTheDocument();
    expect(screen.queryByText('단말기 ID')).not.toBeInTheDocument();
  });

  it('renders missing state labels when operator, assignment, terminal, and telemetry are absent', async () => {
    apiMocks.getVehicleOps.mockResolvedValue(
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
    );

    renderPage('2');

    expect(await screen.findByRole('heading', { name: '34나5678' })).toBeInTheDocument();
    expect(screen.getAllByText('미배정').length).toBeGreaterThan(0);
    expect(screen.getAllByText('미설치').length).toBeGreaterThan(0);
    expect(screen.getAllByText('확인 불가').length).toBeGreaterThan(0);
  });

  it('renders an error banner when detail lookup fails', async () => {
    apiMocks.getVehicleOps.mockRejectedValue(new Error('detail lookup failed'));

    renderPage();

    expect(await screen.findByText('detail lookup failed')).toBeInTheDocument();
  });

  it('renders a route error when vehicleRef is missing', async () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }} initialEntries={['/vehicles']}>
        <VehicleDetailPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('차량 경로 키가 없습니다.')).toBeInTheDocument();
  });
});
