import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getVehicleOps } from '../api/vehicleOps';
import {
  listVehicleOperatorAccesses,
  updateVehicleOperatorAccess,
} from '../api/vehicles';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
import { getVehicleRouteRef } from '../routeRefs';
import type { Company, VehicleOperatorAccess, VehicleOpsSummary } from '../types';
import {
  formatAccessStatusLabel,
  formatInstallationStatusLabel,
  formatLifecycleStatusLabel,
  formatLocationStatusLabel,
} from '../uiLabels';

type VehicleDetailPageProps = {
  client: HttpClient;
};

function createTimestamp() {
  return new Date().toISOString();
}

export function VehicleDetailPage({ client }: VehicleDetailPageProps) {
  const { vehicleRef } = useParams();
  const [vehicle, setVehicle] = useState<VehicleOpsSummary | null>(null);
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
          getVehicleOps(client, selectedVehicleRef),
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

  function getManufacturerName(summary: VehicleOpsSummary) {
    return summary.manufacturer_company.company_name ?? '제조사 미상';
  }

  function getActiveOperatorName(summary: VehicleOpsSummary) {
    if (summary.active_operator_company.company_name) {
      return summary.active_operator_company.company_name;
    }
    if (summary.active_operator_company.company_id) {
      return '운영사 미상';
    }
    return '미배정';
  }

  function getCurrentDriverLabel(summary: VehicleOpsSummary) {
    if (summary.current_assignment?.driver_id) {
      return '배정됨';
    }
    return '미배정';
  }

  function getTerminalDetailValue(
    summary: VehicleOpsSummary,
    value: string | null | undefined,
    { missingLabel = '확인 불가' }: { missingLabel?: string } = {},
  ) {
    if (summary.current_terminal == null) {
      return '미설치';
    }
    return value ?? missingLabel;
  }

  function getLatestLocationLabel(summary: VehicleOpsSummary) {
    const latestLocation = summary.telemetry.latest_location;
    if (latestLocation.lat == null || latestLocation.lng == null) {
      return '확인 불가';
    }
    return `${latestLocation.lat}, ${latestLocation.lng}`;
  }

  function getLatestDiagnosticLabel(summary: VehicleOpsSummary) {
    return summary.telemetry.latest_diagnostic.event_code ?? '확인 불가';
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
    <PageLayout
      actions={
        vehicle ? (
          <Link className="button ghost" to={`/vehicles/${getVehicleRouteRef(vehicle)}/edit`}>
            차량 수정
          </Link>
        ) : null
      }
      subtitle="차량 정본, 운영사 접근, 단말 상태를 함께 확인합니다."
      title={vehicle?.plate_number ?? '차량 상세'}
    >
      <div className="stack large-gap">
        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">차량 요약</p>
            <h2>기본 정보</h2>
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
                <dt>제조사</dt>
                <dd>{getManufacturerName(vehicle)}</dd>
              </div>
              <div>
                <dt>현재 운영사</dt>
                <dd>{getActiveOperatorName(vehicle)}</dd>
              </div>
              <div>
                <dt>현재 배송원</dt>
                <dd>{getCurrentDriverLabel(vehicle)}</dd>
              </div>
              <div>
                <dt>배정 상태</dt>
                <dd>{vehicle.current_assignment ? '배정됨' : '미배정'}</dd>
              </div>
              <div>
                <dt>설치 상태</dt>
                <dd>
                  {getTerminalDetailValue(
                    vehicle,
                    vehicle.current_terminal?.installation_status
                      ? formatInstallationStatusLabel(vehicle.current_terminal.installation_status)
                      : null,
                  )}
                </dd>
              </div>
              <div>
                <dt>설치 시각</dt>
                <dd>{getTerminalDetailValue(vehicle, vehicle.current_terminal?.installed_at)}</dd>
              </div>
              <div>
                <dt>펌웨어 버전</dt>
                <dd>{getTerminalDetailValue(vehicle, vehicle.current_terminal?.firmware_version)}</dd>
              </div>
              <div>
                <dt>프로토콜 버전</dt>
                <dd>{getTerminalDetailValue(vehicle, vehicle.current_terminal?.protocol_version)}</dd>
              </div>
              <div>
                <dt>앱 버전</dt>
                <dd>{getTerminalDetailValue(vehicle, vehicle.current_terminal?.app_version)}</dd>
              </div>
              <div>
                <dt>최신 위치</dt>
                <dd>{getLatestLocationLabel(vehicle)}</dd>
              </div>
              <div>
                <dt>위치 상태</dt>
                <dd>
                  {vehicle.telemetry.latest_location.snapshot_status
                    ? formatLocationStatusLabel(vehicle.telemetry.latest_location.snapshot_status)
                    : '확인 불가'}
                </dd>
              </div>
              <div>
                <dt>최신 진단</dt>
                <dd>{getLatestDiagnosticLabel(vehicle)}</dd>
              </div>
              <div>
                <dt>VIN</dt>
                <dd>{vehicle.vin}</dd>
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
            {vehicle.warnings.length ? (
              <div className="error-banner">
                {vehicle.warnings.map((warning) => (
                  <div key={warning}>{warning}</div>
                ))}
              </div>
            ) : null}
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
    </PageLayout>
  );
}
