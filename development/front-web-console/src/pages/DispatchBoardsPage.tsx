import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { listDailyDeliveryInputSnapshots } from '../api/deliveryRecords';
import { listDispatchPlans } from '../api/dispatchRegistry';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import { PageLayout } from '../components/PageLayout';
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
  const snapshotCountMap = useMemo(() => {
    const counts = new Map<string, number>();
    snapshots.forEach((snapshot) => {
      const key = `${snapshot.company_id}:${snapshot.fleet_id}:${snapshot.service_date}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [snapshots]);
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
  const draftPlanCount = rows.filter((plan) => plan.dispatch_status === 'draft').length;

  return (
    <PageLayout
      actions={
        <div className="button-group">
          <Link className="button primary" to="/dispatch/plans/new">
            예상 물량 입력
          </Link>
          <Link className="button ghost" to="/dispatch/uploads">
            배차표 업로드
          </Link>
        </div>
      }
      subtitle="플릿과 날짜 기준으로 배차 계획을 관리합니다."
      title="배차 계획"
    >
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">보드 목록</p>
          <h2>플릿 날짜별 배차 계획</h2>
          <p className="table-meta">예상 물량과 보드 진입점을 날짜 기준으로 정리합니다.</p>
        </div>
        {!isLoading ? (
          <div className="summary-strip">
            <article className="summary-item">
              <span>Boards</span>
              <strong>{rows.length}</strong>
              <small>현재 조회 가능한 배차 보드 수</small>
            </article>
            <article className="summary-item">
              <span>활성 Snapshot</span>
              <strong>{snapshots.length}</strong>
              <small>해당 날짜 기준 생성된 입력 snapshot 수</small>
            </article>
            <article className="summary-item">
              <span>Draft Plans</span>
              <strong>{draftPlanCount}</strong>
              <small>아직 확정 전인 배차 계획 수</small>
            </article>
          </div>
        ) : null}
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">배차 계획을 불러오는 중입니다...</p>
        ) : rows.length ? (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">각 카드에서 날짜, 물량, 입력 준비 상태를 함께 봅니다.</span>
              <span className="table-meta">총 {rows.length}개 보드</span>
            </div>
            <div className="dispatch-plan-list">
              {rows.map((plan) => {
                const fleet = fleetMap.get(plan.fleet_id);
                const fleetRef = fleet ? getFleetBrowserRef(fleet) : null;
                const snapshotCount =
                  snapshotCountMap.get(`${plan.company_id}:${plan.fleet_id}:${plan.dispatch_date}`) ?? 0;

                return (
                  <article className="dispatch-plan-card" key={plan.dispatch_plan_id}>
                    <div className="dispatch-plan-card-header">
                      <div className="dispatch-plan-card-title">
                        <p className="panel-kicker">{companyNameMap.get(plan.company_id) ?? '미확인 회사'}</p>
                        <h3>{fleet?.name ?? '미확인 플릿'}</h3>
                        <p className="table-meta">{plan.dispatch_date}</p>
                      </div>
                      <span className="status-badge">{plan.dispatch_status}</span>
                    </div>
                    <div className="dispatch-plan-card-metrics">
                      <div className="metric-card">
                        <span>예상 물량</span>
                        <strong>{plan.planned_volume}</strong>
                      </div>
                      <div className="metric-card">
                        <span>입력 Snapshot</span>
                        <strong>{snapshotCount}</strong>
                      </div>
                    </div>
                    <div className="dispatch-plan-card-actions">
                      {fleetRef ? (
                        <Link className="button primary small" to={`/dispatch/boards/${fleetRef}/${plan.dispatch_date}`}>
                          보드 열기
                        </Link>
                      ) : null}
                      <Link className="button ghost small" to={`/dispatch/plans/${plan.dispatch_plan_id}/edit`}>
                        예상 물량 수정
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <p className="empty-state">등록된 배차 계획이 없습니다.</p>
        )}
      </section>
    </PageLayout>
  );
}
