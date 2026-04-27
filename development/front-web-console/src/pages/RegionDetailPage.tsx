import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getRegionByCode, listRegionDailyStatistics, listRegionPerformanceSummaries } from '../api/regions';
import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import { canManageRegionScope } from '../authScopes';
import { getRegionRouteRef } from '../routeRefs';
import type { Region, RegionDailyStatistic, RegionPerformanceSummary } from '../types';
import { PageLayout } from '../components/PageLayout';

type RegionDetailPageProps = {
  client: HttpClient;
  session: SessionPayload;
};

function formatPercentage(value: string | null | undefined) {
  if (!value) {
    return '-';
  }
  return `${Number(value).toFixed(2)}%`;
}

export function RegionDetailPage({ client, session }: RegionDetailPageProps) {
  const { regionRef } = useParams();
  const [region, setRegion] = useState<Region | null>(null);
  const [dailyStatistics, setDailyStatistics] = useState<RegionDailyStatistic[]>([]);
  const [performanceSummaries, setPerformanceSummaries] = useState<RegionPerformanceSummary[]>([]);
  const [serviceDateFilter, setServiceDateFilter] = useState('');
  const [periodStartFilter, setPeriodStartFilter] = useState('');
  const [periodEndFilter, setPeriodEndFilter] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!regionRef) {
      setErrorMessage('권역 경로 키가 없습니다.');
      setIsLoading(false);
      return;
    }

    const selectedRegionRef = regionRef;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const regionResponse = await getRegionByCode(client, selectedRegionRef);
        if (ignore) {
          return;
        }
        setRegion(regionResponse);

        const [dailyResponse, performanceResponse] = await Promise.all([
          listRegionDailyStatistics(client, {
            regionId: regionResponse.region_id,
            serviceDate: serviceDateFilter || undefined,
          }),
          listRegionPerformanceSummaries(client, {
            regionId: regionResponse.region_id,
            periodStart: periodStartFilter || undefined,
            periodEnd: periodEndFilter || undefined,
          }),
        ]);
        if (ignore) {
          return;
        }
        setDailyStatistics(
          [...dailyResponse].sort((left, right) => right.service_date.localeCompare(left.service_date)),
        );
        setPerformanceSummaries(
          [...performanceResponse].sort((left, right) => {
            if (left.period_end === right.period_end) {
              return right.period_start.localeCompare(left.period_start);
            }
            return right.period_end.localeCompare(left.period_end);
          }),
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
  }, [client, periodEndFilter, periodStartFilter, regionRef, serviceDateFilter]);

  const latestDailyStatistic = useMemo(() => dailyStatistics[0] ?? null, [dailyStatistics]);
  const latestPerformanceSummary = useMemo(() => performanceSummaries[0] ?? null, [performanceSummaries]);

  return (
    <PageLayout
      actions={
        <>
          {region && canManageRegionScope(session) ? (
            <Link className="button ghost" to={`/regions/${getRegionRouteRef(region)}/edit`}>
              권역 수정
            </Link>
          ) : null}
          <Link className="button ghost" to="/regions">
            목록으로
          </Link>
        </>
      }
      contentClassName="data-grid two-columns relationship-grid"
      subtitle="권역 정본과 최신 분석 snapshot을 한 문맥에서 확인합니다."
      title={region?.name ?? '권역 상세'}
    >
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">권역 상세를 불러오는 중입니다...</p>
      ) : region ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <p className="panel-kicker">권역 문맥</p>
              <h2>정본과 분석 요약</h2>
              <p className="empty-state">정본 정보와 최신 분석 요약을 같은 권역 문맥에서 검토합니다.</p>
            </div>
            <div className="summary-strip">
              <article className="summary-item">
                <span>Status</span>
                <strong>{region.status}</strong>
                <small>권역 코드: {region.region_code}</small>
              </article>
              <article className="summary-item">
                <span>Latest Daily</span>
                <strong>{latestDailyStatistic?.delivery_count ?? '-'}</strong>
                <small>최근 일별 통계 기준 물량</small>
              </article>
              <article className="summary-item">
                <span>Completion</span>
                <strong>{formatPercentage(latestPerformanceSummary?.completion_rate)}</strong>
                <small>최근 기간 성과 기준 완료율</small>
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <p className="panel-kicker">기본 정보</p>
              <h3>권역 정본</h3>
            </div>
            <dl className="detail-list">
              <div>
                <dt>권역 코드</dt>
                <dd>{region.region_code}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{region.status}</dd>
              </div>
              <div>
                <dt>난이도</dt>
                <dd>{region.difficulty_level}</dd>
              </div>
              <div>
                <dt>설명</dt>
                <dd>{region.description || '-'}</dd>
              </div>
              <div>
                <dt>정렬 순서</dt>
                <dd>{region.display_order}</dd>
              </div>
            </dl>
          </section>

          <section className="panel">
            <div className="panel-header">
              <p className="panel-kicker">영역 좌표</p>
              <h3>Polygon</h3>
            </div>
            <pre className="code-block">{JSON.stringify(region.polygon_geojson, null, 2)}</pre>
          </section>

          <section className="panel">
            <div className="panel-header">
              <p className="panel-kicker">일별 통계</p>
              <h3>최신 배송 통계</h3>
            </div>
            <label className="field">
              <span>서비스 일자 선택</span>
              <input type="date" value={serviceDateFilter} onChange={(event) => setServiceDateFilter(event.target.value)} />
            </label>
            {latestDailyStatistic ? (
              <>
                <div className="panel-toolbar">
                  <span className="table-meta">최근 일별 통계부터 순서대로 확인합니다.</span>
                  <span className="table-meta">총 {dailyStatistics.length}건 일별 통계</span>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>서비스 일자</dt>
                    <dd>{latestDailyStatistic.service_date}</dd>
                  </div>
                  <div>
                    <dt>배송 물량</dt>
                    <dd>{latestDailyStatistic.delivery_count}</dd>
                  </div>
                  <div>
                    <dt>완료 건수</dt>
                    <dd>{latestDailyStatistic.completed_delivery_count}</dd>
                  </div>
                  <div>
                    <dt>예외 건수</dt>
                    <dd>{latestDailyStatistic.exception_delivery_count}</dd>
                  </div>
                </dl>
                <table className="table compact">
                  <thead>
                    <tr>
                      <th>일자</th>
                      <th>물량</th>
                      <th>완료</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyStatistics.map((statistic) => (
                      <tr key={statistic.region_daily_statistic_id}>
                        <td>{statistic.service_date}</td>
                        <td>{statistic.delivery_count}</td>
                        <td>{statistic.completed_delivery_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="empty-state">일별 통계가 없습니다.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <p className="panel-kicker">기간 성과</p>
              <h3>성과 요약</h3>
            </div>
            <div className="inline-field-grid">
              <label className="field">
                <span>기간 시작</span>
                <input type="date" value={periodStartFilter} onChange={(event) => setPeriodStartFilter(event.target.value)} />
              </label>
              <label className="field">
                <span>기간 종료</span>
                <input type="date" value={periodEndFilter} onChange={(event) => setPeriodEndFilter(event.target.value)} />
              </label>
            </div>
            {latestPerformanceSummary ? (
              <>
                <div className="panel-toolbar">
                  <span className="table-meta">기간 필터를 주면 해당 조건으로 성과 snapshot을 다시 읽습니다.</span>
                  <span className="table-meta">총 {performanceSummaries.length}건 기간 요약</span>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>기간</dt>
                    <dd>{latestPerformanceSummary.period_start} ~ {latestPerformanceSummary.period_end}</dd>
                  </div>
                  <div>
                    <dt>완료율</dt>
                    <dd>{formatPercentage(latestPerformanceSummary.completion_rate)}</dd>
                  </div>
                  <div>
                    <dt>생산성 점수</dt>
                    <dd>{latestPerformanceSummary.productivity_score}</dd>
                  </div>
                  <div>
                    <dt>비고</dt>
                    <dd>{latestPerformanceSummary.notes || '-'}</dd>
                  </div>
                </dl>
                <table className="table compact">
                  <thead>
                    <tr>
                      <th>기간</th>
                      <th>완료율</th>
                      <th>생산성</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceSummaries.map((summary) => (
                      <tr key={summary.region_performance_summary_id}>
                        <td>{summary.period_start} ~ {summary.period_end}</td>
                        <td>{formatPercentage(summary.completion_rate)}</td>
                        <td>{summary.productivity_score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="empty-state">기간 성과 요약이 없습니다.</p>
            )}
          </section>
        </>
      ) : (
        <p className="empty-state">권역을 찾을 수 없습니다.</p>
      )}
    </PageLayout>
  );
}
