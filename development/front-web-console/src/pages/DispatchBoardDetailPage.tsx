import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  bootstrapDailySnapshotsFromDispatch,
  listDailyDeliveryInputSnapshots,
} from '../api/deliveryRecords';
import {
  createDispatchAssignment,
  createDriverDayException,
  createDispatchWorkRule,
  createOutsourcedDriver,
  archiveOutsourcedDriver,
  listDriverDayExceptions,
  listDispatchUploadBatches,
  listDispatchPlans,
  listDispatchWorkRules,
  listOutsourcedDrivers,
  createVehicleSchedule,
  listVehicleSchedules,
  removeDriverDayException,
  removeDispatchWorkRule,
  updateOutsourcedDriver,
  updateDispatchWorkRule,
  updateDispatchAssignment,
} from '../api/dispatchRegistry';
import { getDispatchBoard, getDispatchSummary } from '../api/dispatchOps';
import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getFleet, listCompanies } from '../api/organization';
import { listVehicleMasters } from '../api/vehicles';
import { getDriverRouteRef, getVehicleRouteRef } from '../routeRefs';
import type {
  Company,
  DailyDeliveryInputSnapshot,
  DispatchBoardRow,
  DispatchBoardSummary,
  DispatchPlan,
  DispatchUploadBatch,
  DispatchWorkRule,
  DriverDayException,
  DriverProfile,
  OutsourcedDriver,
  Fleet,
  VehicleMaster,
  VehicleSchedule,
} from '../types';
import { DispatchUploadWizard } from '../components/DispatchUploadWizard';
import { PageLayout } from '../components/PageLayout';

type DispatchBoardDetailPageProps = {
  client: HttpClient;
};

function createTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function formatWorkRuleKindLabel(systemKind: DispatchWorkRule['system_kind']) {
  switch (systemKind) {
    case 'working':
      return '출근';
    case 'day_off':
      return '휴무';
    case 'overtime':
      return '특근';
    default:
      return systemKind;
  }
}

function getFirstPlannedInternalDriverId(rows: DispatchBoardRow[]) {
  return rows.find((row) => row.planned_driver_kind === 'internal' && row.planned_driver_id)?.planned_driver_id ?? '';
}

function getDefaultAssignmentMode(
  drivers: DriverProfile[],
  outsourcedDrivers: OutsourcedDriver[],
): 'internal' | 'outsourced' {
  if (drivers.length === 0 && outsourcedDrivers.length > 0) {
    return 'outsourced';
  }
  return 'internal';
}

