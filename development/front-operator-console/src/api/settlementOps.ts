import type { DriverLatestSettlement, SettlementItem, SettlementRun } from '../types';
import type { HttpClient } from './http';

export function listSettlementReadRuns(client: HttpClient) {
  return client.request<SettlementRun[]>('/settlement-ops/runs/');
}

export function listSettlementReadItems(client: HttpClient) {
  return client.request<SettlementItem[]>('/settlement-ops/items/');
}

export function getDriverLatestSettlement(client: HttpClient, driverId: string) {
  return client.request<DriverLatestSettlement>(`/settlement-ops/drivers/${driverId}/latest-settlement/`);
}
