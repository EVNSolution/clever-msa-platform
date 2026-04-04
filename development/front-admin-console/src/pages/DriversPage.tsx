import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listDriverAccountLinks } from '../api/driverAccountLinks';
import { listDrivers } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getDriverRouteRef } from '../routeRefs';
import type { Company, DriverAccountLinkSummary, DriverProfile, Fleet } from '../types';

type DriversPageProps = {
  client: HttpClient;
};

export function DriversPage({ client }: DriversPageProps) {
  const navigate = useNavigate();
  const [driverAccountLinks, setDriverAccountLinks] = useState<DriverAccountLinkSummary[]>([]);
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
        const [driverResponse, driverAccountLinkResponse, companyResponse, fleetResponse] = await Promise.all([
          listDrivers(client),
          listDriverAccountLinks(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setDrivers(driverResponse);
        setDriverAccountLinks(driverAccountLinkResponse);
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

  function getDriverAccountEmail(driverId: string) {
    const link = driverAccountLinks.find((entry) => entry.driver_id === driverId);
    if (!link) {
      return '미연결';
    }
    return link.email;
  }

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function getFleetName(fleetId: string) {
    return fleets.find((fleet) => fleet.fleet_id === fleetId)?.name ?? '미확인 플릿';
  }

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
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
          <thead><tr><th>이름</th><th>배송원 계정</th><th>회사</th><th>플릿</th></tr></thead>
          <tbody>
            {drivers.map((driver) => {
              const detailPath = driver.route_no != null ? `/drivers/${getDriverRouteRef(driver)}` : null;

              return (
                <tr
                  key={driver.driver_id}
                  className={detailPath ? 'interactive-row' : undefined}
                  data-detail-path={detailPath ?? undefined}
                  onClick={detailPath ? () => navigate(detailPath) : undefined}
                  onKeyDown={detailPath ? (event) => handleRowKeyDown(event, detailPath) : undefined}
                  tabIndex={detailPath ? 0 : undefined}
                >
                  <td>{driver.name}</td>
                  <td>{getDriverAccountEmail(driver.driver_id)}</td>
                  <td>{getCompanyName(driver.company_id)}</td>
                  <td>{getFleetName(driver.fleet_id)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
