import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SupportPage } from './SupportPage';

const apiMocks = vi.hoisted(() => ({
  listSupportTicketResponses: vi.fn(),
  listSupportTickets: vi.fn(),
  updateSupportTicket: vi.fn(),
  createSupportTicketResponse: vi.fn(),
}));

vi.mock('../api/support', () => ({
  listSupportTickets: apiMocks.listSupportTickets,
  listSupportTicketResponses: apiMocks.listSupportTicketResponses,
  updateSupportTicket: apiMocks.updateSupportTicket,
  createSupportTicketResponse: apiMocks.createSupportTicketResponse,
}));

describe('SupportPage', () => {
  it('renders support tickets and registers an admin response', async () => {
    apiMocks.listSupportTickets.mockResolvedValue([
      {
        ticket_id: '11111111-1111-1111-1111-111111111111',
        route_no: 12,
        requester_account_id: '22222222-2222-2222-2222-222222222222',
        title: '로그인이 안 됩니다',
        body: '브라우저에서 세션이 자주 끊깁니다.',
        status: 'open',
        priority: 'high',
        created_at: '2026-04-05T00:00:00Z',
        updated_at: '2026-04-05T01:00:00Z',
      },
    ]);
    apiMocks.listSupportTicketResponses.mockResolvedValue([
      {
        response_id: '33333333-3333-3333-3333-333333333333',
        ticket_id: '11111111-1111-1111-1111-111111111111',
        author_account_id: '44444444-4444-4444-4444-444444444444',
        author_role: 'company_super_admin',
        body: '원인 확인 중입니다.',
        created_at: '2026-04-05T02:00:00Z',
        updated_at: '2026-04-05T02:00:00Z',
      },
    ]);
    apiMocks.createSupportTicketResponse.mockResolvedValue({
      response_id: '55555555-5555-5555-5555-555555555555',
      ticket_id: '11111111-1111-1111-1111-111111111111',
      author_account_id: '44444444-4444-4444-4444-444444444444',
      author_role: 'company_super_admin',
      body: '브라우저 캐시 초기화를 안내했습니다.',
      created_at: '2026-04-05T03:00:00Z',
      updated_at: '2026-04-05T03:00:00Z',
    });

    render(<SupportPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: '지원 관리' });
    expect(screen.getAllByText('로그인이 안 됩니다').length).toBeGreaterThan(0);
    expect(await screen.findByText('원인 확인 중입니다.')).toBeInTheDocument();
    expect(
      screen.getByText('답변을 등록하면 요청자 알림함에 일반 알림이 자동 생성됩니다. Push는 자동 발송되지 않습니다.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('답변 내용'), {
      target: { value: '브라우저 캐시 초기화를 안내했습니다.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '답변 등록' }));

    await waitFor(() => {
      expect(apiMocks.createSupportTicketResponse).toHaveBeenCalledWith(expect.anything(), {
        ticket_id: '11111111-1111-1111-1111-111111111111',
        body: '브라우저 캐시 초기화를 안내했습니다.',
      });
    });
  });
});
