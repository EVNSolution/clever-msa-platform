import { useEffect, useState } from 'react';

import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { listPagedDriverLatestSettlements, listSettlementReadItems, listSettlementReadRuns } from '../api/settlementOps';
import type {
  Company,
  DriverLatestSettlementPage,
  Fleet,
  SettlementItem,
  SettlementRun,
} from '../types';
import {
  formatNullableBooleanLabel,
  formatPayoutStatusLabel,
  formatSettlementStatusLabel,
} from '../uiLabels';
import { useSettlementFlow } from '../components/SettlementFlowContext';
import { getCompanyName, getFleetName } from './settlementAdminHelpers';

type SettlementOverviewPageProps = {
  client: HttpClient;
};

const DRIVER_PAGE_SIZE = 10;

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

export function SettlementOverviewPage({ client }: SettlementOverviewPageProps) {
  const { selectedCompanyId, selectedFleetId } = useSettlementFlow();
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [latestDriverSettlementPage, setLatestDriverSettlementPage] = useState<DriverLatestSettlementPage | null>(null);
  const [currentDriverPage, setCurrentDriverPage] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driverSummaryError, setDriverSummaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDriverSummaryLoading, setIsDriverSummaryLoading] = useState(false);

  function getScopeFilters() {
    return {
      ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
      ...(selectedFleetId ? { fleet_id: selectedFleetId } : {}),
    };
  }

  useEffect(() => {
    setCurrentDriverPage(1);
  }, [selectedCompanyId, selectedFleetId]);

  useEffect(() => {
    let ignore = false;

    async function loadReferenceData() {
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
      }
    }

    void loadReferenceData();
    return () => {
      ignore = true;
    };
  }, [client]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      const scopeFilters = getScopeFilters();

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [runResponse, itemResponse] = await Promise.all([
          listSettlementReadRuns(client, scopeFilters),
          listSettlementReadItems(client, scopeFilters),
        ]);

        if (ignore) {
          return;
        }

        setRuns(runResponse);
        setItems(itemResponse);
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
  }, [client, selectedCompanyId, selectedFleetId]);

  useEffect(() => {
    let ignore = false;

    async function loadLatestDriverSettlements() {
      const scopeFilters = getScopeFilters();

      setIsDriverSummaryLoading(true);
      setDriverSummaryError(null);
      try {
        const response = await listPagedDriverLatestSettlements(client, {
          ...scopeFilters,
          page: currentDriverPage,
          page_size: DRIVER_PAGE_SIZE,
        });
        if (ignore) {
          return;
        }

        setLatestDriverSettlementPage(response);
        if (response.page !== currentDriverPage) {
          setCurrentDriverPage(response.page);
        }
      } catch (error) {
        if (!ignore) {
          setLatestDriverSettlementPage(null);
          setDriverSummaryError(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsDriverSummaryLoading(false);
        }
      }
    }

    void loadLatestDriverSettlements();
    return () => {
      ignore = true;
    };
  }, [client, currentDriverPage, selectedCompanyId, selectedFleetId]);

  const latestRun = runs[0] ?? null;
  const latestItem = items[0] ?? null;
  const totalDriverCount = latestDriverSettlementPage?.count ?? 0;
  const latestDriverSettlements = latestDriverSettlementPage?.results ?? [];
  const totalDriverPages = Math.max(
    1,
    Math.ceil(totalDriverCount / (latestDriverSettlementPage?.page_size ?? DRIVER_PAGE_SIZE)),
  );
  const paginationTokens = buildPaginationTokens(totalDriverPages, latestDriverSettlementPage?.page ?? currentDriverPage);

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 조회</p>
          <h2>정산 운영 요약</h2>
          <p className="empty-state">최근 정산 실행, 기사별 결과, 배송원 최신 정산을 한 화면에서 확인합니다.</p>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 조회 데이터를 불러오는 중입니다...</p>
        ) : (
          <div className="summary-strip">
            <article className="summary-item">
              <span>Settlement Runs</span>
              <strong>{runs.length}</strong>
              <small>
                최신 실행:{' '}
                {latestRun
                  ? `${getCompanyName(companies, latestRun.company_id)} / ${getFleetName(fleets, latestRun.fleet_id)}`
                  : '없음'}
              </small>
            </article>
            <article className="summary-item">
              <span>Settlement Items</span>
              <strong>{items.length}</strong>
              <small>최신 지급 상태: {latestItem ? formatPayoutStatusLabel(latestItem.payout_status) : '없음'}</small>
            </article>
            <article className="summary-item">
              <span>Drivers</span>
              <strong>{totalDriverCount}</strong>
              <small>최신 정산 조회 가능: {totalDriverCount}명</small>
            </article>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">배송원 기준</p>
          <h2>최신 정산 조회</h2>
          <p className="empty-state">배송원 최신 정산은 10명 단위로 나눠 조회합니다. 전체 배송원 일괄 조회는 사용하지 않습니다.</p>
        </div>
        {driverSummaryError ? <div className="error-banner">{driverSummaryError}</div> : null}
        {isDriverSummaryLoading ? (
          <p className="empty-state">배송원 최신 정산을 불러오는 중입니다...</p>
        ) : latestDriverSettlements.length ? (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">현재 페이지 10명 기준 최신 정산 상태만 조회합니다.</span>
              <span className="table-meta">
                페이지 {latestDriverSettlementPage?.page ?? currentDriverPage} / {totalDriverPages}
              </span>
            </div>
            <table className="table compact">
              <thead>
                <tr>
                  <th>배송원</th>
                  <th>정산 상태</th>
                  <th>지급 상태</th>
                  <th>금액</th>
                  <th>최신 정산</th>
                  <th>배송이력</th>
                  <th>근태 추정</th>
                </tr>
              </thead>
              <tbody>
                {latestDriverSettlements.map((driverSettlement) => (
                  <tr key={driverSettlement.driver_id}>
                    <td>{driverSettlement.driver_name}</td>
                    <td>
                      {driverSettlement.latest_settlement
                        ? formatSettlementStatusLabel(driverSettlement.latest_settlement.status)
                        : '없음'}
                    </td>
                    <td>
                      {driverSettlement.latest_settlement
                        ? formatPayoutStatusLabel(driverSettlement.latest_settlement.payout_status)
                        : '없음'}
                    </td>
                    <td>{driverSettlement.latest_settlement?.amount ?? '-'}</td>
                    <td>
                      {driverSettlement.latest_settlement
                        ? `${driverSettlement.latest_settlement.period_start} ~ ${driverSettlement.latest_settlement.period_end}`
                        : '정산 이력 없음'}
                    </td>
                    <td>{formatNullableBooleanLabel(driverSettlement.delivery_history_present)}</td>
                    <td>{formatNullableBooleanLabel(driverSettlement.attendance_inferred_from_delivery_history)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalDriverPages > 1 ? (
              <div className="settlement-overview-pagination" aria-label="배송원 정산 조회 페이지 번호">
                {paginationTokens.map((token, index) =>
                  token === 'ellipsis' ? (
                    <span key={`ellipsis-${index}`} className="settlement-overview-pagination-ellipsis" aria-hidden="true">
                      ...
                    </span>
                  ) : (
                    <button
                      key={token}
                      className={
                        token === (latestDriverSettlementPage?.page ?? currentDriverPage)
                          ? 'button primary small'
                          : 'button ghost small'
                      }
                      onClick={() => setCurrentDriverPage(token)}
                      type="button"
                    >
                      {token}
                    </button>
                  ),
                )}
              </div>
            ) : null}
          </>
        ) : (
          <p className="empty-state">조회할 배송원이 없습니다.</p>
        )}
      </section>

      <div className="data-grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">Run Read</p>
            <h2>정산 실행 조회</h2>
          </div>
          <div className="panel-toolbar">
            <span className="table-meta">최근 실행 순으로 run을 읽고 상태 흐름을 확인합니다.</span>
            <span className="table-meta">총 {runs.length}건</span>
          </div>
          {isLoading ? (
            <p className="empty-state">정산 실행 조회를 불러오는 중입니다...</p>
          ) : runs.length ? (
            <table className="table compact">
              <thead>
                <tr>
                  <th>회사</th>
                  <th>플릿</th>
                  <th>기간</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.settlement_run_id}>
                    <td>{getCompanyName(companies, run.company_id)}</td>
                    <td>{getFleetName(fleets, run.fleet_id)}</td>
                    <td>
                      {run.period_start} ~ {run.period_end}
                    </td>
                    <td>{formatSettlementStatusLabel(run.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">조회 가능한 정산 실행이 없습니다.</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">Item Read</p>
            <h2>정산 결과 조회</h2>
          </div>
          <div className="panel-toolbar">
            <span className="table-meta">기사별 금액과 지급 상태를 결과 기준으로 읽습니다.</span>
            <span className="table-meta">총 {items.length}건</span>
          </div>
          {isLoading ? (
            <p className="empty-state">정산 결과 조회를 불러오는 중입니다...</p>
          ) : items.length ? (
            <table className="table compact">
              <thead>
                <tr>
                  <th>배송원</th>
                  <th>금액</th>
                  <th>지급 상태</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.settlement_item_id}>
                    <td>{item.driver_id}</td>
                    <td>{item.amount}</td>
                    <td>{formatPayoutStatusLabel(item.payout_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">조회 가능한 정산 결과가 없습니다.</p>
          )}
        </section>
      </div>
    </div>
  );
}
