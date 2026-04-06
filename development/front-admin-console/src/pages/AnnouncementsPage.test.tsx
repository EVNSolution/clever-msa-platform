import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AnnouncementsPage } from './AnnouncementsPage';

const apiMocks = vi.hoisted(() => ({
  listAnnouncements: vi.fn(),
}));

vi.mock('../api/announcements', () => ({
  listAnnouncements: apiMocks.listAnnouncements,
}));

const companySuperAdminSession = {
  accessToken: 'token',
  sessionKind: 'normal',
  email: 'admin@example.com',
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

const vehicleManagerSession = {
  ...companySuperAdminSession,
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000002',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'vehicle_manager',
  },
};

describe('AnnouncementsPage', () => {
  it('renders announcement list with create entry for management roles', async () => {
    apiMocks.listAnnouncements.mockResolvedValue([
      {
        announcement_id: 'a-1',
        slug: 'ops-update',
        title: '운영 공지',
        body: '이번 주 운영 변경사항',
        status: 'published',
        exposure_scope: 'operator',
        published_at: '2026-04-05T00:00:00Z',
        expires_at: null,
        is_pinned: true,
        display_order: 1,
        created_at: '2026-04-04T00:00:00Z',
        updated_at: '2026-04-05T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <AnnouncementsPage client={{ request: vi.fn() }} session={companySuperAdminSession} />
      </MemoryRouter>,
    );

    await screen.findByText('운영 공지');
    expect(screen.getByRole('heading', { name: '공지 목록' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지 생성' })).toBeInTheDocument();
    expect(screen.getByText('게시됨')).toBeInTheDocument();
    expect(screen.getByText('운영자용')).toBeInTheDocument();
  });

  it('renders published read view for lower manager roles', async () => {
    apiMocks.listAnnouncements.mockResolvedValue([
      {
        announcement_id: 'a-1',
        slug: 'ops-update',
        title: '운영 공지',
        body: '이번 주 운영 변경사항',
        status: 'published',
        exposure_scope: 'operator',
        published_at: '2026-04-05T00:00:00Z',
        expires_at: null,
        is_pinned: true,
        display_order: 1,
        created_at: '2026-04-04T00:00:00Z',
        updated_at: '2026-04-05T00:00:00Z',
      },
      {
        announcement_id: 'a-2',
        slug: 'draft-note',
        title: '비공개 공지',
        body: '초안입니다.',
        status: 'draft',
        exposure_scope: 'operator',
        published_at: null,
        expires_at: null,
        is_pinned: false,
        display_order: 2,
        created_at: '2026-04-04T00:00:00Z',
        updated_at: '2026-04-05T00:00:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <AnnouncementsPage client={{ request: vi.fn() }} session={vehicleManagerSession} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '공지' });
    expect(apiMocks.listAnnouncements).toHaveBeenCalledWith(expect.anything(), { status: 'published' });
    expect(screen.getByText('이번 주 운영 변경사항')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '공지 생성' })).not.toBeInTheDocument();
    expect(screen.queryByText('비공개 공지')).not.toBeInTheDocument();
  });
});
