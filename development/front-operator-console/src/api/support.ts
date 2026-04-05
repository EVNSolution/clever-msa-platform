import type { SupportTicket, SupportTicketResponse } from '../types';
import type { HttpClient } from './http';

type ListSupportTicketsParams = {
  status?: SupportTicket['status'];
  priority?: SupportTicket['priority'];
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
  const suffix = query.size ? `?${query.toString()}` : '';
  return client.request<SupportTicket[]>(`/support/tickets/${suffix}`);
}

export function createSupportTicket(client: HttpClient, payload: SupportTicketWritePayload) {
  return client.request<SupportTicket>('/support/tickets/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listSupportTicketResponses(client: HttpClient, ticketId: string) {
  return client.request<SupportTicketResponse[]>(`/support/ticket-responses/?ticket_id=${ticketId}`);
}

export function createSupportTicketResponse(client: HttpClient, payload: SupportTicketResponseWritePayload) {
  return client.request<SupportTicketResponse>('/support/ticket-responses/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
