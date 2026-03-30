import type { AccountSummary, Company, Fleet } from './types';

export function getAccountRouteRef(account: Pick<AccountSummary, 'account_id' | 'public_ref'>): string {
  return account.public_ref ?? account.account_id;
}

export function getCompanyRouteRef(company: Pick<Company, 'company_id' | 'public_ref'>): string {
  return company.public_ref ?? company.company_id;
}

export function getFleetRouteRef(fleet: Pick<Fleet, 'fleet_id' | 'public_ref'>): string {
  return fleet.public_ref ?? fleet.fleet_id;
}
