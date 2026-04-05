import type { GeneralNotification } from '../types';
import type { HttpClient } from './http';

type NotificationListParams = {
  status?: GeneralNotification['status'];
  category?: string;
  source_type?: string;
};

export function listGeneralNotifications(client: HttpClient, params: NotificationListParams = {}) {
  const query = new URLSearchParams();
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.category) {
    query.set('category', params.category);
  }
  if (params.source_type) {
    query.set('source_type', params.source_type);
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return client.request<GeneralNotification[]>(`/notifications/general/${suffix}`);
}

export function updateNotificationStatus(client: HttpClient, notificationId: string, status: GeneralNotification['status']) {
  return client.request<GeneralNotification>(`/notifications/general/${notificationId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
