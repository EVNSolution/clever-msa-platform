import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  createAssignment,
  getAssignment,
  updateAssignment,
  type DriverVehicleAssignmentPayload,
} from '../api/assignments';
import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { listVehicleMasters } from '../api/vehicles';
import { PageLayout } from '../components/PageLayout';
import { getAssignmentRouteRef } from '../routeRefs';
import type { Company, DriverProfile, DriverVehicleAssignment, VehicleMaster } from '../types';

type VehicleAssignmentFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

function createTimestamp() {
  return new Date().toISOString();
}

function createEmptyForm(
  drivers: DriverProfile[],
  vehicles: VehicleMaster[],
  companies: Company[],
): DriverVehicleAssignmentPayload {
  return {
    driver_id: drivers[0]?.driver_id ?? '',
    vehicle_id: vehicles[0]?.vehicle_id ?? '',
    operator_company_id: companies[0]?.company_id ?? '',
    assignment_status: 'assigned',
    assigned_at: createTimestamp(),
    unassigned_at: null,
  };
}

export function VehicleAssignmentFormPage({ client, mode }: VehicleAssignmentFormPageProps) {
  const navigate = useNavigate();
  const { assignmentRef } = useParams();
  const isEdit = mode === 'edit';
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [vehicleMasters, setVehicleMasters] = useState<VehicleMaster[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState<DriverVehicleAssignmentPayload>(
    createEmptyForm([], [], []),
  );
  const [assignment, setAssignment] = useState<DriverVehicleAssignment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const selectedAssignmentRef = assignmentRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [driverResponse, vehicleResponse, companyResponse, assignmentResponse] =
          await Promise.all([
            listDrivers(client),
            listVehicleMasters(client),
            listCompanies(client),
            isEdit && selectedAssignmentRef
              ? getAssignment(client, selectedAssignmentRef)
              : Promise.resolve(null),
          ]);
        if (ignore) {
          return;
        }

        setDrivers(driverResponse);
        setVehicleMasters(vehicleResponse);
        setCompanies(companyResponse);

        if (assignmentResponse) {
          setAssignment(assignmentResponse);
          setForm({
            driver_id: assignmentResponse.driver_id,
            vehicle_id: assignmentResponse.vehicle_id,
            operator_company_id: assignmentResponse.operator_company_id,
            assignment_status: assignmentResponse.assignment_status,
            assigned_at: assignmentResponse.assigned_at,
            unassigned_at: assignmentResponse.unassigned_at,
          });
          return;
        }

        setForm(createEmptyForm(driverResponse, vehicleResponse, companyResponse));
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

    if (isEdit && !selectedAssignmentRef) {
      setErrorMessage('배정 경로 키가 없습니다.');
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [assignmentRef, client, isEdit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isEdit && assignmentRef) {
        const updated = await updateAssignment(client, assignmentRef, form);
        navigate(`/vehicle-assignments/${getAssignmentRouteRef(updated)}`);
        return;
      }

      const created = await createAssignment(client, form);
      navigate(`/vehicle-assignments/${getAssignmentRouteRef(created)}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && assignmentRef ? `/vehicle-assignments/${assignmentRef}` : '/vehicle-assignments';

  return (
    <PageLayout
      subtitle="배송원과 차량 연결 상태를 같은 입력 흐름에서 관리합니다."
      title={isEdit ? '배정 수정' : '배정 생성'}
    >
      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">배정 입력</p>
          <h2>배정 기본 정보 입력</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">배정 정보를 불러오는 중입니다...</p>
        ) : (
          <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>배송원</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, driver_id: event.target.value }))}
              value={form.driver_id}
            >
              {drivers.map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>차량</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, vehicle_id: event.target.value }))}
              value={form.vehicle_id}
            >
              {vehicleMasters.map((vehicle) => (
                <option key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                  {vehicle.plate_number}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>운영사 회사</span>
            <select
              onChange={(event) =>
                setForm((current) => ({ ...current, operator_company_id: event.target.value }))
              }
              value={form.operator_company_id}
            >
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>상태</span>
            <input readOnly value={form.assignment_status} />
          </label>
          <label className="field">
            <span>배정 시각</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, assigned_at: event.target.value }))
              }
              value={form.assigned_at}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '배정 수정' : '배정 생성'}
            </button>
            <Link className="button ghost" to={cancelHref}>
              취소
            </Link>
          </div>
          </form>
        )}
      </section>
    </PageLayout>
  );
}