export function DispatchBoardDetailPage({ client }: DispatchBoardDetailPageProps) {
  const { dispatchDate, fleetRef } = useParams();
  const [summary, setSummary] = useState<DispatchBoardSummary | null>(null);
  const [boardRows, setBoardRows] = useState<DispatchBoardRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [dispatchPlan, setDispatchPlan] = useState<DispatchPlan | null>(null);
  const [confirmedUploadBatches, setConfirmedUploadBatches] = useState<DispatchUploadBatch[]>([]);
  const [vehicleSchedules, setVehicleSchedules] = useState<VehicleSchedule[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [activeOutsourcedDrivers, setActiveOutsourcedDrivers] = useState<OutsourcedDriver[]>([]);
  const [archivedOutsourcedDrivers, setArchivedOutsourcedDrivers] = useState<OutsourcedDriver[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<DailyDeliveryInputSnapshot[]>([]);
  const [workRules, setWorkRules] = useState<DispatchWorkRule[]>([]);
  const [driverDayExceptions, setDriverDayExceptions] = useState<DriverDayException[]>([]);
  const [newScheduleVehicleId, setNewScheduleVehicleId] = useState('');
  const [newScheduleShiftSlot, setNewScheduleShiftSlot] = useState('A');
  const [newAssignmentScheduleId, setNewAssignmentScheduleId] = useState('');
  const [newAssignmentMode, setNewAssignmentMode] = useState<'internal' | 'outsourced'>('internal');
  const [newAssignmentDriverId, setNewAssignmentDriverId] = useState('');
  const [newAssignmentOutsourcedDriverId, setNewAssignmentOutsourcedDriverId] = useState('');
  const [newOutsourcedDriverName, setNewOutsourcedDriverName] = useState('');
  const [newOutsourcedDriverContactNumber, setNewOutsourcedDriverContactNumber] = useState('');
  const [newOutsourcedDriverVehicleNote, setNewOutsourcedDriverVehicleNote] = useState('');
  const [newOutsourcedDriverMemo, setNewOutsourcedDriverMemo] = useState('');
  const [editingOutsourcedDriverId, setEditingOutsourcedDriverId] = useState<string | null>(null);
  const [editingOutsourcedDriverName, setEditingOutsourcedDriverName] = useState('');
  const [editingOutsourcedDriverContactNumber, setEditingOutsourcedDriverContactNumber] = useState('');
  const [editingOutsourcedDriverVehicleNote, setEditingOutsourcedDriverVehicleNote] = useState('');
  const [editingOutsourcedDriverMemo, setEditingOutsourcedDriverMemo] = useState('');
  const [newWorkRuleName, setNewWorkRuleName] = useState('');
  const [newWorkRuleSystemKind, setNewWorkRuleSystemKind] = useState<DispatchWorkRule['system_kind']>('overtime');
  const [editingWorkRuleId, setEditingWorkRuleId] = useState<string | null>(null);
  const [editingWorkRuleName, setEditingWorkRuleName] = useState('');
  const [newExceptionDriverId, setNewExceptionDriverId] = useState('');
  const [newExceptionWorkRuleId, setNewExceptionWorkRuleId] = useState('');
  const [newExceptionMemo, setNewExceptionMemo] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!dispatchDate || !fleetRef) {
      setErrorMessage('플릿 또는 날짜 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedDispatchDate = dispatchDate;
    const selectedFleetRef = fleetRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [fleetResponse, companyResponse] = await Promise.all([
          getFleet(client, selectedFleetRef),
          listCompanies(client),
        ]);
        const [
          summaryResponse,
          boardResponse,
          planResponse,
          scheduleResponse,
          vehicleResponse,
          driverResponse,
          workRuleResponse,
          driverDayExceptionResponse,
          activeOutsourcedDriverResponse,
          archivedOutsourcedDriverResponse,
          uploadBatchResponse,
          dailySnapshotResponse,
        ] = await Promise.all([
          getDispatchSummary(client, selectedDispatchDate, fleetResponse.fleet_id),
          getDispatchBoard(client, selectedDispatchDate, fleetResponse.fleet_id),
          listDispatchPlans(client, {
            fleet_id: fleetResponse.fleet_id,
            dispatch_date: selectedDispatchDate,
          }),
          listVehicleSchedules(client, {
            fleet_id: fleetResponse.fleet_id,
            dispatch_date: selectedDispatchDate,
          }),
          listVehicleMasters(client),
          listDrivers(client),
          listDispatchWorkRules(client, { company_id: fleetResponse.company_id }),
          listDriverDayExceptions(client, {
            company_id: fleetResponse.company_id,
            fleet_id: fleetResponse.fleet_id,
            dispatch_date: selectedDispatchDate,
          }),
          listOutsourcedDrivers(client, {
            fleet_id: fleetResponse.fleet_id,
            dispatch_date: selectedDispatchDate,
            status: 'active',
          }),
          listOutsourcedDrivers(client, {
            fleet_id: fleetResponse.fleet_id,
            dispatch_date: selectedDispatchDate,
            status: 'archived',
          }),
          listDispatchUploadBatches(client, {
            company_id: fleetResponse.company_id,
            fleet_id: fleetResponse.fleet_id,
            dispatch_date: selectedDispatchDate,
            upload_status: 'confirmed',
          }),
          listDailyDeliveryInputSnapshots(client, {
            company_id: fleetResponse.company_id,
            fleet_id: fleetResponse.fleet_id,
            service_date: selectedDispatchDate,
          }),
        ]);
        if (ignore) {
          return;
        }
        setFleet(fleetResponse);
        setCompanies(companyResponse);
        setSummary(summaryResponse);
        setBoardRows(boardResponse);
        setDispatchPlan(planResponse[0] ?? null);
        setVehicleSchedules(scheduleResponse);
        setVehicles(vehicleResponse);
        setDrivers(driverResponse);
        setWorkRules(workRuleResponse);
        setDriverDayExceptions(driverDayExceptionResponse);
        setActiveOutsourcedDrivers(activeOutsourcedDriverResponse);
        setArchivedOutsourcedDrivers(archivedOutsourcedDriverResponse);
        setConfirmedUploadBatches(uploadBatchResponse);
        setDailySnapshots(dailySnapshotResponse);
        setNewScheduleVehicleId(vehicleResponse[0]?.vehicle_id ?? '');
        setNewAssignmentScheduleId(scheduleResponse[0]?.vehicle_schedule_id ?? '');
        setNewAssignmentDriverId(driverResponse[0]?.driver_id ?? '');
        setNewAssignmentMode(
          getDefaultAssignmentMode(driverResponse, activeOutsourcedDriverResponse),
        );
        setNewExceptionDriverId(getFirstPlannedInternalDriverId(boardResponse));
        setNewExceptionWorkRuleId(
          workRuleResponse.find((workRule) => workRule.system_kind !== 'working')?.work_rule_id ?? '',
        );
        setNewAssignmentOutsourcedDriverId(activeOutsourcedDriverResponse[0]?.outsourced_driver_id ?? '');
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client, dispatchDate, fleetRef]);

  const companyName = useMemo(
    () => companies.find((company) => company.company_id === fleet?.company_id)?.name ?? '미확인 회사',
    [companies, fleet],
  );
  const vehicleMap = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.vehicle_id, vehicle])),
    [vehicles],
  );
  const driverMap = useMemo(() => new Map(drivers.map((driver) => [driver.driver_id, driver])), [drivers]);
  const driverDayExceptionMap = useMemo(
    () => new Map(driverDayExceptions.map((exception) => [exception.driver_id, exception])),
    [driverDayExceptions],
  );
  const plannedInternalDrivers = useMemo(() => {
    const plannedDriverIds = new Set(
      boardRows
        .filter(
          (row) => row.planned_driver_kind === 'internal' && Boolean(row.planned_driver_id),
        )
        .map((row) => row.planned_driver_id as string),
    );

    return drivers.filter((driver) => plannedDriverIds.has(driver.driver_id));
  }, [boardRows, drivers]);
  const exceptionEligibleWorkRules = useMemo(
    () => workRules.filter((workRule) => workRule.system_kind !== 'working'),
    [workRules],
  );

  async function reloadBoard() {
    if (!fleet || !dispatchDate) {
      return;
    }

    const [
      summaryResponse,
      boardResponse,
      planResponse,
      scheduleResponse,
      workRuleResponse,
      driverDayExceptionResponse,
      activeOutsourcedDriverResponse,
      archivedOutsourcedDriverResponse,
      uploadBatchResponse,
      dailySnapshotResponse,
    ] = await Promise.all([
      getDispatchSummary(client, dispatchDate, fleet.fleet_id),
      getDispatchBoard(client, dispatchDate, fleet.fleet_id),
      listDispatchPlans(client, { fleet_id: fleet.fleet_id, dispatch_date: dispatchDate }),
      listVehicleSchedules(client, { fleet_id: fleet.fleet_id, dispatch_date: dispatchDate }),
      listDispatchWorkRules(client, { company_id: fleet.company_id }),
      listDriverDayExceptions(client, {
        company_id: fleet.company_id,
        fleet_id: fleet.fleet_id,
        dispatch_date: dispatchDate,
      }),
      listOutsourcedDrivers(client, {
        fleet_id: fleet.fleet_id,
        dispatch_date: dispatchDate,
        status: 'active',
      }),
      listOutsourcedDrivers(client, {
        fleet_id: fleet.fleet_id,
        dispatch_date: dispatchDate,
        status: 'archived',
      }),
      listDispatchUploadBatches(client, {
        company_id: fleet.company_id,
        fleet_id: fleet.fleet_id,
        dispatch_date: dispatchDate,
        upload_status: 'confirmed',
      }),
      listDailyDeliveryInputSnapshots(client, {
        company_id: fleet.company_id,
        fleet_id: fleet.fleet_id,
        service_date: dispatchDate,
      }),
    ]);
    setSummary(summaryResponse);
    setBoardRows(boardResponse);
    setDispatchPlan(planResponse[0] ?? null);
    setVehicleSchedules(scheduleResponse);
    setWorkRules(workRuleResponse);
    setDriverDayExceptions(driverDayExceptionResponse);
    setActiveOutsourcedDrivers(activeOutsourcedDriverResponse);
    setArchivedOutsourcedDrivers(archivedOutsourcedDriverResponse);
    setConfirmedUploadBatches(uploadBatchResponse);
    setDailySnapshots(dailySnapshotResponse);
    setNewAssignmentScheduleId(scheduleResponse[0]?.vehicle_schedule_id ?? '');
    setNewAssignmentMode(
      getDefaultAssignmentMode(drivers, activeOutsourcedDriverResponse),
    );
    setNewExceptionDriverId(getFirstPlannedInternalDriverId(boardResponse));
    setNewExceptionWorkRuleId(
      workRuleResponse.find((workRule) => workRule.system_kind !== 'working')?.work_rule_id ?? '',
    );
    setNewAssignmentOutsourcedDriverId(activeOutsourcedDriverResponse[0]?.outsourced_driver_id ?? '');
  }

  const draftDailySnapshotCount = dailySnapshots.filter((snapshot) => snapshot.status === 'draft').length;
  const activeDailySnapshotCount = dailySnapshots.filter((snapshot) => snapshot.status === 'active').length;
  const hasActiveDailySnapshot = activeDailySnapshotCount > 0;
  const hasDraftDailySnapshot = draftDailySnapshotCount > 0;

  async function handleBootstrapSettlementInputs() {
    if (!fleet || !dispatchDate) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await bootstrapDailySnapshotsFromDispatch(client, {
        company_id: fleet.company_id,
        fleet_id: fleet.fleet_id,
        service_date: dispatchDate,
      });
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fleet || !dispatchDate || !newScheduleVehicleId) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await createVehicleSchedule(client, {
        vehicle_id: newScheduleVehicleId,
        fleet_id: fleet.fleet_id,
        dispatch_date: dispatchDate,
        shift_slot: newScheduleShiftSlot,
        schedule_status: 'planned',
        starts_at: null,
        ends_at: null,
      });
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isInternalAssignment = newAssignmentMode === 'internal';
    if (
      !fleet ||
      !dispatchDate ||
      !newAssignmentScheduleId ||
      (isInternalAssignment ? !newAssignmentDriverId : !newAssignmentOutsourcedDriverId)
    ) {
      return;
    }
    const selectedSchedule = vehicleSchedules.find(
      (schedule) => schedule.vehicle_schedule_id === newAssignmentScheduleId,
    );
    if (!selectedSchedule) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await createDispatchAssignment(client, {
        vehicle_schedule_id: selectedSchedule.vehicle_schedule_id,
        vehicle_id: selectedSchedule.vehicle_id,
        driver_id: isInternalAssignment ? newAssignmentDriverId : null,
        outsourced_driver_id: isInternalAssignment ? null : newAssignmentOutsourcedDriverId,
        operator_company_id: fleet.company_id,
        dispatch_date: dispatchDate,
        shift_slot: selectedSchedule.shift_slot,
        assignment_status: 'assigned',
        assigned_at: createTimestamp(),
        unassigned_at: null,
      });
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateOutsourcedDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dispatchPlan || !newOutsourcedDriverName || !newOutsourcedDriverContactNumber) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await createOutsourcedDriver(client, {
        dispatch_plan_id: dispatchPlan.dispatch_plan_id,
        name: newOutsourcedDriverName,
        contact_number: newOutsourcedDriverContactNumber,
        vehicle_note: newOutsourcedDriverVehicleNote,
        memo: newOutsourcedDriverMemo,
      });
      setNewOutsourcedDriverName('');
      setNewOutsourcedDriverContactNumber('');
      setNewOutsourcedDriverVehicleNote('');
      setNewOutsourcedDriverMemo('');
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateWorkRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fleet || !newWorkRuleName) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await createDispatchWorkRule(client, {
        company_id: fleet.company_id,
        name: newWorkRuleName,
        system_kind: newWorkRuleSystemKind,
      });
      setNewWorkRuleName('');
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveWorkRule(workRuleId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await removeDispatchWorkRule(client, workRuleId);
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateWorkRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingWorkRuleId || !editingWorkRuleName) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateDispatchWorkRule(client, editingWorkRuleId, {
        name: editingWorkRuleName,
      });
      setEditingWorkRuleId(null);
      setEditingWorkRuleName('');
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateDriverDayException(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fleet || !dispatchDate || !newExceptionDriverId || !newExceptionWorkRuleId) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await createDriverDayException(client, {
        company_id: fleet.company_id,
        fleet_id: fleet.fleet_id,
        dispatch_date: dispatchDate,
        driver_id: newExceptionDriverId,
        work_rule_id: newExceptionWorkRuleId,
        memo: newExceptionMemo,
      });
      setNewExceptionMemo('');
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveDriverDayException(driverDayExceptionId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await removeDriverDayException(client, driverDayExceptionId);
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchiveOutsourcedDriver(outsourcedDriverId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await archiveOutsourcedDriver(client, outsourcedDriverId);
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateOutsourcedDriver(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingOutsourcedDriverId || !editingOutsourcedDriverName || !editingOutsourcedDriverContactNumber) {
      return;
    }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateOutsourcedDriver(client, editingOutsourcedDriverId, {
        name: editingOutsourcedDriverName,
        contact_number: editingOutsourcedDriverContactNumber,
        vehicle_note: editingOutsourcedDriverVehicleNote,
        memo: editingOutsourcedDriverMemo,
      });
      setEditingOutsourcedDriverId(null);
      setEditingOutsourcedDriverName('');
      setEditingOutsourcedDriverContactNumber('');
      setEditingOutsourcedDriverVehicleNote('');
      setEditingOutsourcedDriverMemo('');
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnassign(dispatchAssignmentId: string) {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await updateDispatchAssignment(client, dispatchAssignmentId, {
        assignment_status: 'unassigned',
        unassigned_at: createTimestamp(),
      });
      await reloadBoard();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageLayout
      actions={
        <div className="button-group">
          <button
            className="button primary"
            disabled={isSaving || !fleet || !dispatchDate}
            onClick={() => void handleBootstrapSettlementInputs()}
            type="button"
          >
            정산 입력으로 넘기기
          </button>
          <Link className="button ghost" to="/dispatch/boards">
            보드 목록
          </Link>
        </div>
      }
      subtitle="해당 날짜의 차량, 배송원, 예외를 운영합니다."
      title={fleet?.name ?? '배차 보드'}
    >
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">운영 개요</p>
            <h2>배차 문맥</h2>
          </div>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">배차 보드를 불러오는 중입니다...</p>
        ) : (
          <dl className="detail-list">
            <div>
              <dt>회사</dt>
              <dd>{companyName}</dd>
            </div>
            <div>
              <dt>플릿</dt>
              <dd>{fleet?.name ?? '-'}</dd>
            </div>
            <div>
              <dt>배차일</dt>
              <dd>{dispatchDate ?? '-'}</dd>
            </div>
            <div>
              <dt>예상 물량</dt>
              <dd>{summary?.planned_volume ?? 0}</dd>
            </div>
            <div>
              <dt>계획 배정 수</dt>
              <dd>{summary?.planned_assignment_count ?? 0}</dd>
            </div>
            <div>
              <dt>정산 입력</dt>
              <dd>
                {hasActiveDailySnapshot
                  ? '입력 준비 완료'
                  : hasDraftDailySnapshot
                    ? '입력 초안 생성'
                    : '입력 대기'}
              </dd>
            </div>
            <div>
              <dt>배차 업로드</dt>
              <dd>{confirmedUploadBatches.length ? `확정 ${confirmedUploadBatches.length}건` : '업로드 대기'}</dd>
            </div>
            <div>
              <dt>입력 초안</dt>
              <dd>{draftDailySnapshotCount}</dd>
            </div>
            <div>
              <dt>입력 준비</dt>
              <dd>{activeDailySnapshotCount}</dd>
            </div>
          </dl>
        )}
      </section>

      <DispatchUploadWizard
        client={client}
        companyId={fleet?.company_id ?? ''}
        fleetId={fleet?.fleet_id ?? ''}
        dispatchDate={dispatchDate ?? ''}
        confirmedBatches={confirmedUploadBatches}
        dispatchPlanId={dispatchPlan?.dispatch_plan_id ?? null}
        onConfirmed={reloadBoard}
      />

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">dispatch unit</p>
            <h2>차량-배송원 보드</h2>
          </div>
          {fleet && dispatchDate ? (
            <Link className="button ghost" to={`/dispatch/plans/new?fleetRef=${encodeURIComponent(fleetRef ?? '')}&dispatchDate=${encodeURIComponent(dispatchDate)}`}>
              예상 물량 입력
            </Link>
          ) : null}
        </div>
        {isLoading ? (
          <p className="empty-state">배차 row를 불러오는 중입니다...</p>
        ) : boardRows.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>차량</th>
                <th>기사</th>
                <th>현재 기사</th>
                <th>슬롯</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {boardRows.map((row) => {
                const vehicle = row.vehicle_id ? vehicleMap.get(row.vehicle_id) : null;
                const driver = row.planned_driver_id ? driverMap.get(row.planned_driver_id) : null;
                const dayException =
                  row.planned_driver_kind === 'internal' && row.planned_driver_id
                    ? driverDayExceptionMap.get(row.planned_driver_id)
                    : undefined;
                const plannedDriverLabel =
                  row.planned_driver_kind === 'outsourced'
                    ? `용차 · ${row.planned_driver_name ?? '미배정'}`
                    : row.planned_driver_name ?? '미배정';

                return (
                  <tr key={`${row.vehicle_schedule_id ?? 'unplanned'}:${row.vehicle_id ?? 'none'}:${row.shift_slot ?? '-'}`}>
                    <td>
                      <div className="stack tight">
                        <span>{row.plate_number ?? '미지정 차량'}</span>
                        {vehicle?.route_no != null ? (
                          <Link className="inline-link" to={`/vehicles/${getVehicleRouteRef(vehicle)}`}>
                            차량 관리로 이동
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="stack tight">
                        <span>{plannedDriverLabel}</span>
                        {dayException ? (
                          <span className="status-badge">
                            {dayException.work_rule.name} · {formatWorkRuleKindLabel(dayException.work_rule.system_kind)}
                          </span>
                        ) : null}
                        {row.planned_driver_kind === 'internal' && driver?.route_no != null ? (
                          <Link className="inline-link" to={`/drivers/${getDriverRouteRef(driver)}`}>
                            배송원 관리로 이동
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td>{row.current_driver_name ?? '-'}</td>
                    <td>{row.shift_slot ?? '-'}</td>
                    <td>{row.dispatch_status}</td>
                    <td>
                      {row.dispatch_assignment_id ? (
                        <button
                          className="button ghost small"
                          disabled={isSaving}
                          onClick={() => void handleUnassign(row.dispatch_assignment_id as string)}
                          type="button"
                        >
                          배정 해제
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">해당 날짜의 배차 row가 없습니다.</p>
        )}
      </section>

      <div className="data-grid two-columns relationship-grid">
        <section className="panel form-panel">
          <div className="panel-header">
            <p className="panel-kicker">차량 슬롯 추가</p>
            <h2>vehicle schedule 생성</h2>
          </div>
          <form className="form-stack" onSubmit={handleCreateSchedule}>
            <label className="field">
              <span>차량</span>
              <select onChange={(event) => setNewScheduleVehicleId(event.target.value)} value={newScheduleVehicleId}>
                <option value="">차량 선택</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                    {vehicle.plate_number}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>슬롯</span>
              <input onChange={(event) => setNewScheduleShiftSlot(event.target.value)} value={newScheduleShiftSlot} />
            </label>
            <div className="form-actions">
              <button className="button primary" disabled={isSaving || !newScheduleVehicleId} type="submit">
                차량 슬롯 추가
              </button>
            </div>
          </form>
        </section>

        <section className="panel form-panel">
          <div className="panel-header">
            <p className="panel-kicker">근무 규칙</p>
            <h2>회사 규칙 생성</h2>
          </div>
          <form className="form-stack" onSubmit={handleCreateWorkRule}>
            <label className="field">
              <span>근무 규칙 이름</span>
              <input onChange={(event) => setNewWorkRuleName(event.target.value)} value={newWorkRuleName} />
            </label>
            <label className="field">
              <span>근무 의미</span>
              <select
                aria-label="근무 의미"
                onChange={(event) => setNewWorkRuleSystemKind(event.target.value as DispatchWorkRule['system_kind'])}
                value={newWorkRuleSystemKind}
              >
                <option value="working">출근</option>
                <option value="day_off">휴무</option>
                <option value="overtime">특근</option>
              </select>
            </label>
            <div className="form-actions">
              <button className="button primary" disabled={isSaving || !fleet || !newWorkRuleName} type="submit">
                근무 규칙 추가
              </button>
            </div>
          </form>
          <p className="helper-text">회사 규칙명은 자유롭게 정하되, 시스템 의미는 반드시 출근/휴무/특근에 매핑됩니다.</p>
          <div className="stack tight">
            {workRules.length ? (
              workRules.map((workRule) => (
                <div className="list-card" key={workRule.work_rule_id}>
                  <div className="list-card-header">
                    <div>
                      <h3>{workRule.name}</h3>
                      <p>{formatWorkRuleKindLabel(workRule.system_kind)}</p>
                    </div>
                    <div className="button-group">
                      <button
                        className="button ghost small"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingWorkRuleId(workRule.work_rule_id);
                          setEditingWorkRuleName(workRule.name);
                        }}
                        type="button"
                      >
                        근무 규칙 이름 수정
                      </button>
                      <button
                        className="button ghost small"
                        disabled={isSaving || workRule.is_in_use}
                        onClick={() => void handleRemoveWorkRule(workRule.work_rule_id)}
                        type="button"
                      >
                        근무 규칙 삭제
                      </button>
                    </div>
                  </div>
                  {workRule.is_in_use ? <p>예외에서 사용 중</p> : null}
                  {editingWorkRuleId === workRule.work_rule_id ? (
                    <form className="inline-form" onSubmit={handleUpdateWorkRule}>
                      <label className="field">
                        <span>수정 규칙 이름</span>
                        <input
                          onChange={(event) => setEditingWorkRuleName(event.target.value)}
                          value={editingWorkRuleName}
                        />
                      </label>
                      <div className="form-actions">
                        <button
                          className="button primary small"
                          disabled={isSaving || !editingWorkRuleName}
                          type="submit"
                        >
                          근무 규칙 수정 저장
                        </button>
                        <button
                          className="button ghost small"
                          disabled={isSaving}
                          onClick={() => {
                            setEditingWorkRuleId(null);
                            setEditingWorkRuleName('');
                          }}
                          type="button"
                        >
                          수정 취소
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="empty-state">등록된 회사 근무 규칙이 없습니다.</p>
            )}
          </div>
        </section>

        <section className="panel form-panel">
          <div className="panel-header">
            <p className="panel-kicker">날짜 예외</p>
            <h2>기사 근무 예외 입력</h2>
          </div>
          <p className="helper-text">일반 휴무는 따로 저장하지 않고, 해당 날짜에 계획된 내부 기사에게만 예외를 입력합니다.</p>
          <form className="form-stack" onSubmit={handleCreateDriverDayException}>
            <label className="field">
              <span>예외 배송원</span>
              <select onChange={(event) => setNewExceptionDriverId(event.target.value)} value={newExceptionDriverId}>
                <option value="">배송원 선택</option>
                {plannedInternalDrivers.map((driver) => (
                  <option key={driver.driver_id} value={driver.driver_id}>
                    {driver.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>적용 규칙</span>
              <select onChange={(event) => setNewExceptionWorkRuleId(event.target.value)} value={newExceptionWorkRuleId}>
                <option value="">규칙 선택</option>
                {exceptionEligibleWorkRules.map((workRule) => (
                  <option key={workRule.work_rule_id} value={workRule.work_rule_id}>
                    {workRule.name} · {formatWorkRuleKindLabel(workRule.system_kind)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>예외 메모</span>
              <textarea onChange={(event) => setNewExceptionMemo(event.target.value)} value={newExceptionMemo} />
            </label>
            <div className="form-actions">
              <button
                className="button primary"
                disabled={isSaving || !newExceptionDriverId || !newExceptionWorkRuleId}
                type="submit"
              >
                날짜 예외 추가
              </button>
            </div>
          </form>
          <div className="stack tight">
            {driverDayExceptions.length ? (
              driverDayExceptions.map((exception) => (
                <div className="list-card" key={exception.driver_day_exception_id}>
                  <div className="list-card-header">
                    <div>
                      <h3>{driverMap.get(exception.driver_id)?.name ?? exception.driver_id}</h3>
                      <p>
                        {exception.work_rule.name} · {formatWorkRuleKindLabel(exception.work_rule.system_kind)}
                      </p>
                    </div>
                    <button
                      className="button ghost small"
                      disabled={isSaving}
                      onClick={() => void handleRemoveDriverDayException(exception.driver_day_exception_id)}
                      type="button"
                    >
                      날짜 예외 삭제
                    </button>
                  </div>
                  {exception.memo ? <p>{exception.memo}</p> : null}
                </div>
              ))
            ) : (
              <p className="empty-state">등록된 날짜 예외가 없습니다.</p>
            )}
          </div>
        </section>

        <section className="panel form-panel">
          <div className="panel-header">
            <p className="panel-kicker">용차 기사</p>
            <h2>외부 배송인력 입력</h2>
          </div>
          <form className="form-stack" onSubmit={handleCreateOutsourcedDriver}>
            <label className="field">
              <span>용차 기사 이름</span>
              <input onChange={(event) => setNewOutsourcedDriverName(event.target.value)} value={newOutsourcedDriverName} />
            </label>
            <label className="field">
              <span>연락처</span>
              <input
                onChange={(event) => setNewOutsourcedDriverContactNumber(event.target.value)}
                value={newOutsourcedDriverContactNumber}
              />
            </label>
            <label className="field">
              <span>차량/차종 메모</span>
              <input
                onChange={(event) => setNewOutsourcedDriverVehicleNote(event.target.value)}
                value={newOutsourcedDriverVehicleNote}
              />
            </label>
            <label className="field">
              <span>메모</span>
              <textarea onChange={(event) => setNewOutsourcedDriverMemo(event.target.value)} value={newOutsourcedDriverMemo} />
            </label>
            <div className="form-actions">
              <button
                className="button primary"
                disabled={isSaving || !dispatchPlan || !newOutsourcedDriverName || !newOutsourcedDriverContactNumber}
                type="submit"
              >
                용차 기사 추가
              </button>
            </div>
          </form>
          <div className="stack tight">
            {activeOutsourcedDrivers.length ? (
              activeOutsourcedDrivers.map((outsourcedDriver) => (
                <div className="list-card" key={outsourcedDriver.outsourced_driver_id}>
                  <div className="list-card-header">
                    <div>
                      <h3>{outsourcedDriver.name}</h3>
                      <p>{outsourcedDriver.contact_number}</p>
                    </div>
                    <div className="button-group">
                      <button
                        className="button ghost small"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingOutsourcedDriverId(outsourcedDriver.outsourced_driver_id);
                          setEditingOutsourcedDriverName(outsourcedDriver.name);
                          setEditingOutsourcedDriverContactNumber(outsourcedDriver.contact_number);
                          setEditingOutsourcedDriverVehicleNote(outsourcedDriver.vehicle_note);
                          setEditingOutsourcedDriverMemo(outsourcedDriver.memo);
                        }}
                        type="button"
                      >
                        용차 기사 수정
                      </button>
                      <button
                        className="button ghost small"
                        disabled={isSaving || !(outsourcedDriver.is_archivable ?? false)}
                        onClick={() => void handleArchiveOutsourcedDriver(outsourcedDriver.outsourced_driver_id)}
                        type="button"
                      >
                        용차 기사 아카이브
                      </button>
                    </div>
                  </div>
                  <p>
                    {outsourcedDriver.is_archivable
                      ? '정산 입력 스냅샷 완료 · 아카이브 가능'
                      : '정산 입력 스냅샷 후 아카이브 가능'}
                  </p>
                  {outsourcedDriver.vehicle_note ? <p>차량/차종: {outsourcedDriver.vehicle_note}</p> : null}
                  {outsourcedDriver.memo ? <p>메모: {outsourcedDriver.memo}</p> : null}
                  {editingOutsourcedDriverId === outsourcedDriver.outsourced_driver_id ? (
                    <form className="inline-form" onSubmit={handleUpdateOutsourcedDriver}>
                      <label className="field">
                        <span>수정 용차 기사 이름</span>
                        <input
                          onChange={(event) => setEditingOutsourcedDriverName(event.target.value)}
                          value={editingOutsourcedDriverName}
                        />
                      </label>
                      <label className="field">
                        <span>수정 연락처</span>
                        <input
                          onChange={(event) => setEditingOutsourcedDriverContactNumber(event.target.value)}
                          value={editingOutsourcedDriverContactNumber}
                        />
                      </label>
                      <label className="field">
                        <span>수정 차량/차종 메모</span>
                        <input
                          onChange={(event) => setEditingOutsourcedDriverVehicleNote(event.target.value)}
                          value={editingOutsourcedDriverVehicleNote}
                        />
                      </label>
                      <label className="field">
                        <span>수정 메모</span>
                        <textarea
                          onChange={(event) => setEditingOutsourcedDriverMemo(event.target.value)}
                          value={editingOutsourcedDriverMemo}
                        />
                      </label>
                      <div className="form-actions">
                        <button
                          className="button primary small"
                          disabled={isSaving || !editingOutsourcedDriverName || !editingOutsourcedDriverContactNumber}
                          type="submit"
                        >
                          용차 기사 수정 저장
                        </button>
                        <button
                          className="button ghost small"
                          disabled={isSaving}
                          onClick={() => {
                            setEditingOutsourcedDriverId(null);
                            setEditingOutsourcedDriverName('');
                            setEditingOutsourcedDriverContactNumber('');
                            setEditingOutsourcedDriverVehicleNote('');
                            setEditingOutsourcedDriverMemo('');
                          }}
                          type="button"
                        >
                          수정 취소
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="empty-state">등록된 용차 기사가 없습니다.</p>
            )}
            {archivedOutsourcedDrivers.length ? (
              <div className="stack tight">
                <p className="helper-text">아카이브된 용차 기사</p>
                {archivedOutsourcedDrivers.map((outsourcedDriver) => (
                  <div className="list-card" key={outsourcedDriver.outsourced_driver_id}>
                    <div className="list-card-header">
                      <div>
                        <h3>{outsourcedDriver.name}</h3>
                        <p>{outsourcedDriver.contact_number}</p>
                      </div>
                      <span className="status-badge">아카이브됨</span>
                    </div>
                    {outsourcedDriver.archived_at ? <p>아카이브 시각: {outsourcedDriver.archived_at}</p> : null}
                    {outsourcedDriver.vehicle_note ? <p>차량/차종: {outsourcedDriver.vehicle_note}</p> : null}
                    {outsourcedDriver.memo ? <p>메모: {outsourcedDriver.memo}</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel form-panel">
          <div className="panel-header">
            <p className="panel-kicker">기사 배정</p>
            <h2>dispatch assignment 생성</h2>
          </div>
          <form className="form-stack" onSubmit={handleCreateAssignment}>
            <label className="field">
              <span>차량 슬롯</span>
              <select
                onChange={(event) => setNewAssignmentScheduleId(event.target.value)}
                value={newAssignmentScheduleId}
              >
                <option value="">차량 슬롯 선택</option>
                {vehicleSchedules.map((schedule) => (
                  <option key={schedule.vehicle_schedule_id} value={schedule.vehicle_schedule_id}>
                    {schedule.shift_slot} / {vehicleMap.get(schedule.vehicle_id)?.plate_number ?? schedule.vehicle_id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>배정 대상</span>
              <div className="inline-actions">
                <label>
                  <input
                    checked={newAssignmentMode === 'internal'}
                    name="assignment-target-type"
                    onChange={() => setNewAssignmentMode('internal')}
                    type="radio"
                  />
                  내부 배송원
                </label>
                <label aria-label="용차 기사 배정">
                  <input
                    checked={newAssignmentMode === 'outsourced'}
                    name="assignment-target-type"
                    onChange={() => setNewAssignmentMode('outsourced')}
                    type="radio"
                  />
                  용차 기사
                </label>
              </div>
            </label>
            {newAssignmentMode === 'internal' ? (
              <label className="field">
                <span>배송원</span>
                <select onChange={(event) => setNewAssignmentDriverId(event.target.value)} value={newAssignmentDriverId}>
                  <option value="">배송원 선택</option>
                  {drivers.map((driver) => (
                    <option key={driver.driver_id} value={driver.driver_id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="field">
                <span>용차 기사 선택</span>
                <select
                  aria-label="용차 기사 선택"
                  onChange={(event) => setNewAssignmentOutsourcedDriverId(event.target.value)}
                  value={newAssignmentOutsourcedDriverId}
                >
                  <option value="">용차 기사 선택</option>
                  {activeOutsourcedDrivers.map((outsourcedDriver) => (
                    <option key={outsourcedDriver.outsourced_driver_id} value={outsourcedDriver.outsourced_driver_id}>
                      {outsourcedDriver.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="form-actions">
              <button
                className="button primary"
                disabled={
                  isSaving ||
                  !newAssignmentScheduleId ||
                  (newAssignmentMode === 'internal'
                    ? !newAssignmentDriverId
                    : !newAssignmentOutsourcedDriverId)
                }
                type="submit"
              >
                기사 배정 추가
              </button>
            </div>
          </form>
        </section>
      </div>
    </PageLayout>
  );
}
