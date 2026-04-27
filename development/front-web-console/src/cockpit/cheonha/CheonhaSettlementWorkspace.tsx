import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import type { HttpClient, SessionPayload } from '../../api/http';
import { DriversPage } from '../../pages/DriversPage';
import type { SettlementChildNavItem } from '../SubdomainAccordionNav';
import { settlementChildNavItems } from '../SubdomainAccordionNav';
import { CheonhaDispatchDataPage } from './CheonhaDispatchDataPage';
import { CheonhaRuleShellPanel } from './CheonhaRuleShellPanel';
import { CheonhaSettlementHomePage } from './CheonhaSettlementHomePage';
import { CheonhaSettlementProcessPage } from './CheonhaSettlementProcessPage';

type CheonhaSettlementWorkspaceProps = {
  client?: HttpClient;
  companyName?: string;
  session?: SessionPayload | null;
};

function renderSettlementChildRoute(
  slug: SettlementChildNavItem['slug'],
  client?: HttpClient,
  session?: SessionPayload | null,
  companyName = '천하운수',
) {
  switch (slug) {
    case 'home':
      return <CheonhaSettlementHomePage companyName={companyName} />;
    case 'dispatch':
      return <CheonhaDispatchDataPage client={client} session={session} />;
    case 'crew':
      return client && session ? <DriversPage client={client} session={session} viewMode="vehicleStatus" /> : null;
    case 'operations':
      return (
        <CheonhaRuleShellPanel
          description="날짜별 운영 현황"
          note="배차 근태 요약"
          summaryCards={[
            {
              rows: [
                { label: '기준 날짜', value: '없음' },
                { label: '마지막 갱신', value: '없음' },
                { label: '다음 반영', value: 0 },
              ],
              status: '오늘',
              title: '날짜',
            },
            {
              rows: [
                { label: '배차 건수', value: 0 },
                { label: '미할당', value: 0 },
                { label: '예외', value: '없음' },
              ],
              status: '0건',
              title: '배차',
            },
            {
              rows: [
                { label: '출근', value: 0 },
                { label: '지각', value: 0 },
                { label: '결근', value: 0 },
              ],
              status: '0명',
              title: '근태',
            },
          ]}
          title="운영 현황"
        />
      );
    case 'process':
      return <CheonhaSettlementProcessPage client={client} session={session} />;
    case 'team':
      return (
        <CheonhaRuleShellPanel
          description="팀 기준 정보"
          note="단가 기준 요약"
          summaryCards={[
            {
              rows: [
                { label: '팀 수', value: 0 },
                { label: '활성 규칙', value: 0 },
                { label: '예외', value: '없음' },
              ],
              status: '0개',
              title: '팀 기준',
            },
            {
              rows: [
                { label: '기준일', value: '없음' },
                { label: '기본 플릿', value: '없음' },
                { label: '담당자', value: '없음' },
              ],
              status: '없음',
              title: '배차 연결',
            },
          ]}
          title="팀 관리"
        />
      );
  }
}

export function CheonhaSettlementWorkspace({
  client,
  companyName = '천하운수',
  session,
}: CheonhaSettlementWorkspaceProps) {
  const location = useLocation();
  const isDetachedSettlementRoute = location.pathname === '/settlement/dispatch';

  const routes = (
    <Routes>
      <Route index element={<Navigate replace to="/settlement/home" />} />
      {settlementChildNavItems.map((item) => (
        <Route
          key={item.slug}
          path={item.slug}
          element={renderSettlementChildRoute(item.slug, client, session, companyName)}
        />
      ))}
      <Route path="*" element={<Navigate replace to="/settlement/home" />} />
    </Routes>
  );

  return (
    <div
      className="cockpit-workspace settlement-workspace-frame"
      data-testid="settlement-workspace-frame"
    >
      <div className="cockpit-workspace-stage settlement-workspace-frame-body">
        {isDetachedSettlementRoute ? (
          routes
        ) : (
          <section
            className="cockpit-workspace-panel settlement-workspace-frame-panel settlement-workspace-scroll-panel"
            data-testid="settlement-workspace-panel"
          >
            {routes}
          </section>
        )}
      </div>
    </div>
  );
}
