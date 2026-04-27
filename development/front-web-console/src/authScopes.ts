import type { SessionPayload } from './api/http';

export type ManagerRole = 'company_super_admin' | 'vehicle_manager' | 'settlement_manager' | 'fleet_manager';
export type SettlementContextSelectorMode = 'company_and_fleet' | 'fleet_only' | 'locked';
export type NavItemKey =
  | 'dashboard'
  | 'account'
  | 'manager_navigation_policy'
  | 'manager_roles'
  | 'company_navigation_policy'
  | 'accounts'
  | 'announcements'
  | 'support'
  | 'companies'
  | 'regions'
  | 'vehicles'
  | 'vehicle_assignments'
  | 'drivers'
  | 'personnel_documents'
  | 'dispatch'
  | 'settlements';

export const allNavItemKeys: NavItemKey[] = [
  'dashboard',
  'account',
  'manager_navigation_policy',
  'manager_roles',
  'company_navigation_policy',
  'accounts',
  'announcements',
  'support',
  'companies',
  'regions',
  'vehicles',
  'vehicle_assignments',
  'drivers',
  'personnel_documents',
  'dispatch',
  'settlements',
];

export function isSystemAdmin(session: SessionPayload) {
  return session.activeAccount?.accountType === 'system_admin';
}

export function getManagerRole(session: SessionPayload): ManagerRole | null {
  if (session.activeAccount?.accountType !== 'manager') {
    return null;
  }

  const roleType = session.activeAccount.roleType;
  if (
    roleType === 'company_super_admin' ||
    roleType === 'vehicle_manager' ||
    roleType === 'settlement_manager' ||
    roleType === 'fleet_manager'
  ) {
    return roleType;
  }

  return null;
}

export function canAccessAccountsScope(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) !== null;
}

export function canAccessCompanyScope(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) === 'company_super_admin';
}

export function canAccessVehicleScope(session: SessionPayload) {
  const role = getManagerRole(session);
  return isSystemAdmin(session) || role === 'company_super_admin' || role === 'vehicle_manager';
}

export function canAccessSettlementScope(session: SessionPayload) {
  const role = getManagerRole(session);
  return (
    isSystemAdmin(session) ||
    role === 'company_super_admin' ||
    role === 'settlement_manager' ||
    role === 'fleet_manager'
  );
}

export function canManageSettlementPricingScope(session: SessionPayload) {
  return canAccessSettlementScope(session);
}

export function canManageGlobalSettlementCriteria(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) === 'company_super_admin';
}

export function getSettlementContextSelectorMode(
  session: SessionPayload,
): SettlementContextSelectorMode {
  if (isSystemAdmin(session)) {
    return 'company_and_fleet';
  }

  const scopeUiMode = session.activeAccount?.scopeUiMode;
  if (scopeUiMode === 'fleet_fixed_single') {
    return 'locked';
  }

  return 'fleet_only';
}

export function canAccessDispatchScope(session: SessionPayload) {
  return canAccessSettlementScope(session);
}

export function canAccessRegionScope(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) !== null;
}

export function canManageRegionScope(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) === 'company_super_admin';
}

export function canAccessDriverScope(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) !== null;
}

export function canAccessPersonnelDocumentScope(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) !== null;
}

export function canManagePersonnelDocumentScope(session: SessionPayload) {
  const role = getManagerRole(session);
  return (
    isSystemAdmin(session) ||
    role === 'company_super_admin' ||
    role === 'settlement_manager' ||
    role === 'fleet_manager'
  );
}

export function canManageDriverProfileScope(session: SessionPayload) {
  const role = getManagerRole(session);
  return (
    isSystemAdmin(session) ||
    role === 'company_super_admin' ||
    role === 'settlement_manager' ||
    role === 'fleet_manager'
  );
}

export function canManageAnnouncementScope(session: SessionPayload) {
  const role = getManagerRole(session);
  return isSystemAdmin(session) || role === 'company_super_admin';
}

export function canManageSupportScope(session: SessionPayload) {
  return canManageAnnouncementScope(session);
}

export function canManageCompanySuperAdmin(session: SessionPayload) {
  return isSystemAdmin(session);
}

export function canManageCompanyNavigationPolicy(session: SessionPayload) {
  return getManagerRole(session) === 'company_super_admin';
}

export function canManageManagerRoles(session: SessionPayload) {
  return isSystemAdmin(session) || getManagerRole(session) === 'company_super_admin';
}

export function getManageableManagerRoleOptions(session: SessionPayload): ManagerRole[] {
  if (canManageCompanySuperAdmin(session)) {
    return ['company_super_admin', 'vehicle_manager', 'settlement_manager', 'fleet_manager'];
  }

  return ['vehicle_manager', 'settlement_manager', 'fleet_manager'];
}

export function getAccountsScopeDescription(session: SessionPayload) {
  if (isSystemAdmin(session)) {
    return '전체 회사의 요청과 관리자 계정을 관리합니다.';
  }

  const role = getManagerRole(session);
  if (role === 'company_super_admin') {
    return '현재 권한으로 처리할 수 있는 하위 요청과 관리자 계정만 표시합니다.';
  }

  return '내 계정과 같은 회사의 배송원 계정 요청만 처리할 수 있습니다.';
}

export function getDefaultAllowedNavKeys(session: SessionPayload): NavItemKey[] {
  const allowed = new Set<NavItemKey>(['dashboard', 'account']);

  if (isSystemAdmin(session)) {
    allowed.add('manager_navigation_policy');
  }

  if (canManageManagerRoles(session)) {
    allowed.add('manager_roles');
  }

  if (canManageCompanyNavigationPolicy(session)) {
    allowed.add('company_navigation_policy');
  }

  if (canAccessAccountsScope(session)) {
    allowed.add('accounts');
    allowed.add('announcements');
    allowed.add('support');
  }

  if (canAccessCompanyScope(session)) {
    allowed.add('companies');
  }

  if (canAccessRegionScope(session)) {
    allowed.add('regions');
  }

  if (canAccessVehicleScope(session)) {
    allowed.add('vehicles');
    allowed.add('vehicle_assignments');
  }

  if (canAccessDriverScope(session)) {
    allowed.add('drivers');
  }

  if (canAccessPersonnelDocumentScope(session)) {
    allowed.add('personnel_documents');
  }

  if (canAccessDispatchScope(session)) {
    allowed.add('dispatch');
  }

  if (canAccessSettlementScope(session)) {
    allowed.add('settlements');
  }

  return allNavItemKeys.filter((key) => allowed.has(key));
}
