import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { SessionPayload } from '../api/http';
import { RegionDetailPage } from './RegionDetailPage';

const companySuperAdminSession: SessionPayload = {
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

const settlementManagerSession: SessionPayload = {
  ...companySuperAdminSession,
  email: 'settlement@example.com',
  activeAccount: {
    accountType: 'manager',
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'settlement_manager' as const,
  },
};

const apiMocks = vi.hoisted(() => ({
  getRegionByCode: vi.fn(),
  listRegionDailyStatistics: vi.fn(),
  listRegionPerformanceSummaries: vi.fn(),
}));

vi.mock('../api/regions', () => ({
  getRegionByCode: apiMocks.getRegionByCode,
  listRegionDailyStatistics: apiMocks.listRegionDailyStatistics,
  listRegionPerformanceSummaries: apiMocks.listRegionPerformanceSummaries,
}));

describe('RegionDetailPage', () => {
  function renderPage(session = companySuperAdminSession) {
    return render(
      <MemoryRouter initialEntries={['/regions/SEOUL-A']}>
        <Routes>
          <Route path="/regions/:regionRef" element={<RegionDetailPage client={{ request: vi.fn() }} session={session} />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders registry info, polygon, latest daily stats, and performance summaries together', async () => {
    apiMocks.getRegionByCode.mockResolvedValue({
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
    });
    apiMocks.listRegionDailyStatistics.mockResolvedValue([
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
        notes: '상세 메모',
        created_at: '2026-04-05T00:00:00Z',
        updated_at: '2026-04-05T00:00:00Z',
      },
    ]);

    renderPage();

    expect(await screen.findByRole('heading', { name: '서울 A 권역' })).toBeInTheDocument();
    expect(screen.getByText('SEOUL-A')).toBeInTheDocument();
    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getAllByText('2026-04-05').length).toBeGreaterThan(0);
    expect(screen.getAllByText('97.20%').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: '권역 수정' })).toHaveAttribute('href', '/regions/SEOUL-A/edit');
  });

  it('keeps analytics readable but hides edit action for read-only roles', async () => {
    apiMocks.getRegionByCode.mockResolvedValue({
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
    });
    apiMocks.listRegionDailyStatistics.mockResolvedValue([]);
    apiMocks.listRegionPerformanceSummaries.mockResolvedValue([]);

    renderPage(settlementManagerSession);

    expect(await screen.findByRole('heading', { name: '서울 A 권역' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '권역 수정' })).not.toBeInTheDocument();
  });
});
