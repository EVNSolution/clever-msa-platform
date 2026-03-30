import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getAccount } from '../api/accounts';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getAccountRouteRef } from '../routeRefs';
import type { AccountSummary } from '../types';
import { formatBooleanLabel, formatRoleLabel } from '../uiLabels';

type AccountDetailPageProps = {
  client: HttpClient;
};

export function AccountDetailPage({ client }: AccountDetailPageProps) {
  const { accountRef } = useParams();
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accountRef) {
      setErrorMessage('계정 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedAccountRef = accountRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getAccount(client, selectedAccountRef);
        if (!ignore) {
          setAccount(response);
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
  }, [accountRef, client]);

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">계정 상세</p>
          <h2>{account?.email ?? '계정 상세'}</h2>
        </div>
        {account ? (
          <Link className="button ghost" to={`/accounts/${getAccountRouteRef(account)}/edit`}>
            계정 수정
          </Link>
        ) : null}
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">계정을 불러오는 중입니다...</p>
      ) : account ? (
        <div className="stack">
          <dl className="detail-list">
            <div>
              <dt>이메일</dt>
              <dd>{account.email}</dd>
            </div>
            <div>
              <dt>권한</dt>
              <dd>{formatRoleLabel(account.role)}</dd>
            </div>
            <div>
              <dt>활성 여부</dt>
              <dd>{formatBooleanLabel(account.is_active)}</dd>
            </div>
          </dl>
          <div className="page-actions">
            <Link className="button ghost" to="/accounts">
              목록으로
            </Link>
          </div>
        </div>
      ) : (
        <p className="empty-state">계정을 찾을 수 없습니다.</p>
      )}
    </section>
  );
}
