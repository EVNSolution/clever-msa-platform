import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PersonnelDocumentDetailPage } from './PersonnelDocumentDetailPage';

const apiMocks = vi.hoisted(() => ({
  getPersonnelDocument: vi.fn(),
  getDriver: vi.fn(),
}));

vi.mock('../api/personnelDocuments', () => ({
  getPersonnelDocument: apiMocks.getPersonnelDocument,
}));

vi.mock('../api/drivers', () => ({
  getDriver: apiMocks.getDriver,
}));

describe('PersonnelDocumentDetailPage', () => {
  it('renders driver linkage and document metadata together', async () => {
    apiMocks.getPersonnelDocument.mockResolvedValue({
      personnel_document_id: '90000000-0000-0000-0000-000000000001',
      driver_id: '10000000-0000-0000-0000-000000000001',
      document_type: 'license_or_certificate',
      status: 'active',
      title: '화물 운송 자격증',
      document_number: 'LIC-001',
      issuer_name: '국토부',
      issued_on: '2025-01-01',
      expires_on: '2027-01-01',
      notes: '정상',
      external_reference: 'hr://license/001',
      payload: { grade: 'A' },
    });
    apiMocks.getDriver.mockResolvedValue({
      driver_id: '10000000-0000-0000-0000-000000000001',
      route_no: 101,
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      name: '홍길동',
      ev_id: 'EV-1001',
      phone_number: '010-1111-2222',
      address: '서울',
    });

    render(
      <MemoryRouter initialEntries={['/personnel-documents/90000000-0000-0000-0000-000000000001']}>
        <Routes>
          <Route
            path="/personnel-documents/:documentRef"
            element={<PersonnelDocumentDetailPage client={{ request: vi.fn() }} session={{ activeAccount: { roleType: 'company_super_admin' } } as never} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '인사문서 상세' })).toBeInTheDocument();
    expect(screen.getByText('기사 연결 문서 메타데이터와 payload를 함께 확인합니다.')).toBeInTheDocument();
    expect(screen.getByText('기사 연결 상태와 문서 수명주기를 먼저 확인합니다.')).toBeInTheDocument();
    expect(screen.getAllByText('홍길동').length).toBeGreaterThan(0);
    expect(screen.getByText('화물 운송 자격증')).toBeInTheDocument();
    expect(screen.getAllByText('자격/증빙').length).toBeGreaterThan(0);
    expect(screen.getByText('국토부')).toBeInTheDocument();
    expect(screen.getByText('hr://license/001')).toBeInTheDocument();
  });
});
