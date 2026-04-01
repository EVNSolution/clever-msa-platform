import type { VehicleOpsSummary } from '../types';
import type { HttpClient } from './http';

export function getVehicleOps(client: HttpClient, vehicleRef: string) {
  return client.request<VehicleOpsSummary>(`/vehicle-ops/vehicles/${vehicleRef}/`);
}
