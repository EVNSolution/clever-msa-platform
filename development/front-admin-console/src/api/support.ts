import type { SupportTicket, SupportTicketResponse } from '../types';
import type { HttpClient } from './http';

type ListSupportTicketsParams = {
  status?: SupportTicket['status'];
  priority?: SupportTicket['priority'];
  requester_account_id?: string;
};

export type SupportTicketWritePayload = {
  title: string;
  body: string;
  status: SupportTicket['status'];
  priority: SupportTicket['priority'];
};

export type SupportTicketResponseWritePayload = {
  ticket_id: string;
  body: string;
};

export function listSupportTickets(client: HttpClient, params: ListSupportTicketsParams = {}) {
  const query = new URLSearchParams();
  if (params.status) {
    query.set('status', params.status);
  }
  if (params.priority) {
    query.set('priority', params.priority);
  }
  if (params.requester_account_id) {
    query.set('requester_account_id', params.requester_account_id);
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return client.request<SupportTicket[]>(`/ticket/tickets/${suffix}`);
}

export function createSupportTicket(client: HttpClient, payload: SupportTicketWritePayload) {
  return client.request<SupportTicket>('/ticket/tickets/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSupportTicket(client: HttpClient, ticketRef: string, payload: Partial<SupportTicketWritePayload>) {
  return client.request<SupportTicket>(`/ticket/tickets/${ticketRef}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listSupportTicketResponses(client: HttpClient, ticketId: string) {
  return client.request<SupportTicketResponse[]>(`/ticket/ticket-responses/?ticket_id=${ticketId}`);
}

export function createSupportTicketResponse(client: HttpClient, payload: SupportTicketResponseWritePayload) {
  return client.request<SupportTicketResponse>('/ticket/ticket-responses/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
