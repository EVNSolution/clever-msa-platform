import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SupportPage } from './SupportPage';

const apiMocks = vi.hoisted(() => ({
  createSupportTicket: vi.fn(),
  createSupportTicketResponse: vi.fn(),
  listSupportTicketResponses: vi.fn(),
  listSupportTickets: vi.fn(),
}));

vi.mock('../api/support', () => ({
  createSupportTicket: apiMocks.createSupportTicket,
  createSupportTicketResponse: apiMocks.createSupportTicketResponse,
  listSupportTicketResponses: apiMocks.listSupportTicketResponses,
  listSupportTickets: apiMocks.listSupportTickets,
}));

describe('Operator SupportPage', () => {
  it('renders own tickets and submits a new support request', async () => {
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
    apiMocks.listSupportTicketResponses.mockResolvedValue([]);
    apiMocks.createSupportTicket.mockResolvedValue({
      ticket_id: '33333333-3333-3333-3333-333333333333',
      route_no: 13,
      requester_account_id: '22222222-2222-2222-2222-222222222222',
      title: '앱 접속 문의',
      body: '웹만 열리고 앱 안내가 없습니다.',
      status: 'open',
      priority: 'medium',
      created_at: '2026-04-05T02:00:00Z',
      updated_at: '2026-04-05T02:00:00Z',
    });

    render(<SupportPage client={{ request: vi.fn() }} />);

    await screen.findByRole('heading', { name: '지원' });
    expect(screen.getAllByText('로그인이 안 됩니다').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText('문의 제목'), { target: { value: '앱 접속 문의' } });
    fireEvent.change(screen.getByLabelText('문의 본문'), { target: { value: '웹만 열리고 앱 안내가 없습니다.' } });
    fireEvent.change(screen.getByLabelText('우선순위'), { target: { value: 'medium' } });
    fireEvent.click(screen.getByRole('button', { name: '문의 등록' }));

    await waitFor(() => {
      expect(apiMocks.createSupportTicket).toHaveBeenCalledWith(expect.anything(), {
        title: '앱 접속 문의',
        body: '웹만 열리고 앱 안내가 없습니다.',
        priority: 'medium',
        status: 'open',
      });
    });
  });
});
