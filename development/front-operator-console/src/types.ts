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

export type GeneralNotification = {
  notification_id: string;
  recipient_account_id: string;
  category: string;
  source_type: string;
  source_ref: string;
  title: string;
  body: string;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
  read_at: string | null;
  archived_at: string | null;
};

export type Company = {
  company_id: string;
  route_no?: number;
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
