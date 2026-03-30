import { useEffect, useState } from 'react';

import { listSettlementItems, listSettlementRuns } from '../api/settlements';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { SettlementItem, SettlementRun } from '../types';
import {
  formatPayoutStatusLabel,
  formatSettlementStatusLabel,
} from '../uiLabels';

type SettlementsPageProps = {
  client: HttpClient;
};

export function SettlementsPage({ client }: SettlementsPageProps) {
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [runResponse, itemResponse] = await Promise.all([
          listSettlementRuns(client),
          listSettlementItems(client),
        ]);
        if (ignore) {
          return;
        }
        setRuns(runResponse);
        setItems(itemResponse);
        setSelectedRunId(runResponse[0]?.settlement_run_id ?? null);
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

  const filteredItems = (() => {
    if (!selectedRunId) {
      return items;
    }
    return items.filter((item) => item.settlement_run_id === selectedRunId);
  })();

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 실행</p>
          <h2>읽기 전용 정산 조회</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 실행을 불러오는 중입니다...</p>
        ) : runs.length ? (
          <div className="run-list">
            {runs.map((run) => (
              <button
                className={run.settlement_run_id === selectedRunId ? 'run-card selected' : 'run-card'}
                key={run.settlement_run_id}
                onClick={() => setSelectedRunId(run.settlement_run_id)}
                type="button"
              >
                <span>{formatSettlementStatusLabel(run.status)}</span>
                <strong>{run.period_start} → {run.period_end}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-state">등록된 정산 실행이 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 항목</p>
          <h2>{selectedRunId ? '선택한 실행의 항목' : '전체 정산 항목'}</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 항목을 불러오는 중입니다...</p>
        ) : filteredItems.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>대상</th>
                <th>금액</th>
                <th>지급 상태</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.settlement_item_id}>
                  <td>{item.driver_id ? '배송원 비공개' : '-'}</td>
                  <td>{item.amount}</td>
                  <td>{formatPayoutStatusLabel(item.payout_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">해당 실행의 정산 항목이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
