import { useEffect, useRef, useState } from 'react';

import { getVehicleOps, listVehicleOps } from '../api/vehicleOps';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { VehicleOpsSummary } from '../types';
import {
  formatInstallationStatusLabel,
  formatLocationStatusLabel,
  formatProtectedIdentifier,
  formatVehicleStatusLabel,
} from '../uiLabels';

type VehiclesPageProps = {
  client: HttpClient;
};

export function VehiclesPage({ client }: VehiclesPageProps) {
  const [vehicles, setVehicles] = useState<VehicleOpsSummary[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOpsSummary | null>(null);
  const [listErrorMessage, setListErrorMessage] = useState<string | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const detailRequestId = useRef(0);

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
    return formatProtectedIdentifier(vehicle.current_assignment?.driver_id, { missingLabel: '미배정' });
  }

  function shortenIdentifier(value: string) {
    return `${value.slice(0, 8)}...`;
  }

  function getCurrentTerminalLabel(vehicle: VehicleOpsSummary) {
    if (vehicle.current_terminal?.imei) {
      return formatProtectedIdentifier(vehicle.current_terminal.imei);
    }
    if (vehicle.current_terminal?.terminal_id) {
      return shortenIdentifier(vehicle.current_terminal.terminal_id);
    }
    return '미설치';
  }

  function getTerminalDetailValue(
    value: string | null | undefined,
    { missingLabel = '확인 불가' }: { missingLabel?: string } = {},
  ) {
    if (selectedVehicle?.current_terminal == null) {
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

  useEffect(() => {
    let ignore = false;

    async function load() {
      detailRequestId.current += 1;
      setSelectedVehicle(null);
      setDetailErrorMessage(null);
      setIsLoading(true);
      setListErrorMessage(null);
      try {
        const response = await listVehicleOps(client);
        if (!ignore) {
          setVehicles(response);
        }
      } catch (error) {
        if (!ignore) {
          setVehicles([]);
          setListErrorMessage(getErrorMessage(error));
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

  async function handleViewDetails(vehicleId: string) {
    const requestId = ++detailRequestId.current;
    setDetailErrorMessage(null);
    try {
      const response = await getVehicleOps(client, vehicleId);
      if (detailRequestId.current === requestId) {
        setSelectedVehicle(response);
      }
    } catch (error) {
      if (detailRequestId.current === requestId) {
        setSelectedVehicle(null);
        setDetailErrorMessage(getErrorMessage(error));
      }
    }
  }

  return (
    <div className="data-grid two-columns wide-left">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">차량 레지스트리</p>
          <h2>운영 중 차량</h2>
        </div>
        {listErrorMessage ? <div className="error-banner">{listErrorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">차량을 불러오는 중입니다...</p>
        ) : listErrorMessage ? null : vehicles.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>번호판</th>
                <th>제조사</th>
                <th>현재 운영사</th>
                <th>현재 배송원</th>
                <th>단말기</th>
                <th>VIN</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.vehicle_id}>
                  <td>{vehicle.plate_number}</td>
                  <td>{getManufacturerName(vehicle)}</td>
                  <td>{getActiveOperatorName(vehicle)}</td>
                  <td>{getCurrentDriverLabel(vehicle)}</td>
                  <td>{getCurrentTerminalLabel(vehicle)}</td>
                  <td>{vehicle.vin}</td>
                  <td>{formatVehicleStatusLabel(vehicle.vehicle_status)}</td>
                  <td>
                    <button className="button ghost small" onClick={() => void handleViewDetails(vehicle.vehicle_id)} type="button">
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 차량이 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">차량 요약</p>
          <h2>차량 상세</h2>
        </div>
        {detailErrorMessage ? <div className="error-banner">{detailErrorMessage}</div> : null}
        {selectedVehicle ? (
          <dl className="detail-list">
            <div>
              <dt>번호판</dt>
              <dd>{selectedVehicle.plate_number}</dd>
            </div>
            <div>
              <dt>제조사</dt>
              <dd>{getManufacturerName(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>제조사 회사 ID</dt>
              <dd><code>{formatProtectedIdentifier(selectedVehicle.manufacturer_company.company_id)}</code></dd>
            </div>
            <div>
              <dt>현재 운영사</dt>
              <dd>{getActiveOperatorName(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>운영사 회사 ID</dt>
              <dd><code>{formatProtectedIdentifier(selectedVehicle.active_operator_company.company_id, { missingLabel: '미배정' })}</code></dd>
            </div>
            <div>
              <dt>현재 배송원</dt>
              <dd>{getCurrentDriverLabel(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>현재 배정</dt>
              <dd><code>{formatProtectedIdentifier(selectedVehicle.current_assignment?.driver_vehicle_assignment_id, { missingLabel: '미배정' })}</code></dd>
            </div>
            <div>
              <dt>단말기 ID</dt>
              <dd><code>{formatProtectedIdentifier(getTerminalDetailValue(selectedVehicle.current_terminal?.terminal_id), { missingLabel: '미설치' })}</code></dd>
            </div>
            <div>
              <dt>설치 상태</dt>
              <dd>
                {getTerminalDetailValue(
                  selectedVehicle.current_terminal?.installation_status
                    ? formatInstallationStatusLabel(selectedVehicle.current_terminal.installation_status)
                    : null,
                )}
              </dd>
            </div>
            <div>
              <dt>설치 시각</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.installed_at)}</dd>
            </div>
            <div>
              <dt>IMEI</dt>
              <dd>{formatProtectedIdentifier(getTerminalDetailValue(selectedVehicle.current_terminal?.imei), { missingLabel: '미설치' })}</dd>
            </div>
            <div>
              <dt>ICCID</dt>
              <dd>{formatProtectedIdentifier(getTerminalDetailValue(selectedVehicle.current_terminal?.iccid), { missingLabel: '미설치' })}</dd>
            </div>
            <div>
              <dt>펌웨어 버전</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.firmware_version)}</dd>
            </div>
            <div>
              <dt>프로토콜 버전</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.protocol_version)}</dd>
            </div>
            <div>
              <dt>앱 버전</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.app_version)}</dd>
            </div>
            <div>
              <dt>최신 위치</dt>
              <dd>{getLatestLocationLabel(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>위치 상태</dt>
              <dd>
                {selectedVehicle.telemetry.latest_location.snapshot_status
                  ? formatLocationStatusLabel(selectedVehicle.telemetry.latest_location.snapshot_status)
                  : '확인 불가'}
              </dd>
            </div>
            <div>
              <dt>최신 진단</dt>
              <dd>{getLatestDiagnosticLabel(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>VIN</dt>
              <dd>{selectedVehicle.vin}</dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd>{formatVehicleStatusLabel(selectedVehicle.vehicle_status)}</dd>
            </div>
          </dl>
        ) : (
          <p className="empty-state">차량을 선택하면 상세를 볼 수 있습니다.</p>
        )}
        {selectedVehicle?.warnings.length ? (
          <section className="subpanel">
            <p className="panel-kicker">주의 사항</p>
            <ul className="warning-list">
              {selectedVehicle.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </section>
    </div>
  );
}
