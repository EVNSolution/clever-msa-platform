import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getCompanyRouteRef } from '../routeRefs';
import type { Company, Fleet } from '../types';

type CompaniesPageProps = {
  client: HttpClient;
};

export function CompaniesPage({ client }: CompaniesPageProps) {
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
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.company_id}>
                  <td>{company.name}</td>
                  <td>{fleetCountByCompanyId.get(company.company_id) ?? 0}</td>
                  <td>
                    <Link className="button ghost small" to={`/companies/${getCompanyRouteRef(company)}`}>
                      보기
                    </Link>
                  </td>
                  <td>
                    <Link className="button ghost small" to={`/companies/${getCompanyRouteRef(company)}/edit`}>
                      수정
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 회사가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
