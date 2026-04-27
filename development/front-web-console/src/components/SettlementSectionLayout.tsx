import { NavLink, Outlet } from 'react-router-dom';

import type { HttpClient, SessionPayload } from '../api/http';
import { PageLayout } from './PageLayout';
import { SettlementFlowProvider, useSettlementFlow } from './SettlementFlowContext';

const SETTLEMENT_NAV_ITEMS = [
  { to: '/settlements/criteria', label: '정산 기준' },
  { to: '/settlements/inputs', label: '정산 입력' },
  { to: '/settlements/runs', label: '정산 실행' },
  { to: '/settlements/results', label: '정산 결과' },
] as const;

type SettlementSectionLayoutProps = {
  client: HttpClient;
  session?: SessionPayload;
};

function SettlementContextBar() {
  const {
    companies,
    availableFleets,
    selectedCompanyId,
    selectedFleetId,
    isLoading,
    errorMessage,
    showCompanySelector,
    showFleetSelector,
    setSelectedCompanyId,
    setSelectedFleetId,
  } = useSettlementFlow();

  if (!errorMessage && !showCompanySelector && !showFleetSelector) {
    return null;
  }

  return (
    <div className="settlement-context-bar" aria-label="정산 문맥 선택">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      <div className="settlement-context-grid">
        {showCompanySelector ? (
          <label className="field">
            <span>회사</span>
            <select
              disabled={isLoading || !companies.length}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              value={selectedCompanyId}
            >
              {companies.length ? null : <option value="">회사 없음</option>}
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {showFleetSelector ? (
          <label className="field">
            <span>플릿</span>
            <select
              disabled={isLoading || !availableFleets.length}
              onChange={(event) => setSelectedFleetId(event.target.value)}
              value={selectedFleetId}
            >
              {availableFleets.length ? null : <option value="">플릿 없음</option>}
              {availableFleets.map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}

export function SettlementSectionLayout({ client, session }: SettlementSectionLayoutProps) {
  return (
    <SettlementFlowProvider client={client} session={session}>
      <PageLayout
        filters={<SettlementContextBar />}
        subtitle="회사와 플릿 문맥을 고정한 상태로 정산 기준부터 결과까지 이어서 운영합니다."
        tabs={
          <div className="settlement-tab-strip" role="tablist" aria-label="정산 단계">
            {SETTLEMENT_NAV_ITEMS.map((item, index) => (
              <NavLink
                key={item.to}
                aria-label={item.label}
                className={({ isActive }) =>
                  isActive ? 'settlement-tab-link active' : 'settlement-tab-link'
                }
                to={item.to}
              >
                <span className="settlement-tab-index">{index + 1}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        }
        template="workbench"
        title="정산 처리"
      >
        <Outlet />
      </PageLayout>
    </SettlementFlowProvider>
  );
}
