import type { Company, Fleet } from '../types';
import type { HttpClient } from './http';
import { DEFAULT_API_BASE_URL, parseApiResponse, resolveApiUrl, toApiError } from './http';

export function listCompanies(client: HttpClient) {
  return client.request<Company[]>('/org/companies/');
}

export async function listPublicCompanies(baseUrl = DEFAULT_API_BASE_URL): Promise<Company[]> {
  const response = await fetch(resolveApiUrl(baseUrl, '/org/companies/public/'), {
    credentials: 'include',
  });
  const payload = await parseApiResponse(response);
  if (!response.ok || !Array.isArray(payload)) {
    throw toApiError(response, payload);
  }
  return payload as Company[];
}

export function getCompany(client: HttpClient, companyRef: string) {
  return client.request<Company>(`/org/companies/${companyRef}/`);
}

export function createCompany(client: HttpClient, payload: Pick<Company, 'name'>) {
  return client.request<Company>('/org/companies/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCompany(client: HttpClient, companyRef: string, payload: Partial<Pick<Company, 'name'>>) {
  return client.request<Company>(`/org/companies/${companyRef}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteCompany(client: HttpClient, companyRef: string) {
  return client.request<void>(`/org/companies/${companyRef}/`, {
    method: 'DELETE',
  });
}

export function listFleets(client: HttpClient) {
  return client.request<Fleet[]>('/org/fleets/');
}

export function getFleet(client: HttpClient, fleetRef: string) {
  return client.request<Fleet>(`/org/fleets/${fleetRef}/`);
}

export function createFleet(client: HttpClient, payload: Pick<Fleet, 'company_id' | 'name'>) {
  return client.request<Fleet>('/org/fleets/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateFleet(client: HttpClient, fleetRef: string, payload: Partial<Pick<Fleet, 'company_id' | 'name'>>) {
  return client.request<Fleet>(`/org/fleets/${fleetRef}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteFleet(client: HttpClient, fleetRef: string) {
  return client.request<void>(`/org/fleets/${fleetRef}/`, {
    method: 'DELETE',
  });
}
