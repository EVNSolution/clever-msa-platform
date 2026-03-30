import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listAccounts } from '../api/accounts';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getAccountRouteRef } from '../routeRefs';
import type { AccountSummary } from '../types';
import { formatBooleanLabel, formatRoleLabel } from '../uiLabels';

type AccountsPageProps = {
  client: HttpClient;
};

export function AccountsPage({ client }: AccountsPageProps) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listAccounts(client);
        if (!ignore) {
          setAccounts(response);
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
  }, [client]);

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">계정 목록</p>
          <h2>관리자 조회용 계정 목록</h2>
        </div>
        <Link className="button primary" to="/accounts/new">
          계정 생성
        </Link>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">계정을 불러오는 중입니다...</p>
      ) : (
          <table className="table compact">
          <thead>
            <tr>
              <th>이메일</th>
              <th>권한</th>
              <th>활성</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const detailPath = account.route_no != null ? `/accounts/${getAccountRouteRef(account)}` : null;

              return (
                <tr
                  key={account.account_id}
                  className={detailPath ? 'interactive-row' : undefined}
                  data-detail-path={detailPath ?? undefined}
                  onClick={detailPath ? () => navigate(detailPath) : undefined}
                  onKeyDown={detailPath ? (event) => handleRowKeyDown(event, detailPath) : undefined}
                  tabIndex={detailPath ? 0 : undefined}
                >
                  <td>{account.email}</td>
                  <td>{formatRoleLabel(account.role)}</td>
                  <td>{formatBooleanLabel(account.is_active)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
