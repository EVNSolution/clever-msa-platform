import type { SessionPayload } from './api/http';
import {
  type NavItemKey,
  canAccessAccountsScope,
  canAccessCompanyScope,
  canAccessDispatchScope,
  canAccessDriverScope,
  canAccessPersonnelDocumentScope,
  canAccessRegionScope,
  canAccessSettlementScope,
  canAccessVehicleScope,
  isSystemAdmin,
  canManageManagerRoles,
} from './authScopes';

type Visibility = (session: SessionPayload) => boolean;

export type NavigationItem = {
  key: NavItemKey;
  label: string;
  to: string;
  isVisible: Visibility;
  matchPrefixes?: string[];
};

export type NavigationGroup = {
  key: string;
  label: string;
  isVisible: Visibility;
  items: NavigationItem[];
  displayMode?: 'group' | 'link';
};

const alwaysVisible: Visibility = () => true;

function anyVisible(items: NavigationItem[], session: SessionPayload) {
  return items.some((item) => item.isVisible(session));
}

export const dashboardItem: NavigationItem = {
  key: 'dashboard',
  label: '대시보드',
  to: '/',
  isVisible: alwaysVisible,
};

export const accountItem: NavigationItem = {
  key: 'account',
  label: '내 계정',
  to: '/me',
  isVisible: alwaysVisible,
  matchPrefixes: ['/me'],
};

const organizationItems: NavigationItem[] = [
  {
    key: 'companies',
    label: '회사',
    to: '/companies',
    isVisible: canAccessCompanyScope,
    matchPrefixes: ['/companies'],
  },
  {
    key: 'regions',
    label: '권역',
    to: '/regions',
    isVisible: canAccessRegionScope,
    matchPrefixes: ['/regions'],
  },
];

const vehicleItems: NavigationItem[] = [
  {
    key: 'vehicles',
    label: '차량',
    to: '/vehicles',
    isVisible: canAccessVehicleScope,
    matchPrefixes: ['/vehicles'],
  },
  {
    key: 'vehicle_assignments',
    label: '차량 배정',
    to: '/vehicle-assignments',
    isVisible: canAccessVehicleScope,
    matchPrefixes: ['/vehicle-assignments'],
  },
];

const driverItems: NavigationItem[] = [
  {
    key: 'drivers',
    label: '배송원',
    to: '/drivers',
    isVisible: canAccessDriverScope,
    matchPrefixes: ['/drivers'],
  },
  {
    key: 'personnel_documents',
    label: '인사문서',
    to: '/personnel-documents',
    isVisible: canAccessPersonnelDocumentScope,
    matchPrefixes: ['/personnel-documents'],
  },
];

const managementItems: NavigationItem[] = [
  {
    key: 'manager_navigation_policy',
    label: '메뉴 정책',
    to: '/admin/menu-policy',
    isVisible: isSystemAdmin,
    matchPrefixes: ['/admin/menu-policy'],
  },
  {
    key: 'manager_roles',
    label: '관리자 역할',
    to: '/admin/manager-roles',
    isVisible: canManageManagerRoles,
    matchPrefixes: ['/admin/manager-roles'],
  },
  {
    key: 'company_navigation_policy',
    label: '회사 메뉴 정책',
    to: '/company/menu-policy',
    isVisible: (session) => session.activeAccount?.accountType === 'manager' && session.activeAccount.roleType === 'company_super_admin',
    matchPrefixes: ['/company/menu-policy'],
  },
  {
    key: 'accounts',
    label: '계정 요청',
    to: '/admin/account-requests',
    isVisible: canAccessAccountsScope,
    matchPrefixes: ['/admin/account-requests'],
  },
];

const operationsItems: NavigationItem[] = [
  {
    key: 'announcements',
    label: '공지',
    to: '/announcements',
    isVisible: canAccessAccountsScope,
    matchPrefixes: ['/announcements'],
  },
  {
    key: 'support',
    label: '지원',
    to: '/support',
    isVisible: canAccessAccountsScope,
    matchPrefixes: ['/support'],
  },
];

const dispatchItems: NavigationItem[] = [
  {
    key: 'dispatch',
    label: '배차 계획',
    to: '/dispatch/boards',
    isVisible: canAccessDispatchScope,
    matchPrefixes: ['/dispatch/boards', '/dispatch/plans'],
  },
  {
    key: 'dispatch',
    label: '배차표 업로드',
    to: '/dispatch/uploads',
    isVisible: canAccessDispatchScope,
    matchPrefixes: ['/dispatch/uploads'],
  },
];

const settlementItems: NavigationItem[] = [
  {
    key: 'settlements',
    label: '정산 조회',
    to: '/settlements/overview',
    isVisible: canAccessSettlementScope,
    matchPrefixes: ['/settlements/overview'],
  },
  {
    key: 'settlements',
    label: '정산 처리',
    to: '/settlements/criteria',
    isVisible: canAccessSettlementScope,
    matchPrefixes: [
      '/settlements/criteria',
      '/settlements/inputs',
      '/settlements/runs',
      '/settlements/results',
    ],
  },
];

export const navigationGroups: NavigationGroup[] = [
  {
    key: 'organization',
    label: '조직 관리',
    isVisible: (session) => anyVisible(organizationItems, session),
    items: organizationItems,
  },
  {
    key: 'vehicle',
    label: '차량',
    isVisible: (session) => anyVisible(vehicleItems, session),
    items: vehicleItems,
  },
  {
    key: 'driver',
    label: '배송원',
    isVisible: (session) => anyVisible(driverItems, session),
    items: driverItems,
  },
  {
    key: 'management',
    label: '관리',
    isVisible: (session) => anyVisible(managementItems, session),
    items: managementItems,
  },
  {
    key: 'operations',
    label: '운영',
    isVisible: (session) => anyVisible(operationsItems, session),
    items: operationsItems,
  },
  {
    key: 'dispatch',
    label: '배차',
    isVisible: (session) => anyVisible(dispatchItems, session),
    items: dispatchItems,
  },
  {
    key: 'settlement',
    label: '정산',
    isVisible: (session) => anyVisible(settlementItems, session),
    items: settlementItems,
  },
];

export function isNavigationItemActive(pathname: string, item: NavigationItem) {
  if (pathname === item.to) {
    return true;
  }

  return (item.matchPrefixes ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isNavigationGroupActive(pathname: string, group: NavigationGroup) {
  return group.items.some((item) => isNavigationItemActive(pathname, item));
}
