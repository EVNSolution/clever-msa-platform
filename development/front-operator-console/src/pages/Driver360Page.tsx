import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getDriver360 } from '../api/driver360';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { Driver360Summary } from '../types';
import {
  formatAccountStatusLabel,
  formatPayoutStatusLabel,
  formatSettlementStatusLabel,
} from '../uiLabels';

type Driver360PageProps = {
  client: HttpClient;
};

export function Driver360Page({ client }: Driver360PageProps) {
  const { driverRef = '' } = useParams();
  const [summary, setSummary] = useState<Driver360Summary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getDriver360(client, driverRef);
        if (!ignore) {
          setSummary(response);
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

    if (!driverRef) {
      setErrorMessage('배송원 선택이 필요합니다.');
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client, driverRef]);

  return (
    <div className="stack large-gap">
      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">배송원 360</p>
            <h2>배송원 요약</h2>
          </div>
          <div className="inline-actions">
            <Link className="button ghost small" to="/drivers">
              배송원 목록
            </Link>
            <Link className="button ghost small" to={`/drivers/${driverRef}/edit`}>
              배송원 수정
            </Link>
          </div>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? <p className="empty-state">배송원 요약을 불러오는 중입니다...</p> : null}
      </section>

      {summary ? (
        <>
          <section className="data-grid two-columns">
            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">기본 정보</p>
                <h3>{summary.driver_name}</h3>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>EV ID</dt>
                  <dd>{summary.ev_id}</dd>
                </div>
                <div>
                  <dt>연락처</dt>
                  <dd>{summary.phone_number}</dd>
                </div>
                <div>
                  <dt>주소</dt>
                  <dd>{summary.address}</dd>
                </div>
              </dl>
            </article>

            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">소속 정보</p>
                <h3>현재 회사 및 플릿</h3>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>회사</dt>
                  <dd>{summary.company_name ?? '미확인 회사'}</dd>
                </div>
                <div>
                  <dt>플릿</dt>
                  <dd>{summary.fleet_name ?? '미확인 플릿'}</dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="data-grid two-columns">
            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">배송원 계정</p>
                <h3>연결된 배송원 계정</h3>
              </div>
              {summary.driver_account_id ? (
                <dl className="detail-list">
                  <div>
                    <dt>이름</dt>
                    <dd>{summary.driver_account_identity_name}</dd>
                  </div>
                  <div>
                    <dt>이메일</dt>
                    <dd>{summary.driver_account_email}</dd>
                  </div>
                  <div>
                    <dt>상태</dt>
                    <dd>{formatAccountStatusLabel(summary.driver_account_status)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="empty-state">연결된 배송원 계정이 없습니다.</p>
              )}
            </article>

            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">정산</p>
                <h3>최근 정산 정보</h3>
              </div>
              {summary.latest_settlement_run_id ? (
                <dl className="detail-list">
                  <div>
                    <dt>기간</dt>
                    <dd>
                      {summary.latest_settlement_period_start} - {summary.latest_settlement_period_end}
                    </dd>
                  </div>
                  <div>
                    <dt>상태</dt>
                    <dd>{formatSettlementStatusLabel(summary.latest_settlement_status)}</dd>
                  </div>
                  <div>
                    <dt>지급 상태</dt>
                    <dd>{formatPayoutStatusLabel(summary.latest_payout_status)}</dd>
                  </div>
                  <div>
                    <dt>금액</dt>
                    <dd>{summary.latest_settlement_amount}</dd>
                  </div>
                </dl>
              ) : (
                <p className="empty-state">정산 정보가 없습니다.</p>
              )}
            </article>
          </section>

          <section className="panel">
            <div className="panel-header">
              <p className="panel-kicker">주의 사항</p>
              <h3>누락된 참조</h3>
            </div>
            {summary.warnings.length ? (
              <ul className="warning-list">
                {summary.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">주의 사항이 없습니다.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
