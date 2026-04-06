import type { GeneralNotification, PushDeliveryLog } from '../types';
import type { HttpClient } from './http';

type NotificationListParams = {
  status?: GeneralNotification['status'];
  category?: string;
  source_type?: string;
  recipient_account_id?: string;
};

type PushLogListParams = {
  delivery_status?: PushDeliveryLog['delivery_status'];
  event_type?: string;
  target_account_id?: string;
};

export type PushSendPayload = {
  target_account_id: string;
  event_type: string;
  category: string;
  source_type: string;
  source_ref: string;
  title: string;
  body: string;
  create_inbox: boolean;
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
  if (params.recipient_account_id) {
    query.set('recipient_account_id', params.recipient_account_id);
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

export function createPushSend(client: HttpClient, payload: PushSendPayload) {
  return client.request<PushDeliveryLog>('/notifications/push-sends/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listPushDeliveryLogs(client: HttpClient, params: PushLogListParams = {}) {
  const query = new URLSearchParams();
  if (params.delivery_status) {
    query.set('delivery_status', params.delivery_status);
  }
  if (params.event_type) {
    query.set('event_type', params.event_type);
  }
  if (params.target_account_id) {
    query.set('target_account_id', params.target_account_id);
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return client.request<PushDeliveryLog[]>(`/notifications/push-logs/${suffix}`);
}
