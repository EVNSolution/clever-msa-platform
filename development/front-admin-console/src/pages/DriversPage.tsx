import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { canManageDriverProfileScope } from '../authScopes';
import { listManageableDriverAccounts } from '../api/driverAccounts';
import { createDriverAccountLink, listDriverAccountLinks, unlinkDriverAccountLink } from '../api/driverAccountLinks';
import { listDrivers } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { getDriverRouteRef } from '../routeRefs';
import type { Company, DriverAccountLinkSummary, DriverAccountSummary, DriverProfile, Fleet } from '../types';

type DriversPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

export function DriversPage({ client, session }: DriversPageProps) {
  const navigate = useNavigate();
  const [driverAccountLinks, setDriverAccountLinks] = useState<DriverAccountLinkSummary[]>([]);
  const [driverAccounts, setDriverAccounts] = useState<DriverAccountSummary[]>([]);
  const [selectedDriverAccounts, setSelectedDriverAccounts] = useState<Record<string, string>>({});
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canManageDriverProfiles = canManageDriverProfileScope(session);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [driverResponse, driverAccountLinkResponse, driverAccountResponse, companyResponse, fleetResponse] = await Promise.all([
          listDrivers(client),
          listDriverAccountLinks(client),
          listManageableDriverAccounts(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setDrivers(driverResponse);
        setDriverAccountLinks(driverAccountLinkResponse);
        setDriverAccounts(driverAccountResponse.accounts);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setSelectedDriverAccounts(
          Object.fromEntries(
            driverResponse.map((driver) => {
              const availableAccount = driverAccountResponse.accounts.find(
                (account) => account.company_id === driver.company_id && account.active_driver_id == null,
              );
              return [driver.driver_id, availableAccount?.driver_account_id ?? ''];
            }),
          ),
        );
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

  async function reloadDriverAccounts() {
    const [driverAccountLinkResponse, driverAccountResponse] = await Promise.all([
      listDriverAccountLinks(client),
      listManageableDriverAccounts(client),
    ]);
    setDriverAccountLinks(driverAccountLinkResponse);
    setDriverAccounts(driverAccountResponse.accounts);
  }

  function getActiveDriverAccountLink(driverId: string) {
    return driverAccountLinks.find((entry) => entry.driver_id === driverId && entry.unlinked_at == null);
  }

  function getAvailableDriverAccounts(driver: DriverProfile) {
    return driverAccounts.filter(
      (account) =>
        account.company_id === driver.company_id &&
        (account.active_driver_id == null || account.active_driver_id === driver.driver_id),
    );
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

  function stopRowNavigation(event: React.SyntheticEvent) {
    event.stopPropagation();
  }

  async function handleLinkDriverAccount(driver: DriverProfile) {
    const driverAccountId = selectedDriverAccounts[driver.driver_id];
    if (!driverAccountId) {
      return;
    }

    setErrorMessage(null);
    try {
      await createDriverAccountLink(client, driverAccountId, driver.driver_id);
      await reloadDriverAccounts();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleUnlinkDriverAccount(linkId: string) {
    setErrorMessage(null);
    try {
      await unlinkDriverAccountLink(client, linkId);
      await reloadDriverAccounts();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <PageLayout
      actions={
        canManageDriverProfiles ? (
          <Link className="button primary" to="/drivers/new">
            배송원 생성
          </Link>
        ) : null
      }
      subtitle="배송원 정본과 계정 연결 상태를 같은 화면에서 관리합니다."
      title="배송원"
    >
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">배송원</p>
          <h2>배송원 목록</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? <p className="empty-state">배송원을 불러오는 중입니다...</p> : (
          <table className="table compact">
            <thead><tr><th>이름</th><th>배송원 계정</th><th>회사</th><th>플릿</th><th>계정 연결</th></tr></thead>
            <tbody>
              {drivers.map((driver) => {
                const detailPath = driver.route_no != null ? `/drivers/${getDriverRouteRef(driver)}` : null;
                const activeLink = getActiveDriverAccountLink(driver.driver_id);
                const availableAccounts = getAvailableDriverAccounts(driver);

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
                    <td>{activeLink?.email ?? '미연결'}</td>
                    <td>{getCompanyName(driver.company_id)}</td>
                    <td>{getFleetName(driver.fleet_id)}</td>
                    <td>
                      <div className="inline-actions" onClick={stopRowNavigation} onKeyDown={stopRowNavigation}>
                        {activeLink ? (
                          <button className="button ghost small" onClick={() => void handleUnlinkDriverAccount(activeLink.driver_account_link_id)} type="button">
                            연결 해제
                          </button>
                        ) : (
                          <>
                            <select
                              onChange={(event) =>
                                setSelectedDriverAccounts((current) => ({
                                  ...current,
                                  [driver.driver_id]: event.target.value,
                                }))
                              }
                              value={selectedDriverAccounts[driver.driver_id] ?? ''}
                            >
                              <option value="">배송원 계정 선택</option>
                              {availableAccounts.map((account) => (
                                <option key={account.driver_account_id} value={account.driver_account_id}>
                                  {account.identity.name}
                                </option>
                              ))}
                            </select>
                            <button
                              className="button ghost small"
                              disabled={!selectedDriverAccounts[driver.driver_id]}
                              onClick={() => void handleLinkDriverAccount(driver)}
                              type="button"
                            >
                              계정 연결
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </PageLayout>
  );
}
