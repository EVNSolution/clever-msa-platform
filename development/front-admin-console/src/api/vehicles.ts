import type { VehicleMaster, VehicleOperatorAccess } from '../types';
import type { HttpClient } from './http';

export type VehicleMasterPayload = Omit<VehicleMaster, 'vehicle_id' | 'created_at' | 'updated_at'>;
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

export function updateVehicleMaster(client: HttpClient, vehicleId: string, payload: VehicleMasterPayload) {
  return client.request<VehicleMaster>(`/vehicles/vehicle-masters/${vehicleId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listVehicleOperatorAccesses(client: HttpClient) {
  return client.request<VehicleOperatorAccess[]>('/vehicles/vehicle-operator-accesses/');
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
