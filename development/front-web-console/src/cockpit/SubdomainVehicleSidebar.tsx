import { NavLink, useLocation } from 'react-router-dom';

export type VehicleChildNavItem = {
  slug: 'home' | 'drivers' | 'vehicles' | 'assignments';
  label: string;
  to: string;
};

type SubdomainVehicleSidebarProps = {
  items: VehicleChildNavItem[];
};

export function SubdomainVehicleSidebar({ items }: SubdomainVehicleSidebarProps) {
  const location = useLocation();

  return (
    <aside className="cockpit-child-nav cockpit-detached-sidebar" data-testid="subdomain-vehicle-sidebar">
      <nav aria-label="차량 메뉴" className="cockpit-child-nav cockpit-detached-sidebar">
        {items.map((item) => (
          <NavLink
            className={({ isActive }) => {
              const isVehicleBranch =
                item.slug === 'vehicles' &&
                location.pathname !== '/vehicles/home' &&
                (location.pathname === '/vehicles' || location.pathname.startsWith('/vehicles/'));
              const isLinkActive = item.slug === 'vehicles' ? isVehicleBranch : isActive;
              return isLinkActive ? 'cockpit-nav-child-link is-active' : 'cockpit-nav-child-link';
            }}
            end={item.to === '/vehicles/home'}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
