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
}));

vi.mock('../api/vehicles', () => ({
  listVehicleMasters: apiMocks.listVehicleMasters,
  createVehicleMaster: apiMocks.createVehicleMaster,
  updateVehicleMaster: apiMocks.updateVehicleMaster,
  listVehicleOperatorAccesses: apiMocks.listVehicleOperatorAccesses,
  createVehicleOperatorAccess: apiMocks.createVehicleOperatorAccess,
  updateVehicleOperatorAccess: apiMocks.updateVehicleOperatorAccess,
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

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: /create vehicle master/i });

    expect(screen.queryByLabelText(/^company id$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/fleet id/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/manufacturer company id/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/manufacturer company id/i), {
      target: { value: '30000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/plate number/i), {
      target: { value: '12가3456' },
    });
    fireEvent.change(screen.getByLabelText(/^vin$/i), {
      target: { value: 'VIN-000000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/manufacturer vehicle code/i), {
      target: { value: 'MFG-001' },
    });
    fireEvent.change(screen.getByLabelText(/model name/i), {
      target: { value: 'Model X' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create vehicle master/i }));

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
    apiMocks.updateVehicleMaster.mockResolvedValue(
      makeVehicleMaster({
        model_name: 'Model Y',
        vehicle_status: 'inactive',
      }),
    );

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findByText('12가3456');
    fireEvent.click(screen.getByRole('button', { name: /edit master/i }));

    expect(screen.getByDisplayValue('30000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Model X')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/model name/i), {
      target: { value: 'Model Y' },
    });
    fireEvent.change(screen.getByLabelText(/vehicle status/i), {
      target: { value: 'inactive' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update vehicle master/i }));

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
    apiMocks.listVehicleOperatorAccesses
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeOperatorAccess()])
      .mockResolvedValueOnce([makeOperatorAccess({ access_status: 'ended', ended_at: '2026-03-21T00:00:00Z' })]);
    apiMocks.createVehicleOperatorAccess.mockResolvedValue(makeOperatorAccess());
    apiMocks.updateVehicleOperatorAccess.mockResolvedValue(
      makeOperatorAccess({ access_status: 'ended', ended_at: '2026-03-21T00:00:00Z' }),
    );

    render(<VehiclesPage client={{ request: vi.fn() }} />);

    await screen.findByText('12가3456');

    fireEvent.change(screen.getByLabelText(/access vehicle id/i), {
      target: { value: '50000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/operator company id/i), {
      target: { value: '30000000-0000-0000-0000-000000000002' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create operator access/i }));

    await waitFor(() => {
      expect(apiMocks.createVehicleOperatorAccess).toHaveBeenCalledWith(expect.anything(), {
        vehicle_id: '50000000-0000-0000-0000-000000000001',
        operator_company_id: '30000000-0000-0000-0000-000000000002',
        access_status: 'active',
        started_at: expect.any(String),
        ended_at: null,
      });
    });

    const accessSection = screen.getByRole('heading', { name: /operator access registry/i }).closest('section') as HTMLElement;
    const endButton = await within(accessSection).findByRole('button', { name: /end access/i });
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
