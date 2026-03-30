import type { Company, Fleet } from '../types';
import type { HttpClient } from './http';

export function listCompanies(client: HttpClient) {
  return client.request<Company[]>('/org/companies/');
}

export function getCompany(client: HttpClient, companyId: string) {
  return client.request<Company>(`/org/companies/${companyId}/`);
}

export function createCompany(client: HttpClient, payload: Pick<Company, 'name'>) {
  return client.request<Company>('/org/companies/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCompany(client: HttpClient, companyId: string, payload: Partial<Pick<Company, 'name'>>) {
  return client.request<Company>(`/org/companies/${companyId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteCompany(client: HttpClient, companyId: string) {
  return client.request<void>(`/org/companies/${companyId}/`, {
    method: 'DELETE',
  });
}

export function listFleets(client: HttpClient) {
  return client.request<Fleet[]>('/org/fleets/');
}

export function getFleet(client: HttpClient, fleetId: string) {
  return client.request<Fleet>(`/org/fleets/${fleetId}/`);
}

export function createFleet(client: HttpClient, payload: Pick<Fleet, 'company_id' | 'name'>) {
  return client.request<Fleet>('/org/fleets/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateFleet(client: HttpClient, fleetId: string, payload: Partial<Pick<Fleet, 'company_id' | 'name'>>) {
  return client.request<Fleet>(`/org/fleets/${fleetId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteFleet(client: HttpClient, fleetId: string) {
  return client.request<void>(`/org/fleets/${fleetId}/`, {
    method: 'DELETE',
  });
}
