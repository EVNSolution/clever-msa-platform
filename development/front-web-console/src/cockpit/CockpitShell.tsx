import { Outlet, useLocation } from 'react-router-dom';

import type { SessionPayload } from '../api/http';
import { CockpitGlobalHeader } from './CockpitGlobalHeader';
import {
  SubdomainAccordionNav,
  resolveTopLevelMenu,
  settlementChildNavItems,
  vehicleChildNavItems,
} from './SubdomainAccordionNav';
import { SubdomainSettlementSidebar } from './SubdomainSettlementSidebar';
import { SubdomainVehicleSidebar } from './SubdomainVehicleSidebar';

type CockpitShellProps = {
  companyName: string;
  onLogout: () => void | Promise<void>;
  session: SessionPayload;
};

export function CockpitShell({ companyName, onLogout, session }: CockpitShellProps) {
  const location = useLocation();
  const activeMenu = resolveTopLevelMenu(location.pathname);
  const shellClassName =
    activeMenu === 'vehicle'
      ? 'cockpit-shell cockpit-shell-vehicle'
      : activeMenu === 'settlement'
        ? 'cockpit-shell cockpit-shell-settlement'
        : 'cockpit-shell cockpit-shell-no-dashboard-sidebar';

  return (
    <div className={shellClassName}>
      <SubdomainAccordionNav activeMenu={activeMenu} companyName={companyName} />
      {activeMenu === 'vehicle' ? <SubdomainVehicleSidebar items={vehicleChildNavItems} /> : null}
      {activeMenu === 'settlement' ? <SubdomainSettlementSidebar items={settlementChildNavItems} /> : null}
      <div className="cockpit-main-panel">
        <CockpitGlobalHeader onLogout={onLogout} session={session} />
        <main className="cockpit-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
