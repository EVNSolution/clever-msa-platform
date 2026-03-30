import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getVehicleOps } from '../api/vehicleOps';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { VehicleOpsSummary } from '../types';
import {
  formatInstallationStatusLabel,
  formatLocationStatusLabel,
  formatVehicleStatusLabel,
} from '../uiLabels';

type VehicleDetailPageProps = {
  client: HttpClient;
};

function getManufacturerName(vehicle: VehicleOpsSummary) {
  return vehicle.manufacturer_company.company_name ?? '제조사 미상';
}

function getActiveOperatorName(vehicle: VehicleOpsSummary) {
  if (vehicle.active_operator_company.company_name) {
    return vehicle.active_operator_company.company_name;
  }
  if (vehicle.active_operator_company.company_id) {
    return '운영사 미상';
  }
  return '미배정';
}

function getCurrentDriverLabel(vehicle: VehicleOpsSummary) {
  if (vehicle.current_assignment?.driver_id) {
    return '배정됨';
  }
  return '미배정';
}

function getTerminalDetailValue(
  vehicle: VehicleOpsSummary,
  value: string | null | undefined,
  { missingLabel = '확인 불가' }: { missingLabel?: string } = {},
) {
  if (vehicle.current_terminal == null) {
    return '미설치';
  }
  return value ?? missingLabel;
}

function getLatestLocationLabel(vehicle: VehicleOpsSummary) {
  const latestLocation = vehicle.telemetry.latest_location;
  if (latestLocation.lat == null || latestLocation.lng == null) {
    return '확인 불가';
  }
  return `${latestLocation.lat}, ${latestLocation.lng}`;
}

function getLatestDiagnosticLabel(vehicle: VehicleOpsSummary) {
  return vehicle.telemetry.latest_diagnostic.event_code ?? '확인 불가';
}

export function VehicleDetailPage({ client }: VehicleDetailPageProps) {
  const { vehicleRef } = useParams();
  const [vehicle, setVehicle] = useState<VehicleOpsSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!vehicleRef) {
      setErrorMessage('차량 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const safeVehicleRef = vehicleRef;

    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getVehicleOps(client, safeVehicleRef);
        if (!ignore) {
          setVehicle(response);
        }
      } catch (error) {
        if (!ignore) {
          setVehicle(null);
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

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">차량 요약</p>
          <h2>{vehicle?.plate_number ?? '차량 상세'}</h2>
        </div>
        <div className="page-actions">
          <Link className="button ghost" to="/vehicles">
            차량 목록
          </Link>
        </div>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">차량을 불러오는 중입니다...</p>
      ) : vehicle ? (
        <>
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
              <dt>상태</dt>
              <dd>{formatVehicleStatusLabel(vehicle.vehicle_status)}</dd>
            </div>
          </dl>
          {vehicle.warnings.length ? (
            <section className="subpanel">
              <p className="panel-kicker">주의 사항</p>
              <ul className="warning-list">
                {vehicle.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className="empty-state">차량을 찾을 수 없습니다.</p>
      )}
    </section>
  );
}
