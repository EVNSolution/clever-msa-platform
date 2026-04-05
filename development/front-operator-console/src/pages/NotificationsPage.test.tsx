import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
        source_type: 'ticket',
        source_ref: '12',
        title: '문의 답변 등록',
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
      source_type: 'ticket',
      source_ref: '12',
      title: '문의 답변 등록',
      body: '답변이 등록되었습니다.',
      status: 'read',
      created_at: '2026-04-05T00:00:00Z',
      read_at: '2026-04-05T01:00:00Z',
      archived_at: null,
    });

    render(<NotificationsPage client={{ request: vi.fn() }} />);

    await screen.findByText('문의 답변 등록');
    expect(screen.getByRole('heading', { name: '알림' })).toBeInTheDocument();
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
