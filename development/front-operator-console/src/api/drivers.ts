import type { DriverProfile } from '../types';
import type { HttpClient } from './http';

export type DriverPayload = Omit<DriverProfile, 'driver_id'>;

export function listDrivers(client: HttpClient) {
  return client.request<DriverProfile[]>('/drivers/');
}

export function createDriver(client: HttpClient, payload: DriverPayload) {
  return client.request<DriverProfile>('/drivers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDriver(client: HttpClient, driverId: string, payload: Partial<DriverPayload>) {
  return client.request<DriverProfile>(`/drivers/${driverId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
