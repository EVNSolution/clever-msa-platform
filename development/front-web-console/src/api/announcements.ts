import type { Announcement } from '../types';
import type { HttpClient } from './http';

export type AnnouncementWritePayload = {
  slug: string;
  title: string;
  body: string;
  status: Announcement['status'];
  exposure_scope: Announcement['exposure_scope'];
  published_at: string | null;
  expires_at: string | null;
  is_pinned: boolean;
  display_order: number;
};

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

export async function getAnnouncementBySlug(client: HttpClient, slug: string) {
  const announcements = await listAnnouncements(client, { slug });
  const announcement = announcements.find((item) => item.slug === slug);
  if (!announcement) {
    throw new Error('공지를 찾을 수 없습니다.');
  }
  return announcement;
}

export function createAnnouncement(client: HttpClient, payload: AnnouncementWritePayload) {
  return client.request<Announcement>('/announcements/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAnnouncement(client: HttpClient, announcementId: string, payload: Partial<AnnouncementWritePayload>) {
  return client.request<Announcement>(`/announcements/${announcementId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
