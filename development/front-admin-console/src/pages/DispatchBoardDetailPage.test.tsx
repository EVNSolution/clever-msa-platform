import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DispatchBoardDetailPage } from './DispatchBoardDetailPage';

const apiMocks = vi.hoisted(() => ({
  getDispatchBoard: vi.fn(),
  getDispatchSummary: vi.fn(),
  listDispatchAssignments: vi.fn(),
  listDrivers: vi.fn(),
  listVehicleMasters: vi.fn(),
  listVehicleSchedules: vi.fn(),
  updateDispatchAssignment: vi.fn(),
}));

vi.mock('../api/dispatchOps', () => ({
  getDispatchBoard: apiMocks.getDispatchBoard,
  getDispatchSummary: apiMocks.getDispatchSummary,
}));

vi.mock('../api/dispatchRegistry', () => ({
  listDispatchAssignments: apiMocks.listDispatchAssignments,
  listVehicleSchedules: apiMocks.listVehicleSchedules,
  updateDispatchAssignment: apiMocks.updateDispatchAssignment,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

vi.mock('../api/vehicles', () => ({
  listVehicleMasters: apiMocks.listVehicleMasters,
}));

vi.mock('../api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([
    {
      company_id: '30000000-0000-0000-0000-000000000001',
      route_no: 31,
      name: '알파 회사',
    },
  ]),
  getFleet: vi.fn().mockResolvedValue({
    fleet_id: '40000000-0000-0000-0000-000000000001',
    route_no: 41,
    company_id: '30000000-0000-0000-0000-000000000001',
    name: '서울 플릿',
  }),
}));

describe('DispatchBoardDetailPage', () => {
  it('renders board rows and unassigns an assignment', async () => {
    apiMocks.getDispatchSummary.mockResolvedValue({
      dispatch_date: '2026-03-24',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      planned_volume: 120,
      planned_assignment_count: 1,
      matched_count: 1,
      not_started_count: 0,
      dispatch_unit_changed_count: 0,
      unplanned_current_count: 0,
    });
    apiMocks.getDispatchBoard.mockResolvedValue([
      {
        dispatch_date: '2026-03-24',
        vehicle_schedule_id: 'vehicle-schedule-1',
        dispatch_assignment_id: 'dispatch-assignment-1',
        shift_slot: 'A',
        vehicle_id: 'vehicle-1',
        plate_number: '12가3456',
        planned_driver_id: 'driver-1',
        planned_driver_name: '홍길동',
        current_driver_id: 'driver-1',
        current_driver_name: '홍길동',
        dispatch_status: 'matched',
        warnings: [],
      },
    ]);
    apiMocks.listVehicleSchedules.mockResolvedValue([]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.updateDispatchAssignment.mockResolvedValue({
      dispatch_assignment_id: 'dispatch-assignment-1',
      vehicle_schedule_id: 'vehicle-schedule-1',
      vehicle_id: 'vehicle-1',
      driver_id: 'driver-1',
      operator_company_id: '30000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      shift_slot: 'A',
      assignment_status: 'unassigned',
      assigned_at: '2026-03-24T09:00:00Z',
      unassigned_at: '2026-04-05T12:00:00Z',
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-04-05T12:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/dispatch/boards/41/2026-03-24']}>
        <Routes>
          <Route
            path="/dispatch/boards/:fleetRef/:dispatchDate"
            element={<DispatchBoardDetailPage client={{ request: vi.fn() }} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '서울 플릿' });
    expect(screen.getByText('12가3456')).toBeInTheDocument();
    expect(screen.getAllByText('홍길동').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '배정 해제' }));
    await waitFor(() => {
      expect(apiMocks.updateDispatchAssignment).toHaveBeenCalledWith(
        expect.anything(),
        'dispatch-assignment-1',
        expect.objectContaining({
          assignment_status: 'unassigned',
          unassigned_at: expect.any(String),
        }),
      );
    });
  });
});
