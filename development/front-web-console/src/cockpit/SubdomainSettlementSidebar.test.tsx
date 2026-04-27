import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { settlementChildNavItems } from './SubdomainAccordionNav';
import { SubdomainSettlementSidebar } from './SubdomainSettlementSidebar';

function renderSidebar(initialEntry = '/settlement/home') {
  render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
      initialEntries={[initialEntry]}
    >
      <SubdomainSettlementSidebar items={settlementChildNavItems} />
    </MemoryRouter>,
  );
}

describe('SubdomainSettlementSidebar', () => {
  it('renders the settlement menu as a two-line cheonha-style sidebar', () => {
    renderSidebar();

    const sidebar = screen.getByTestId('subdomain-settlement-sidebar');
    const nav = within(sidebar).getByRole('navigation', { name: '정산 메뉴' });
    const links = within(nav).getAllByRole('link');

    expect(sidebar.closest('.cockpit-rail')).toBeNull();
    expect(links).toHaveLength(6);
    expect(links[0]).toHaveAccessibleName('홈');
    expect(links[0]).toHaveAccessibleDescription('현황 요약');
    expect(links[0]).toHaveTextContent('홈');
    expect(links[0]).toHaveTextContent('현황 요약');
    expect(links[1]).toHaveAccessibleName('배차 데이터');
    expect(links[1]).toHaveAccessibleDescription('업로드 · 정산');
    expect(links[1]).toHaveTextContent('배차 데이터');
    expect(links[1]).toHaveTextContent('업로드 · 정산');
    expect(links[2]).toHaveAccessibleName('배송원 현황');
    expect(links[2]).toHaveAccessibleDescription('플릿 기준 목록');
    expect(links[2]).toHaveTextContent('배송원 현황');
    expect(links[2]).toHaveTextContent('플릿 기준 목록');
    expect(links[3]).toHaveAccessibleName('운영 현황');
    expect(links[3]).toHaveAccessibleDescription('날짜별 현황');
    expect(links[3]).toHaveTextContent('운영 현황');
    expect(links[3]).toHaveTextContent('날짜별 현황');
    expect(links[4]).toHaveAccessibleName('정산 처리');
    expect(links[4]).toHaveAccessibleDescription('정산 관리');
    expect(links[4]).toHaveTextContent('정산 처리');
    expect(links[4]).toHaveTextContent('정산 관리');
    expect(links[5]).toHaveAccessibleName('팀 관리');
    expect(links[5]).toHaveAccessibleDescription('단가 설정');
    expect(links[5]).toHaveTextContent('팀 관리');
    expect(links[5]).toHaveTextContent('단가 설정');
  });

  it('marks the exact settlement route as active', () => {
    renderSidebar('/settlement/process');

    const nav = screen.getByRole('navigation', { name: '정산 메뉴' });
    const processLink = within(nav).getByRole('link', { name: '정산 처리' });
    const homeLink = within(nav).getByRole('link', { name: '홈' });

    expect(processLink).toHaveClass('is-active');
    expect(processLink).toHaveAttribute('aria-current', 'page');
    expect(homeLink).not.toHaveClass('is-active');
    expect(homeLink).not.toHaveAttribute('aria-current');
  });
});
