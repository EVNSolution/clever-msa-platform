import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VehiclesPage } from './VehiclesPage';

const apiMocks = vi.hoisted(() => ({
  listVehicleOps: vi.fn(),
  getVehicleOps: vi.fn(),
}));

vi.mock('../api/vehicleOps', () => ({
  listVehicleOps: apiMocks.listVehicleOps,
  getVehicleOps: apiMocks.getVehicleOps,
}));

function makeVehicle({
  vehicleId,
  plateNumber,
  manufacturerCompanyName,
  activeOperatorCompanyId,
  activeOperatorCompanyName,
  currentDriverId,
  locationStatus = 'fresh',
  warnings,
  currentTerminal,
}: {
  vehicleId: string;
  plateNumber: string;
  manufacturerCompanyName: string | null;
  activeOperatorCompanyId: string | null;
  activeOperatorCompanyName: string | null;
  currentDriverId: string | null;
  locationStatus?: 'fresh' | 'stale' | null;
  warnings: string[];
  currentTerminal?: {
    terminal_id: string;
    installation_status: 'installed' | 'removed';
    installed_at: string | null;
    imei: string | null;
    iccid: string | null;
    firmware_version: string | null;
    protocol_version: string | null;
    app_version: string | null;
  } | null;
}) {
  return {
    vehicle_id: vehicleId,
    plate_number: plateNumber,
    vin: `VIN-${vehicleId.slice(-4)}`,
    vehicle_status: 'active',
    manufacturer_company: {
      company_id: '30000000-0000-0000-0000-000000000001',
      company_name: manufacturerCompanyName,
    },
    active_operator_company: {
      company_id: activeOperatorCompanyId,
      company_name: activeOperatorCompanyName,
      access_status: activeOperatorCompanyId ? 'active' : null,
    },
    current_assignment: currentDriverId
      ? {
          driver_vehicle_assignment_id: '60000000-0000-0000-0000-000000000001',
          driver_id: currentDriverId,
          assignment_status: 'assigned',
          assigned_at: '2026-03-20T10:00:00Z',
        }
      : null,
    current_terminal: currentTerminal ?? null,
    telemetry: {
      latest_location: {
        lat: locationStatus ? 37.5665 : null,
        lng: locationStatus ? 126.978 : null,
        captured_at: locationStatus ? '2026-03-20T10:05:00Z' : null,
        snapshot_status: locationStatus,
      },
      latest_diagnostic: {
        event_code: locationStatus ? 'BAT_LOW' : null,
        severity: locationStatus ? 'warning' : null,
        event_status: locationStatus ? 'open' : null,
        captured_at: locationStatus ? '2026-03-20T10:04:00Z' : null,
      },
    },
    warnings,
  };
}

function getListSection() {
  return screen.getByRole('heading', { name: /운영 중 차량/i }).closest('section') as HTMLElement;
}

function getDetailSection() {
  return screen.getByRole('heading', { name: /차량 상세/i }).closest('section') as HTMLElement;
}

function getDetailScope() {
  return within(getDetailSection());
}

