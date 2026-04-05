import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationsPage } from './NotificationsPage';

const apiMocks = vi.hoisted(() => ({
  createPushSend: vi.fn(),
  listGeneralNotifications: vi.fn(),
  listPushDeliveryLogs: vi.fn(),
}));

vi.mock('../api/notifications', () => ({
  createPushSend: apiMocks.createPushSend,
  listGeneralNotifications: apiMocks.listGeneralNotifications,
  listPushDeliveryLogs: apiMocks.listPushDeliveryLogs,
}));

describe('NotificationsPage', () => {
  it('renders notifications and sends a push request', async () => {
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
    apiMocks.listPushDeliveryLogs.mockResolvedValue([
      {
        delivery_log_id: '33333333-3333-3333-3333-333333333333',
        target_account_id: '22222222-2222-2222-2222-222222222222',
        push_token_id: null,
        channel: 'fcm',
        event_type: 'support.reply',
        title: '문의 답변 등록',
        body: '답변이 등록되었습니다.',
        delivery_status: 'failed',
        provider_message_id: '',
        failure_reason: 'active token not found.',
        inbox_notification_id: '11111111-1111-1111-1111-111111111111',
        requested_by_account_id: '44444444-4444-4444-4444-444444444444',
        requested_at: '2026-04-05T00:00:00Z',
        delivered_at: null,
      },
    ]);
    apiMocks.createPushSend.mockResolvedValue({
      delivery_log_id: '55555555-5555-5555-5555-555555555555',
    });

    render(<NotificationsPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: '알림 관리' });
    expect(screen.getAllByText('문의 답변 등록').length).toBeGreaterThan(0);
    expect(screen.getByText('실패')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('대상 account_id'), {
      target: { value: '22222222-2222-2222-2222-222222222222' },
    });
    fireEvent.change(screen.getByLabelText('이벤트 타입'), { target: { value: 'support.reply' } });
    fireEvent.change(screen.getByLabelText('카테고리'), { target: { value: 'support' } });
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '문의 답변 등록' } });
    fireEvent.change(screen.getByLabelText('본문'), { target: { value: '답변이 등록되었습니다.' } });
    fireEvent.click(screen.getByRole('button', { name: '알림 발송' }));

    await waitFor(() => {
      expect(apiMocks.createPushSend).toHaveBeenCalledWith(expect.anything(), {
        target_account_id: '22222222-2222-2222-2222-222222222222',
        event_type: 'support.reply',
        category: 'support',
        source_type: '',
        source_ref: '',
        title: '문의 답변 등록',
        body: '답변이 등록되었습니다.',
        create_inbox: true,
      });
    });
  });
});
