import type { Company, Fleet } from '../types';
import type { HttpClient } from './http';

export function listCompanies(client: HttpClient) {
  return client.request<Company[]>('/org/companies/');
}

export function listFleets(client: HttpClient) {
  return client.request<Fleet[]>('/org/fleets/');
}
