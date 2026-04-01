import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getAssignment, updateAssignment } from '../api/assignments';
import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { listVehicleMasters } from '../api/vehicles';
import { getDriverRouteRef, getVehicleRouteRef } from '../routeRefs';
import type { Company, DriverProfile, DriverVehicleAssignment, VehicleMaster } from '../types';
import { formatAssignmentStatusLabel } from '../uiLabels';

type VehicleAssignmentDetailPageProps = {
  client: HttpClient;
};

export function VehicleAssignmentDetailPage({ client }: VehicleAssignmentDetailPageProps) {
  const { assignmentRef } = useParams();
  const [assignment, setAssignment] = useState<DriverVehicleAssignment | null>(null);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [vehicleMasters, setVehicleMasters] = useState<VehicleMaster[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!assignmentRef) {
      setErrorMessage('배정 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedAssignmentRef = assignmentRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [assignmentResponse, driverResponse, vehicleResponse, companyResponse] =
          await Promise.all([
            getAssignment(client, selectedAssignmentRef),
            listDrivers(client),
            listVehicleMasters(client),
            listCompanies(client),
          ]);
        if (ignore) {
          return;
        }
        setAssignment(assignmentResponse);
        setDrivers(driverResponse);
        setVehicleMasters(vehicleResponse);
        setCompanies(companyResponse);
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
  }, [assignmentRef, client]);

  function getDriver() {
    return drivers.find((driver) => driver.driver_id === assignment?.driver_id) ?? null;
  }

  function getVehicle() {
    return vehicleMasters.find((vehicle) => vehicle.vehicle_id === assignment?.vehicle_id) ?? null;
  }

  function getCompany() {
    return companies.find((company) => company.company_id === assignment?.operator_company_id) ?? null;
  }

  async function handleUnassign() {
    if (!assignmentRef || !assignment || assignment.assignment_status !== 'assigned') {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    try {
      const updated = await updateAssignment(client, assignmentRef, {
        assignment_status: 'unassigned',
      });
      setAssignment(updated);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const driver = getDriver();
  const vehicle = getVehicle();
  const company = getCompany();

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">배정 상세</p>
          <h2>배정 상세</h2>
        </div>
        <div className="inline-actions">
          {assignmentRef ? (
            <Link className="button ghost" to={`/vehicle-assignments/${assignmentRef}/edit`}>
              배정 수정
            </Link>
          ) : null}
          {assignment?.assignment_status === 'assigned' ? (
            <button
              className="button ghost"
              disabled={isSaving}
              onClick={() => void handleUnassign()}
              type="button"
            >
              {isSaving ? '처리 중...' : '배정 해제'}
            </button>
          ) : null}
        </div>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">배정 정보를 불러오는 중입니다...</p>
      ) : assignment ? (
        <div className="stack">
          <dl className="detail-list">
            <div>
              <dt>배송원</dt>
              <dd>{driver?.name ?? '미확인 배송원'}</dd>
            </div>
            <div>
              <dt>차량</dt>
              <dd>{vehicle?.plate_number ?? '미확인 차량'}</dd>
            </div>
            <div>
              <dt>운영사</dt>
              <dd>{company?.name ?? '미확인 회사'}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd>{formatAssignmentStatusLabel(assignment.assignment_status)}</dd>
            </div>
            <div>
              <dt>배정 시각</dt>
              <dd>{assignment.assigned_at}</dd>
            </div>
            <div>
              <dt>해제 시각</dt>
              <dd>{assignment.unassigned_at ?? '미해제'}</dd>
            </div>
          </dl>
          <div className="page-actions">
            {driver?.route_no != null ? (
              <Link className="button ghost" to={`/drivers/${getDriverRouteRef(driver)}`}>
                배송원 상세
              </Link>
            ) : null}
            {vehicle?.route_no != null ? (
              <Link className="button ghost" to={`/vehicles/${getVehicleRouteRef(vehicle)}`}>
                차량 상세
              </Link>
            ) : null}
            <Link className="button ghost" to="/vehicle-assignments">
              목록으로
            </Link>
          </div>
        </div>
      ) : (
        <p className="empty-state">배정 정보를 찾을 수 없습니다.</p>
      )}
    </section>
  );
}
