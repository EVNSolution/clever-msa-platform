import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';

const session = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'manager@example.com',
  identity: {
    identityId: '10000000-0000-0000-0000-000000000001',
    name: '관리자',
    birthDate: '1990-01-01',
    status: 'active',
  },
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000001',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'company_super_admin',
  },
  availableAccountTypes: ['manager'],
};

vi.mock('./sessionPersistence', () => ({
  clearStoredSession: vi.fn(),
  loadStoredSession: vi.fn(() => session),
  persistSession: vi.fn(),
}));

vi.mock('./api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([]),
  listFleets: vi.fn().mockResolvedValue([]),
  listPublicCompanies: vi.fn().mockResolvedValue([]),
}));

vi.mock('./api/personnelDocuments', () => ({
  listPersonnelDocuments: vi.fn().mockResolvedValue([]),
  getPersonnelDocument: vi.fn(),
  createPersonnelDocument: vi.fn(),
  updatePersonnelDocument: vi.fn(),
}));

vi.mock('./api/drivers', async () => {
  const actual = await vi.importActual<typeof import('./api/drivers')>('./api/drivers');
  return {
    ...actual,
    listDrivers: vi.fn().mockResolvedValue([]),
    getDriver: vi.fn(),
  };
});

vi.mock('./api/regions', () => ({
  listRegions: vi.fn().mockResolvedValue([]),
  getRegionByCode: vi.fn().mockResolvedValue({
    region_id: '10000000-0000-0000-0000-000000000011',
    region_code: 'SEOUL-A',
    name: '서울 A 권역',
    status: 'active',
    difficulty_level: 'high',
    polygon_geojson: { type: 'Polygon', coordinates: [] },
    description: '',
    display_order: 1,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  }),
  createRegion: vi.fn(),
  updateRegion: vi.fn(),
  listRegionDailyStatistics: vi.fn().mockResolvedValue([]),
  listRegionPerformanceSummaries: vi.fn().mockResolvedValue([]),
}));
describe('Admin App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('uses the unified dashboard as the root route', async () => {
    render(<App />);

    expect(await screen.findByText('운영 요약')).toBeInTheDocument();
  });

  it('renders personnel documents route inside the unified console', async () => {
    window.history.replaceState({}, '', '/personnel-documents');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '인사문서 목록' })).toBeInTheDocument();
  });

  it('renders the region list route inside the single web console', async () => {
    window.history.replaceState({}, '', '/regions');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '권역 목록' })).toBeInTheDocument();
  });
});
