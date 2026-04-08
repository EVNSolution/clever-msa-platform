import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listRegionDailyStatistics, listRegionPerformanceSummaries, listRegions } from '../api/regions';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { canManageRegionScope } from '../authScopes';
import { PageLayout } from '../components/PageLayout';
import { getRegionRouteRef } from '../routeRefs';
import type { Region, RegionDailyStatistic, RegionPerformanceSummary } from '../types';

type RegionsPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

function getLatestDailyStatsByRegion(stats: RegionDailyStatistic[]) {
  const map = new Map<string, RegionDailyStatistic>();
  stats.forEach((stat) => {
    const current = map.get(stat.region_id);
    if (!current || stat.service_date > current.service_date) {
      map.set(stat.region_id, stat);
    }
  });
  return map;
}

function getLatestPerformanceByRegion(summaries: RegionPerformanceSummary[]) {
  const map = new Map<string, RegionPerformanceSummary>();
  summaries.forEach((summary) => {
    const current = map.get(summary.region_id);
    if (
      !current ||
      summary.period_end > current.period_end ||
      (summary.period_end === current.period_end && summary.period_start > current.period_start)
    ) {
      map.set(summary.region_id, summary);
    }
  });
  return map;
}

function formatPercentage(value: string | null | undefined) {
  if (!value) {
    return '-';
  }
  return `${Number(value).toFixed(2)}%`;
}

export function RegionsPage({ client, session }: RegionsPageProps) {
  const navigate = useNavigate();
  const [regions, setRegions] = useState<Region[]>([]);
  const [dailyStatistics, setDailyStatistics] = useState<RegionDailyStatistic[]>([]);
  const [performanceSummaries, setPerformanceSummaries] = useState<RegionPerformanceSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [regionResponse, dailyResponse, performanceResponse] = await Promise.all([
          listRegions(client),
          listRegionDailyStatistics(client),
          listRegionPerformanceSummaries(client),
        ]);
        if (ignore) {
          return;
        }
        setRegions(regionResponse);
        setDailyStatistics(dailyResponse);
        setPerformanceSummaries(performanceResponse);
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

  const latestDailyStatsByRegion = useMemo(() => getLatestDailyStatsByRegion(dailyStatistics), [dailyStatistics]);
  const latestPerformanceByRegion = useMemo(
    () => getLatestPerformanceByRegion(performanceSummaries),
    [performanceSummaries],
  );
  const analyzedRegionCount = useMemo(
    () =>
      regions.filter(
        (region) =>
          latestDailyStatsByRegion.has(region.region_id) || latestPerformanceByRegion.has(region.region_id),
      ).length,
    [latestDailyStatsByRegion, latestPerformanceByRegion, regions],
  );

  function handleRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, detailPath: string) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    navigate(detailPath);
  }

  return (
    <PageLayout
      actions={
        canManageRegionScope(session) ? (
          <Link className="button primary" to="/regions/new">
            권역 생성
          </Link>
        ) : null
      }
      subtitle="권역 정본과 최신 분석 요약을 같은 목록에서 확인합니다."
      title="권역"
    >
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">권역</p>
          <h2>권역 목록</h2>
          <p className="empty-state">권역 정본과 최신 분석 요약을 같은 밀도로 확인합니다.</p>
        </div>
        {!isLoading ? (
          <div className="summary-strip">
            <article className="summary-item">
              <span>Regions</span>
              <strong>{regions.length}</strong>
              <small>전체 등록 권역 수</small>
            </article>
            <article className="summary-item">
              <span>Analyzed</span>
              <strong>{analyzedRegionCount}</strong>
              <small>최신 통계 또는 성과 요약이 있는 권역</small>
            </article>
          </div>
        ) : null}
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? (
          <p className="empty-state">권역을 불러오는 중입니다...</p>
        ) : regions.length ? (
          <>
            <div className="panel-toolbar">
              <span className="table-meta">권역을 선택하면 polygon과 최신 분석 요약을 같은 문맥에서 확인합니다.</span>
              <span className="table-meta">총 {regions.length}개 권역</span>
            </div>
            <table className="table compact">
              <thead>
                <tr>
                  <th>권역</th>
                  <th>상태</th>
                  <th>난이도</th>
                  <th>최신 물량</th>
                  <th>완료율</th>
                </tr>
              </thead>
              <tbody>
                {regions.map((region) => {
                  const detailPath = `/regions/${getRegionRouteRef(region)}`;
                  const latestDailyStat = latestDailyStatsByRegion.get(region.region_id);
                  const latestPerformance = latestPerformanceByRegion.get(region.region_id);

                  return (
                    <tr
                      key={region.region_id}
                      className="interactive-row"
                      data-detail-path={detailPath}
                      onClick={() => navigate(detailPath)}
                      onKeyDown={(event) => handleRowKeyDown(event, detailPath)}
                      tabIndex={0}
                    >
                      <td>{region.name}</td>
                      <td>{region.status}</td>
                      <td>{region.difficulty_level}</td>
                      <td>{latestDailyStat?.delivery_count ?? '-'}</td>
                      <td>{formatPercentage(latestPerformance?.completion_rate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <p className="empty-state">등록된 권역이 없습니다.</p>
        )}
      </section>
    </PageLayout>
  );
}
