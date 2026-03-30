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
