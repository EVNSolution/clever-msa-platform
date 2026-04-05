import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DispatchBoardsPage } from './DispatchBoardsPage';

const apiMocks = vi.hoisted(() => ({
  listDispatchPlans: vi.fn(),
}));

vi.mock('../api/dispatchRegistry', () => ({
  listDispatchPlans: apiMocks.listDispatchPlans,
}));

vi.mock('../api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([
    {
      company_id: '30000000-0000-0000-0000-000000000001',
      route_no: 31,
      name: '알파 회사',
    },
  ]),
  listFleets: vi.fn().mockResolvedValue([
    {
      fleet_id: '40000000-0000-0000-0000-000000000001',
      route_no: 41,
      company_id: '30000000-0000-0000-0000-000000000001',
      name: '서울 플릿',
    },
  ]),
}));

describe('DispatchBoardsPage', () => {
  it('renders dispatch plan rows with board and plan links', async () => {
    apiMocks.listDispatchPlans.mockResolvedValue([
      {
        dispatch_plan_id: 'dispatch-plan-1',
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        dispatch_date: '2026-03-24',
        planned_volume: 120,
        dispatch_status: 'draft',
        created_at: '2026-03-20T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <DispatchBoardsPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByText('알파 회사');
    expect(screen.getByText('서울 플릿')).toBeInTheDocument();
    expect(screen.getByText('2026-03-24')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '보드 열기' })).toHaveAttribute(
      'href',
      '/dispatch/boards/41/2026-03-24',
    );
    expect(screen.getByRole('link', { name: '예상 물량 수정' })).toHaveAttribute(
      'href',
      '/dispatch/plans/dispatch-plan-1/edit',
    );
  });
});