describe('VehiclesPage', () => {
  it('loads the split Vehicle Ops summary contract and renders manufacturer operator and assignment fields', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
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
    ]);
    apiMocks.getVehicleOps.mockResolvedValue(
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
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

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('12가3456')).toBeInTheDocument();
    expect(within(table).getByText('Manufacturer Co')).toBeInTheDocument();
    expect(within(table).getByText('Operator Co')).toBeInTheDocument();
    expect(within(table).getByText('배정됨')).toBeInTheDocument();
    expect(within(table).getByText('설치됨')).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: /fleet/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /상세 보기/i }));

    await waitFor(() => {
      expect(apiMocks.getVehicleOps).toHaveBeenCalledWith(
        expect.anything(),
        '50000000-0000-0000-0000-000000000001',
      );
    });

    expect(await getDetailScope().findByText('Manufacturer Co')).toBeInTheDocument();
    expect(getDetailScope().getByText('Operator Co')).toBeInTheDocument();
    expect(getDetailScope().getByText('설치됨')).toBeInTheDocument();
    expect(getDetailScope().getAllByText('배정됨').length).toBeGreaterThanOrEqual(2);
    expect(getDetailScope().getByText('2026-03-20T09:55:00Z')).toBeInTheDocument();
    expect(getDetailScope().getByText('2.1')).toBeInTheDocument();
    expect(getDetailScope().getByText('3.4.5')).toBeInTheDocument();
    expect(getDetailScope().getByText('37.5665, 126.978')).toBeInTheDocument();
    expect(getDetailScope().getByText('정상')).toBeInTheDocument();
    expect(getDetailScope().getByText('BAT_LOW')).toBeInTheDocument();
    expect(getDetailScope().getByText('active_operator_company_name_missing')).toBeInTheDocument();
    expect(getDetailScope().queryByText('플릿')).not.toBeInTheDocument();
    expect(getDetailScope().queryByText('플릿 ID')).not.toBeInTheDocument();
    expect(getDetailScope().queryByText('제조사 회사 ID')).not.toBeInTheDocument();
    expect(getDetailScope().queryByText('운영사 회사 ID')).not.toBeInTheDocument();
    expect(getDetailScope().queryByText('단말기 ID')).not.toBeInTheDocument();
    expect(getDetailScope().queryByText('IMEI')).not.toBeInTheDocument();
    expect(getDetailScope().queryByText('ICCID')).not.toBeInTheDocument();
  });

  it('shows Unassigned when there is no current assignment or active operator', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
        plateNumber: '12가3456',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: null,
        activeOperatorCompanyName: null,
        currentDriverId: null,
        currentTerminal: null,
        locationStatus: null,
        warnings: [],
      }),
    ]);
    apiMocks.getVehicleOps.mockResolvedValue(
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
        plateNumber: '12가3456',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: null,
        activeOperatorCompanyName: null,
        currentDriverId: null,
        currentTerminal: null,
        locationStatus: null,
        warnings: [],
      }),
    );

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    const table = await screen.findByRole('table');
    expect(within(table).getAllByText('미배정').length).toBeGreaterThan(0);
    expect(within(table).getByText('미설치')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /상세 보기/i }));

    const detailSection = getDetailSection();
    expect(await within(detailSection).findAllByText('미배정')).not.toHaveLength(0);
    expect(within(detailSection).getAllByText('미설치').length).toBeGreaterThan(0);
  });

  it('shows Unknown operator when an active operator exists but company-name lookup is missing', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
        plateNumber: '12가3456',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: '30000000-0000-0000-0000-000000000002',
        activeOperatorCompanyName: null,
        currentDriverId: '10000000-0000-0000-0000-000000000001',
        currentTerminal: null,
        warnings: ['active_operator_company_name_missing'],
      }),
    ]);
    apiMocks.getVehicleOps.mockResolvedValue(
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
        plateNumber: '12가3456',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: '30000000-0000-0000-0000-000000000002',
        activeOperatorCompanyName: null,
        currentDriverId: '10000000-0000-0000-0000-000000000001',
        currentTerminal: null,
        warnings: ['active_operator_company_name_missing'],
      }),
    );

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('운영사 미상')).toBeInTheDocument();
    expect(within(table).queryByText('미배정')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /상세 보기/i }));

    const detailSection = getDetailSection();
    expect(await within(detailSection).findByText('운영사 미상')).toBeInTheDocument();
    expect(within(detailSection).getByText('active_operator_company_name_missing')).toBeInTheDocument();
  });

  it('shows a list-area error when the vehicle list fails to load', async () => {
    apiMocks.listVehicleOps.mockRejectedValue(new Error('vehicle backend down'));

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    const listSection = getListSection();
    expect(await within(listSection).findByText('vehicle backend down')).toBeInTheDocument();
    expect(within(listSection).queryByText(/등록된 차량이 없습니다/i)).not.toBeInTheDocument();
    expect(within(getDetailSection()).queryByText('vehicle backend down')).not.toBeInTheDocument();
  });

  it('shows a detail-area error when vehicle detail fails to load', async () => {
    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
        plateNumber: '12가3456',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: '30000000-0000-0000-0000-000000000002',
        activeOperatorCompanyName: 'Operator Co',
        currentDriverId: '10000000-0000-0000-0000-000000000001',
        currentTerminal: null,
        warnings: [],
      }),
    ]);
    apiMocks.getVehicleOps.mockRejectedValue(new Error('detail lookup failed'));

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findByText('12가3456');
    fireEvent.click(screen.getByRole('button', { name: /상세 보기/i }));

    const detailSection = getDetailSection();
    expect(await within(detailSection).findByText('detail lookup failed')).toBeInTheDocument();
    expect(within(getListSection()).queryByText('detail lookup failed')).not.toBeInTheDocument();
  });

  it('does not let a stale detail response overwrite a newer selection', async () => {
    const pendingByVehicle = new Map<string, Array<(value: ReturnType<typeof makeVehicle>) => void>>();

    apiMocks.listVehicleOps.mockResolvedValue([
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000001',
        plateNumber: '12가3456',
        manufacturerCompanyName: 'Manufacturer Co',
        activeOperatorCompanyId: '30000000-0000-0000-0000-000000000002',
        activeOperatorCompanyName: 'Operator Co',
        currentDriverId: '10000000-0000-0000-0000-000000000001',
        currentTerminal: null,
        warnings: [],
      }),
      makeVehicle({
        vehicleId: '50000000-0000-0000-0000-000000000002',
        plateNumber: '34나5678',
        manufacturerCompanyName: 'Second Manufacturer',
        activeOperatorCompanyId: null,
        activeOperatorCompanyName: null,
        currentDriverId: null,
        currentTerminal: null,
        locationStatus: null,
        warnings: [],
      }),
    ]);
    apiMocks.getVehicleOps.mockImplementation((_, vehicleId: string) => {
      return new Promise((resolve) => {
        const pending = pendingByVehicle.get(vehicleId) ?? [];
        pending.push(resolve);
        pendingByVehicle.set(vehicleId, pending);
      });
    });

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findByText('12가3456');
    await screen.findByText('34나5678');

    const buttons = screen.getAllByRole('button', { name: /상세 보기/i });
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    await waitFor(() => {
      expect((pendingByVehicle.get('50000000-0000-0000-0000-000000000001') ?? []).length).toBeGreaterThan(0);
      expect((pendingByVehicle.get('50000000-0000-0000-0000-000000000002') ?? []).length).toBeGreaterThan(0);
    });

    for (const resolve of pendingByVehicle.get('50000000-0000-0000-0000-000000000002') ?? []) {
      resolve(
        makeVehicle({
          vehicleId: '50000000-0000-0000-0000-000000000002',
          plateNumber: '34나5678',
          manufacturerCompanyName: 'Second Manufacturer',
          activeOperatorCompanyId: null,
          activeOperatorCompanyName: null,
          currentDriverId: null,
          currentTerminal: null,
          locationStatus: null,
          warnings: [],
        }),
      );
    }

    const detailSectionAfterB = getDetailSection();
    expect(await within(detailSectionAfterB).findByText('34나5678')).toBeInTheDocument();
    expect(within(detailSectionAfterB).getByText('Second Manufacturer')).toBeInTheDocument();

    for (const resolve of pendingByVehicle.get('50000000-0000-0000-0000-000000000001') ?? []) {
      resolve(
        makeVehicle({
          vehicleId: '50000000-0000-0000-0000-000000000001',
          plateNumber: '12가3456',
          manufacturerCompanyName: 'Manufacturer Co',
          activeOperatorCompanyId: '30000000-0000-0000-0000-000000000002',
          activeOperatorCompanyName: 'Operator Co',
          currentDriverId: '10000000-0000-0000-0000-000000000001',
          currentTerminal: null,
          warnings: [],
        }),
      );
    }

    expect(await within(getDetailSection()).findByText('34나5678')).toBeInTheDocument();
    expect(within(getDetailSection()).queryByText('12가3456')).not.toBeInTheDocument();
  });
});
