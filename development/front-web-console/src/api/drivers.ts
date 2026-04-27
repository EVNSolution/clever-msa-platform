import type { DriverProfile, EnsureDriversByExternalUserNamesResult } from '../types';
import { ApiError, getErrorMessage, type HttpClient } from './http';

export type DriverPayload = Omit<DriverProfile, 'driver_id' | 'route_no'>;

export function listDrivers(
  client: HttpClient,
  filters?: Partial<Pick<DriverProfile, 'company_id' | 'fleet_id' | 'external_user_name'>>,
) {
  const query = new URLSearchParams();
  if (filters?.company_id) {
    query.set('company_id', filters.company_id);
  }
  if (filters?.fleet_id) {
    query.set('fleet_id', filters.fleet_id);
  }
  if (filters?.external_user_name) {
    query.set('external_user_name', filters.external_user_name);
  }
  const queryString = query.toString();
  const path = queryString ? `/drivers/?${queryString}` : '/drivers/';
  return client.request<DriverProfile[]>(path);
}

export function getDriver(client: HttpClient, driverRef: string) {
  return client.request<DriverProfile>(`/drivers/${driverRef}/`);
}

export function createDriver(client: HttpClient, payload: DriverPayload) {
  return client.request<DriverProfile>('/drivers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDriver(client: HttpClient, driverRef: string, payload: Partial<DriverPayload>) {
  return client.request<DriverProfile>(`/drivers/${driverRef}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteDriver(client: HttpClient, driverRef: string) {
  return client.request<void>(`/drivers/${driverRef}/`, {
    method: 'DELETE',
  });
}

export function ensureDriversByExternalUserNames(
  client: HttpClient,
  payload: Pick<DriverProfile, 'company_id' | 'fleet_id'> & {
    external_user_names: string[];
  },
) {
  return client.request<EnsureDriversByExternalUserNamesResult>('/drivers/ensure-external-users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getEnsureDriversByExternalUserNamesErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return getErrorMessage(error);
  }

  switch (error.status) {
    case 400:
      return '배송원 자동 생성 요청이 올바르지 않습니다. 회사, 플릿, 배송원 이름을 다시 확인해 주세요.';
    case 401:
      return '로그인 세션이 없어 배송원을 생성할 수 없습니다. 다시 로그인한 뒤 다시 시도해 주세요.';
    case 403:
      return '현재 계정으로는 배송원 자동 생성 권한이 없습니다. 배송원 관리 권한을 확인해 주세요.';
    case 404:
      return '배송원 자동 생성 API를 찾을 수 없습니다. 서비스 배포 상태를 확인해 주세요.';
    case 405:
      return '현재 배송원 자동 생성 API가 POST 요청을 처리하지 못하고 있습니다. 서비스 배포 상태를 확인해 주세요.';
    default:
      return getErrorMessage(error);
  }
}
