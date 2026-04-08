import type { SessionPayload } from './api/http';
import {
  canAccessAccountsScope,
  canAccessCompanyScope,
  canAccessDispatchScope,
  canAccessDriverScope,
  canAccessPersonnelDocumentScope,
  canAccessRegionScope,
  canAccessSettlementScope,
  canAccessVehicleScope,
} from './authScopes';

type Visibility = (session: SessionPayload) => boolean;

export type NavigationItem = {
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
  label: '대시보드',
  to: '/',
  isVisible: alwaysVisible,
};

export const accountItem: NavigationItem = {
  label: '내 계정',
  to: '/account',
  isVisible: alwaysVisible,
  matchPrefixes: ['/account'],
};

const organizationItems: NavigationItem[] = [
  {
    label: '회사',
    to: '/companies',
    isVisible: canAccessCompanyScope,
    matchPrefixes: ['/companies'],
  },
  {
    label: '권역',
    to: '/regions',
    isVisible: canAccessRegionScope,
    matchPrefixes: ['/regions'],
  },
];

const vehicleItems: NavigationItem[] = [
  {
    label: '차량',
    to: '/vehicles',
    isVisible: canAccessVehicleScope,
    matchPrefixes: ['/vehicles'],
  },
  {
    label: '차량 배정',
    to: '/vehicle-assignments',
    isVisible: canAccessVehicleScope,
    matchPrefixes: ['/vehicle-assignments'],
  },
];

const driverItems: NavigationItem[] = [
  {
    label: '배송원',
    to: '/drivers',
    isVisible: canAccessDriverScope,
    matchPrefixes: ['/drivers'],
  },
  {
    label: '인사문서',
    to: '/personnel-documents',
    isVisible: canAccessPersonnelDocumentScope,
    matchPrefixes: ['/personnel-documents'],
  },
];

const operationsItems: NavigationItem[] = [
  {
    label: '계정 요청',
    to: '/accounts',
    isVisible: canAccessAccountsScope,
    matchPrefixes: ['/accounts'],
  },
  {
    label: '공지',
    to: '/announcements',
    isVisible: canAccessAccountsScope,
    matchPrefixes: ['/announcements'],
  },
  {
    label: '지원',
    to: '/support',
    isVisible: canAccessAccountsScope,
    matchPrefixes: ['/support'],
  },
  {
    label: '알림',
    to: '/notifications',
    isVisible: canAccessAccountsScope,
    matchPrefixes: ['/notifications'],
  },
];

const dispatchItems: NavigationItem[] = [
  {
    label: '배차',
    to: '/dispatch/boards',
    isVisible: canAccessDispatchScope,
    matchPrefixes: ['/dispatch'],
  },
];

const settlementItems: NavigationItem[] = [
  {
    label: '정산',
    to: '/settlements/overview',
    isVisible: canAccessSettlementScope,
    matchPrefixes: ['/settlements'],
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
    key: 'operations',
    label: '운영',
    isVisible: (session) => anyVisible(operationsItems, session),
    items: operationsItems,
  },
  {
    key: 'dispatch',
    label: '배차 계획',
    isVisible: (session) => anyVisible(dispatchItems, session),
    items: dispatchItems,
  },
  {
    key: 'settlement',
    label: '정산',
    isVisible: (session) => anyVisible(settlementItems, session),
    items: settlementItems,
    displayMode: 'link',
  },
];

export function isNavigationItemActive(pathname: string, item: NavigationItem) {
  if (pathname === item.to) {
    return true;
  }

  return (item.matchPrefixes ?? []).some((prefix) => pathname.startsWith(prefix));
}

export function isNavigationGroupActive(pathname: string, group: NavigationGroup) {
  return group.items.some((item) => isNavigationItemActive(pathname, item));
}
