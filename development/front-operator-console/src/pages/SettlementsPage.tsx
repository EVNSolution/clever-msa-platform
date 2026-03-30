import { useEffect, useState } from 'react';

import { listDrivers } from '../api/drivers';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import {
  getDriverLatestSettlement,
  listSettlementReadItems,
  listSettlementReadRuns,
} from '../api/settlementOps';
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

type SettlementsPageProps = {
  client: HttpClient;
};

export function SettlementsPage({ client }: SettlementsPageProps) {
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [latestDriverSettlement, setLatestDriverSettlement] = useState<DriverLatestSettlement | null>(null);
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
        setSelectedDriverId((current) => current || driverResponse[0]?.driver_id || '');
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
    if (!selectedDriverId) {
      setLatestDriverSettlement(null);
      setDriverSummaryError(null);
      return;
    }

    let ignore = false;

    async function loadLatestDriverSettlement() {
      setIsDriverSummaryLoading(true);
      setDriverSummaryError(null);
      try {
        const response = await getDriverLatestSettlement(client, selectedDriverId);
        if (!ignore) {
          setLatestDriverSettlement(response);
        }
      } catch (error) {
        if (!ignore) {
          setLatestDriverSettlement(null);
          setDriverSummaryError(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsDriverSummaryLoading(false);
        }
      }
    }

    void loadLatestDriverSettlement();
    return () => {
      ignore = true;
    };
  }, [client, selectedDriverId]);

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function getFleetName(fleetId: string) {
    return fleets.find((fleet) => fleet.fleet_id === fleetId)?.name ?? '미확인 플릿';
  }

  function getDriverName(driverId: string) {
    return drivers.find((driver) => driver.driver_id === driverId)?.name ?? '미확인 배송원';
  }

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 조회</p>
          <h2>읽기 전용 정산 요약</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 조회 데이터를 불러오는 중입니다...</p>
        ) : (
          <div className="grid-cards">
            <article className="stat-card">
              <span>실행</span>
              <strong>{runs.length}</strong>
            </article>
            <article className="stat-card">
              <span>결과</span>
              <strong>{items.length}</strong>
            </article>
            <article className="stat-card">
              <span>배송원</span>
              <strong>{drivers.length}</strong>
            </article>
          </div>
        )}
      </section>

      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">배송원 기준</p>
          <h2>최신 정산 조회</h2>
        </div>
        <label className="field">
          <span>배송원</span>
          <select onChange={(event) => setSelectedDriverId(event.target.value)} value={selectedDriverId}>
            {drivers.map((driver) => (
              <option key={driver.driver_id} value={driver.driver_id}>
                {driver.name}
              </option>
            ))}
          </select>
        </label>
        {driverSummaryError ? <div className="error-banner">{driverSummaryError}</div> : null}
        {isDriverSummaryLoading ? (
          <p className="empty-state">배송원 최신 정산을 불러오는 중입니다...</p>
        ) : latestDriverSettlement ? (
          <dl className="detail-list">
            <div>
              <dt>배송원</dt>
              <dd>{getDriverName(latestDriverSettlement.driver_id)}</dd>
            </div>
            <div>
              <dt>배송이력 존재</dt>
              <dd>{formatNullableBooleanLabel(latestDriverSettlement.delivery_history_present)}</dd>
            </div>
            <div>
              <dt>근태 추정</dt>
              <dd>{formatNullableBooleanLabel(latestDriverSettlement.attendance_inferred_from_delivery_history)}</dd>
            </div>
            <div>
              <dt>최신 정산</dt>
              <dd>
                {latestDriverSettlement.latest_settlement
                  ? `${latestDriverSettlement.latest_settlement.period_start} ~ ${latestDriverSettlement.latest_settlement.period_end}`
                  : '정산 이력 없음'}
              </dd>
            </div>
            <div>
              <dt>정산 상태</dt>
              <dd>
                {latestDriverSettlement.latest_settlement
                  ? formatSettlementStatusLabel(latestDriverSettlement.latest_settlement.status)
                  : '정산 이력 없음'}
              </dd>
            </div>
            <div>
              <dt>지급 상태</dt>
              <dd>
                {latestDriverSettlement.latest_settlement
                  ? formatPayoutStatusLabel(latestDriverSettlement.latest_settlement.payout_status)
                  : '정산 이력 없음'}
              </dd>
            </div>
            <div>
              <dt>금액</dt>
              <dd>{latestDriverSettlement.latest_settlement?.amount ?? '정산 이력 없음'}</dd>
            </div>
          </dl>
        ) : (
          <p className="empty-state">조회할 배송원이 없습니다.</p>
        )}
      </section>

      <section className="data-grid two-columns">
        <article className="panel">
          <div className="panel-header">
            <p className="panel-kicker">Run Read</p>
            <h2>정산 실행 조회</h2>
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
                    <td>{getCompanyName(run.company_id)}</td>
                    <td>{getFleetName(run.fleet_id)}</td>
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
        </article>

        <article className="panel">
          <div className="panel-header">
            <p className="panel-kicker">Item Read</p>
            <h2>정산 결과 조회</h2>
          </div>
          {isLoading ? (
            <p className="empty-state">정산 결과 조회를 불러오는 중입니다...</p>
          ) : items.length ? (
            <table className="table compact">
              <thead>
                <tr>
                  <th>대상</th>
                  <th>금액</th>
                  <th>지급 상태</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.settlement_item_id}>
                    <td>{getDriverName(item.driver_id)}</td>
                    <td>{item.amount}</td>
                    <td>{formatPayoutStatusLabel(item.payout_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">조회 가능한 정산 결과가 없습니다.</p>
          )}
        </article>
      </section>
    </div>
  );
}
