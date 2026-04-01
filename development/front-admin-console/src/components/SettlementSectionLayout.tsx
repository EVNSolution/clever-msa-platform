import { NavLink, Outlet } from 'react-router-dom';

import type { HttpClient } from '../api/http';
import { SettlementFlowProvider, useSettlementFlow } from './SettlementFlowContext';

const SETTLEMENT_NAV_ITEMS = [
  { to: '/settlements/overview', label: '정산 조회', description: '현재 run, item, 최신 정산을 읽습니다.' },
  { to: '/settlements/criteria', label: '정산 기준', description: '정책, 버전, 회사/플릿 연결을 관리합니다.' },
  { to: '/settlements/inputs', label: '정산 입력', description: '배송 원천 입력과 일별 snapshot을 준비합니다.' },
  { to: '/settlements/runs', label: '정산 실행', description: '회사/플릿 기준으로 run을 생성합니다.' },
  { to: '/settlements/results', label: '정산 결과', description: '기사별 정산 항목과 지급 상태를 확인합니다.' },
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
    <section className="panel settlement-context-panel">
      <div className="panel-header">
        <p className="panel-kicker">정산 문맥</p>
        <h3>회사 / 플릿 선택</h3>
        <p className="empty-state">입력, 실행, 결과는 같은 문맥을 유지한 채 이어집니다.</p>
      </div>
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
    </section>
  );
}

export function SettlementSectionLayout({ client }: SettlementSectionLayoutProps) {
  return (
    <SettlementFlowProvider client={client}>
      <div className="stack large-gap">
        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">정산 그룹</p>
            <h2>정산</h2>
            <p className="empty-state">
              기준, 입력, 실행, 결과, 조회를 service 이름이 아니라 정산 흐름 기준으로 나눕니다.
            </p>
          </div>
          <div className="step-grid">
            {SETTLEMENT_NAV_ITEMS.map((item, index) => (
              <NavLink
                key={item.to}
                aria-label={item.label}
                className={({ isActive }) => (isActive ? 'step-card active' : 'step-card')}
                to={item.to}
              >
                <span className="step-index">{index + 1}</span>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </NavLink>
            ))}
          </div>
        </section>
        <SettlementContextBar />
        <Outlet />
      </div>
    </SettlementFlowProvider>
  );
}
