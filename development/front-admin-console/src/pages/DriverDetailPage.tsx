import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { listAccounts } from '../api/accounts';
import { deleteDriver, getDriver } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { getDriverRouteRef } from '../routeRefs';
import type { AccountSummary, Company, DriverProfile, Fleet } from '../types';

type DriverDetailPageProps = {
  client: HttpClient;
};

export function DriverDetailPage({ client }: DriverDetailPageProps) {
  const navigate = useNavigate();
  const { driverRef } = useParams();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!driverRef) {
      setErrorMessage('배송원 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedDriverRef = driverRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [driverResponse, accountResponse, companyResponse, fleetResponse] = await Promise.all([
          getDriver(client, selectedDriverRef),
          listAccounts(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setDriver(driverResponse);
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
  }, [client, driverRef]);

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

  async function handleDelete() {
    if (!driverRef || !driver) {
      return;
    }
    if (!window.confirm(`배송원 "${driver.name}"를 삭제할까요?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteDriver(client, driverRef);
      navigate('/drivers');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setIsDeleting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">배송원 상세</p>
          <h2>{driver?.name ?? '배송원 상세'}</h2>
        </div>
        <div className="inline-actions">
          {driver ? (
            <Link className="button ghost" to={`/drivers/${getDriverRouteRef(driver)}/edit`}>
              배송원 수정
            </Link>
          ) : null}
          <button className="button ghost" disabled={isDeleting || !driver} onClick={() => void handleDelete()} type="button">
            {isDeleting ? '삭제 중...' : '배송원 삭제'}
          </button>
        </div>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">배송원 정보를 불러오는 중입니다...</p>
      ) : driver ? (
        <div className="stack">
          <dl className="detail-list">
            <div>
              <dt>계정</dt>
              <dd>{getAccountEmail(driver.account_id)}</dd>
            </div>
            <div>
              <dt>회사</dt>
              <dd>{getCompanyName(driver.company_id)}</dd>
            </div>
            <div>
              <dt>플릿</dt>
              <dd>{getFleetName(driver.fleet_id)}</dd>
            </div>
            <div>
              <dt>이름</dt>
              <dd>{driver.name}</dd>
            </div>
            <div>
              <dt>EV ID</dt>
              <dd>{driver.ev_id}</dd>
            </div>
            <div>
              <dt>연락처</dt>
              <dd>{driver.phone_number}</dd>
            </div>
            <div>
              <dt>주소</dt>
              <dd>{driver.address}</dd>
            </div>
          </dl>
          <div className="page-actions">
            <Link className="button ghost" to="/drivers">
              목록으로
            </Link>
          </div>
        </div>
      ) : (
        <p className="empty-state">배송원을 찾을 수 없습니다.</p>
      )}
    </section>
  );
}
