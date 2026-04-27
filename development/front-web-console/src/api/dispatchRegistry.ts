import type {
  DispatchAssignment,
  DispatchUploadBatch,
  DispatchPlan,
  DispatchWorkRule,
  DriverDayException,
  OutsourcedDriver,
  VehicleSchedule,
} from '../types';
import type { HttpClient } from './http';

export type DispatchPlanPayload = Pick<
  DispatchPlan,
  'company_id' | 'fleet_id' | 'dispatch_date' | 'planned_volume' | 'dispatch_status'
>;

export type VehicleSchedulePayload = Pick<
  VehicleSchedule,
  'vehicle_id' | 'fleet_id' | 'dispatch_date' | 'shift_slot' | 'schedule_status' | 'starts_at' | 'ends_at'
>;

export type DispatchAssignmentPayload = Pick<
  DispatchAssignment,
  | 'vehicle_schedule_id'
  | 'vehicle_id'
  | 'driver_id'
  | 'outsourced_driver_id'
  | 'operator_company_id'
  | 'dispatch_date'
  | 'shift_slot'
  | 'assignment_status'
  | 'assigned_at'
  | 'unassigned_at'
>;

export type OutsourcedDriverPayload = Pick<
  OutsourcedDriver,
  'dispatch_plan_id' | 'name' | 'contact_number' | 'vehicle_note' | 'memo'
>;

export type DispatchWorkRulePayload = Pick<DispatchWorkRule, 'company_id' | 'name' | 'system_kind'>;

export type DriverDayExceptionPayload = {
  company_id: string;
  fleet_id: string;
  dispatch_date: string;
  driver_id: string;
  work_rule_id: string;
  memo: string;
};

export type DispatchUploadPreviewRowPayload = {
  delivery_manager_name: string;
  small_region_text: string;
  detailed_region_text: string;
  box_count: number;
  household_count: number;
};

export type DispatchUploadPreviewPayload = {
  company_id: string;
  fleet_id: string;
  dispatch_date: string;
  dispatch_plan_id?: string | null;
  source_filename?: string;
  rows: DispatchUploadPreviewRowPayload[];
};

export function listDispatchPlans(
  client: HttpClient,
  filters?: Partial<Pick<DispatchPlan, 'company_id' | 'fleet_id' | 'dispatch_date'>>,
) {
  const query = new URLSearchParams();
  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.dispatch_date) {
    query.set('dispatch_date', filters.dispatch_date);
  }
  const queryString = query.toString();
  const path = queryString ? `/dispatch/plans/?${queryString}` : '/dispatch/plans/';
  return client.request<DispatchPlan[]>(path);
}

