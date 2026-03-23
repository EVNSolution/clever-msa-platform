import type { TerminalInstallation, TerminalRegistry } from '../types';
import type { HttpClient } from './http';

export type TerminalPayload = Omit<
  TerminalRegistry,
  'terminal_id' | 'created_at' | 'updated_at'
>;
export type TerminalInstallationPayload = Omit<
  TerminalInstallation,
  'terminal_installation_id' | 'created_at' | 'updated_at'
>;
export type TerminalInstallationStatusPayload = Pick<
  TerminalInstallation,
  'installation_status' | 'removed_at'
>;

export function listTerminals(client: HttpClient) {
  return client.request<TerminalRegistry[]>('/terminals/');
}

export function createTerminal(client: HttpClient, payload: TerminalPayload) {
  return client.request<TerminalRegistry>('/terminals/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTerminal(client: HttpClient, terminalId: string, payload: TerminalPayload) {
  return client.request<TerminalRegistry>(`/terminals/${terminalId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function listTerminalInstallations(client: HttpClient) {
  return client.request<TerminalInstallation[]>('/terminals/installations/');
}

export function createTerminalInstallation(client: HttpClient, payload: TerminalInstallationPayload) {
  return client.request<TerminalInstallation>('/terminals/installations/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTerminalInstallation(
  client: HttpClient,
  terminalInstallationId: string,
  payload: TerminalInstallationStatusPayload,
) {
  return client.request<TerminalInstallation>(
    `/terminals/installations/${terminalInstallationId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
  );
}
