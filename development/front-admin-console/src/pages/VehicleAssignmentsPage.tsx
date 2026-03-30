import { useEffect, useState, type FormEvent } from 'react';

import { createAssignment, listAssignments, updateAssignment } from '../api/assignments';
import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import type { Company, DriverProfile, DriverVehicleAssignment, VehicleMaster } from '../types';
import { listVehicleMasters } from '../api/vehicles';
import { formatAssignmentStatusLabel } from '../uiLabels';

type VehicleAssignmentsPageProps = {
  client: HttpClient;
};

type AssignmentFormState = {
  driver_id: string;
  vehicle_id: string;
  operator_company_id: string;
};

function createEmptyAssignmentForm(
  driverId = '',
  vehicleId = '',
  companyId = '',
): AssignmentFormState {
  return {
    driver_id: driverId,
    vehicle_id: vehicleId,
    operator_company_id: companyId,
  };
}

function createTimestamp() {
  return new Date().toISOString();
}

export function VehicleAssignmentsPage({ client }: VehicleAssignmentsPageProps) {
  const [assignments, setAssignments] = useState<DriverVehicleAssignment[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [vehicleMasters, setVehicleMasters] = useState<VehicleMaster[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<AssignmentFormState>(createEmptyAssignmentForm());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshAssignments() {
    const response = await listAssignments(client);
    setAssignments(response);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [response, driverResponse, vehicleResponse, companyResponse] = await Promise.all([
          listAssignments(client),
          listDrivers(client),
          listVehicleMasters(client),
          listCompanies(client),
        ]);
        if (!ignore) {
          setAssignments(response);
          setDrivers(driverResponse);
          setVehicleMasters(vehicleResponse);
          setCompanies(companyResponse);
          setForm((current) => ({
            driver_id: current.driver_id || driverResponse[0]?.driver_id || '',
            vehicle_id: current.vehicle_id || vehicleResponse[0]?.vehicle_id || '',
            operator_company_id: current.operator_company_id || companyResponse[0]?.company_id || '',
          }));
        }
      } catch (error) {
        if (!ignore) {
          setAssignments([]);
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
  }, [client]);

  function getDriverName(driverId: string) {
    return drivers.find((driver) => driver.driver_id === driverId)?.name ?? '미확인 배송원';
  }

  function getVehicleLabel(vehicleId: string) {
    return vehicleMasters.find((vehicle) => vehicle.vehicle_id === vehicleId)?.plate_number ?? '미확인 차량';
  }

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function resetForm() {
    setForm(
      createEmptyAssignmentForm(
        drivers[0]?.driver_id ?? '',
        vehicleMasters[0]?.vehicle_id ?? '',
        companies[0]?.company_id ?? '',
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createAssignment(client, {
        driver_id: form.driver_id.trim(),
        vehicle_id: form.vehicle_id.trim(),
        operator_company_id: form.operator_company_id.trim(),
        assignment_status: 'assigned',
        assigned_at: createTimestamp(),
        unassigned_at: null,
      });
      await refreshAssignments();
      resetForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleUnassign(driverVehicleAssignmentId: string) {
    setErrorMessage(null);
    try {
      await updateAssignment(client, driverVehicleAssignmentId, {
        assignment_status: 'unassigned',
      });
      await refreshAssignments();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="data-grid two-columns wide-left">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">배송원 배정 관리</p>
          <h2>배정 생성</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>배송원</span>
            <select onChange={(event) => setForm((current) => ({ ...current, driver_id: event.target.value }))} value={form.driver_id}>
              {drivers.map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>차량</span>
            <select onChange={(event) => setForm((current) => ({ ...current, vehicle_id: event.target.value }))} value={form.vehicle_id}>
              {vehicleMasters.map((vehicle) => (
                <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                  {vehicle.plate_number}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>운영사 회사</span>
            <select onChange={(event) => setForm((current) => ({ ...current, operator_company_id: event.target.value }))} value={form.operator_company_id}>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              배정 생성
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">배정 레지스트리</p>
          <h2>배정 목록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">배정 정보를 불러오는 중입니다...</p>
        ) : errorMessage ? null : assignments.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>배송원</th>
                <th>차량</th>
                <th>운영사</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.driver_vehicle_assignment_id}>
                  <td>{getDriverName(assignment.driver_id)}</td>
                  <td>{getVehicleLabel(assignment.vehicle_id)}</td>
                  <td>{getCompanyName(assignment.operator_company_id)}</td>
                  <td>{formatAssignmentStatusLabel(assignment.assignment_status)}</td>
                  <td>
                    {assignment.assignment_status === 'assigned' ? (
                      <button
                        className="button ghost small"
                        onClick={() => void handleUnassign(assignment.driver_vehicle_assignment_id)}
                        type="button"
                      >
                        배정 해제
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 배정 정보가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
