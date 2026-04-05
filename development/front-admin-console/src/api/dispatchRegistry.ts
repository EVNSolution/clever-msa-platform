import type { DispatchAssignment, DispatchPlan, VehicleSchedule } from '../types';
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
  | 'operator_company_id'
  | 'dispatch_date'
  | 'shift_slot'
  | 'assignment_status'
  | 'assigned_at'
  | 'unassigned_at'
>;

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
      'dispatch_date' | 'assignment_status' | 'vehicle_schedule_id' | 'vehicle_id' | 'driver_id'
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
