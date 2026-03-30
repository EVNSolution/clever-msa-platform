import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  getVehicleMaster,
  listVehicleOperatorAccesses,
  updateVehicleOperatorAccess,
} from '../api/vehicles';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { getVehicleRouteRef } from '../routeRefs';
import type { Company, VehicleMaster, VehicleOperatorAccess } from '../types';
import { formatAccessStatusLabel, formatLifecycleStatusLabel } from '../uiLabels';

type VehicleDetailPageProps = {
  client: HttpClient;
};

function createTimestamp() {
  return new Date().toISOString();
}

export function VehicleDetailPage({ client }: VehicleDetailPageProps) {
  const { vehicleRef } = useParams();
  const [vehicle, setVehicle] = useState<VehicleMaster | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [accesses, setAccesses] = useState<VehicleOperatorAccess[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [endingAccessId, setEndingAccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleRef) {
      setErrorMessage('차량 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedVehicleRef = vehicleRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [vehicleResponse, companyResponse] = await Promise.all([
          getVehicleMaster(client, selectedVehicleRef),
          listCompanies(client),
        ]);
        const accessResponse = await listVehicleOperatorAccesses(client, {
          vehicle_id: vehicleResponse.vehicle_id,
        });

        if (ignore) {
          return;
        }

        setVehicle(vehicleResponse);
        setCompanies(companyResponse);
        setAccesses(accessResponse);
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
  }, [client, vehicleRef]);

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  async function handleEndAccess(vehicleOperatorAccessId: string) {
    setEndingAccessId(vehicleOperatorAccessId);
    setErrorMessage(null);
    try {
      const updated = await updateVehicleOperatorAccess(client, vehicleOperatorAccessId, {
        access_status: 'ended',
        ended_at: createTimestamp(),
      });
      setAccesses((current) =>
        current.map((entry) =>
          entry.vehicle_operator_access_id === vehicleOperatorAccessId ? updated : entry,
        ),
      );
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setEndingAccessId(null);
    }
  }

  return (
    <div className="stack large-gap">
      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">차량 상세</p>
            <h2>{vehicle?.plate_number ?? '차량 상세'}</h2>
          </div>
          <div className="inline-actions">
            {vehicle ? (
              <Link className="button ghost" to={`/vehicles/${getVehicleRouteRef(vehicle)}/edit`}>
                차량 수정
              </Link>
            ) : null}
          </div>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">차량 정보를 불러오는 중입니다...</p>
        ) : vehicle ? (
          <div className="stack">
            <dl className="detail-list">
              <div>
                <dt>번호판</dt>
                <dd>{vehicle.plate_number}</dd>
              </div>
              <div>
                <dt>모델명</dt>
                <dd>{vehicle.model_name}</dd>
              </div>
              <div>
                <dt>제조사 회사</dt>
                <dd>{getCompanyName(vehicle.manufacturer_company_id)}</dd>
              </div>
              <div>
                <dt>VIN</dt>
                <dd>{vehicle.vin}</dd>
              </div>
              <div>
                <dt>제조사 차량 코드</dt>
                <dd>{vehicle.manufacturer_vehicle_code ?? '-'}</dd>
              </div>
              <div>
                <dt>차량 상태</dt>
                <dd>{formatLifecycleStatusLabel(vehicle.vehicle_status)}</dd>
              </div>
            </dl>
            <div className="page-actions">
              <Link className="button ghost" to="/vehicles">
                목록으로
              </Link>
              <Link className="button primary" to={`/vehicles/${getVehicleRouteRef(vehicle)}/accesses/new`}>
                운영사 접근 생성
              </Link>
            </div>
          </div>
        ) : (
          <p className="empty-state">차량을 찾을 수 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">운영사 접근</p>
          <h2>이 차량의 운영사 접근 기록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">운영사 접근을 불러오는 중입니다...</p>
        ) : accesses.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>운영사</th>
                <th>상태</th>
                <th>시작</th>
                <th>종료</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {accesses.map((access) => (
                <tr key={access.vehicle_operator_access_id}>
                  <td>{getCompanyName(access.operator_company_id)}</td>
                  <td>{formatAccessStatusLabel(access.access_status)}</td>
                  <td>{access.started_at}</td>
                  <td>{access.ended_at ?? '-'}</td>
                  <td>
                    {access.access_status === 'active' ? (
                      <button
                        className="button ghost small"
                        disabled={endingAccessId === access.vehicle_operator_access_id}
                        onClick={() => void handleEndAccess(access.vehicle_operator_access_id)}
                        type="button"
                      >
                        {endingAccessId === access.vehicle_operator_access_id ? '종료 중...' : '접근 종료'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 운영사 접근 정보가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
