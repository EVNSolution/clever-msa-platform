import { useEffect, useState } from 'react';

import { getMe } from '../api/auth';
import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { AccountSummary, Company, Fleet } from '../types';

type DashboardPageProps = {
  account: AccountSummary;
  client: HttpClient;
};

export function DashboardPage({ account, client }: DashboardPageProps) {
  const [me, setMe] = useState<AccountSummary>(account);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [meResponse, companyResponse, fleetResponse] = await Promise.all([
          getMe(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setMe(meResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
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
    <div className="stack large-gap">
      <section className="hero-card panel">
        <div>
          <p className="panel-kicker">Operator Summary</p>
          <h2>{me.email}</h2>
          <p className="hero-copy">
            Logged in as <strong>{me.role}</strong>. Organization data is loaded directly from the gateway-backed
            read endpoints.
          </p>
        </div>
        <div className="grid-cards">
          <article className="stat-card">
            <span>Companies</span>
            <strong>{companies.length}</strong>
          </article>
          <article className="stat-card">
            <span>Fleets</span>
            <strong>{fleets.length}</strong>
          </article>
        </div>
      </section>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="data-grid two-columns">
        <article className="panel">
          <div className="panel-header">
            <p className="panel-kicker">Companies</p>
            <h3>Source of truth from Organization Master</h3>
          </div>
          {isLoading ? (
            <p className="empty-state">Loading companies...</p>
          ) : companies.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.company_id}>
                    <td>{company.name}</td>
                    <td><code>{company.company_id}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No companies seeded yet.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <p className="panel-kicker">Fleets</p>
            <h3>Current fleet registry</h3>
          </div>
          {isLoading ? (
            <p className="empty-state">Loading fleets...</p>
          ) : fleets.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                {fleets.map((fleet) => (
                  <tr key={fleet.fleet_id}>
                    <td>{fleet.name}</td>
                    <td><code>{fleet.company_id}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No fleets seeded yet.</p>
          )}
        </article>
      </section>
    </div>
  );
}
