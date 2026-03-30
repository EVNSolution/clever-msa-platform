import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { getDriverRouteRef } from '../routeRefs';
import type { AccountSummary, DriverProfile } from '../types';
type DriversPageProps = {
  account: AccountSummary;
  client: HttpClient;
};

export function DriversPage({ account, client }: DriversPageProps) {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const driverResponse = await listDrivers(client);
        if (ignore) {
          return;
        }
        setDrivers(driverResponse);
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
          <h2>{account.email}</h2>
        </div>
        <Link className="button primary" to="/drivers/new">
          배송원 생성
        </Link>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">배송원을 불러오는 중입니다...</p>
      ) : drivers.length ? (
        <table className="table compact">
          <thead>
            <tr>
              <th>이름</th>
              <th>연락처</th>
              <th>계정 연결</th>
            </tr>
          </thead>
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
                  <td>{driver.phone_number}</td>
                  <td>{driver.account_id ? '연결됨' : '미연결'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">등록된 배송원이 없습니다.</p>
      )}
    </section>
  );
}
