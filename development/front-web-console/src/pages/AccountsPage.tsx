import { useEffect, useMemo, useState } from 'react';

import { approveManagedRequest, listManagedRequests, rejectManagedRequest } from '../api/authRequests';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { archiveManagerAccount, changeManagerAccountRole, listManageableManagerAccounts } from '../api/managerAccounts';
import { listCompanyManagerRoles } from '../api/managerRoles';
import { listCompanies, listFleets } from '../api/organization';
import { canManageCompanySuperAdmin, getAccountsScopeDescription } from '../authScopes';
import { PageLayout } from '../components/PageLayout';
import type {
  Company,
  CompanyManagerRole,
  Fleet,
  IdentitySignupRequestSummary,
  ManagerAccountSummary,
} from '../types';
import { formatAccountStatusLabel, formatRoleLabel } from '../uiLabels';

type AccountsPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

const dateOnlyFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function getRoleCodeOptions(
  companyRolesByCompanyId: Record<string, CompanyManagerRole[]>,
  companyId: string,
  options: {
    includeCompanySuperAdmin: boolean;
    currentRoleType?: string;
  },
) {
  const { includeCompanySuperAdmin, currentRoleType } = options;
  const roles = companyRolesByCompanyId[companyId] ?? [];
  const filtered = roles.filter((role) => includeCompanySuperAdmin || role.code !== 'company_super_admin');
  if (currentRoleType && filtered.some((role) => role.code === currentRoleType)) {
    return filtered;
  }
  if (!currentRoleType) {
    return filtered;
  }
  const currentRole = roles.find((role) => role.code === currentRoleType);
  if (currentRole) {
    return [currentRole, ...filtered];
  }
  return filtered;
}

function getDefaultRoleCode(
  companyRolesByCompanyId: Record<string, CompanyManagerRole[]>,
  companyId: string,
  includeCompanySuperAdmin: boolean,
) {
  return getRoleCodeOptions(companyRolesByCompanyId, companyId, { includeCompanySuperAdmin })[0]?.code ?? 'vehicle_manager';
}

function formatDateOnly(value: string) {
  return dateOnlyFormatter.format(new Date(value));
}

function getRoleScopeLevel(
  companyRolesByCompanyId: Record<string, CompanyManagerRole[]>,
  companyId: string,
  roleType: string | undefined,
) {
  if (!roleType) {
    return 'company';
  }
  return (
    companyRolesByCompanyId[companyId]?.find((candidate) => candidate.code === roleType)?.scope_level ??
    'company'
  );
}

function getFleetOptions(fleets: Fleet[], companyId: string) {
  return fleets.filter((fleet) => fleet.company_id === companyId);
}

function areFleetSelectionsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

