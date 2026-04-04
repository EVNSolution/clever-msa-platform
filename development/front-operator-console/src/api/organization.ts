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

export function listFleets(client: HttpClient) {
  return client.request<Fleet[]>('/org/fleets/');
}
