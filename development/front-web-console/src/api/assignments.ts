import type { DriverVehicleAssignment } from '../types';
import type { HttpClient } from './http';

export type DriverVehicleAssignmentPayload = Omit<
  DriverVehicleAssignment,
  'driver_vehicle_assignment_id' | 'route_no' | 'created_at' | 'updated_at'
>;
export type DriverVehicleAssignmentUpdatePayload = Partial<DriverVehicleAssignmentPayload>;

export function listAssignments(client: HttpClient) {
  return client.request<DriverVehicleAssignment[]>('/driver-vehicle-assignments/assignments/');
}

export function getAssignment(client: HttpClient, assignmentRef: string) {
  return client.request<DriverVehicleAssignment>(
    `/driver-vehicle-assignments/assignments/${assignmentRef}/`,
  );
}

export function createAssignment(client: HttpClient, payload: DriverVehicleAssignmentPayload) {
  return client.request<DriverVehicleAssignment>('/driver-vehicle-assignments/assignments/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAssignment(
  client: HttpClient,
  assignmentRef: string,
  payload: DriverVehicleAssignmentUpdatePayload,
) {
  return client.request<DriverVehicleAssignment>(
    `/driver-vehicle-assignments/assignments/${assignmentRef}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}
