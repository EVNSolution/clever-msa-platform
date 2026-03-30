import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listVehicleMasters } from '../api/vehicles';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { getVehicleRouteRef } from '../routeRefs';
import type { Company, VehicleMaster } from '../types';
import { formatLifecycleStatusLabel } from '../uiLabels';

type VehiclesPageProps = {
  client: HttpClient;
};

export function VehiclesPage({ client }: VehiclesPageProps) {
  const navigate = useNavigate();
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
        const [masters, companyResponse] = await Promise.all([
          listVehicleMasters(client),
          listCompanies(client),
        ]);
        if (ignore) {
          return;
        }
        setVehicleMasters(masters);
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

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
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
          <p className="panel-kicker">차량 목록</p>
          <h2>차량 마스터 관리자 조회</h2>
        </div>
        <Link className="button primary" to="/vehicles/new">
          차량 생성
        </Link>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">차량 마스터를 불러오는 중입니다...</p>
      ) : vehicleMasters.length ? (
        <table className="table compact">
          <thead>
            <tr>
              <th>번호판</th>
              <th>모델명</th>
              <th>제조사</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {vehicleMasters.map((vehicle) => {
              const detailPath = vehicle.route_no != null ? `/vehicles/${getVehicleRouteRef(vehicle)}` : null;

              return (
                <tr
                  key={vehicle.vehicle_id}
                  className={detailPath ? 'interactive-row' : undefined}
                  data-detail-path={detailPath ?? undefined}
                  onClick={detailPath ? () => navigate(detailPath) : undefined}
                  onKeyDown={detailPath ? (event) => handleRowKeyDown(event, detailPath) : undefined}
                  tabIndex={detailPath ? 0 : undefined}
                >
                  <td>{vehicle.plate_number}</td>
                  <td>{vehicle.model_name}</td>
                  <td>{getCompanyName(vehicle.manufacturer_company_id)}</td>
                  <td>{formatLifecycleStatusLabel(vehicle.vehicle_status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">등록된 차량 마스터가 없습니다.</p>
      )}
    </section>
  );
}
