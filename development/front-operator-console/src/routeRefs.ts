import type { DriverProfile } from './types';

export function getDriverRouteRef(driver: Pick<DriverProfile, 'route_no'>): string {
  if (driver.route_no == null) {
    throw new Error('driver route_no is required for browser routes.');
  }

  return String(driver.route_no);
}
