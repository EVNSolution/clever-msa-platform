import type { DriverVehicleAssignment } from '../types';
import type { HttpClient } from './http';

export type DriverVehicleAssignmentPayload = Omit<
  DriverVehicleAssignment,
  'driver_vehicle_assignment_id' | 'created_at' | 'updated_at'
>;
export type DriverVehicleAssignmentStatusPayload = Pick<
  DriverVehicleAssignment,
  'assignment_status'
>;

export function listAssignments(client: HttpClient) {
  return client.request<DriverVehicleAssignment[]>('/driver-vehicle-assignments/assignments/');
}

export function createAssignment(client: HttpClient, payload: DriverVehicleAssignmentPayload) {
  return client.request<DriverVehicleAssignment>('/driver-vehicle-assignments/assignments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAssignment(
  client: HttpClient,
  driverVehicleAssignmentId: string,
  payload: DriverVehicleAssignmentStatusPayload,
) {
  return client.request<DriverVehicleAssignment>(
    `/driver-vehicle-assignments/assignments/${driverVehicleAssignmentId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}
