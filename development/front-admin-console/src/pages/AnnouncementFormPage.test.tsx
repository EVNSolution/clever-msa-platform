import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AnnouncementFormPage } from './AnnouncementFormPage';

const apiMocks = vi.hoisted(() => ({
  createAnnouncement: vi.fn(),
}));

vi.mock('../api/announcements', () => ({
  createAnnouncement: apiMocks.createAnnouncement,
  getAnnouncementBySlug: vi.fn(),
  updateAnnouncement: vi.fn(),
}));

describe('AnnouncementFormPage', () => {
  it('creates an announcement from the create route', async () => {
    apiMocks.createAnnouncement.mockResolvedValue({
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
      <MemoryRouter initialEntries={['/announcements/new']}>
        <Routes>
          <Route path="/announcements/new" element={<AnnouncementFormPage client={{ request: vi.fn() }} mode="create" />} />
          <Route path="/announcements/:announcementSlug" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('슬러그'), { target: { value: 'ops-update' } });
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '운영 공지' } });
    fireEvent.change(screen.getByLabelText('본문'), { target: { value: '이번 주 운영 변경사항' } });
    fireEvent.change(screen.getByLabelText('게시 상태'), { target: { value: 'published' } });
    fireEvent.change(screen.getByLabelText('노출 범위'), { target: { value: 'operator' } });
    fireEvent.change(screen.getByLabelText('게시 시각'), { target: { value: '2026-04-05T09:00' } });
    fireEvent.change(screen.getByLabelText('정렬 순서'), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText('상단 고정'));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(apiMocks.createAnnouncement).toHaveBeenCalledWith(expect.anything(), {
        slug: 'ops-update',
        title: '운영 공지',
        body: '이번 주 운영 변경사항',
        status: 'published',
        exposure_scope: 'operator',
        published_at: '2026-04-05T09:00:00Z',
        expires_at: null,
        is_pinned: true,
        display_order: 1,
      });
    });
  });
});
