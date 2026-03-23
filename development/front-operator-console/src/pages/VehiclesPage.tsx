import { useEffect, useRef, useState } from 'react';

import { getVehicleOps, listVehicleOps } from '../api/vehicleOps';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { VehicleOpsSummary } from '../types';

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
    return vehicle.manufacturer_company.company_name ?? 'Unknown manufacturer';
  }

  function getActiveOperatorName(vehicle: VehicleOpsSummary) {
    if (vehicle.active_operator_company.company_name) {
      return vehicle.active_operator_company.company_name;
    }
    if (vehicle.active_operator_company.company_id) {
      return 'Unknown operator';
    }
    return 'Unassigned';
  }

  function getCurrentDriverLabel(vehicle: VehicleOpsSummary) {
    return vehicle.current_assignment?.driver_id ?? 'Unassigned';
  }

  function shortenIdentifier(value: string) {
    return `${value.slice(0, 8)}...`;
  }

  function getCurrentTerminalLabel(vehicle: VehicleOpsSummary) {
    if (vehicle.current_terminal?.imei) {
      return vehicle.current_terminal.imei;
    }
    if (vehicle.current_terminal?.terminal_id) {
      return shortenIdentifier(vehicle.current_terminal.terminal_id);
    }
    return 'Uninstalled';
  }

  function getTerminalDetailValue(
    value: string | null | undefined,
    { missingLabel = 'Unavailable' }: { missingLabel?: string } = {},
  ) {
    if (selectedVehicle?.current_terminal == null) {
      return 'Uninstalled';
    }
    return value ?? missingLabel;
  }

  function getLatestLocationLabel(vehicle: VehicleOpsSummary) {
    const latestLocation = vehicle.telemetry.latest_location;
    if (latestLocation.lat == null || latestLocation.lng == null) {
      return 'Unavailable';
    }
    return `${latestLocation.lat}, ${latestLocation.lng}`;
  }

  function getLatestDiagnosticLabel(vehicle: VehicleOpsSummary) {
    return vehicle.telemetry.latest_diagnostic.event_code ?? 'Unavailable';
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
          <p className="panel-kicker">Vehicle Registry</p>
          <h2>Active vehicles</h2>
        </div>
        {listErrorMessage ? <div className="error-banner">{listErrorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">Loading vehicles...</p>
        ) : listErrorMessage ? null : vehicles.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Manufacturer</th>
                <th>Active Operator</th>
                <th>Current Driver</th>
                <th>Terminal</th>
                <th>VIN</th>
                <th>Status</th>
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
                  <td>{vehicle.vehicle_status}</td>
                  <td>
                    <button className="button ghost small" onClick={() => void handleViewDetails(vehicle.vehicle_id)} type="button">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No vehicles yet.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Vehicle Summary</p>
          <h2>Vehicle detail</h2>
        </div>
        {detailErrorMessage ? <div className="error-banner">{detailErrorMessage}</div> : null}
        {selectedVehicle ? (
          <dl className="detail-list">
            <div>
              <dt>Plate Number</dt>
              <dd>{selectedVehicle.plate_number}</dd>
            </div>
            <div>
              <dt>Manufacturer</dt>
              <dd>{getManufacturerName(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>Manufacturer Company ID</dt>
              <dd><code>{selectedVehicle.manufacturer_company.company_id}</code></dd>
            </div>
            <div>
              <dt>Active Operator</dt>
              <dd>{getActiveOperatorName(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>Active Operator Company ID</dt>
              <dd><code>{selectedVehicle.active_operator_company.company_id ?? 'Unassigned'}</code></dd>
            </div>
            <div>
              <dt>Current Driver</dt>
              <dd>{getCurrentDriverLabel(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>Current Assignment</dt>
              <dd><code>{selectedVehicle.current_assignment?.driver_vehicle_assignment_id ?? 'Unassigned'}</code></dd>
            </div>
            <div>
              <dt>Terminal ID</dt>
              <dd><code>{getTerminalDetailValue(selectedVehicle.current_terminal?.terminal_id)}</code></dd>
            </div>
            <div>
              <dt>Installation Status</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.installation_status)}</dd>
            </div>
            <div>
              <dt>Installed At</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.installed_at)}</dd>
            </div>
            <div>
              <dt>IMEI</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.imei)}</dd>
            </div>
            <div>
              <dt>ICCID</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.iccid)}</dd>
            </div>
            <div>
              <dt>Firmware Version</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.firmware_version)}</dd>
            </div>
            <div>
              <dt>Protocol Version</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.protocol_version)}</dd>
            </div>
            <div>
              <dt>App Version</dt>
              <dd>{getTerminalDetailValue(selectedVehicle.current_terminal?.app_version)}</dd>
            </div>
            <div>
              <dt>Latest Location</dt>
              <dd>{getLatestLocationLabel(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>Location Status</dt>
              <dd>{selectedVehicle.telemetry.latest_location.snapshot_status ?? 'Unavailable'}</dd>
            </div>
            <div>
              <dt>Latest Diagnostic</dt>
              <dd>{getLatestDiagnosticLabel(selectedVehicle)}</dd>
            </div>
            <div>
              <dt>VIN</dt>
              <dd>{selectedVehicle.vin}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{selectedVehicle.vehicle_status}</dd>
            </div>
          </dl>
        ) : (
          <p className="empty-state">Select a vehicle to view details.</p>
        )}
        {selectedVehicle?.warnings.length ? (
          <section className="subpanel">
            <p className="panel-kicker">Warnings</p>
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
