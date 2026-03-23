import type { SettlementItem, SettlementRun } from '../types';
import type { HttpClient } from './http';

export function listSettlementRuns(client: HttpClient) {
  return client.request<SettlementRun[]>('/settlements/runs/');
}

export function listSettlementItems(client: HttpClient) {
  return client.request<SettlementItem[]>('/settlements/items/');
}
