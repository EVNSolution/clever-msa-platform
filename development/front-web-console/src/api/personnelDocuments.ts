import type { PersonnelDocument } from '../types';
import type { HttpClient } from './http';

export type PersonnelDocumentWritePayload = Omit<PersonnelDocument, 'personnel_document_id'>;

type PersonnelDocumentListParams = {
  driver_id?: string;
  document_type?: PersonnelDocument['document_type'];
  status?: PersonnelDocument['status'];
};

export function listPersonnelDocuments(client: HttpClient, params: PersonnelDocumentListParams = {}) {
  const query = new URLSearchParams();
  if (params.driver_id) {
    query.set('driver_id', params.driver_id);
  }
  if (params.document_type) {
    query.set('document_type', params.document_type);
  }
  if (params.status) {
    query.set('status', params.status);
  }
  const suffix = query.size ? `?${query.toString()}` : '';
  return client.request<PersonnelDocument[]>(`/personnel-documents/documents/${suffix}`);
}

export function getPersonnelDocument(client: HttpClient, personnelDocumentId: string) {
  return client.request<PersonnelDocument>(`/personnel-documents/documents/${personnelDocumentId}/`);
}

export function createPersonnelDocument(client: HttpClient, payload: PersonnelDocumentWritePayload) {
  return client.request<PersonnelDocument>('/personnel-documents/documents/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePersonnelDocument(
  client: HttpClient,
  personnelDocumentId: string,
  payload: Partial<PersonnelDocumentWritePayload>,
) {
  return client.request<PersonnelDocument>(`/personnel-documents/documents/${personnelDocumentId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
