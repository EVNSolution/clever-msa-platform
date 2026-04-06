import { useEffect, useState } from 'react';

import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import type { Company, Fleet } from '../types';
import { formatRoleLabel } from '../uiLabels';

type DashboardPageProps = {
  session: SessionPayload;
  client: HttpClient;
};

export function DashboardPage({ session, client }: DashboardPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([listCompanies(client), listFleets(client)]);
        if (ignore) {
          return;
        }
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
          <p className="panel-kicker">운영 요약</p>
          <h2>{session.email}</h2>
          <p className="hero-copy">
            현재 <strong>{formatRoleLabel(session.activeAccount?.roleType ?? session.activeAccount?.accountType)}</strong>{' '}
            권한으로 로그인되어 있습니다. 회사와 플릿 기준 요약은 조직 정본 API에서 바로 불러옵니다.
          </p>
        </div>
        <div className="grid-cards">
          <article className="stat-card">
            <span>회사</span>
            <strong>{companies.length}</strong>
          </article>
          <article className="stat-card">
            <span>플릿</span>
            <strong>{fleets.length}</strong>
          </article>
        </div>
      </section>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="data-grid two-columns">
        <article className="panel">
          <div className="panel-header">
            <p className="panel-kicker">회사</p>
            <h3>Organization Master 정본</h3>
          </div>
          {isLoading ? (
            <p className="empty-state">회사를 불러오는 중입니다...</p>
          ) : companies.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>이름</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.company_id}>
                    <td>{company.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">등록된 회사가 없습니다.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <p className="panel-kicker">플릿</p>
            <h3>현재 플릿 레지스트리</h3>
          </div>
          {isLoading ? (
            <p className="empty-state">플릿을 불러오는 중입니다...</p>
          ) : fleets.length ? (
            <table className="table">
              <thead>
                <tr>
                  <th>이름</th>
                  <th>회사</th>
                </tr>
              </thead>
              <tbody>
                {fleets.map((fleet) => (
                  <tr key={fleet.fleet_id}>
                    <td>{fleet.name}</td>
                    <td>{getCompanyName(fleet.company_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">등록된 플릿이 없습니다.</p>
          )}
        </article>
      </section>
    </div>
  );
}
