import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DispatchBoardDetailPage } from './DispatchBoardDetailPage';

const apiMocks = vi.hoisted(() => ({
  createDispatchAssignment: vi.fn(),
  createDriverDayException: vi.fn(),
  createDispatchWorkRule: vi.fn(),
  createOutsourcedDriver: vi.fn(),
  getDispatchBoard: vi.fn(),
  getDispatchSummary: vi.fn(),
  listDriverDayExceptions: vi.fn(),
  listDispatchPlans: vi.fn(),
  listDispatchAssignments: vi.fn(),
  listDispatchWorkRules: vi.fn(),
  listOutsourcedDrivers: vi.fn(),
  listDrivers: vi.fn(),
  listVehicleMasters: vi.fn(),
  listVehicleSchedules: vi.fn(),
  removeDriverDayException: vi.fn(),
  removeDispatchWorkRule: vi.fn(),
  archiveOutsourcedDriver: vi.fn(),
  updateOutsourcedDriver: vi.fn(),
  updateDispatchWorkRule: vi.fn(),
  updateDispatchAssignment: vi.fn(),
  listDailyDeliveryInputSnapshots: vi.fn(),
}));

vi.mock('../api/dispatchOps', () => ({
  getDispatchBoard: apiMocks.getDispatchBoard,
  getDispatchSummary: apiMocks.getDispatchSummary,
}));

vi.mock('../api/dispatchRegistry', () => ({
  createDispatchAssignment: apiMocks.createDispatchAssignment,
  createDriverDayException: apiMocks.createDriverDayException,
  createDispatchWorkRule: apiMocks.createDispatchWorkRule,
  createOutsourcedDriver: apiMocks.createOutsourcedDriver,
  listDriverDayExceptions: apiMocks.listDriverDayExceptions,
  listDispatchPlans: apiMocks.listDispatchPlans,
  listDispatchAssignments: apiMocks.listDispatchAssignments,
  listDispatchWorkRules: apiMocks.listDispatchWorkRules,
  listOutsourcedDrivers: apiMocks.listOutsourcedDrivers,
  listVehicleSchedules: apiMocks.listVehicleSchedules,
  removeDriverDayException: apiMocks.removeDriverDayException,
  removeDispatchWorkRule: apiMocks.removeDispatchWorkRule,
  archiveOutsourcedDriver: apiMocks.archiveOutsourcedDriver,
  updateOutsourcedDriver: apiMocks.updateOutsourcedDriver,
  updateDispatchWorkRule: apiMocks.updateDispatchWorkRule,
  updateDispatchAssignment: apiMocks.updateDispatchAssignment,
}));

