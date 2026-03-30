import type { Company, DriverProfile, Fleet } from '../types';

export function getCompanyName(companies: Company[], companyId: string) {
  return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
}

export function getFleetName(fleets: Fleet[], fleetId: string) {
  return fleets.find((fleet) => fleet.fleet_id === fleetId)?.name ?? '미확인 플릿';
}

export function getDriverName(drivers: DriverProfile[], driverId: string) {
  return drivers.find((driver) => driver.driver_id === driverId)?.name ?? '미확인 배송원';
}

export function getFleetOptions(fleets: Fleet[], companyId: string) {
  return fleets.filter((fleet) => fleet.company_id === companyId);
}

export function stringifyJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

export function parseJsonInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  return JSON.parse(trimmed) as Record<string, unknown>;
}
