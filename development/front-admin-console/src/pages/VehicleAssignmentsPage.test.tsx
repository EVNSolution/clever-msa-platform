import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VehicleAssignmentsPage } from './VehicleAssignmentsPage';

const apiMocks = vi.hoisted(() => ({
  listAssignments: vi.fn(),
  createAssignment: vi.fn(),
  updateAssignment: vi.fn(),
}));

vi.mock('../api/assignments', () => ({
  listAssignments: apiMocks.listAssignments,
  createAssignment: apiMocks.createAssignment,
  updateAssignment: apiMocks.updateAssignment,
}));

function makeAssignment(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    driver_vehicle_assignment_id: '60000000-0000-0000-0000-000000000001',
    driver_id: '10000000-0000-0000-0000-000000000001',
    vehicle_id: '50000000-0000-0000-0000-000000000001',
    operator_company_id: '30000000-0000-0000-0000-000000000001',
    assignment_status: 'assigned',
    assigned_at: '2026-03-20T00:00:00Z',
    unassigned_at: null,
    created_at: '2026-03-20T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

describe('VehicleAssignmentsPage', () => {
  it('lists assignments and creates a new assigned relation', async () => {
    apiMocks.listAssignments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeAssignment()]);
    apiMocks.createAssignment.mockResolvedValue(makeAssignment());

    render(<VehicleAssignmentsPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: /create assignment/i });

    fireEvent.change(screen.getByLabelText(/driver id/i), {
      target: { value: '10000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/vehicle id/i), {
      target: { value: '50000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/operator company id/i), {
      target: { value: '30000000-0000-0000-0000-000000000001' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create assignment/i }));

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

    expect(await screen.findByText('10000000-0000-0000-0000-000000000001')).toBeInTheDocument();
    expect(screen.getByText('assigned')).toBeInTheDocument();
  });

  it('unassigns an active assignment', async () => {
    apiMocks.listAssignments
      .mockResolvedValueOnce([makeAssignment()])
      .mockResolvedValueOnce([makeAssignment({ assignment_status: 'unassigned', unassigned_at: '2026-03-21T00:00:00Z' })]);
    apiMocks.updateAssignment.mockResolvedValue(
      makeAssignment({ assignment_status: 'unassigned', unassigned_at: '2026-03-21T00:00:00Z' }),
    );

    render(<VehicleAssignmentsPage client={{ request: vi.fn() }} />);

    const registrySection = screen.getByRole('heading', { name: /assignment registry/i }).closest('section') as HTMLElement;
    const unassignButton = await within(registrySection).findByRole('button', { name: /unassign/i });
    fireEvent.click(unassignButton);

    await waitFor(() => {
      expect(apiMocks.updateAssignment).toHaveBeenCalledWith(
        expect.anything(),
        '60000000-0000-0000-0000-000000000001',
        {
          assignment_status: 'unassigned',
        },
      );
    });
  });
});
