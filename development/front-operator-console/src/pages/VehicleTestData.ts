export function makeVehicle({
  vehicleId,
  routeNo,
  plateNumber,
  manufacturerCompanyName,
  activeOperatorCompanyId,
  activeOperatorCompanyName,
  currentDriverId,
  locationStatus = 'fresh',
  warnings,
  currentTerminal,
}: {
  vehicleId: string;
  routeNo?: number;
  plateNumber: string;
  manufacturerCompanyName: string | null;
  activeOperatorCompanyId: string | null;
  activeOperatorCompanyName: string | null;
  currentDriverId: string | null;
  locationStatus?: 'fresh' | 'stale' | null;
  warnings: string[];
  currentTerminal?: {
    terminal_id: string;
    installation_status: 'installed' | 'removed';
    installed_at: string | null;
    imei: string | null;
    iccid: string | null;
    firmware_version: string | null;
    protocol_version: string | null;
    app_version: string | null;
  } | null;
}) {
  return {
    vehicle_id: vehicleId,
    route_no: routeNo,
    plate_number: plateNumber,
    vin: `VIN-${vehicleId.slice(-4)}`,
    vehicle_status: 'active',
    manufacturer_company: {
      company_id: '30000000-0000-0000-0000-000000000001',
      company_name: manufacturerCompanyName,
    },
    active_operator_company: {
      company_id: activeOperatorCompanyId,
      company_name: activeOperatorCompanyName,
      access_status: activeOperatorCompanyId ? 'active' : null,
    },
    current_assignment: currentDriverId
      ? {
          driver_vehicle_assignment_id: '60000000-0000-0000-0000-000000000001',
          driver_id: currentDriverId,
          assignment_status: 'assigned',
          assigned_at: '2026-03-20T10:00:00Z',
        }
      : null,
    current_terminal: currentTerminal ?? null,
    telemetry: {
      latest_location: {
        lat: locationStatus ? 37.5665 : null,
        lng: locationStatus ? 126.978 : null,
        captured_at: locationStatus ? '2026-03-20T10:05:00Z' : null,
        snapshot_status: locationStatus,
      },
      latest_diagnostic: {
        event_code: locationStatus ? 'BAT_LOW' : null,
        severity: locationStatus ? 'warning' : null,
        event_status: locationStatus ? 'open' : null,
        captured_at: locationStatus ? '2026-03-20T10:04:00Z' : null,
      },
    },
    warnings,
  };
}
