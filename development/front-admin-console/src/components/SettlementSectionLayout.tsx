import { NavLink, Outlet } from 'react-router-dom';

const SETTLEMENT_NAV_ITEMS = [
  { to: '/settlements/overview', label: '정산 조회' },
  { to: '/settlements/criteria', label: '정산 기준' },
  { to: '/settlements/inputs', label: '정산 입력' },
  { to: '/settlements/runs', label: '정산 실행' },
  { to: '/settlements/results', label: '정산 결과' },
] as const;

export function SettlementSectionLayout() {
  return (
    <div className="stack large-gap">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 그룹</p>
          <h2>정산</h2>
          <p className="empty-state">
            기준, 입력, 실행, 결과, 조회를 service 이름이 아니라 정산 흐름 기준으로 나눕니다.
          </p>
        </div>
        <nav className="section-nav">
          {SETTLEMENT_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </section>
      <Outlet />
    </div>
  );
}