export function AccountsPage({ client, session }: AccountsPageProps) {
  const [requests, setRequests] = useState<IdentitySignupRequestSummary[]>([]);
  const [managerAccounts, setManagerAccounts] = useState<ManagerAccountSummary[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [companyRolesByCompanyId, setCompanyRolesByCompanyId] = useState<Record<string, CompanyManagerRole[]>>({});
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [setupRoles, setSetupRoles] = useState<Record<string, string>>({});
  const [setupFleetIds, setSetupFleetIds] = useState<Record<string, string[]>>({});
  const [managerRoles, setManagerRoles] = useState<Record<string, string>>({});
  const [managerFleetIds, setManagerFleetIds] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tabs = useMemo(
    () => [
      { value: 'pending', label: '대기' },
      { value: 'approved', label: '승인됨' },
      { value: 'rejected', label: '반려됨' },
    ],
    [],
  );
  const canAssignSuperAdmin = useMemo(() => canManageCompanySuperAdmin(session), [session]);
  const scopeDescription = useMemo(() => getAccountsScopeDescription(session), [session]);
  const companyNameById = useMemo(
    () => Object.fromEntries(companies.map((company) => [company.company_id, company.name])),
    [companies],
  );

  function getRoleLabel(companyId: string, roleType: string | undefined, roleDisplayName?: string) {
    if (roleDisplayName) {
      return roleDisplayName;
    }
    const role = (companyRolesByCompanyId[companyId] ?? []).find((candidate) => candidate.code === roleType);
    return role?.display_name ?? formatRoleLabel(roleType);
  }

  async function loadRoleCatalog(companyResponse: Company[]) {
    const entries = await Promise.all(
      companyResponse.map(async (company) => {
        const response = await listCompanyManagerRoles(client, company.company_id);
        return [company.company_id, response.roles] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [requestResponse, managerAccountResponse, companyResponse] = await Promise.all([
          listManagedRequests(client, statusFilter),
          listManageableManagerAccounts(client),
          listCompanies(client),
        ]);
        const [roleCatalog, fleetResponse] = await Promise.all([
          loadRoleCatalog(companyResponse),
          listFleets(client),
        ]);
        if (!ignore) {
          setRequests(requestResponse.requests);
          setManagerAccounts(managerAccountResponse.accounts);
          setCompanies(companyResponse);
          setFleets(fleetResponse);
          setCompanyRolesByCompanyId(roleCatalog);
          setSetupRoles(
            Object.fromEntries(
              requestResponse.requests.map((request) => [
                request.identity_signup_request_id,
                getDefaultRoleCode(roleCatalog, request.company_id, canAssignSuperAdmin),
              ]),
            ),
          );
          setSetupFleetIds(
            Object.fromEntries(
              requestResponse.requests.map((request) => [request.identity_signup_request_id, []]),
            ),
          );
          setManagerRoles(
            Object.fromEntries(
              managerAccountResponse.accounts.map((account) => [account.manager_account_id, account.role_type]),
            ),
          );
          setManagerFleetIds(
            Object.fromEntries(
              managerAccountResponse.accounts.map((account) => [
                account.manager_account_id,
                account.assigned_fleet_ids ?? [],
              ]),
            ),
          );
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [canAssignSuperAdmin, client, statusFilter]);

  async function reloadCurrentStatus() {
    const [requestResponse, managerAccountResponse, companyResponse] = await Promise.all([
      listManagedRequests(client, statusFilter),
      listManageableManagerAccounts(client),
      listCompanies(client),
    ]);
    const [roleCatalog, fleetResponse] = await Promise.all([loadRoleCatalog(companyResponse), listFleets(client)]);
    setRequests(requestResponse.requests);
    setManagerAccounts(managerAccountResponse.accounts);
    setCompanies(companyResponse);
    setFleets(fleetResponse);
    setCompanyRolesByCompanyId(roleCatalog);
    setSetupRoles(
      Object.fromEntries(
        requestResponse.requests.map((request) => [
          request.identity_signup_request_id,
          getDefaultRoleCode(roleCatalog, request.company_id, canAssignSuperAdmin),
        ]),
      ),
    );
    setSetupFleetIds(
      Object.fromEntries(requestResponse.requests.map((request) => [request.identity_signup_request_id, []])),
    );
    setManagerRoles(
      Object.fromEntries(
        managerAccountResponse.accounts.map((account) => [account.manager_account_id, account.role_type]),
      ),
    );
    setManagerFleetIds(
      Object.fromEntries(
        managerAccountResponse.accounts.map((account) => [
          account.manager_account_id,
          account.assigned_fleet_ids ?? [],
        ]),
      ),
    );
  }

  async function handleApprove(requestId: string, roleType?: string, fleetIds?: string[]) {
    setErrorMessage(null);
    try {
      await approveManagedRequest(client, requestId, roleType, fleetIds);
      await reloadCurrentStatus();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleReject(requestId: string) {
    setErrorMessage(null);
    try {
      await rejectManagedRequest(client, requestId);
      await reloadCurrentStatus();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleChangeRole(managerAccountId: string, fleetIds?: string[]) {
    setErrorMessage(null);
    try {
      await changeManagerAccountRole(
        client,
        managerAccountId,
        managerRoles[managerAccountId] ?? 'vehicle_manager',
        fleetIds,
      );
      await reloadCurrentStatus();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleArchive(managerAccountId: string) {
    setErrorMessage(null);
    try {
      await archiveManagerAccount(client, managerAccountId);
      await reloadCurrentStatus();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <PageLayout
      subtitle={scopeDescription}
      tabs={
        <div className="page-tab-strip">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              className={
                tab.value === statusFilter
                  ? 'button primary small accounts-status-tab'
                  : 'button ghost small accounts-status-tab'
              }
              onClick={() => setStatusFilter(tab.value as typeof statusFilter)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
      title="계정 요청 관리"
    >
      <section className="panel accounts-panel accounts-requests-panel">
        <div className="panel-header">
          <p className="panel-kicker">계정 요청</p>
          <h2>요청 처리</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">요청을 불러오는 중입니다...</p>
        ) : requests.length === 0 ? (
          <p className="empty-state">표시할 요청이 없습니다.</p>
        ) : (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">총 {requests.length}건 요청</span>
            </div>
            <table aria-label="계정 요청 목록" className="table compact accounts-table accounts-requests-table">
              <thead>
                <tr>
                  <th>신청자</th>
                  <th>회사</th>
                  <th>요청</th>
                  <th>현재 단계</th>
                  <th>요청 시각</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => {
                  const requestRoleOptions = getRoleCodeOptions(companyRolesByCompanyId, request.company_id, {
                    includeCompanySuperAdmin: canAssignSuperAdmin,
                    currentRoleType: setupRoles[request.identity_signup_request_id],
                  });
                  const selectedRequestRole =
                    setupRoles[request.identity_signup_request_id] ??
                    getDefaultRoleCode(companyRolesByCompanyId, request.company_id, canAssignSuperAdmin);
                  const requestRoleScopeLevel = getRoleScopeLevel(
                    companyRolesByCompanyId,
                    request.company_id,
                    selectedRequestRole,
                  );
                  const requestFleetIds = setupFleetIds[request.identity_signup_request_id] ?? [];
                  const requestFleetOptions = getFleetOptions(fleets, request.company_id);
                  return (
                    <tr key={request.identity_signup_request_id}>
                      <td>{request.identity.name}</td>
                      <td>{companyNameById[request.company_id] ?? request.company_id}</td>
                      <td>{request.request_display_name}</td>
                      <td>{request.status_message}</td>
                      <td>{formatDateOnly(request.requested_at)}</td>
                      <td>
                        <div className="accounts-action-stack">
                          {request.request_type === 'manager_account_create' &&
                          (request.status === 'pending' || request.status === 'awaiting_setup') ? (
                            <>
                              <select
                                className="accounts-action-select"
                                onChange={(event) =>
                                  setSetupRoles((current) => {
                                    const nextRoleType = event.target.value;
                                    const nextScopeLevel = getRoleScopeLevel(
                                      companyRolesByCompanyId,
                                      request.company_id,
                                      nextRoleType,
                                    );
                                    setSetupFleetIds((fleetCurrent) => ({
                                      ...fleetCurrent,
                                      [request.identity_signup_request_id]:
                                        nextScopeLevel === 'fleet'
                                          ? fleetCurrent[request.identity_signup_request_id] ?? []
                                          : [],
                                    }));
                                    return {
                                      ...current,
                                      [request.identity_signup_request_id]: nextRoleType,
                                    };
                                  })
                                }
                                value={selectedRequestRole}
                              >
                                {requestRoleOptions.map((role) => (
                                  <option key={role.company_manager_role_id} value={role.code}>
                                    {role.display_name}
                                  </option>
                                ))}
                              </select>
                              {requestRoleScopeLevel === 'fleet' ? (
                                <label className="field accounts-fleet-field">
                                  <span>배정 플릿</span>
                                  <select
                                    aria-label="배정 플릿"
                                    className="accounts-fleet-select"
                                    multiple
                                    onChange={(event) =>
                                      setSetupFleetIds((current) => ({
                                        ...current,
                                        [request.identity_signup_request_id]: Array.from(
                                          event.target.selectedOptions,
                                          (option) => option.value,
                                        ),
                                      }))
                                    }
                                    value={requestFleetIds}
                                  >
                                    {requestFleetOptions.map((fleet) => (
                                      <option key={fleet.fleet_id} value={fleet.fleet_id}>
                                        {fleet.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}
                              <div className="inline-actions accounts-action-buttons">
                                <button
                                  className="button ghost small"
                                  disabled={requestRoleScopeLevel === 'fleet' && requestFleetIds.length === 0}
                                  onClick={() =>
                                    void handleApprove(
                                      request.identity_signup_request_id,
                                      selectedRequestRole,
                                      requestRoleScopeLevel === 'fleet' ? requestFleetIds : undefined,
                                    )
                                  }
                                  type="button"
                                >
                                  승인
                                </button>
                                <button className="button ghost small" onClick={() => void handleReject(request.identity_signup_request_id)} type="button">
                                  반려
                                </button>
                              </div>
                            </>
                          ) : null}
                          {request.request_type !== 'manager_account_create' && request.status === 'pending' ? (
                            <div className="inline-actions accounts-action-buttons">
                              <button className="button ghost small" onClick={() => void handleApprove(request.identity_signup_request_id)} type="button">
                                승인
                              </button>
                              <button className="button ghost small" onClick={() => void handleReject(request.identity_signup_request_id)} type="button">
                                반려
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="panel accounts-panel accounts-manager-panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">활성 관리자</p>
            <h2>활성 관리자 계정</h2>
          </div>
        </div>
        {isLoading ? (
          <p className="empty-state">관리자 계정을 불러오는 중입니다...</p>
        ) : managerAccounts.length === 0 ? (
          <p className="empty-state">관리할 관리자 계정이 없습니다.</p>
        ) : (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">총 {managerAccounts.length}명 관리자</span>
            </div>
            <table aria-label="활성 관리자 계정 목록" className="table compact accounts-table accounts-manager-table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>회사</th>
                  <th>현재 권한</th>
                  <th>상태</th>
                  <th>생성 시각</th>
                  <th>처리</th>
                </tr>
              </thead>
              <tbody>
                {managerAccounts.map((account) => {
                  const managerRoleOptions = getRoleCodeOptions(companyRolesByCompanyId, account.company_id, {
                    includeCompanySuperAdmin: canAssignSuperAdmin,
                    currentRoleType: managerRoles[account.manager_account_id] ?? account.role_type,
                  });
                  const selectedRoleType = managerRoles[account.manager_account_id] ?? account.role_type;
                  const selectedRoleScopeLevel = getRoleScopeLevel(
                    companyRolesByCompanyId,
                    account.company_id,
                    selectedRoleType,
                  );
                  const selectedManagerFleetIds =
                    managerFleetIds[account.manager_account_id] ?? account.assigned_fleet_ids ?? [];
                  const hasPendingRoleChange =
                    selectedRoleType !== account.role_type ||
                    !areFleetSelectionsEqual(selectedManagerFleetIds, account.assigned_fleet_ids ?? []);
                  const managerFleetOptions = getFleetOptions(fleets, account.company_id);
                  return (
                    <tr key={account.manager_account_id}>
                      <td>{account.identity.name}</td>
                      <td>{companyNameById[account.company_id] ?? account.company_id}</td>
                      <td>{getRoleLabel(account.company_id, account.role_type, account.role_display_name)}</td>
                      <td>{formatAccountStatusLabel(account.status)}</td>
                      <td>{formatDateOnly(account.created_at)}</td>
                      <td>
                        <div
                          className="accounts-manager-inline-actions"
                          data-testid={`manager-account-actions-${account.manager_account_id}`}
                        >
                          <select
                            className="accounts-action-select"
                            onChange={(event) =>
                              setManagerRoles((current) => {
                                const nextRoleType = event.target.value;
                                const nextScopeLevel = getRoleScopeLevel(
                                  companyRolesByCompanyId,
                                  account.company_id,
                                  nextRoleType,
                                );
                                setManagerFleetIds((fleetCurrent) => ({
                                  ...fleetCurrent,
                                  [account.manager_account_id]:
                                    nextScopeLevel === 'fleet'
                                      ? fleetCurrent[account.manager_account_id] ??
                                        account.assigned_fleet_ids ??
                                        []
                                      : [],
                                }));
                                return {
                                  ...current,
                                  [account.manager_account_id]: nextRoleType,
                                };
                              })
                            }
                            value={selectedRoleType}
                          >
                            {managerRoleOptions.map((role) => (
                              <option key={role.company_manager_role_id} value={role.code}>
                                {role.display_name}
                              </option>
                            ))}
                          </select>
                          {selectedRoleScopeLevel === 'fleet' ? (
                            <label className="field accounts-fleet-field">
                              <span>{`${account.identity.name} 배정 플릿`}</span>
                              <select
                                aria-label={`${account.identity.name} 배정 플릿`}
                                className="accounts-fleet-select"
                                multiple
                                onChange={(event) =>
                                  setManagerFleetIds((current) => ({
                                    ...current,
                                    [account.manager_account_id]: Array.from(
                                      event.target.selectedOptions,
                                      (option) => option.value,
                                    ),
                                  }))
                                }
                                value={selectedManagerFleetIds}
                              >
                                {managerFleetOptions.map((fleet) => (
                                  <option key={fleet.fleet_id} value={fleet.fleet_id}>
                                    {fleet.name}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                          {hasPendingRoleChange ? (
                            <button
                              className="button ghost small"
                              disabled={
                                selectedRoleScopeLevel === 'fleet' && selectedManagerFleetIds.length === 0
                              }
                              onClick={() =>
                                void handleChangeRole(
                                  account.manager_account_id,
                                  selectedRoleScopeLevel === 'fleet'
                                    ? selectedManagerFleetIds
                                    : undefined,
                                )
                              }
                              type="button"
                            >
                              권한 변경
                            </button>
                          ) : null}
                          <div className="inline-actions accounts-action-buttons">
                            <button className="button ghost small" onClick={() => void handleArchive(account.manager_account_id)} type="button">
                              계정 종료
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </PageLayout>
  );
}
