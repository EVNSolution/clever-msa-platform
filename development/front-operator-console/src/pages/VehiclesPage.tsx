import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { listVehicleOps } from '../api/vehicleOps';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getVehicleRouteRef } from '../routeRefs';
import type { VehicleOpsSummary } from '../types';
import {
  formatVehicleStatusLabel,
} from '../uiLabels';

type VehiclesPageProps = {
  client: HttpClient;
};

export function VehiclesPage({ client }: VehiclesPageProps) {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<VehicleOpsSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  function getCurrentTerminalLabel(vehicle: VehicleOpsSummary) {
    if (vehicle.current_terminal?.terminal_id || vehicle.current_terminal?.imei) {
      return '설치됨';
    }
    return '미설치';
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listVehicleOps(client);
        if (!ignore) {
          setVehicles(response);
        }
      } catch (error) {
        if (!ignore) {
          setVehicles([]);
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

  function handleVehicleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <p className="panel-kicker">차량 레지스트리</p>
        <h2>운영 중 차량</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">차량을 불러오는 중입니다...</p>
      ) : errorMessage ? null : vehicles.length ? (
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
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => {
              const detailPath = vehicle.route_no != null ? `/vehicles/${getVehicleRouteRef(vehicle)}` : null;

              return (
                <tr
                  key={vehicle.vehicle_id}
                  className={detailPath ? 'interactive-row' : undefined}
                  data-detail-path={detailPath ?? undefined}
                  onClick={detailPath ? () => navigate(detailPath) : undefined}
                  onKeyDown={detailPath ? (event) => handleVehicleRowKeyDown(event, detailPath) : undefined}
                  tabIndex={detailPath ? 0 : undefined}
                >
                  <td>{vehicle.plate_number}</td>
                  <td>{getManufacturerName(vehicle)}</td>
                  <td>{getActiveOperatorName(vehicle)}</td>
                  <td>{getCurrentDriverLabel(vehicle)}</td>
                  <td>{getCurrentTerminalLabel(vehicle)}</td>
                  <td>{vehicle.vin}</td>
                  <td>{formatVehicleStatusLabel(vehicle.vehicle_status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">등록된 차량이 없습니다.</p>
      )}
    </section>
  );
}
