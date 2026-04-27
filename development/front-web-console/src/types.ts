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
  roleDisplayName?: string | null;
  roleScopeLevel?: 'company' | 'fleet' | null;
  assignedFleetIds?: string[];
  scopeUiMode?: 'company_selectable' | 'fleet_fixed_single' | 'fleet_selectable_multi' | null;
  defaultFleetId?: string | null;
};

export type IdentitySession = {
  accessToken: string;
  sessionKind: string;
  email: string;
  identity: IdentitySummary;
  activeAccount: ActiveAccountSummary | null;
  availableAccountTypes: string[];
};

export type IdentityProfile = {
  identity_id: string;
  name: string;
  birth_date: string;
  status: string;
};

export type IdentityConsentCurrent = {
  privacy_policy_version: string;
  privacy_policy_consented: boolean;
  privacy_policy_consented_at: string | null;
  location_policy_version: string;
  location_policy_consented: boolean;
  location_policy_consented_at: string | null;
};

export type IdentityLoginMethod = {
  identity_login_method_id: string;
  method_type: 'email' | 'phone' | 'social';
  verified_at: string | null;
  value: string | { provider_type: string; provider_subject: string };
};

export type IdentityLoginMethodList = {
  methods: IdentityLoginMethod[];
};

export type IdentitySignupRequestSummary = {
  identity_signup_request_id: string;
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
  };
  request_type: string;
  request_display_name: string;
  status: string;
  status_message: string;
  company_id: string;
  requested_at: string;
};

export type IdentitySignupRequestList = {
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
  };
  requests: IdentitySignupRequestSummary[];
  inquiry_message: string;
};

export type Announcement = {
  announcement_id: string;
  slug: string;
  title: string;
  body: string;
  status: 'draft' | 'published' | 'archived';
  exposure_scope: 'all' | 'driver' | 'operator';
  published_at: string | null;
  expires_at: string | null;
  is_pinned: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type SupportTicket = {
  ticket_id: string;
  route_no: number;
  requester_account_id: string;
  title: string;
  body: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
};

export type SupportTicketResponse = {
  response_id: string;
  ticket_id: string;
  author_account_id: string;
  author_role: string;
  body: string;
  created_at: string;
  updated_at: string;
};


export type ManagerAccountSummary = {
  manager_account_id: string;
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
  };
  company_id: string;
  role_type: string;
  role_display_name?: string;
  assigned_fleet_ids?: string[];
  status: string;
  created_at: string;
};

export type ManagerAccountList = {
  accounts: ManagerAccountSummary[];
};

export type Company = {
  company_id: string;
  route_no?: number;
  public_ref?: string;
  name: string;
};

export type TenantCompanyContext = {
  companyId: string;
  companyName: string;
  tenantCode: string;
  workflowProfile: string;
  enabledFeatures: string[];
  homeDashboardPreset: Record<string, unknown>;
  workspacePresets: Record<string, unknown>;
};

export type WorkspaceBootstrapPayload = {
  companyId: string | null;
  companyName: string | null;
  tenantCode: string | null;
  workflowProfile: string;
  enabledFeatures: string[];
  homeDashboardPreset: Record<string, unknown>;
  workspacePresets: Record<string, unknown>;
};

export type Fleet = {
  fleet_id: string;
  route_no?: number;
  public_ref?: string;
  company_id: string;
  name: string;
};

export type CompanyFleetPricingTable = {
  pricing_table_id: string;
  company_id: string;
  fleet_id: string;
  box_sale_unit_price: string;
  box_purchase_unit_price: string;
  overtime_fee: string;
};

export type CompanyManagerRole = {
  company_manager_role_id: string;
  company_id: string;
  code: string;
  display_name: string;
  display_order: number;
  scope_level: 'company' | 'fleet';
  is_system_required: boolean;
  is_default: boolean;
  allowed_nav_keys: string[];
  assigned_count: number;
  can_delete: boolean;
  delete_block_reason: string | null;
};

