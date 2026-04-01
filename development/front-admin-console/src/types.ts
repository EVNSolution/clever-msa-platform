export type AccountSummary = {
  account_id: string;
  route_no?: number;
  public_ref?: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type Company = {
  company_id: string;
  route_no?: number;
  public_ref?: string;
  name: string;
};

export type Fleet = {
  fleet_id: string;
  route_no?: number;
  public_ref?: string;
  company_id: string;
  name: string;
};

export type DriverProfile = {
  driver_id: string;
  route_no?: number;
  account_id: string | null;
  company_id: string;
  fleet_id: string;
  name: string;
  ev_id: string;
  phone_number: string;
  address: string;
};

export type VehicleMaster = {
  vehicle_id: string;
  route_no?: number;
  manufacturer_company_id: string;
  plate_number: string;
  vin: string;
  manufacturer_vehicle_code: string | null;
  model_name: string;
  vehicle_status: string;
  created_at: string;
  updated_at: string;
};

export type VehicleOperatorAccess = {
  vehicle_operator_access_id: string;
  vehicle_id: string;
  operator_company_id: string;
  access_status: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VehicleOpsSummary = {
  vehicle_id: string;
  route_no?: number;
  plate_number: string;
  vin: string;
  vehicle_status: string;
  manufacturer_company: {
    company_id: string;
    company_name: string | null;
  };
  active_operator_company: {
    company_id: string | null;
    company_name: string | null;
    access_status: 'active' | 'suspended' | 'ended' | null;
  };
  current_assignment: {
    driver_vehicle_assignment_id: string;
    driver_id: string;
    assignment_status: 'assigned';
    assigned_at: string | null;
  } | null;
  current_terminal: {
    terminal_id: string;
    installation_status: 'installed' | 'removed';
    installed_at: string | null;
    imei: string | null;
    iccid: string | null;
    firmware_version: string | null;
    protocol_version: string | null;
    app_version: string | null;
  } | null;
  telemetry: {
    latest_location: {
      lat: number | null;
      lng: number | null;
      captured_at: string | null;
      snapshot_status: 'fresh' | 'stale' | 'unavailable' | null;
    };
    latest_diagnostic: {
      event_code: string | null;
      severity: 'info' | 'warning' | 'critical' | null;
      event_status: 'open' | 'cleared' | null;
      captured_at: string | null;
    };
  };
  warnings: string[];
};

export type TerminalRegistry = {
  terminal_id: string;
  manufacturer_company_id: string;
  imei: string;
  iccid: string;
  firmware_version: string;
  protocol_version: string;
  app_version: string;
  terminal_status: string;
  created_at: string;
  updated_at: string;
};

export type TerminalInstallation = {
  terminal_installation_id: string;
  terminal_id: string;
  vehicle_id: string;
  installation_status: string;
  installed_at: string;
  removed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DriverVehicleAssignment = {
  driver_vehicle_assignment_id: string;
  route_no?: number;
  driver_id: string;
  vehicle_id: string;
  operator_company_id: string;
  assignment_status: string;
  assigned_at: string;
  unassigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SettlementRun = {
  settlement_run_id: string;
  company_id: string;
  fleet_id: string;
  period_start: string;
  period_end: string;
  status: string;
};

export type SettlementItem = {
  settlement_item_id: string;
  settlement_run_id: string;
  driver_id: string;
  amount: string;
  payout_status: string;
};

export type SettlementPolicy = {
  policy_id: string;
  policy_code: string;
  name: string;
  status: string;
  description: string;
};

export type SettlementPolicyVersion = {
  policy_version_id: string;
  policy_id: string;
  version_number: number;
  rule_payload: Record<string, unknown>;
  status: string;
  published_at: string | null;
};

export type SettlementPolicyAssignment = {
  assignment_id: string;
  policy_version_id: string;
  company_id: string;
  fleet_id: string;
  effective_start_date: string;
  effective_end_date: string | null;
  status: string;
};

export type DeliveryRecord = {
  delivery_record_id: string;
  company_id: string;
  fleet_id: string;
  driver_id: string;
  service_date: string;
  source_reference: string;
  delivery_count: number;
  distance_km: string;
  base_amount: string;
  status: string;
  payload: Record<string, unknown>;
};

export type DailyDeliveryInputSnapshot = {
  daily_delivery_input_snapshot_id: string;
  company_id: string;
  fleet_id: string;
  driver_id: string;
  service_date: string;
  delivery_count: number;
  total_distance_km: string;
  total_base_amount: string;
  source_record_count: number;
  status: string;
};

export type LatestSettlementSummary = {
  settlement_run_id: string;
  period_start: string;
  period_end: string;
  status: string;
  payout_status: string;
  amount: string;
};

export type DriverLatestSettlement = {
  driver_id: string;
  delivery_history_present: boolean | null;
  attendance_inferred_from_delivery_history: boolean | null;
  latest_settlement: LatestSettlementSummary | null;
};
