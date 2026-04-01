import type { AccountSummary, Company, DriverProfile, Fleet } from './types';

function requireRouteNo(routeNo: number | undefined, resourceLabel: string): string {
  if (routeNo == null) {
    throw new Error(`${resourceLabel} route_no is required for browser routes.`);
  }
  return String(routeNo);
}

export function getAccountRouteRef(account: Pick<AccountSummary, 'route_no'>): string {
  return requireRouteNo(account.route_no, 'account');
}

export function getCompanyRouteRef(company: Pick<Company, 'route_no'>): string {
  return requireRouteNo(company.route_no, 'company');
}

export function getFleetRouteRef(fleet: Pick<Fleet, 'route_no'>): string {
  return requireRouteNo(fleet.route_no, 'fleet');
}

export function getDriverRouteRef(driver: Pick<DriverProfile, 'route_no'>): string {
  return requireRouteNo(driver.route_no, 'driver');
}

export function getVehicleRouteRef(vehicle: { route_no?: number }): string {
  return requireRouteNo(vehicle.route_no, 'vehicle');
}
