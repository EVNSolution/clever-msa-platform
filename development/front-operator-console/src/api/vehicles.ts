import type { Vehicle } from '../types';
import type { HttpClient } from './http';

export type VehiclePayload = Omit<Vehicle, 'vehicle_id'>;

export function listVehicles(client: HttpClient) {
  return client.request<Vehicle[]>('/vehicles/');
}

export function getVehicle(client: HttpClient, vehicleId: string) {
  return client.request<Vehicle>(`/vehicles/${vehicleId}/`);
}
