import type { Driver360Summary } from '../types';
import type { HttpClient } from './http';

export function getDriver360(client: HttpClient, driverRef: string) {
  return client.request<Driver360Summary>(`/driver-ops/drivers/${driverRef}/`);
}
