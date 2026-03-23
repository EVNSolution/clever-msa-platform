import type { Driver360Summary } from '../types';
import type { HttpClient } from './http';


export function getDriver360(client: HttpClient, driverId: string) {
  return client.request<Driver360Summary>(`/driver-ops/drivers/${driverId}/`);
}
