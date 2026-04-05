import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DispatchBoardDetailPage } from './DispatchBoardDetailPage';

const apiMocks = vi.hoisted(() => ({
  createDispatchAssignment: vi.fn(),
  createOutsourcedDriver: vi.fn(),
  getDispatchBoard: vi.fn(),
  getDispatchSummary: vi.fn(),
  listDispatchPlans: vi.fn(),
  listDispatchAssignments: vi.fn(),
  listOutsourcedDrivers: vi.fn(),
  listDrivers: vi.fn(),
  listVehicleMasters: vi.fn(),
  listVehicleSchedules: vi.fn(),
  removeOutsourcedDriver: vi.fn(),
  updateDispatchAssignment: vi.fn(),
}));

vi.mock('../api/dispatchOps', () => ({
  getDispatchBoard: apiMocks.getDispatchBoard,
  getDispatchSummary: apiMocks.getDispatchSummary,
}));

vi.mock('../api/dispatchRegistry', () => ({
  createDispatchAssignment: apiMocks.createDispatchAssignment,
  createOutsourcedDriver: apiMocks.createOutsourcedDriver,
  listDispatchPlans: apiMocks.listDispatchPlans,
  listDispatchAssignments: apiMocks.listDispatchAssignments,
  listOutsourcedDrivers: apiMocks.listOutsourcedDrivers,
  listVehicleSchedules: apiMocks.listVehicleSchedules,
  removeOutsourcedDriver: apiMocks.removeOutsourcedDriver,
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
    apiMocks.listDispatchPlans.mockResolvedValue([
      {
        dispatch_plan_id: 'dispatch-plan-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        planned_volume: 120,
        dispatch_status: 'draft',
      },
    ]);
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
        planned_driver_kind: 'internal',
        outsourced_driver_id: null,
        planned_driver_id: 'driver-1',
        planned_driver_name: '홍길동',
        current_driver_id: 'driver-1',
        current_driver_name: '홍길동',
        dispatch_status: 'matched',
        warnings: [],
      },
    ]);
    apiMocks.listOutsourcedDrivers.mockResolvedValue([]);
    apiMocks.listVehicleSchedules.mockResolvedValue([]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.updateDispatchAssignment.mockResolvedValue({
      dispatch_assignment_id: 'dispatch-assignment-1',
      vehicle_schedule_id: 'vehicle-schedule-1',
      vehicle_id: 'vehicle-1',
      driver_id: 'driver-1',
      outsourced_driver_id: null,
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

  it('creates outsourced driver and assigns it to a schedule', async () => {
    apiMocks.listDispatchPlans.mockResolvedValue([
      {
        dispatch_plan_id: 'dispatch-plan-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        planned_volume: 120,
        dispatch_status: 'draft',
      },
    ]);
    apiMocks.getDispatchSummary.mockResolvedValue({
      dispatch_date: '2026-03-24',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      planned_volume: 120,
      planned_assignment_count: 0,
      matched_count: 0,
      not_started_count: 0,
      dispatch_unit_changed_count: 0,
      unplanned_current_count: 0,
    });
    apiMocks.getDispatchBoard.mockResolvedValue([]);
    apiMocks.listOutsourcedDrivers
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          outsourced_driver_id: 'outsourced-1',
          dispatch_plan_id: 'dispatch-plan-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          dispatch_date: '2026-03-24',
          name: '외부 기사',
          contact_number: '010-9999-8888',
          vehicle_note: '1톤 카고',
          memo: '월말 정산 대상',
          created_at: '2026-03-24T09:00:00Z',
          updated_at: '2026-03-24T09:00:00Z',
        },
      ]);
    apiMocks.listVehicleSchedules.mockResolvedValue([
      {
        vehicle_schedule_id: 'schedule-1',
        vehicle_id: 'vehicle-1',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        shift_slot: 'A',
        schedule_status: 'planned',
        starts_at: null,
        ends_at: null,
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
    ]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([
      {
        vehicle_id: 'vehicle-1',
        plate_number: '12가3456',
        vin: 'VIN-1',
        manufacturer_company_id: 'company-1',
        manufacturer_vehicle_code: null,
        model_name: 'EV Truck',
        vehicle_status: 'active',
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
    ]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.createOutsourcedDriver.mockResolvedValue({
      outsourced_driver_id: 'outsourced-1',
      dispatch_plan_id: 'dispatch-plan-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      name: '외부 기사',
      contact_number: '010-9999-8888',
      vehicle_note: '1톤 카고',
      memo: '월말 정산 대상',
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T09:00:00Z',
    });
    apiMocks.createDispatchAssignment.mockResolvedValue({
      dispatch_assignment_id: 'dispatch-assignment-1',
      vehicle_schedule_id: 'schedule-1',
      vehicle_id: 'vehicle-1',
      driver_id: null,
      outsourced_driver_id: 'outsourced-1',
      operator_company_id: '30000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      shift_slot: 'A',
      assignment_status: 'assigned',
      assigned_at: '2026-03-24T09:00:00Z',
      unassigned_at: null,
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T09:00:00Z',
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
    fireEvent.change(screen.getByLabelText('용차 기사 이름'), { target: { value: '외부 기사' } });
    fireEvent.change(screen.getByLabelText('연락처'), { target: { value: '010-9999-8888' } });
    fireEvent.click(screen.getByRole('button', { name: '용차 기사 추가' }));

    await waitFor(() => {
      expect(apiMocks.createOutsourcedDriver).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          dispatch_plan_id: 'dispatch-plan-1',
          name: '외부 기사',
          contact_number: '010-9999-8888',
        }),
      );
    });

    await screen.findByText('외부 기사');
    fireEvent.click(screen.getByLabelText('용차 기사 배정'));
    fireEvent.change(screen.getByLabelText('용차 기사 선택'), { target: { value: 'outsourced-1' } });
    fireEvent.click(screen.getByRole('button', { name: '기사 배정 추가' }));

    await waitFor(() => {
      expect(apiMocks.createDispatchAssignment).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          vehicle_schedule_id: 'schedule-1',
          driver_id: null,
          outsourced_driver_id: 'outsourced-1',
        }),
      );
    });
  });
});
