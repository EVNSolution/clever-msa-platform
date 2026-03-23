import type { SettlementItem, SettlementRun } from '../types';
import type { HttpClient } from './http';

export type SettlementRunPayload = Omit<SettlementRun, 'settlement_run_id'>;
export type SettlementItemPayload = Omit<SettlementItem, 'settlement_item_id'>;

export function listSettlementRuns(client: HttpClient) {
  return client.request<SettlementRun[]>('/settlements/runs/');
}

export function createSettlementRun(client: HttpClient, payload: SettlementRunPayload) {
  return client.request<SettlementRun>('/settlements/runs/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSettlementRun(
  client: HttpClient,
  settlementRunId: string,
  payload: Partial<SettlementRunPayload>,
) {
  return client.request<SettlementRun>(`/settlements/runs/${settlementRunId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteSettlementRun(client: HttpClient, settlementRunId: string) {
  return client.request<void>(`/settlements/runs/${settlementRunId}/`, {
    method: 'DELETE',
  });
}

export function listSettlementItems(client: HttpClient) {
  return client.request<SettlementItem[]>('/settlements/items/');
}

export function createSettlementItem(client: HttpClient, payload: SettlementItemPayload) {
  return client.request<SettlementItem>('/settlements/items/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSettlementItem(
  client: HttpClient,
  settlementItemId: string,
  payload: Partial<SettlementItemPayload>,
) {
  return client.request<SettlementItem>(`/settlements/items/${settlementItemId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteSettlementItem(client: HttpClient, settlementItemId: string) {
  return client.request<void>(`/settlements/items/${settlementItemId}/`, {
    method: 'DELETE',
  });
}
