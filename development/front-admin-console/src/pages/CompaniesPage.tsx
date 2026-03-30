import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getCompanyRouteRef } from '../routeRefs';
import type { Company, Fleet } from '../types';

type CompaniesPageProps = {
  client: HttpClient;
};

export function CompaniesPage({ client }: CompaniesPageProps) {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
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
        const [companyResponse, fleetResponse] = await Promise.all([
          listCompanies(client),
          listFleets(client),
        ]);
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

  const fleetCountByCompanyId = useMemo(() => {
    const next = new Map<string, number>();
    fleets.forEach((fleet) => {
      next.set(fleet.company_id, (next.get(fleet.company_id) ?? 0) + 1);
    });
    return next;
  }, [fleets]);

  return (
    <div className="stack large-gap">
      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">회사 목록</p>
            <h2>회사 루트 목록</h2>
          </div>
          <Link className="button primary" to="/companies/new">
            회사 생성
          </Link>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">회사를 불러오는 중입니다...</p>
        ) : companies.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>회사</th>
                <th>플릿 수</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const detailPath = company.route_no != null ? `/companies/${getCompanyRouteRef(company)}` : null;

                return (
                  <tr
                    key={company.company_id}
                    className={detailPath ? 'interactive-row' : undefined}
                    data-detail-path={detailPath ?? undefined}
                    onClick={detailPath ? () => navigate(detailPath) : undefined}
                    onKeyDown={detailPath ? (event) => handleRowKeyDown(event, detailPath) : undefined}
                    tabIndex={detailPath ? 0 : undefined}
                  >
                    <td>{company.name}</td>
                    <td>{fleetCountByCompanyId.get(company.company_id) ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 회사가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
