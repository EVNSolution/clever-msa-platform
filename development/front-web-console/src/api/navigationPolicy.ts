import type { HttpClient } from './http';

export type CurrentNavigationPolicy = {
  allowed_nav_keys: string[];
  source: string;
};

export function getNavigationPolicy(client: HttpClient) {
  return client.request<CurrentNavigationPolicy>('/auth/identity-navigation-policy/');
}
