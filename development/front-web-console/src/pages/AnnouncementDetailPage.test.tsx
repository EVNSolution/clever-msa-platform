import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AnnouncementDetailPage } from './AnnouncementDetailPage';

const apiMocks = vi.hoisted(() => ({
  getAnnouncementBySlug: vi.fn(),
}));

vi.mock('../api/announcements', () => ({
  getAnnouncementBySlug: apiMocks.getAnnouncementBySlug,
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

describe('AnnouncementDetailPage', () => {
  it('renders shared page header for announcement detail', async () => {
    apiMocks.getAnnouncementBySlug.mockResolvedValue({
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
    });

    render(
      <MemoryRouter initialEntries={['/announcements/ops-update']}>
        <Routes>
          <Route
            path="/announcements/:announcementSlug"
            element={<AnnouncementDetailPage client={{ request: vi.fn() }} session={companySuperAdminSession} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '운영 공지' });
    expect(screen.getByText('노출 범위와 게시 상태를 한 문맥에서 확인합니다.')).toBeInTheDocument();
    expect(screen.getByText('공지 문맥')).toBeInTheDocument();
    expect(screen.getByText('상태와 노출 문맥')).toBeInTheDocument();
    expect(screen.getByText('이번 주 운영 변경사항')).toBeInTheDocument();
  });
});
