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

    await screen.findByRole('heading', { name: /배정 생성/i });

    fireEvent.change(screen.getByLabelText(/배송원 id/i), {
      target: { value: '10000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/차량 id/i), {
      target: { value: '50000000-0000-0000-0000-000000000001' },
    });
    fireEvent.change(screen.getByLabelText(/운영사 회사 id/i), {
      target: { value: '30000000-0000-0000-0000-000000000001' },
    });
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

    expect(await screen.findAllByText('비공개')).not.toHaveLength(0);
    expect(screen.getByText('배정됨')).toBeInTheDocument();
  });

  it('unassigns an active assignment', async () => {
    apiMocks.listAssignments
      .mockResolvedValueOnce([makeAssignment()])
      .mockResolvedValueOnce([makeAssignment({ assignment_status: 'unassigned', unassigned_at: '2026-03-21T00:00:00Z' })]);
    apiMocks.updateAssignment.mockResolvedValue(
      makeAssignment({ assignment_status: 'unassigned', unassigned_at: '2026-03-21T00:00:00Z' }),
    );

    render(<VehicleAssignmentsPage client={{ request: vi.fn() }} />);

    const registrySection = screen.getByRole('heading', { name: /배정 목록/i }).closest('section') as HTMLElement;
    const unassignButton = await within(registrySection).findByRole('button', { name: /배정 해제/i });
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
