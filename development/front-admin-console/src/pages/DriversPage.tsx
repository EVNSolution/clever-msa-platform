import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listAccounts } from '../api/accounts';
import { listDrivers } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getDriverRouteRef } from '../routeRefs';
import type { AccountSummary, Company, DriverProfile, Fleet } from '../types';

type DriversPageProps = {
  client: HttpClient;
};

export function DriversPage({ client }: DriversPageProps) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
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
        const [driverResponse, accountResponse, companyResponse, fleetResponse] = await Promise.all([
          listDrivers(client),
          listAccounts(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setDrivers(driverResponse);
        setAccounts(accountResponse);
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

  function getAccountEmail(accountId: string | null) {
    if (!accountId) {
      return '미연결';
    }
    return accounts.find((entry) => entry.account_id === accountId)?.email ?? '미확인 계정';
  }

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function getFleetName(fleetId: string) {
    return fleets.find((fleet) => fleet.fleet_id === fleetId)?.name ?? '미확인 플릿';
  }

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">배송원 목록</p>
          <h2>Driver Profile HR 관리자 조회</h2>
        </div>
        <Link className="button primary" to="/drivers/new">
          배송원 생성
        </Link>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? <p className="empty-state">배송원을 불러오는 중입니다...</p> : (
        <table className="table compact">
          <thead><tr><th>이름</th><th>계정</th><th>회사</th><th>플릿</th><th /><th /></tr></thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.driver_id}>
                <td>{driver.name}</td>
                <td>{getAccountEmail(driver.account_id)}</td>
                <td>{getCompanyName(driver.company_id)}</td>
                <td>{getFleetName(driver.fleet_id)}</td>
                <td>
                  {driver.route_no != null ? (
                    <Link className="button ghost small" to={`/drivers/${getDriverRouteRef(driver)}`}>
                      보기
                    </Link>
                  ) : (
                    <span className="empty-state">상세 비공개</span>
                  )}
                </td>
                <td>
                  {driver.route_no != null ? (
                    <Link className="button ghost small" to={`/drivers/${getDriverRouteRef(driver)}/edit`}>
                      수정
                    </Link>
                  ) : (
                    <span className="empty-state">수정 비공개</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
