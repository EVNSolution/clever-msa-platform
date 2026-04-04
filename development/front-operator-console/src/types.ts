export type IdentitySummary = {
  identityId: string;
  name: string;
  birthDate: string;
  status: string;
};

export type ActiveAccountSummary = {
  accountType: 'system_admin' | 'manager' | 'driver';
  accountId: string;
  companyId?: string | null;
  roleType?: string | null;
};

export type IdentitySession = {
  accessToken: string;
  sessionKind: string;
  email: string;
  identity: IdentitySummary;
  activeAccount: ActiveAccountSummary | null;
  availableAccountTypes: string[];
};

export type Company = {
  company_id: string;
  name: string;
};

export type Fleet = {
  fleet_id: string;
  company_id: string;
  name: string;
};

export type DriverProfile = {
  driver_id: string;
  route_no?: number;
  company_id: string;
  fleet_id: string;
  name: string;
  ev_id: string;
  phone_number: string;
  address: string;
};

export type Vehicle = {
  vehicle_id: string;
  company_id: string;
  fleet_id: string | null;
  plate_number: string;
  vin: string;
  vehicle_status: string;
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

export type Driver360Summary = {
  driver_id: string;
  driver_name: string;
  ev_id: string;
  phone_number: string;
  address: string;
  company_id: string;
  company_name: string | null;
  fleet_id: string;
  fleet_name: string | null;
  driver_account_link_id: string | null;
  driver_account_id: string | null;
  driver_account_identity_name: string | null;
  driver_account_email: string | null;
  driver_account_status: string | null;
  latest_settlement_run_id: string | null;
  latest_settlement_period_start: string | null;
  latest_settlement_period_end: string | null;
  latest_settlement_status: string | null;
  latest_payout_status: string | null;
  latest_settlement_amount: string | null;
  warnings: string[];
};