export function createDispatchPlan(client: HttpClient, payload: DispatchPlanPayload) {
  return client.request<DispatchPlan>('/dispatch/plans/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getDispatchPlan(client: HttpClient, dispatchPlanRef: string) {
  return client.request<DispatchPlan>(`/dispatch/plans/${dispatchPlanRef}/`);
}

export function updateDispatchPlan(client: HttpClient, dispatchPlanRef: string, payload: Partial<DispatchPlanPayload>) {
  return client.request<DispatchPlan>(`/dispatch/plans/${dispatchPlanRef}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listDispatchUploadBatches(
  client: HttpClient,
  filters?: Partial<Pick<DispatchPlan, 'company_id' | 'fleet_id' | 'dispatch_date'>> & {
    upload_status?: DispatchUploadBatch['upload_status'];
  },
) {
  const query = new URLSearchParams();
  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.dispatch_date) {
    query.set('dispatch_date', filters.dispatch_date);
  }
  if (filters?.upload_status) {
    query.set('upload_status', filters.upload_status);
  }
  const queryString = query.toString();
  const path = queryString ? `/dispatch/upload-batches/?${queryString}` : '/dispatch/upload-batches/';
  return client.request<DispatchUploadBatch[]>(path);
}

export function previewDispatchUpload(client: HttpClient, payload: DispatchUploadPreviewPayload) {
  return client.request<DispatchUploadBatch>('/dispatch/upload-batches/preview/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function confirmDispatchUpload(client: HttpClient, uploadBatchId: string) {
  return client.request<DispatchUploadBatch>(`/dispatch/upload-batches/${uploadBatchId}/confirm/`, {
    method: 'POST',
  });
}

export function listVehicleSchedules(
  client: HttpClient,
  filters?: Partial<Pick<VehicleSchedule, 'fleet_id' | 'dispatch_date' | 'vehicle_id'>>,
) {
  const query = new URLSearchParams();
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.dispatch_date) {
    query.set('dispatch_date', filters.dispatch_date);
  }
  if (filters?.vehicle_id) {
    query.set('vehicle_id', filters.vehicle_id);
  }
  const queryString = query.toString();
  const path = queryString
    ? `/dispatch/vehicle-schedules/?${queryString}`
    : '/dispatch/vehicle-schedules/';
  return client.request<VehicleSchedule[]>(path);
}

export function listOutsourcedDrivers(
  client: HttpClient,
  filters?: Partial<
    Pick<OutsourcedDriver, 'dispatch_plan_id' | 'company_id' | 'fleet_id' | 'dispatch_date' | 'status'>
  >,
) {
  const query = new URLSearchParams();
  if (filters?.dispatch_plan_id) {
    query.set('dispatch_plan_id', filters.dispatch_plan_id);
  }
  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.dispatch_date) {
    query.set('dispatch_date', filters.dispatch_date);
  }
  if (filters?.status) {
    query.set('status', filters.status);
  }
  const queryString = query.toString();
  const path = queryString ? `/dispatch/outsourced-drivers/?${queryString}` : '/dispatch/outsourced-drivers/';
  return client.request<OutsourcedDriver[]>(path);
}

export function listDispatchWorkRules(
  client: HttpClient,
  filters?: Partial<Pick<DispatchWorkRule, 'company_id' | 'system_kind'>>,
) {
  const query = new URLSearchParams();
  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.system_kind) {
    query.set('system_kind', filters.system_kind);
  }
  const queryString = query.toString();
  const path = queryString ? `/dispatch/work-rules/?${queryString}` : '/dispatch/work-rules/';
  return client.request<DispatchWorkRule[]>(path);
}

export function createDispatchWorkRule(client: HttpClient, payload: DispatchWorkRulePayload) {
  return client.request<DispatchWorkRule>('/dispatch/work-rules/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeDispatchWorkRule(client: HttpClient, workRuleId: string) {
  return client.request<void>(`/dispatch/work-rules/${workRuleId}/`, {
    method: 'DELETE',
  });
}

export function updateDispatchWorkRule(
  client: HttpClient,
  workRuleId: string,
  payload: Partial<Pick<DispatchWorkRule, 'name'>>,
) {
  return client.request<DispatchWorkRule>(`/dispatch/work-rules/${workRuleId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listDriverDayExceptions(
  client: HttpClient,
  filters?: Partial<Pick<DriverDayException, 'company_id' | 'fleet_id' | 'dispatch_date' | 'driver_id'>> & {
    work_rule_id?: string;
  },
) {
  const query = new URLSearchParams();
  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.dispatch_date) {
    query.set('dispatch_date', filters.dispatch_date);
  }
  if (filters?.driver_id) {
    query.set('driver_id', filters.driver_id);
  }
  if (filters?.work_rule_id) {
    query.set('work_rule_id', filters.work_rule_id);
  }
  const queryString = query.toString();
  const path = queryString
    ? `/dispatch/driver-day-exceptions/?${queryString}`
    : '/dispatch/driver-day-exceptions/';
  return client.request<DriverDayException[]>(path);
}

export function createDriverDayException(client: HttpClient, payload: DriverDayExceptionPayload) {
  return client.request<DriverDayException>('/dispatch/driver-day-exceptions/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function removeDriverDayException(client: HttpClient, driverDayExceptionId: string) {
  return client.request<void>(`/dispatch/driver-day-exceptions/${driverDayExceptionId}/`, {
    method: 'DELETE',
  });
}

export function createOutsourcedDriver(client: HttpClient, payload: OutsourcedDriverPayload) {
  return client.request<OutsourcedDriver>('/dispatch/outsourced-drivers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function archiveOutsourcedDriver(client: HttpClient, outsourcedDriverId: string) {
  return client.request<OutsourcedDriver>(`/dispatch/outsourced-drivers/${outsourcedDriverId}/archive/`, {
    method: 'POST',
  });
}

export function updateOutsourcedDriver(
  client: HttpClient,
  outsourcedDriverId: string,
  payload: Partial<Pick<OutsourcedDriver, 'name' | 'contact_number' | 'vehicle_note' | 'memo'>>,
) {
  return client.request<OutsourcedDriver>(`/dispatch/outsourced-drivers/${outsourcedDriverId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createVehicleSchedule(client: HttpClient, payload: VehicleSchedulePayload) {
  return client.request<VehicleSchedule>('/dispatch/vehicle-schedules/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateVehicleSchedule(
  client: HttpClient,
  vehicleScheduleId: string,
  payload: Partial<VehicleSchedulePayload>,
) {
  return client.request<VehicleSchedule>(`/dispatch/vehicle-schedules/${vehicleScheduleId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listDispatchAssignments(
  client: HttpClient,
  filters?: Partial<
    Pick<
      DispatchAssignment,
      | 'dispatch_date'
      | 'assignment_status'
      | 'vehicle_schedule_id'
      | 'vehicle_id'
      | 'driver_id'
      | 'outsourced_driver_id'
    >
  >,
) {
  const query = new URLSearchParams();
  if (filters?.dispatch_date) {
    query.set('dispatch_date', filters.dispatch_date);
  }
  if (filters?.assignment_status) {
    query.set('assignment_status', filters.assignment_status);
  }
  if (filters?.vehicle_schedule_id) {
    query.set('vehicle_schedule_id', filters.vehicle_schedule_id);
  }
  if (filters?.vehicle_id) {
    query.set('vehicle_id', filters.vehicle_id);
  }
  if (filters?.driver_id) {
    query.set('driver_id', filters.driver_id);
  }
  if (filters?.outsourced_driver_id) {
    query.set('outsourced_driver_id', filters.outsourced_driver_id);
  }
  const queryString = query.toString();
  const path = queryString ? `/dispatch/assignments/?${queryString}` : '/dispatch/assignments/';
  return client.request<DispatchAssignment[]>(path);
}

export function createDispatchAssignment(client: HttpClient, payload: DispatchAssignmentPayload) {
  return client.request<DispatchAssignment>('/dispatch/assignments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDispatchAssignment(
  client: HttpClient,
  dispatchAssignmentId: string,
  payload: Partial<DispatchAssignmentPayload>,
) {
  return client.request<DispatchAssignment>(`/dispatch/assignments/${dispatchAssignmentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
