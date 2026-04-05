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

describe('AnnouncementsPage', () => {
  it('renders announcement list with create entry', async () => {
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
        <AnnouncementsPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByText('운영 공지');
    expect(screen.getByRole('heading', { name: '공지 목록' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '공지 생성' })).toBeInTheDocument();
    expect(screen.getByText('게시됨')).toBeInTheDocument();
    expect(screen.getByText('운영자용')).toBeInTheDocument();
  });
});
