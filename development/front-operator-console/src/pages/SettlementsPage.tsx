import { useEffect, useState } from 'react';

import { listSettlementItems, listSettlementRuns } from '../api/settlements';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { SettlementItem, SettlementRun } from '../types';

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
          <p className="panel-kicker">Settlement Runs</p>
          <h2>Read-only settlement placeholder</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">Loading settlement runs...</p>
        ) : runs.length ? (
          <div className="run-list">
            {runs.map((run) => (
              <button
                className={run.settlement_run_id === selectedRunId ? 'run-card selected' : 'run-card'}
                key={run.settlement_run_id}
                onClick={() => setSelectedRunId(run.settlement_run_id)}
                type="button"
              >
                <span>{run.status}</span>
                <strong>{run.period_start} → {run.period_end}</strong>
                <code>{run.settlement_run_id}</code>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-state">No settlement runs seeded yet.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Settlement Items</p>
          <h2>{selectedRunId ? 'Items for selected run' : 'All placeholder items'}</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">Loading settlement items...</p>
        ) : filteredItems.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Driver ID</th>
                <th>Amount</th>
                <th>Payout Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.settlement_item_id}>
                  <td><code>{item.settlement_item_id}</code></td>
                  <td><code>{item.driver_id}</code></td>
                  <td>{item.amount}</td>
                  <td>{item.payout_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No settlement items found for this run.</p>
        )}
      </section>
    </div>
  );
}
