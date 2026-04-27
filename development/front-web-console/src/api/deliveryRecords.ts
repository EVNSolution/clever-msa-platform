import type { DailyDeliveryInputSnapshot, DeliveryRecord } from '../types';
import type { HttpClient } from './http';

export type DeliveryRecordPayload = Omit<DeliveryRecord, 'delivery_record_id'>;
export type DailyDeliveryInputSnapshotPayload = Omit<
  DailyDeliveryInputSnapshot,
  'daily_delivery_input_snapshot_id'
>;
export type DispatchSnapshotBootstrapPayload = {
  company_id: string;
  fleet_id: string;
  service_date: string;
};

export type DispatchSnapshotBootstrapResult = {
  created_count: number;
  skipped_count: number;
  created_snapshot_ids: string[];
};

export type DeliveryRecordListFilters = Partial<
  Pick<DeliveryRecord, 'company_id' | 'fleet_id' | 'driver_id' | 'service_date' | 'status'>
>;

export function listDeliveryRecords(client: HttpClient, filters?: DeliveryRecordListFilters) {
  const query = new URLSearchParams();

  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.driver_id) {
    query.set('driver_id', filters.driver_id);
  }
  if (filters?.service_date) {
    query.set('service_date', filters.service_date);
  }
  if (filters?.status) {
    query.set('status', filters.status);
  }

  const queryString = query.toString();
  const path = queryString
    ? `/delivery-record/records/?${queryString}`
    : '/delivery-record/records/';

  return client.request<DeliveryRecord[]>(path);
}

export function createDeliveryRecord(client: HttpClient, payload: DeliveryRecordPayload) {
  return client.request<DeliveryRecord>('/delivery-record/records/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDeliveryRecord(
  client: HttpClient,
  deliveryRecordId: string,
  payload: Partial<DeliveryRecordPayload>,
) {
  return client.request<DeliveryRecord>(`/delivery-record/records/${deliveryRecordId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDeliveryRecord(client: HttpClient, deliveryRecordId: string) {
  return client.request<void>(`/delivery-record/records/${deliveryRecordId}/`, {
    method: 'DELETE',
  });
}

export function listDailyDeliveryInputSnapshots(
  client: HttpClient,
  filters?: Partial<
    Pick<DailyDeliveryInputSnapshot, 'company_id' | 'fleet_id' | 'driver_id' | 'service_date' | 'status'>
  >,
) {
  const query = new URLSearchParams();
  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.driver_id) {
    query.set('driver_id', filters.driver_id);
  }
  if (filters?.service_date) {
    query.set('service_date', filters.service_date);
  }
  if (filters?.status) {
    query.set('status', filters.status);
  }
  const queryString = query.toString();
  const path = queryString
    ? `/delivery-record/daily-snapshots/?${queryString}`
    : '/delivery-record/daily-snapshots/';
  return client.request<DailyDeliveryInputSnapshot[]>(path);
}

export function createDailyDeliveryInputSnapshot(
  client: HttpClient,
  payload: DailyDeliveryInputSnapshotPayload,
) {
  return client.request<DailyDeliveryInputSnapshot>('/delivery-record/daily-snapshots/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDailyDeliveryInputSnapshot(
  client: HttpClient,
  snapshotId: string,
  payload: Partial<DailyDeliveryInputSnapshotPayload>,
) {
  return client.request<DailyDeliveryInputSnapshot>(
    `/delivery-record/daily-snapshots/${snapshotId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}

export function deleteDailyDeliveryInputSnapshot(client: HttpClient, snapshotId: string) {
  return client.request<void>(`/delivery-record/daily-snapshots/${snapshotId}/`, {
    method: 'DELETE',
  });
}

export function bootstrapDailySnapshotsFromDispatch(
  client: HttpClient,
  payload: DispatchSnapshotBootstrapPayload,
) {
  return client.request<DispatchSnapshotBootstrapResult>(
    '/delivery-record/daily-snapshots/bootstrap-from-dispatch/',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}
