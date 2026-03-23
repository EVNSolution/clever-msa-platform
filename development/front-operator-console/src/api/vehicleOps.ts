import type { VehicleOpsSummary } from '../types';
import type { HttpClient } from './http';

export function listVehicleOps(client: HttpClient) {
  return client.request<VehicleOpsSummary[]>('/vehicle-ops/vehicles/');
}

export function getVehicleOps(client: HttpClient, vehicleId: string) {
  return client.request<VehicleOpsSummary>(`/vehicle-ops/vehicles/${vehicleId}/`);
}