export type Region = {
  region_id: string;
  region_code: string;
  name: string;
  status: 'draft' | 'active' | 'inactive';
  difficulty_level: 'low' | 'medium' | 'high';
  polygon_geojson: Record<string, unknown>;
  description: string;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type RegionDailyStatistic = {
  region_daily_statistic_id: string;
  region_id: string;
  region_code_snapshot: string;
  service_date: string;
  delivery_count: number;
  completed_delivery_count: number;
  exception_delivery_count: number;
  total_distance_km: string;
  total_base_amount: string;
  average_delivery_minutes: string;
  created_at: string;
  updated_at: string;
};

export type RegionPerformanceSummary = {
  region_performance_summary_id: string;
  region_id: string;
  region_code_snapshot: string;
  difficulty_level_snapshot: 'low' | 'medium' | 'high';
  period_start: string;
  period_end: string;
  delivery_count: number;
  completion_rate: string;
  productivity_score: string;
  cost_per_delivery: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type DispatchPlan = {
  dispatch_plan_id: string;
  company_id: string;
  fleet_id: string;
  dispatch_date: string;
  planned_volume: number;
  dispatch_status: string;
  created_at: string;
  updated_at: string;
};

export type DispatchUploadRow = {
  upload_row_id: string;
  row_index: number;
  external_user_name: string;
  small_region_text: string;
  detailed_region_text: string;
  box_count: number;
  household_count: number;
  matched_driver_id: string | null;
};

export type DispatchUploadBatch = {
  upload_batch_id: string;
  dispatch_plan_id: string | null;
  company_id: string;
  fleet_id: string;
  dispatch_date: string;
  source_filename: string;
  upload_status: 'draft' | 'confirmed';
  rows: DispatchUploadRow[];
  created_at: string;
  updated_at: string;
};

export type DispatchWorkRule = {
  work_rule_id: string;
  company_id: string;
  name: string;
  system_kind: 'working' | 'day_off' | 'overtime';
  is_in_use: boolean;
  created_at: string;
  updated_at: string;
};

export type DriverDayException = {
  driver_day_exception_id: string;
  company_id: string;
  fleet_id: string;
  dispatch_date: string;
  driver_id: string;
  work_rule: DispatchWorkRule;
  memo: string;
  created_at: string;
  updated_at: string;
};

export type OutsourcedDriver = {
  outsourced_driver_id: string;
  dispatch_plan_id: string;
  company_id: string;
  fleet_id: string;
  dispatch_date: string;
  name: string;
  contact_number: string;
  vehicle_note: string;
  memo: string;
  status?: 'active' | 'archived';
  archived_at?: string | null;
  is_archivable?: boolean;
  created_at: string;
  updated_at: string;
};

export type VehicleSchedule = {
  vehicle_schedule_id: string;
  vehicle_id: string;
  fleet_id: string;
  dispatch_date: string;
  shift_slot: string;
  schedule_status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DispatchAssignment = {
  dispatch_assignment_id: string;
  vehicle_schedule_id: string;
  vehicle_id: string;
  driver_id: string | null;
  outsourced_driver_id: string | null;
  operator_company_id: string;
  dispatch_date: string;
  shift_slot: string;
  assignment_status: string;
  assigned_at: string;
  unassigned_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DispatchBoardRow = {
  dispatch_date: string;
  vehicle_schedule_id: string | null;
  dispatch_assignment_id: string | null;
  shift_slot: string | null;
  vehicle_id: string | null;
  plate_number: string | null;
  planned_driver_kind: 'internal' | 'outsourced' | null;
  outsourced_driver_id: string | null;
  planned_driver_id: string | null;
  planned_driver_name: string | null;
  current_driver_id: string | null;
  current_driver_name: string | null;
  dispatch_status: 'matched' | 'not_started' | 'dispatch_unit_changed' | 'unplanned_current';
  warnings: string[];
};

export type DispatchBoardSummary = {
  dispatch_date: string;
  fleet_id: string;
  planned_volume: number;
  planned_assignment_count: number;
  matched_count: number;
  not_started_count: number;
  dispatch_unit_changed_count: number;
  unplanned_current_count: number;
};

export type DriverProfile = {
  driver_id: string;
  route_no?: number;
  company_id: string;
  fleet_id: string;
  name: string;
  external_user_name: string;
  ev_id: string;
  phone_number: string;
  address: string;
};

export type EnsureDriversByExternalUserNamesResult = {
  drivers: DriverProfile[];
  created_external_user_names: string[];
  existing_external_user_names: string[];
};

export type PersonnelDocument = {
  personnel_document_id: string;
  driver_id: string;
  document_type: 'contract' | 'license_or_certificate' | 'bank_account_proof' | 'business_registration';
  status: 'draft' | 'active' | 'expired' | 'revoked';
  title: string;
  document_number: string | null;
  issuer_name: string | null;
  issued_on: string | null;
  expires_on: string | null;
  notes: string | null;
  external_reference: string | null;
  payload: Record<string, unknown>;
};

export type DriverAccountLinkSummary = {
  driver_account_link_id: string;
  driver_account_id: string;
  driver_id: string;
  identity_id: string;
  identity_name: string;
  email: string;
  account_status: string;
  linked_at: string;
  unlinked_at: string | null;
};

export type DriverAccountSummary = {
  driver_account_id: string;
  identity: {
    identity_id: string;
    name: string;
    birth_date: string;
    status: string;
  };
  company_id: string;
  status: string;
  created_at: string;
  active_driver_id: string | null;
};

export type DriverAccountList = {
  accounts: DriverAccountSummary[];
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

export type SettlementConfigMetadataField = {
  key: string;
  label: string;
  description: string;
  input_type: 'percent' | 'currency' | 'text';
  unit: string;
  min: string;
  max: string;
  decimal_precision?: number;
  integer_only?: boolean;
  required: boolean;
};

export type SettlementConfigMetadataSection = {
  key: string;
  title: string;
  description: string;
  fields: SettlementConfigMetadataField[];
};

export type SettlementConfigMetadata = {
  sections: SettlementConfigMetadataSection[];
};

export type SettlementConfig = {
  singleton_key: 'global';
  income_tax_rate: string;
  vat_tax_rate: string;
  reported_amount_rate: string;
  national_pension_rate: string;
  health_insurance_rate: string;
  medical_insurance_rate: string;
  employment_insurance_rate: string;
  industrial_accident_insurance_rate: string;
  special_employment_insurance_rate: string;
  special_industrial_accident_insurance_rate: string;
  two_insurance_min_settlement_amount: string;
  meal_allowance: string;
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

export type DriverLatestSettlementListItem = DriverLatestSettlement & {
  driver_name: string;
};

export type DriverLatestSettlementPage = {
  count: number;
  page: number;
  page_size: number;
  results: DriverLatestSettlementListItem[];
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
