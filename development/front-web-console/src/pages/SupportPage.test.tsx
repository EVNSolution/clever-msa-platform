import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { SupportPage } from './SupportPage';

const apiMocks = vi.hoisted(() => ({
  createSupportTicket: vi.fn(),
  createSupportTicketResponse: vi.fn(),
  listSupportTicketResponses: vi.fn(),
  listSupportTickets: vi.fn(),
  updateSupportTicket: vi.fn(),
}));

vi.mock('../api/support', () => ({
  createSupportTicket: apiMocks.createSupportTicket,
  createSupportTicketResponse: apiMocks.createSupportTicketResponse,
  listSupportTicketResponses: apiMocks.listSupportTicketResponses,
  listSupportTickets: apiMocks.listSupportTickets,
  updateSupportTicket: apiMocks.updateSupportTicket,
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
  email: 'vehicle@example.com',
  activeAccount: {
    accountType: 'manager' as const,
    accountId: '20000000-0000-0000-0000-000000000002',
    companyId: '30000000-0000-0000-0000-000000000001',
    roleType: 'vehicle_manager',
  },
};

describe('SupportPage', () => {
  it('renders support tickets and registers an admin response for management roles', async () => {
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

    render(
      <MemoryRouter>
        <SupportPage client={{ request: vi.fn() }} session={companySuperAdminSession} />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '지원 관리' });
    expect(screen.getAllByText('로그인이 안 됩니다').length).toBeGreaterThan(0);
    expect(await screen.findByText('원인 확인 중입니다.')).toBeInTheDocument();
    expect(
      screen.getByText('답변을 등록하면 요청자에게 일반 알림이 자동 생성됩니다. Push는 자동 발송되지 않습니다.'),
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

  it('renders self-service support for lower manager roles', async () => {
    apiMocks.listSupportTickets.mockResolvedValue([
      {
        ticket_id: '11111111-1111-1111-1111-111111111111',
        route_no: 12,
        requester_account_id: '20000000-0000-0000-0000-000000000002',
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
      requester_account_id: '20000000-0000-0000-0000-000000000002',
      title: '앱 접속 문의',
      body: '웹만 열리고 앱 안내가 없습니다.',
      status: 'open',
      priority: 'medium',
      created_at: '2026-04-05T02:00:00Z',
      updated_at: '2026-04-05T02:00:00Z',
    });

    render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={['/support?ticket=12']}
      >
        <Routes>
          <Route path="/support" element={<SupportPage client={{ request: vi.fn() }} session={vehicleManagerSession} />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '지원' });
    expect(apiMocks.listSupportTickets).toHaveBeenCalledWith(expect.anything(), {
      requester_account_id: '20000000-0000-0000-0000-000000000002',
    });
    expect(screen.getByText('관리자 답변은 이 화면에서 확인합니다.')).toBeInTheDocument();

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
