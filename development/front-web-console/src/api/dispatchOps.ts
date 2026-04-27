import type { DispatchBoardRow, DispatchBoardSummary } from '../types';
import type { HttpClient } from './http';

function buildQuery(dispatchDate: string, fleetId: string) {
  const query = new URLSearchParams();
  query.set('dispatch_date', dispatchDate);
  query.set('fleet_id', fleetId);
  return query.toString();
}

export function getDispatchBoard(client: HttpClient, dispatchDate: string, fleetId: string) {
  return client.request<DispatchBoardRow[]>(`/dispatch-ops/board/?${buildQuery(dispatchDate, fleetId)}`);
}

export function getDispatchSummary(client: HttpClient, dispatchDate: string, fleetId: string) {
  return client.request<DispatchBoardSummary>(`/dispatch-ops/summary/?${buildQuery(dispatchDate, fleetId)}`);
}
