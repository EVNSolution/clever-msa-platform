import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  createDispatchAssignment,
  createVehicleSchedule,
  listVehicleSchedules,
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
  DispatchBoardRow,
  DispatchBoardSummary,
  DriverProfile,
  Fleet,
  VehicleMaster,
  VehicleSchedule,
} from '../types';

type DispatchBoardDetailPageProps = {
  client: HttpClient;
};

function createTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function DispatchBoardDetailPage({ client }: DispatchBoardDetailPageProps) {
  const { dispatchDate, fleetRef } = useParams();
  const [summary, setSummary] = useState<DispatchBoardSummary | null>(null);
  const [boardRows, setBoardRows] = useState<DispatchBoardRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleet, setFleet] = useState<Fleet | null>(null);
  const [vehicleSchedules, setVehicleSchedules] = useState<VehicleSchedule[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMaster[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [newScheduleVehicleId, setNewScheduleVehicleId] = useState('');
  const [newScheduleShiftSlot, setNewScheduleShiftSlot] = useState('A');
  const [newAssignmentScheduleId, setNewAssignmentScheduleId] = useState('');
  const [newAssignmentDriverId, setNewAssignmentDriverId] = useState('');
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
        const [summaryResponse, boardResponse, scheduleResponse, vehicleResponse, driverResponse] =
          await Promise.all([
            getDispatchSummary(client, selectedDispatchDate, fleetResponse.fleet_id),
            getDispatchBoard(client, selectedDispatchDate, fleetResponse.fleet_id),
            listVehicleSchedules(client, {
              fleet_id: fleetResponse.fleet_id,
              dispatch_date: selectedDispatchDate,
            }),
            listVehicleMasters(client),
            listDrivers(client),
          ]);
        if (ignore) {
          return;
        }
        setFleet(fleetResponse);
        setCompanies(companyResponse);
        setSummary(summaryResponse);
        setBoardRows(boardResponse);
        setVehicleSchedules(scheduleResponse);
        setVehicles(vehicleResponse);
        setDrivers(driverResponse);
        setNewScheduleVehicleId(vehicleResponse[0]?.vehicle_id ?? '');
        setNewAssignmentScheduleId(scheduleResponse[0]?.vehicle_schedule_id ?? '');
        setNewAssignmentDriverId(driverResponse[0]?.driver_id ?? '');
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

  async function reloadBoard() {
    if (!fleet || !dispatchDate) {
      return;
    }

    const [summaryResponse, boardResponse, scheduleResponse] = await Promise.all([
      getDispatchSummary(client, dispatchDate, fleet.fleet_id),
      getDispatchBoard(client, dispatchDate, fleet.fleet_id),
      listVehicleSchedules(client, { fleet_id: fleet.fleet_id, dispatch_date: dispatchDate }),
    ]);
    setSummary(summaryResponse);
    setBoardRows(boardResponse);
    setVehicleSchedules(scheduleResponse);
    setNewAssignmentScheduleId(scheduleResponse[0]?.vehicle_schedule_id ?? '');
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
    if (!fleet || !dispatchDate || !newAssignmentScheduleId || !newAssignmentDriverId) {
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
        driver_id: newAssignmentDriverId,
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
    <div className="stack">
      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">배차 보드 상세</p>
            <h2>{fleet?.name ?? '배차 보드'}</h2>
          </div>
          <Link className="button ghost" to="/dispatch/boards">
            보드 목록
          </Link>
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
          </dl>
        )}
      </section>

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
                        <span>{row.planned_driver_name ?? '미배정'}</span>
                        {driver?.route_no != null ? (
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
            <div className="form-actions">
              <button
                className="button primary"
                disabled={isSaving || !newAssignmentScheduleId || !newAssignmentDriverId}
                type="submit"
              >
                기사 배정 추가
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
