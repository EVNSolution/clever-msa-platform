import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VehiclesPage } from './VehiclesPage';

const apiMocks = vi.hoisted(() => ({
  listVehicleMasters: vi.fn(),
  createVehicleMaster: vi.fn(),
  updateVehicleMaster: vi.fn(),
  listVehicleOperatorAccesses: vi.fn(),
  createVehicleOperatorAccess: vi.fn(),
  updateVehicleOperatorAccess: vi.fn(),
  listCompanies: vi.fn(),
}));

vi.mock('../api/vehicles', () => ({
  listVehicleMasters: apiMocks.listVehicleMasters,
  createVehicleMaster: apiMocks.createVehicleMaster,
  updateVehicleMaster: apiMocks.updateVehicleMaster,
  listVehicleOperatorAccesses: apiMocks.listVehicleOperatorAccesses,
  createVehicleOperatorAccess: apiMocks.createVehicleOperatorAccess,
  updateVehicleOperatorAccess: apiMocks.updateVehicleOperatorAccess,
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
}));

function makeVehicleMaster(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    vehicle_id: '50000000-0000-0000-0000-000000000001',
    manufacturer_company_id: '30000000-0000-0000-0000-000000000001',
    plate_number: '12가3456',
    vin: 'VIN-000000000000001',
    manufacturer_vehicle_code: 'MFG-001',
    model_name: 'Model X',
    vehicle_status: 'active',
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

function makeOperatorAccess(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    vehicle_operator_access_id: '51000000-0000-0000-0000-000000000001',
    vehicle_id: '50000000-0000-0000-0000-000000000001',
    operator_company_id: '30000000-0000-0000-0000-000000000002',
    access_status: 'active',
    started_at: '2026-03-20T00:00:00Z',
    ended_at: null,
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

describe('Admin VehiclesPage', () => {
  it('creates a vehicle master with manufacturer company input and no legacy fleet form', async () => {
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listVehicleOperatorAccesses.mockResolvedValue([]);
    apiMocks.createVehicleMaster.mockResolvedValue(makeVehicleMaster());
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' },
      { company_id: '30000000-0000-0000-0000-000000000002', name: '운영사 회사' },
    ]);

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: /차량 마스터 생성/i });

    expect(screen.queryByLabelText(/^company id$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/fleet id/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/제조사 회사/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/제조사 회사/i), {
      target: { value: '30000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/번호판/i), {
      target: { value: '12가3456' },
    });
    fireEvent.change(screen.getByLabelText(/^vin$/i), {
      target: { value: 'VIN-000000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/제조사 차량 코드/i), {
      target: { value: 'MFG-001' },
    });
    fireEvent.change(screen.getByLabelText(/모델명/i), {
      target: { value: 'Model X' },
    });

    fireEvent.click(screen.getByRole('button', { name: /차량 마스터 생성/i }));

    await waitFor(() => {
      expect(apiMocks.createVehicleMaster).toHaveBeenCalledWith(expect.anything(), {
        manufacturer_company_id: '30000000-0000-0000-0000-000000000001',
        plate_number: '12가3456',
        vin: 'VIN-000000000000001',
        manufacturer_vehicle_code: 'MFG-001',
        model_name: 'Model X',
        vehicle_status: 'active',
      });
    });
  });

  it('loads vehicle master data into the edit form and updates it', async () => {
    apiMocks.listVehicleMasters.mockResolvedValue([makeVehicleMaster()]);
    apiMocks.listVehicleOperatorAccesses.mockResolvedValue([]);
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' },
    ]);
    apiMocks.updateVehicleMaster.mockResolvedValue(
      makeVehicleMaster({
        model_name: 'Model Y',
        vehicle_status: 'inactive',
      }),
    );

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findAllByText('12가3456');
    fireEvent.click(screen.getByRole('button', { name: /마스터 수정/i }));

    expect(screen.getAllByRole('option', { name: 'Seed Company' })).not.toHaveLength(0);
    expect(screen.getByDisplayValue('Model X')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/모델명/i), {
      target: { value: 'Model Y' },
    });
    fireEvent.change(screen.getByLabelText(/차량 상태/i), {
      target: { value: 'inactive' },
    });
    fireEvent.click(screen.getByRole('button', { name: /차량 마스터 수정/i }));

    await waitFor(() => {
      expect(apiMocks.updateVehicleMaster).toHaveBeenCalledWith(
        expect.anything(),
        '50000000-0000-0000-0000-000000000001',
        {
          manufacturer_company_id: '30000000-0000-0000-0000-000000000001',
          plate_number: '12가3456',
          vin: 'VIN-000000000000001',
          manufacturer_vehicle_code: 'MFG-001',
          model_name: 'Model Y',
          vehicle_status: 'inactive',
        },
      );
    });
  });

  it('creates and ends operator access records', async () => {
    apiMocks.listVehicleMasters.mockResolvedValue([makeVehicleMaster()]);
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', name: 'Seed Company' },
      { company_id: '30000000-0000-0000-0000-000000000002', name: '운영사 회사' },
    ]);
    apiMocks.listVehicleOperatorAccesses
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeOperatorAccess()])
      .mockResolvedValueOnce([makeOperatorAccess({ access_status: 'ended', ended_at: '2026-03-21T00:00:00Z' })]);
    apiMocks.createVehicleOperatorAccess.mockResolvedValue(makeOperatorAccess());
    apiMocks.updateVehicleOperatorAccess.mockResolvedValue(
      makeOperatorAccess({ access_status: 'ended', ended_at: '2026-03-21T00:00:00Z' }),
    );

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findAllByText('12가3456');

    fireEvent.change(screen.getByLabelText(/접근 차량/i), {
      target: { value: '50000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/운영사 회사/i), {
      target: { value: '30000000-0000-0000-0000-000000000002' },
    });
    fireEvent.click(screen.getByRole('button', { name: /운영사 접근 생성/i }));

    await waitFor(() => {
      expect(apiMocks.createVehicleOperatorAccess).toHaveBeenCalledWith(expect.anything(), {
        vehicle_id: '50000000-0000-0000-0000-000000000001',
        operator_company_id: '30000000-0000-0000-0000-000000000002',
        access_status: 'active',
        started_at: expect.any(String),
        ended_at: null,
      });
    });

    const accessSection = screen.getByRole('heading', { name: /운영사 접근 목록/i }).closest('section') as HTMLElement;
    const endButton = await within(accessSection).findByRole('button', { name: /접근 종료/i });
    fireEvent.click(endButton);

    await waitFor(() => {
      expect(apiMocks.updateVehicleOperatorAccess).toHaveBeenCalledWith(
        expect.anything(),
        '51000000-0000-0000-0000-000000000001',
        {
          access_status: 'ended',
          ended_at: expect.any(String),
        },
      );
    });
  });
});
