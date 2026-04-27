import type { VehicleMaster, VehicleOperatorAccess } from '../types';
import type { HttpClient } from './http';

export type VehicleMasterPayload = Omit<VehicleMaster, 'vehicle_id' | 'route_no' | 'created_at' | 'updated_at'>;
export type VehicleOperatorAccessPayload = Omit<
  VehicleOperatorAccess,
  'vehicle_operator_access_id' | 'created_at' | 'updated_at'
>;
export type VehicleOperatorAccessStatusPayload = Pick<
  VehicleOperatorAccess,
  'access_status' | 'ended_at'
>;

export function listVehicleMasters(client: HttpClient) {
  return client.request<VehicleMaster[]>('/vehicles/vehicle-masters/');
}

export function createVehicleMaster(client: HttpClient, payload: VehicleMasterPayload) {
  return client.request<VehicleMaster>('/vehicles/vehicle-masters/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getVehicleMaster(client: HttpClient, vehicleRef: string) {
  return client.request<VehicleMaster>(`/vehicles/vehicle-masters/${vehicleRef}/`);
}

export function updateVehicleMaster(client: HttpClient, vehicleRef: string, payload: VehicleMasterPayload) {
  return client.request<VehicleMaster>(`/vehicles/vehicle-masters/${vehicleRef}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listVehicleOperatorAccesses(
  client: HttpClient,
  filters?: Partial<Pick<VehicleOperatorAccess, 'vehicle_id' | 'operator_company_id' | 'access_status'>>,
) {
  const query = new URLSearchParams();
  if (filters?.vehicle_id) {
    query.set('vehicle_id', filters.vehicle_id);
  }
  if (filters?.operator_company_id) {
    query.set('operator_company_id', filters.operator_company_id);
  }
  if (filters?.access_status) {
    query.set('access_status', filters.access_status);
  }

  const queryString = query.toString();
  const path = queryString
    ? `/vehicles/vehicle-operator-accesses/?${queryString}`
    : '/vehicles/vehicle-operator-accesses/';
  return client.request<VehicleOperatorAccess[]>(path);
}

export function createVehicleOperatorAccess(client: HttpClient, payload: VehicleOperatorAccessPayload) {
  return client.request<VehicleOperatorAccess>('/vehicles/vehicle-operator-accesses/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateVehicleOperatorAccess(
  client: HttpClient,
  vehicleOperatorAccessId: string,
  payload: VehicleOperatorAccessStatusPayload,
) {
  return client.request<VehicleOperatorAccess>(
    `/vehicles/vehicle-operator-accesses/${vehicleOperatorAccessId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}
