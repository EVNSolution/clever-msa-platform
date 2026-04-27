import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { canManageDriverProfileScope } from '../authScopes';
import { listDriverAccountLinks } from '../api/driverAccountLinks';
import { listDrivers } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { getDriverRouteRef } from '../routeRefs';
import type { Company, DriverAccountLinkSummary, DriverProfile, Fleet } from '../types';

type DriversPageProps = {
  client: HttpClient;
  session: SessionPayload;
  viewMode?: 'default' | 'vehicleStatus';
};

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100, 'all'] as const;

type PaginationToken = number | 'ellipsis';

function buildPaginationTokens(totalPages: number, currentPage: number): PaginationToken[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export function DriversPage({ client, session, viewMode = 'default' }: DriversPageProps) {
  const navigate = useNavigate();
  const [driverAccountLinks, setDriverAccountLinks] = useState<DriverAccountLinkSummary[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFleetId, setSelectedFleetId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(15);
  const [currentPage, setCurrentPage] = useState(1);
  const canManageDriverProfiles = canManageDriverProfileScope(session);
  const isVehicleStatusView = viewMode === 'vehicleStatus';

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

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, searchTerm, selectedFleetId]);

  useEffect(() => {
    if (!isVehicleStatusView) {
      return;
    }

    if (fleets.length === 0) {
      return;
    }

    const hasSelectedFleet = fleets.some((fleet) => fleet.fleet_id === selectedFleetId);
    if (!hasSelectedFleet) {
      setSelectedFleetId(fleets[0].fleet_id);
    }
  }, [fleets, isVehicleStatusView, selectedFleetId]);

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function getFleetName(fleetId: string) {
    return fleets.find((fleet) => fleet.fleet_id === fleetId)?.name ?? '미확인 플릿';
  }

  function getActiveDriverAccountLink(driverId: string) {
    return driverAccountLinks.find((entry) => entry.driver_id === driverId && entry.unlinked_at == null) ?? null;
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

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredDrivers = drivers.filter((driver) => {
    const matchesFleet = selectedFleetId === 'all' || driver.fleet_id === selectedFleetId;
    if (!matchesFleet) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    return (
      driver.name.toLowerCase().includes(normalizedSearchTerm) ||
      (driver.external_user_name ?? '').toLowerCase().includes(normalizedSearchTerm)
    );
  });

  const totalPages =
    pageSize === 'all'
      ? 1
      : Math.max(1, Math.ceil(filteredDrivers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedDrivers =
    pageSize === 'all'
      ? filteredDrivers
      : filteredDrivers.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
  const paginationTokens = buildPaginationTokens(totalPages, safeCurrentPage);
  const filters = isVehicleStatusView ? (
    <div className="driver-list-filter-row driver-list-filter-row-compact">
      <label className="driver-list-filter-inline">
        <span>플릿</span>
        <select value={selectedFleetId} onChange={(event) => setSelectedFleetId(event.target.value)}>
          {fleets.length === 0 ? <option value="all">플릿 없음</option> : null}
          {fleets.map((fleet) => (
            <option key={fleet.fleet_id} value={fleet.fleet_id}>
              {fleet.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  ) : (
    <div className="driver-list-filter-row">
      <label className="driver-list-filter-inline">
        <span>플릿</span>
        <select value={selectedFleetId} onChange={(event) => setSelectedFleetId(event.target.value)}>
          <option value="all">전체</option>
          {fleets.map((fleet) => (
            <option key={fleet.fleet_id} value={fleet.fleet_id}>
              {fleet.name}
            </option>
          ))}
        </select>
      </label>
      <label className="driver-list-filter-inline driver-list-filter-search">
        <span>검색</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="배송원 이름 또는 원청 앱 사용자명"
        />
      </label>
    </div>
  );

  return (
    <PageLayout
      contentClassName="driver-list-page"
      fillContent
      layoutClassName="driver-list-layout"
      template="workbench"
      actions={
        !isVehicleStatusView && canManageDriverProfiles ? (
          <Link className="button primary" to="/drivers/new">
            배송원 생성
          </Link>
        ) : null
      }
      filters={filters}
      subtitle={isVehicleStatusView ? '플릿 기준 배송원 목록' : '배송원 운영 현황을 확인하고, 계정 연결은 상세 화면에서 관리합니다.'}
      title={isVehicleStatusView ? '배송원 현황' : '배송원'}
    >
      <section className="panel driver-list-shell">
        <div className="driver-list-body">
          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
          <div className="driver-list-content">
            {isLoading ? <p className="empty-state">배송원을 불러오는 중입니다...</p> : null}
            {!isLoading && pagedDrivers.length === 0 ? <p className="empty-state">조건에 맞는 배송원이 없습니다.</p> : null}
            {!isLoading && pagedDrivers.length > 0 ? (
              <div className="driver-list-table-shell">
                <div className="driver-list-table-scroll">
                  <table
                    className={
                      isVehicleStatusView
                        ? 'table compact driver-list-table driver-list-status-table'
                        : 'table compact driver-list-table'
                    }
                  >
                    <thead>
                      <tr>
                        {isVehicleStatusView ? (
                          <th>배송원</th>
                        ) : (
                          <>
                            <th>이름</th>
                            <th>원청 앱 사용자명</th>
                            <th>회사</th>
                            <th>플릿</th>
                            <th>계정 연결</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedDrivers.map((driver) => {
                        const detailPath = driver.route_no != null ? `/drivers/${getDriverRouteRef(driver)}` : null;
                        const activeLink = getActiveDriverAccountLink(driver.driver_id);

                        return (
                          <tr
                            key={driver.driver_id}
                            className={detailPath ? 'interactive-row' : undefined}
                            data-detail-path={detailPath ?? undefined}
                            onClick={detailPath ? () => navigate(detailPath) : undefined}
                            onKeyDown={detailPath ? (event) => handleRowKeyDown(event, detailPath) : undefined}
                            tabIndex={detailPath ? 0 : undefined}
                          >
                            {isVehicleStatusView ? (
                              <td>
                                <div className="driver-list-status-cell">
                                  <strong>{driver.name}</strong>
                                  <span>{driver.external_user_name || '계정 미연결'}</span>
                                </div>
                              </td>
                            ) : (
                              <>
                                <td>{driver.name}</td>
                                <td>{driver.external_user_name || '미입력'}</td>
                                <td>{getCompanyName(driver.company_id)}</td>
                                <td>{getFleetName(driver.fleet_id)}</td>
                                <td onClick={stopRowNavigation} onKeyDown={stopRowNavigation}>
                                  {activeLink?.identity_name ?? ''}
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="driver-list-footer">
          <div className="driver-list-footer-controls">
            <label className="driver-list-page-size">
              <span className="driver-list-page-size-label">페이지 당 행 수</span>
              <span className="driver-list-page-size-control">
                <select
                  aria-label="페이지 당 행 수"
                  value={String(pageSize)}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setPageSize(nextValue === 'all' ? 'all' : Number(nextValue) as 15 | 30 | 50 | 100);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={String(option)} value={String(option)}>
                      {option === 'all' ? 'all' : option}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            {totalPages > 1 ? (
              <div className="driver-list-pagination" aria-label="페이지 번호">
                {paginationTokens.map((token, index) =>
                  token === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="driver-list-pagination-ellipsis" aria-hidden="true">
                      …
                    </span>
                  ) : (
                    <button
                      key={token}
                      type="button"
                      className={token === safeCurrentPage ? 'is-active' : undefined}
                      disabled={token === safeCurrentPage}
                      onClick={() => setCurrentPage(token)}
                    >
                      {token}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
