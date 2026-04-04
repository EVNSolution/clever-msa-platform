import { useEffect, useMemo, useState } from 'react';

import { approveManagedRequest, completeManagedManagerSetup, listManagedRequests, rejectManagedRequest } from '../api/authRequests';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { IdentitySignupRequestSummary } from '../types';

type AccountsPageProps = {
  client: HttpClient;
};

export function AccountsPage({ client }: AccountsPageProps) {
  const [requests, setRequests] = useState<IdentitySignupRequestSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'awaiting_setup' | 'approved' | 'rejected'>(
    'pending',
  );
  const [setupRoles, setSetupRoles] = useState<Record<string, string>>({});
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

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listManagedRequests(client, statusFilter);
        if (!ignore) {
          setRequests(response.requests);
          setSetupRoles(
            Object.fromEntries(
              response.requests.map((request) => [request.identity_signup_request_id, 'vehicle_manager']),
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
  }, [client, statusFilter]);

  async function reloadCurrentStatus() {
    const response = await listManagedRequests(client, statusFilter);
    setRequests(response.requests);
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

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">계정 요청</p>
          <h2>계정 요청 관리</h2>
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
                  <td>{request.company_id}</td>
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
                            value={setupRoles[request.identity_signup_request_id] ?? 'vehicle_manager'}
                          >
                            <option value="company_super_admin">회사 전체 관리자</option>
                            <option value="vehicle_manager">차량 관리자</option>
                            <option value="settlement_manager">정산 관리자</option>
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
  );
}
