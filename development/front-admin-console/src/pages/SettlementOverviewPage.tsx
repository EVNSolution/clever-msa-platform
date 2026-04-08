import { useEffect, useState } from 'react';

import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { getDriverLatestSettlement, listSettlementReadItems, listSettlementReadRuns } from '../api/settlementOps';
import type {
  Company,
  DriverLatestSettlement,
  DriverProfile,
  Fleet,
  SettlementItem,
  SettlementRun,
} from '../types';
import {
  formatNullableBooleanLabel,
  formatPayoutStatusLabel,
  formatSettlementStatusLabel,
} from '../uiLabels';
import { getCompanyName, getDriverName, getFleetName } from './settlementAdminHelpers';

type SettlementOverviewPageProps = {
  client: HttpClient;
};

export function SettlementOverviewPage({ client }: SettlementOverviewPageProps) {
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [latestDriverSettlements, setLatestDriverSettlements] = useState<DriverLatestSettlement[]>([]);
  const [hasLoadedDriverSummaries, setHasLoadedDriverSummaries] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driverSummaryError, setDriverSummaryError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDriverSummaryLoading, setIsDriverSummaryLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [runResponse, itemResponse, driverResponse, companyResponse, fleetResponse] = await Promise.all([
          listSettlementReadRuns(client),
          listSettlementReadItems(client),
          listDrivers(client),
          listCompanies(client),
          listFleets(client),
        ]);

        if (ignore) {
          return;
        }

        setRuns(runResponse);
        setItems(itemResponse);
        setDrivers(driverResponse);
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
    if (!drivers.length) {
      setLatestDriverSettlements([]);
      setDriverSummaryError(null);
      setHasLoadedDriverSummaries(true);
      return;
    }
    let ignore = false;

    async function loadLatestDriverSettlements() {
      setIsDriverSummaryLoading(true);
      setDriverSummaryError(null);
      setHasLoadedDriverSummaries(false);
      try {
        const results = await Promise.allSettled(drivers.map((driver) => getDriverLatestSettlement(client, driver.driver_id)));
        if (!ignore) {
          const fulfilled = results
            .filter((result): result is PromiseFulfilledResult<DriverLatestSettlement> => result.status === 'fulfilled')
            .map((result) => result.value);
          const failedCount = results.length - fulfilled.length;

          setLatestDriverSettlements(fulfilled);
          setDriverSummaryError(failedCount > 0 ? '일부 배송원의 최신 정산을 불러오지 못했습니다.' : null);
          setHasLoadedDriverSummaries(true);
        }
      } catch (error) {
        if (!ignore) {
          setLatestDriverSettlements([]);
          setDriverSummaryError(getErrorMessage(error));
          setHasLoadedDriverSummaries(true);
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
  }, [client, drivers]);

  const latestRun = runs[0] ?? null;
  const latestItem = items[0] ?? null;
  const latestDriverSettlementCount = latestDriverSettlements.length;

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
              <strong>{drivers.length}</strong>
              <small>최신 정산 조회 가능: {latestDriverSettlementCount}명</small>
            </article>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">배송원 기준</p>
          <h2>최신 정산 조회</h2>
          <p className="empty-state">배송원을 따로 선택하지 않고 전체 최신 정산 상태를 한 번에 확인합니다.</p>
        </div>
        {driverSummaryError ? <div className="error-banner">{driverSummaryError}</div> : null}
        {!hasLoadedDriverSummaries || isDriverSummaryLoading ? (
          <p className="empty-state">배송원 최신 정산을 불러오는 중입니다...</p>
        ) : latestDriverSettlements.length ? (
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
                  <td>{getDriverName(drivers, driverSettlement.driver_id)}</td>
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
                    <td>{getDriverName(drivers, item.driver_id)}</td>
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
