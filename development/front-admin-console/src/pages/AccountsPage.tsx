import { useEffect, useMemo, useState } from 'react';

import { approveManagedRequest, completeManagedManagerSetup, listManagedRequests, rejectManagedRequest } from '../api/authRequests';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { archiveManagerAccount, changeManagerAccountRole, listManageableManagerAccounts } from '../api/managerAccounts';
import { listCompanies } from '../api/organization';
import { getAccountsScopeDescription, getManageableManagerRoleOptions } from '../authScopes';
import type { Company, IdentitySignupRequestSummary, ManagerAccountSummary } from '../types';
import { formatAccountStatusLabel, formatRoleLabel } from '../uiLabels';

type AccountsPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

export function AccountsPage({ client, session }: AccountsPageProps) {
  const [requests, setRequests] = useState<IdentitySignupRequestSummary[]>([]);
  const [managerAccounts, setManagerAccounts] = useState<ManagerAccountSummary[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'awaiting_setup' | 'approved' | 'rejected'>(
    'pending',
  );
  const [setupRoles, setSetupRoles] = useState<Record<string, string>>({});
  const [managerRoles, setManagerRoles] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tabs = useMemo(
    () => [
      { value: 'pending', label: '대기' },
      { value: 'awaiting_setup', label: '설정 중' },
      { value: 'approved', label: '승인됨' },
      { value: 'rejected', label: '반려됨' },
    ],
    [],
  );
  const roleOptions = useMemo(() => getManageableManagerRoleOptions(session), [session]);
  const scopeDescription = useMemo(() => getAccountsScopeDescription(session), [session]);
  const companyNameById = useMemo(
    () => Object.fromEntries(companies.map((company) => [company.company_id, company.name])),
    [companies],
  );

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
        if (!ignore) {
          setRequests(requestResponse.requests);
          setManagerAccounts(managerAccountResponse.accounts);
          setCompanies(companyResponse);
          setSetupRoles(
            Object.fromEntries(
              requestResponse.requests.map((request) => [request.identity_signup_request_id, roleOptions[0] ?? 'vehicle_manager']),
            ),
          );
          setManagerRoles(
            Object.fromEntries(
              managerAccountResponse.accounts.map((account) => [account.manager_account_id, account.role_type]),
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
  }, [client, roleOptions, statusFilter]);

  async function reloadCurrentStatus() {
    const [requestResponse, managerAccountResponse, companyResponse] = await Promise.all([
      listManagedRequests(client, statusFilter),
      listManageableManagerAccounts(client),
      listCompanies(client),
    ]);
    setRequests(requestResponse.requests);
    setManagerAccounts(managerAccountResponse.accounts);
    setCompanies(companyResponse);
    setManagerRoles((current) => ({
      ...Object.fromEntries(
        managerAccountResponse.accounts.map((account) => [account.manager_account_id, account.role_type]),
      ),
      ...current,
    }));
  }

  async function handleApprove(requestId: string) {
    setErrorMessage(null);
    try {
      await approveManagedRequest(client, requestId);
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

  async function handleCompleteSetup(requestId: string) {
    setErrorMessage(null);
    try {
      await completeManagedManagerSetup(client, requestId, setupRoles[requestId] ?? 'vehicle_manager');
      await reloadCurrentStatus();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleChangeRole(managerAccountId: string) {
    setErrorMessage(null);
    try {
      await changeManagerAccountRole(client, managerAccountId, managerRoles[managerAccountId] ?? 'vehicle_manager');
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
    <>
      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">계정 요청</p>
            <h2>계정 요청 관리</h2>
            <p className="section-copy">{scopeDescription}</p>
          </div>
          <div className="inline-actions">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                className={tab.value === statusFilter ? 'button primary small' : 'button ghost small'}
                onClick={() => setStatusFilter(tab.value as typeof statusFilter)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">요청을 불러오는 중입니다...</p>
        ) : requests.length === 0 ? (
          <p className="empty-state">표시할 요청이 없습니다.</p>
        ) : (
          <table className="table compact">
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
                return (
                  <tr key={request.identity_signup_request_id}>
                    <td>{request.identity.name}</td>
                    <td>{companyNameById[request.company_id] ?? request.company_id}</td>
                    <td>{request.request_display_name}</td>
                    <td>{request.status_message}</td>
                    <td>{new Date(request.requested_at).toLocaleString('ko-KR')}</td>
                    <td>
                      <div className="inline-actions">
                        {request.status === 'pending' ? (
                          <>
                            <button className="button ghost small" onClick={() => void handleApprove(request.identity_signup_request_id)} type="button">
                              승인
                            </button>
                            <button className="button ghost small" onClick={() => void handleReject(request.identity_signup_request_id)} type="button">
                              반려
                            </button>
                          </>
                        ) : null}
                        {request.status === 'awaiting_setup' && request.request_type === 'manager_account_create' ? (
                          <>
                            <select
                              onChange={(event) =>
                                setSetupRoles((current) => ({
                                  ...current,
                                  [request.identity_signup_request_id]: event.target.value,
                                }))
                              }
                              value={setupRoles[request.identity_signup_request_id] ?? roleOptions[0] ?? 'vehicle_manager'}
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {formatRoleLabel(role)}
                                </option>
                              ))}
                            </select>
                            <button
                              className="button ghost small"
                              onClick={() => void handleCompleteSetup(request.identity_signup_request_id)}
                              type="button"
                            >
                              설정 완료
                            </button>
                            <button className="button ghost small" onClick={() => void handleReject(request.identity_signup_request_id)} type="button">
                              반려
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
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
          <table className="table compact">
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
              {managerAccounts.map((account) => (
                <tr key={account.manager_account_id}>
                  <td>{account.identity.name}</td>
                  <td>{companyNameById[account.company_id] ?? account.company_id}</td>
                  <td>{formatRoleLabel(account.role_type)}</td>
                  <td>{formatAccountStatusLabel(account.status)}</td>
                  <td>{new Date(account.created_at).toLocaleString('ko-KR')}</td>
                  <td>
                    <div className="inline-actions">
                      <select
                        onChange={(event) =>
                          setManagerRoles((current) => ({
                            ...current,
                            [account.manager_account_id]: event.target.value,
                          }))
                        }
                        value={managerRoles[account.manager_account_id] ?? account.role_type}
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {formatRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                      <button className="button ghost small" onClick={() => void handleChangeRole(account.manager_account_id)} type="button">
                        권한 변경
                      </button>
                      <button className="button ghost small" onClick={() => void handleArchive(account.manager_account_id)} type="button">
                        계정 종료
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
