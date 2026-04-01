import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listAssignments } from '../api/assignments';
import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { listVehicleMasters } from '../api/vehicles';
import { getAssignmentRouteRef } from '../routeRefs';
import type { Company, DriverProfile, DriverVehicleAssignment, VehicleMaster } from '../types';
import { formatAssignmentStatusLabel } from '../uiLabels';

type VehicleAssignmentsPageProps = {
  client: HttpClient;
};

export function VehicleAssignmentsPage({ client }: VehicleAssignmentsPageProps) {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<DriverVehicleAssignment[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [vehicleMasters, setVehicleMasters] = useState<VehicleMaster[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [assignmentResponse, driverResponse, vehicleResponse, companyResponse] =
          await Promise.all([
            listAssignments(client),
            listDrivers(client),
            listVehicleMasters(client),
            listCompanies(client),
          ]);
        if (ignore) {
          return;
        }
        setAssignments(assignmentResponse);
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
  }, [client]);

  function getDriverName(driverId: string) {
    return drivers.find((driver) => driver.driver_id === driverId)?.name ?? '미확인 배송원';
  }

  function getVehicleLabel(vehicleId: string) {
    return (
      vehicleMasters.find((vehicle) => vehicle.vehicle_id === vehicleId)?.plate_number ??
      '미확인 차량'
    );
  }

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function handleRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    detailPath: string,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
  }

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">배정 레지스트리</p>
          <h2>차량 배정 목록</h2>
        </div>
        <Link className="button primary" to="/vehicle-assignments/new">
          배정 생성
        </Link>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">배정 정보를 불러오는 중입니다...</p>
      ) : assignments.length ? (
        <table className="table compact">
          <thead>
            <tr>
              <th>배송원</th>
              <th>차량</th>
              <th>운영사</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => {
              const detailPath =
                assignment.route_no != null
                  ? `/vehicle-assignments/${getAssignmentRouteRef(assignment)}`
                  : null;

              return (
                <tr
                  key={assignment.driver_vehicle_assignment_id}
                  className={detailPath ? 'interactive-row' : undefined}
                  data-detail-path={detailPath ?? undefined}
                  onClick={detailPath ? () => navigate(detailPath) : undefined}
                  onKeyDown={
                    detailPath ? (event) => handleRowKeyDown(event, detailPath) : undefined
                  }
                  tabIndex={detailPath ? 0 : undefined}
                >
                  <td>{getDriverName(assignment.driver_id)}</td>
                  <td>{getVehicleLabel(assignment.vehicle_id)}</td>
                  <td>{getCompanyName(assignment.operator_company_id)}</td>
                  <td>{formatAssignmentStatusLabel(assignment.assignment_status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">등록된 배정 정보가 없습니다.</p>
      )}
    </section>
  );
}
