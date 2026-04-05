import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listDailyDeliveryInputSnapshots } from '../api/deliveryRecords';
import { listDispatchPlans } from '../api/dispatchRegistry';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import type { Company, DailyDeliveryInputSnapshot, DispatchPlan, Fleet } from '../types';

type DispatchBoardsPageProps = {
  client: HttpClient;
};

function getFleetBrowserRef(fleet: Fleet) {
  if (fleet.route_no != null) {
    return String(fleet.route_no);
  }
  if (fleet.public_ref) {
    return fleet.public_ref;
  }
  return fleet.fleet_id;
}

export function DispatchBoardsPage({ client }: DispatchBoardsPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [plans, setPlans] = useState<DispatchPlan[]>([]);
  const [snapshots, setSnapshots] = useState<DailyDeliveryInputSnapshot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse, planResponse] = await Promise.all([
          listCompanies(client),
          listFleets(client),
          listDispatchPlans(client),
        ]);
        const snapshotResponse = await listDailyDeliveryInputSnapshots(client, { status: 'active' });
        if (ignore) {
          return;
        }
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setPlans(planResponse);
        setSnapshots(snapshotResponse);
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

  const companyNameMap = useMemo(
    () => new Map(companies.map((company) => [company.company_id, company.name])),
    [companies],
  );
  const fleetMap = useMemo(() => new Map(fleets.map((fleet) => [fleet.fleet_id, fleet])), [fleets]);
  const snapshotKeySet = useMemo(
    () =>
      new Set(
        snapshots.map(
          (snapshot) => `${snapshot.company_id}:${snapshot.fleet_id}:${snapshot.service_date}`,
        ),
      ),
    [snapshots],
  );

  const rows = useMemo(
    () =>
      [...plans].sort((left, right) => {
        if (left.dispatch_date !== right.dispatch_date) {
          return left.dispatch_date.localeCompare(right.dispatch_date);
        }
        return left.fleet_id.localeCompare(right.fleet_id);
      }),
    [plans],
  );

  return (
    <section className="panel">
      <div className="panel-header panel-header-inline">
        <div>
          <p className="panel-kicker">배차 보드</p>
          <h2>플릿 날짜별 배차 계획</h2>
        </div>
        <Link className="button primary" to="/dispatch/plans/new">
          예상 물량 입력
        </Link>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">배차 계획을 불러오는 중입니다...</p>
      ) : rows.length ? (
        <table className="table compact">
          <thead>
            <tr>
              <th>회사</th>
              <th>플릿</th>
              <th>날짜</th>
              <th>예상 물량</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((plan) => {
              const fleet = fleetMap.get(plan.fleet_id);
              const fleetRef = fleet ? getFleetBrowserRef(fleet) : null;
              const snapshotStatus = snapshotKeySet.has(
                `${plan.company_id}:${plan.fleet_id}:${plan.dispatch_date}`,
              )
                ? '정산 입력 완료'
                : '정산 입력 대기';

              return (
                <tr key={plan.dispatch_plan_id}>
                  <td>{companyNameMap.get(plan.company_id) ?? '미확인 회사'}</td>
                  <td>{fleet?.name ?? '미확인 플릿'}</td>
                  <td>{plan.dispatch_date}</td>
                  <td>{plan.planned_volume}</td>
                  <td>
                    <div className="stack tight">
                      <span>{plan.dispatch_status}</span>
                      <span>{snapshotStatus}</span>
                    </div>
                  </td>
                  <td>
                    <div className="inline-actions">
                      {fleetRef ? (
                        <Link className="button ghost small" to={`/dispatch/boards/${fleetRef}/${plan.dispatch_date}`}>
                          보드 열기
                        </Link>
                      ) : null}
                      <Link className="button ghost small" to={`/dispatch/plans/${plan.dispatch_plan_id}/edit`}>
                        예상 물량 수정
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">등록된 배차 계획이 없습니다.</p>
      )}
    </section>
  );
}
