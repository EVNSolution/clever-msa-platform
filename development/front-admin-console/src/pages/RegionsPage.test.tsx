import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { RegionsPage } from './RegionsPage';

const companySuperAdminSession = {
  accessToken: 'token',
  sessionKind: 'normal' as const,
  email: 'company@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000001',
    name: '회사 전체 관리자',
    birthDate: '1990-01-01',
    status: 'active' as const,
  },
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'company_super_admin' as const,
  },
  availableAccountTypes: ['manager'],
};

const settlementManagerSession = {
  ...companySuperAdminSession,
  email: 'settlement@example.com',
  activeAccount: {
    ...companySuperAdminSession.activeAccount,
    roleType: 'settlement_manager' as const,
  },
};

const apiMocks = vi.hoisted(() => ({
  listRegionDailyStatistics: vi.fn(),
  listRegionPerformanceSummaries: vi.fn(),
  listRegions: vi.fn(),
}));

vi.mock('../api/regions', () => ({
  listRegionDailyStatistics: apiMocks.listRegionDailyStatistics,
  listRegionPerformanceSummaries: apiMocks.listRegionPerformanceSummaries,
  listRegions: apiMocks.listRegions,
}));

describe('RegionsPage', () => {
  it('renders region rows with latest analytics summaries and create action for editable roles', async () => {
    apiMocks.listRegions.mockResolvedValue([
      {
        region_id: '10000000-0000-0000-0000-000000000011',
        region_code: 'SEOUL-A',
        name: '서울 A 권역',
        status: 'active',
        difficulty_level: 'high',
        polygon_geojson: { type: 'Polygon', coordinates: [[[127.0, 37.5], [127.1, 37.5], [127.1, 37.6], [127.0, 37.5]]] },
        description: '강남권',
        display_order: 1,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ]);
    apiMocks.listRegionDailyStatistics.mockResolvedValue([
      {
        region_daily_statistic_id: '20000000-0000-0000-0000-000000000001',
        region_id: '10000000-0000-0000-0000-000000000011',
        region_code_snapshot: 'SEOUL-A',
        service_date: '2026-04-04',
        delivery_count: 110,
        completed_delivery_count: 100,
        exception_delivery_count: 3,
        total_distance_km: '120.00',
        total_base_amount: '220000.00',
        average_delivery_minutes: '15.50',
        created_at: '2026-04-04T00:00:00Z',
        updated_at: '2026-04-04T00:00:00Z',
      },
      {
        region_daily_statistic_id: '20000000-0000-0000-0000-000000000002',
        region_id: '10000000-0000-0000-0000-000000000011',
        region_code_snapshot: 'SEOUL-A',
        service_date: '2026-04-05',
        delivery_count: 140,
        completed_delivery_count: 132,
        exception_delivery_count: 2,
        total_distance_km: '142.00',
        total_base_amount: '260000.00',
        average_delivery_minutes: '13.40',
        created_at: '2026-04-05T00:00:00Z',
        updated_at: '2026-04-05T00:00:00Z',
      },
    ]);
    apiMocks.listRegionPerformanceSummaries.mockResolvedValue([
      {
        region_performance_summary_id: '30000000-0000-0000-0000-000000000001',
        region_id: '10000000-0000-0000-0000-000000000011',
        region_code_snapshot: 'SEOUL-A',
        difficulty_level_snapshot: 'high',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        delivery_count: 2800,
        completion_rate: '95.00',
        productivity_score: '88.10',
        cost_per_delivery: '4200.00',
        notes: '',
        created_at: '2026-03-31T00:00:00Z',
        updated_at: '2026-03-31T00:00:00Z',
      },
      {
        region_performance_summary_id: '30000000-0000-0000-0000-000000000002',
        region_id: '10000000-0000-0000-0000-000000000011',
        region_code_snapshot: 'SEOUL-A',
        difficulty_level_snapshot: 'high',
        period_start: '2026-04-01',
        period_end: '2026-04-05',
        delivery_count: 460,
        completion_rate: '97.20',
        productivity_score: '91.80',
        cost_per_delivery: '4100.00',
        notes: '',
        created_at: '2026-04-05T00:00:00Z',
        updated_at: '2026-04-05T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <RegionsPage client={{ request: vi.fn() }} session={companySuperAdminSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '권역 목록' })).toBeInTheDocument();
    expect(screen.getByText('서울 A 권역')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('97.20%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '권역 생성' })).toHaveAttribute('href', '/regions/new');
    expect(screen.getByText('서울 A 권역').closest('tr')).toHaveAttribute('data-detail-path', '/regions/SEOUL-A');
  });

  it('keeps region analytics read-only for non-edit manager roles', async () => {
    apiMocks.listRegions.mockResolvedValue([
      {
        region_id: '10000000-0000-0000-0000-000000000011',
        region_code: 'SEOUL-A',
        name: '서울 A 권역',
        status: 'active',
        difficulty_level: 'high',
        polygon_geojson: { type: 'Polygon', coordinates: [[[127.0, 37.5], [127.1, 37.5], [127.1, 37.6], [127.0, 37.5]]] },
        description: '강남권',
        display_order: 1,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      },
    ]);
    apiMocks.listRegionDailyStatistics.mockResolvedValue([]);
    apiMocks.listRegionPerformanceSummaries.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <RegionsPage client={{ request: vi.fn() }} session={settlementManagerSession} />
      </MemoryRouter>,
    );

    expect(await screen.findByText('서울 A 권역')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '권역 생성' })).not.toBeInTheDocument();
  });
});