vi.mock('../api/deliveryRecords', () => ({
  listDailyDeliveryInputSnapshots: apiMocks.listDailyDeliveryInputSnapshots,
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

function mockOutsourcedDriverLists(activeDrivers: unknown[], archivedDrivers: unknown[] = []) {
  apiMocks.listOutsourcedDrivers.mockImplementation((_client, filters) => {
    if (filters?.status === 'archived') {
      return Promise.resolve(archivedDrivers);
    }
    return Promise.resolve(activeDrivers);
  });
}

describe('DispatchBoardDetailPage', () => {
  beforeEach(() => {
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([]);
  });

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
    apiMocks.listDailyDeliveryInputSnapshots.mockResolvedValue([
      {
        daily_delivery_input_snapshot_id: 'snapshot-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        driver_id: 'driver-1',
        service_date: '2026-03-24',
        delivery_count: 5,
        total_distance_km: '10.50',
        total_base_amount: '20000.00',
        source_record_count: 1,
        status: 'active',
      },
    ]);
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
    apiMocks.listDispatchWorkRules.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
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
    expect(screen.getByText('정산 입력 스냅샷 완료')).toBeInTheDocument();
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

  it('renders active and archived outsourced drivers separately and excludes archived drivers from assignment choices', async () => {
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
    apiMocks.listOutsourcedDrivers.mockImplementation((_client, filters) => {
      if (filters?.status === 'archived') {
        return Promise.resolve([
          {
            outsourced_driver_id: 'outsourced-2',
            dispatch_plan_id: 'dispatch-plan-1',
            company_id: '30000000-0000-0000-0000-000000000001',
            fleet_id: '40000000-0000-0000-0000-000000000001',
            dispatch_date: '2026-03-24',
            name: '아카이브 기사',
            contact_number: '010-0000-0002',
            vehicle_note: '리프트',
            memo: '정산 완료',
            status: 'archived',
            archived_at: '2026-03-24T18:00:00Z',
            is_archivable: false,
            created_at: '2026-03-24T09:00:00Z',
            updated_at: '2026-03-24T18:00:00Z',
          },
        ]);
      }

      return Promise.resolve([
        {
          outsourced_driver_id: 'outsourced-1',
          dispatch_plan_id: 'dispatch-plan-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          dispatch_date: '2026-03-24',
          name: '운영 기사',
          contact_number: '010-0000-0001',
          vehicle_note: '1톤 카고',
          memo: '운영 중',
          status: 'active',
          archived_at: null,
          is_archivable: false,
          created_at: '2026-03-24T09:00:00Z',
          updated_at: '2026-03-24T09:00:00Z',
        },
      ]);
    });
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
    apiMocks.listDispatchWorkRules.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);

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

    await screen.findByRole('heading', { name: '운영 기사', level: 3 });
    expect(screen.getByRole('heading', { name: '아카이브 기사', level: 3 })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '운영 기사' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '아카이브 기사' })).not.toBeInTheDocument();
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
    mockOutsourcedDriverLists([
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
    apiMocks.listDispatchWorkRules.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
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

    await screen.findByRole('heading', { name: '외부 기사', level: 3 });
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

  it('creates a company work rule and a driver day exception', async () => {
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
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: 'driver-1',
        route_no: 101,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: '홍길동',
        ev_id: 'EV-1',
        phone_number: '010-1111-2222',
        address: '서울',
      },
      {
        driver_id: 'driver-2',
        route_no: 102,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: '김철수',
        ev_id: 'EV-2',
        phone_number: '010-3333-4444',
        address: '서울',
      },
    ]);
    apiMocks.listDispatchWorkRules
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          work_rule_id: 'work-rule-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          name: '주말 특근',
          system_kind: 'overtime',
          is_in_use: true,
          created_at: '2026-03-24T09:00:00Z',
          updated_at: '2026-03-24T09:00:00Z',
        },
        {
          work_rule_id: 'work-rule-2',
          company_id: '30000000-0000-0000-0000-000000000001',
          name: '평일 출근',
          system_kind: 'working',
          is_in_use: false,
          created_at: '2026-03-24T09:00:00Z',
          updated_at: '2026-03-24T09:00:00Z',
        },
      ]);
    apiMocks.listDriverDayExceptions
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        {
          driver_day_exception_id: 'driver-day-exception-1',
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          dispatch_date: '2026-03-24',
          driver_id: 'driver-1',
          work_rule: {
            work_rule_id: 'work-rule-1',
            company_id: '30000000-0000-0000-0000-000000000001',
            name: '주말 특근',
            system_kind: 'overtime',
            created_at: '2026-03-24T09:00:00Z',
            updated_at: '2026-03-24T09:00:00Z',
          },
          memo: '긴급 물량 대응',
          created_at: '2026-03-24T09:00:00Z',
          updated_at: '2026-03-24T09:00:00Z',
        },
      ]);
    apiMocks.createDispatchWorkRule.mockResolvedValue({
      work_rule_id: 'work-rule-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      name: '주말 특근',
      system_kind: 'overtime',
      is_in_use: false,
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T09:00:00Z',
    });
    apiMocks.createDriverDayException.mockResolvedValue({
      driver_day_exception_id: 'driver-day-exception-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      driver_id: 'driver-1',
      work_rule: {
        work_rule_id: 'work-rule-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: '주말 특근',
        system_kind: 'overtime',
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
      memo: '긴급 물량 대응',
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
    fireEvent.change(screen.getByLabelText('근무 규칙 이름'), { target: { value: '주말 특근' } });
    fireEvent.change(screen.getByLabelText('근무 의미'), { target: { value: 'overtime' } });
    fireEvent.click(screen.getByRole('button', { name: '근무 규칙 추가' }));

    await waitFor(() => {
      expect(apiMocks.createDispatchWorkRule).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          company_id: '30000000-0000-0000-0000-000000000001',
          name: '주말 특근',
          system_kind: 'overtime',
        }),
      );
    });

    await screen.findAllByText('주말 특근');
    const exceptionDriverSelect = screen.getByLabelText('예외 배송원');
    expect(exceptionDriverSelect).toHaveTextContent('홍길동');
    expect(exceptionDriverSelect).not.toHaveTextContent('김철수');
    fireEvent.change(exceptionDriverSelect, { target: { value: 'driver-1' } });
    const exceptionRuleSelect = screen.getByLabelText('적용 규칙');
    expect(exceptionRuleSelect).toHaveTextContent('주말 특근');
    expect(exceptionRuleSelect).not.toHaveTextContent('평일 출근');
    fireEvent.change(exceptionRuleSelect, { target: { value: 'work-rule-1' } });
    fireEvent.change(screen.getByLabelText('예외 메모'), { target: { value: '긴급 물량 대응' } });
    fireEvent.click(screen.getByRole('button', { name: '날짜 예외 추가' }));

    await waitFor(() => {
      expect(apiMocks.createDriverDayException).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          company_id: '30000000-0000-0000-0000-000000000001',
          fleet_id: '40000000-0000-0000-0000-000000000001',
          driver_id: 'driver-1',
          work_rule_id: 'work-rule-1',
        }),
      );
    });

    await screen.findByText('긴급 물량 대응');
  });

  it('deletes an unused company work rule', async () => {
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
    apiMocks.listOutsourcedDrivers.mockResolvedValue([]);
    apiMocks.listVehicleSchedules.mockResolvedValue([]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
    apiMocks.listDispatchWorkRules.mockResolvedValue([
      {
        work_rule_id: 'work-rule-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: '주말 특근',
        system_kind: 'overtime',
        is_in_use: false,
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
    ]);
    apiMocks.removeDispatchWorkRule.mockResolvedValue(undefined);

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

    await screen.findByText('주말 특근');
    fireEvent.click(screen.getByRole('button', { name: '근무 규칙 삭제' }));

    await waitFor(() => {
      expect(apiMocks.removeDispatchWorkRule).toHaveBeenCalledWith(expect.anything(), 'work-rule-1');
    });
  });

  it('shows used work rules as undeletable', async () => {
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
    apiMocks.listOutsourcedDrivers.mockResolvedValue([]);
    apiMocks.listVehicleSchedules.mockResolvedValue([]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
    apiMocks.listDispatchWorkRules.mockResolvedValue([
      {
        work_rule_id: 'work-rule-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: '주말 특근',
        system_kind: 'overtime',
        is_in_use: true,
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
    ]);

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

    await screen.findByText('주말 특근');
    expect(screen.getByText('예외에서 사용 중')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '근무 규칙 삭제' })).toBeDisabled();
  });

  it('renames a work rule without changing its mapped meaning', async () => {
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
    apiMocks.listOutsourcedDrivers.mockResolvedValue([]);
    apiMocks.listVehicleSchedules.mockResolvedValue([]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
    apiMocks.listDispatchWorkRules.mockResolvedValue([
      {
        work_rule_id: 'work-rule-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: '주말 특근',
        system_kind: 'overtime',
        is_in_use: true,
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
      {
        work_rule_id: 'work-rule-2',
        company_id: '30000000-0000-0000-0000-000000000001',
        name: '휴일 특근',
        system_kind: 'overtime',
        is_in_use: false,
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
    ]);
    apiMocks.updateDispatchWorkRule.mockResolvedValue({
      work_rule_id: 'work-rule-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      name: '주말 긴급 특근',
      system_kind: 'overtime',
      is_in_use: true,
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T10:00:00Z',
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

    await screen.findByText('주말 특근');
    expect(screen.getByText('휴일 특근')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '근무 규칙 이름 수정' })[0]);
    fireEvent.change(screen.getByLabelText('수정 규칙 이름'), { target: { value: '주말 긴급 특근' } });
    fireEvent.click(screen.getByRole('button', { name: '근무 규칙 수정 저장' }));

    await waitFor(() => {
      expect(apiMocks.updateDispatchWorkRule).toHaveBeenCalledWith(
        expect.anything(),
        'work-rule-1',
        expect.objectContaining({
          name: '주말 긴급 특근',
        }),
      );
    });
  });

  it('updates outsourced driver information from the board', async () => {
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
    apiMocks.listVehicleSchedules.mockResolvedValue([]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.listDispatchWorkRules.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
    mockOutsourcedDriverLists([
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
    apiMocks.updateOutsourcedDriver.mockResolvedValue({
      outsourced_driver_id: 'outsourced-1',
      dispatch_plan_id: 'dispatch-plan-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      name: '긴급 용차',
      contact_number: '010-2222-3333',
      vehicle_note: '2.5톤 윙바디',
      memo: '수정된 메모',
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T10:00:00Z',
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

    await screen.findByRole('heading', { name: '외부 기사', level: 3 });
    fireEvent.click(screen.getByRole('button', { name: '용차 기사 수정' }));
    fireEvent.change(screen.getByLabelText('수정 용차 기사 이름'), { target: { value: '긴급 용차' } });
    fireEvent.change(screen.getByLabelText('수정 연락처'), { target: { value: '010-2222-3333' } });
    fireEvent.change(screen.getByLabelText('수정 차량/차종 메모'), { target: { value: '2.5톤 윙바디' } });
    fireEvent.change(screen.getByLabelText('수정 메모'), { target: { value: '수정된 메모' } });
    fireEvent.click(screen.getByRole('button', { name: '용차 기사 수정 저장' }));

    await waitFor(() => {
      expect(apiMocks.updateOutsourcedDriver).toHaveBeenCalledWith(
        expect.anything(),
        'outsourced-1',
        expect.objectContaining({
          name: '긴급 용차',
          contact_number: '010-2222-3333',
          vehicle_note: '2.5톤 윙바디',
          memo: '수정된 메모',
        }),
      );
    });
  });

  it('archives outsourced driver only when settlement snapshot exists', async () => {
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
    apiMocks.listVehicleSchedules.mockResolvedValue([]);
    apiMocks.listDispatchAssignments.mockResolvedValue([]);
    apiMocks.listVehicleMasters.mockResolvedValue([]);
    apiMocks.listDrivers.mockResolvedValue([]);
    apiMocks.listDispatchWorkRules.mockResolvedValue([]);
    apiMocks.listDriverDayExceptions.mockResolvedValue([]);
    mockOutsourcedDriverLists([
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
        status: 'active',
        archived_at: null,
        is_archivable: true,
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
      {
        outsourced_driver_id: 'outsourced-2',
        dispatch_plan_id: 'dispatch-plan-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        name: '잠금 용차',
        contact_number: '010-7777-6666',
        vehicle_note: '',
        memo: '',
        status: 'active',
        archived_at: null,
        is_archivable: false,
        created_at: '2026-03-24T09:00:00Z',
        updated_at: '2026-03-24T09:00:00Z',
      },
    ]);
    apiMocks.archiveOutsourcedDriver.mockResolvedValue({
      outsourced_driver_id: 'outsourced-1',
      dispatch_plan_id: 'dispatch-plan-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      name: '외부 기사',
      contact_number: '010-9999-8888',
      vehicle_note: '1톤 카고',
      memo: '월말 정산 대상',
      status: 'archived',
      archived_at: '2026-03-24T20:00:00Z',
      is_archivable: false,
      created_at: '2026-03-24T09:00:00Z',
      updated_at: '2026-03-24T20:00:00Z',
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

    await screen.findByRole('heading', { name: '외부 기사', level: 3 });
    const archiveButtons = screen.getAllByRole('button', { name: '용차 기사 아카이브' });
    expect(archiveButtons[0]).toBeEnabled();
    expect(archiveButtons[1]).toBeDisabled();
    expect(screen.getByText('정산 입력 스냅샷 후 아카이브 가능')).toBeInTheDocument();

    fireEvent.click(archiveButtons[0]);

    await waitFor(() => {
      expect(apiMocks.archiveOutsourcedDriver).toHaveBeenCalledWith(expect.anything(), 'outsourced-1');
    });
  });
});
