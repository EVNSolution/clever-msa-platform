import type { DriverProfile } from '../types';
import type { HttpClient } from './http';

export type DriverPayload = Omit<DriverProfile, 'driver_id' | 'route_no'>;

export function listDrivers(client: HttpClient) {
  return client.request<DriverProfile[]>('/drivers/');
}

export function getDriver(client: HttpClient, driverRef: string) {
  return client.request<DriverProfile>(`/drivers/${driverRef}/`);
}

export function createDriver(client: HttpClient, payload: DriverPayload) {
  return client.request<DriverProfile>('/drivers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDriver(client: HttpClient, driverRef: string, payload: Partial<DriverPayload>) {
  return client.request<DriverProfile>(`/drivers/${driverRef}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDriver(client: HttpClient, driverRef: string) {
  return client.request<void>(`/drivers/${driverRef}/`, {
    method: 'DELETE',
  });
}
