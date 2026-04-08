import { NavLink, Outlet } from 'react-router-dom';

import type { HttpClient } from '../api/http';
import { PageLayout } from './PageLayout';
import { SettlementFlowProvider, useSettlementFlow } from './SettlementFlowContext';

const SETTLEMENT_NAV_ITEMS = [
  { to: '/settlements/overview', label: '정산 조회' },
  { to: '/settlements/criteria', label: '정산 기준' },
  { to: '/settlements/inputs', label: '정산 입력' },
  { to: '/settlements/runs', label: '정산 실행' },
  { to: '/settlements/results', label: '정산 결과' },
] as const;

type SettlementSectionLayoutProps = {
  client: HttpClient;
};

function SettlementContextBar() {
  const {
    companies,
    availableFleets,
    selectedCompanyId,
    selectedFleetId,
    isLoading,
    errorMessage,
    setSelectedCompanyId,
    setSelectedFleetId,
  } = useSettlementFlow();

  return (
    <div className="settlement-context-bar" aria-label="정산 문맥 선택">
      <span className="settlement-context-kicker">정산 문맥</span>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      <div className="settlement-context-grid">
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
      </div>
    </div>
  );
}

export function SettlementSectionLayout({ client }: SettlementSectionLayoutProps) {
  return (
    <SettlementFlowProvider client={client}>
      <PageLayout
        filters={<SettlementContextBar />}
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
        title="정산"
      >
        <Outlet />
      </PageLayout>
    </SettlementFlowProvider>
  );
}
