import type { Announcement } from '../types';
import type { HttpClient } from './http';

type AnnouncementListParams = {
  status?: Announcement['status'];
  exposure_scope?: Announcement['exposure_scope'];
  slug?: string;
};

export function listAnnouncements(client: HttpClient, params: AnnouncementListParams = {}) {
  const query = new URLSearchParams();
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.exposure_scope) {
    query.set('exposure_scope', params.exposure_scope);
  }
  if (params.slug) {
    query.set('slug', params.slug);
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return client.request<Announcement[]>(`/announcements/${suffix}`);
}
