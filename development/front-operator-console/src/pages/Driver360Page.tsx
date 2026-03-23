import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getDriver360 } from '../api/driver360';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { Driver360Summary } from '../types';

type Driver360PageProps = {
  client: HttpClient;
};

export function Driver360Page({ client }: Driver360PageProps) {
  const { driverId = '' } = useParams();
  const [summary, setSummary] = useState<Driver360Summary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await getDriver360(client, driverId);
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

    if (!driverId) {
      setErrorMessage('Driver ID is required.');
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client, driverId]);

  return (
    <div className="stack large-gap">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">Driver 360</p>
            <h2>Driver summary</h2>
          </div>
          <Link className="button ghost small" to="/drivers">
            Back to drivers
          </Link>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? <p className="empty-state">Loading driver summary...</p> : null}
      </section>

      {summary ? (
        <>
          <section className="data-grid two-columns">
            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">Identity</p>
                <h3>{summary.driver_name}</h3>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Driver ID</dt>
                  <dd><code>{summary.driver_id}</code></dd>
                </div>
                <div>
                  <dt>EV ID</dt>
                  <dd>{summary.ev_id}</dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>{summary.phone_number}</dd>
                </div>
                <div>
                  <dt>Address</dt>
                  <dd>{summary.address}</dd>
                </div>
              </dl>
            </article>

            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">Organization</p>
                <h3>Current company and fleet</h3>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Company</dt>
                  <dd>{summary.company_name ?? 'Unknown company'}</dd>
                </div>
                <div>
                  <dt>Company ID</dt>
                  <dd><code>{summary.company_id}</code></dd>
                </div>
                <div>
                  <dt>Fleet</dt>
                  <dd>{summary.fleet_name ?? 'Unknown fleet'}</dd>
                </div>
                <div>
                  <dt>Fleet ID</dt>
                  <dd><code>{summary.fleet_id}</code></dd>
                </div>
              </dl>
            </article>
          </section>

          <section className="data-grid two-columns">
            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">Account</p>
                <h3>Linked account summary</h3>
              </div>
              {summary.account_id ? (
                <dl className="detail-list">
                  <div>
                    <dt>Account ID</dt>
                    <dd><code>{summary.account_id}</code></dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{summary.account_email}</dd>
                  </div>
                  <div>
                    <dt>Role</dt>
                    <dd>{summary.account_role}</dd>
                  </div>
                  <div>
                    <dt>Active</dt>
                    <dd>{summary.account_is_active ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
              ) : (
                <p className="empty-state">No linked account.</p>
              )}
            </article>

            <article className="panel">
              <div className="panel-header">
                <p className="panel-kicker">Settlement</p>
                <h3>Latest settlement placeholder</h3>
              </div>
              {summary.latest_settlement_run_id ? (
                <dl className="detail-list">
                  <div>
                    <dt>Run ID</dt>
                    <dd><code>{summary.latest_settlement_run_id}</code></dd>
                  </div>
                  <div>
                    <dt>Period</dt>
                    <dd>
                      {summary.latest_settlement_period_start} - {summary.latest_settlement_period_end}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{summary.latest_settlement_status}</dd>
                  </div>
                  <div>
                    <dt>Payout</dt>
                    <dd>{summary.latest_payout_status}</dd>
                  </div>
                  <div>
                    <dt>Amount</dt>
                    <dd>{summary.latest_settlement_amount}</dd>
                  </div>
                </dl>
              ) : (
                <p className="empty-state">No settlement summary.</p>
              )}
            </article>
          </section>

          <section className="panel">
            <div className="panel-header">
              <p className="panel-kicker">Warnings</p>
              <h3>Missing source references</h3>
            </div>
            {summary.warnings.length ? (
              <ul className="warning-list">
                {summary.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No warnings.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
