import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { NotificationsPage } from './NotificationsPage';

const apiMocks = vi.hoisted(() => ({
  listGeneralNotifications: vi.fn(),
  updateNotificationStatus: vi.fn(),
}));

vi.mock('../api/notifications', () => ({
  listGeneralNotifications: apiMocks.listGeneralNotifications,
  updateNotificationStatus: apiMocks.updateNotificationStatus,
}));

describe('Operator NotificationsPage', () => {
  it('renders inbox notifications and marks one as read', async () => {
    apiMocks.listGeneralNotifications.mockResolvedValue([
      {
        notification_id: '11111111-1111-1111-1111-111111111111',
        recipient_account_id: '22222222-2222-2222-2222-222222222222',
        category: 'support',
        source_type: 'support_ticket',
        source_ref: '12',
        title: '[문의 #12] 로그인이 안 됩니다',
        body: '답변이 등록되었습니다.',
        status: 'unread',
        created_at: '2026-04-05T00:00:00Z',
        read_at: null,
        archived_at: null,
      },
    ]);
    apiMocks.updateNotificationStatus.mockResolvedValue({
      notification_id: '11111111-1111-1111-1111-111111111111',
      recipient_account_id: '22222222-2222-2222-2222-222222222222',
      category: 'support',
      source_type: 'support_ticket',
      source_ref: '12',
      title: '[문의 #12] 로그인이 안 됩니다',
      body: '답변이 등록되었습니다.',
      status: 'read',
      created_at: '2026-04-05T00:00:00Z',
      read_at: '2026-04-05T01:00:00Z',
      archived_at: null,
    });

    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <NotificationsPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByText('[문의 #12] 로그인이 안 됩니다');
    expect(screen.getByRole('heading', { name: '알림' })).toBeInTheDocument();
    expect(screen.getByText('지원 답변이 등록되면 이 알림함에 일반 알림으로 함께 도착합니다.')).toBeInTheDocument();
    expect(screen.getByText('문의 번호 #12')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '문의 열기' })).toHaveAttribute('href', '/support?ticket=12');
    fireEvent.click(screen.getByRole('button', { name: '읽음 처리' }));

    await waitFor(() => {
      expect(apiMocks.updateNotificationStatus).toHaveBeenCalledWith(
        expect.anything(),
        '11111111-1111-1111-1111-111111111111',
        'read',
      );
    });
  });
});
