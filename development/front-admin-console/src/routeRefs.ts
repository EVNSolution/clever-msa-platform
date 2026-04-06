import type { Announcement, Company, DriverProfile, DriverVehicleAssignment, Fleet, Region } from './types';

function requireRouteNo(routeNo: number | undefined, resourceLabel: string): string {
  if (routeNo == null) {
    throw new Error(`${resourceLabel} route_no is required for browser routes.`);
  }
  return String(routeNo);
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

export function getAssignmentRouteRef(
  assignment: Pick<DriverVehicleAssignment, 'route_no'>,
): string {
  return requireRouteNo(assignment.route_no, 'assignment');
}

export function getAnnouncementRouteRef(announcement: Pick<Announcement, 'slug'>): string {
  return announcement.slug;
}

export function getRegionRouteRef(region: Pick<Region, 'region_code'>): string {
  return region.region_code;
}
