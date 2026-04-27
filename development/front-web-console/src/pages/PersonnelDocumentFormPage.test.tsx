import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PersonnelDocumentFormPage } from './PersonnelDocumentFormPage';

const apiMocks = vi.hoisted(() => ({
  createPersonnelDocument: vi.fn(),
  getPersonnelDocument: vi.fn(),
  updatePersonnelDocument: vi.fn(),
  listDrivers: vi.fn(),
}));

vi.mock('../api/personnelDocuments', () => ({
  createPersonnelDocument: apiMocks.createPersonnelDocument,
  getPersonnelDocument: apiMocks.getPersonnelDocument,
  updatePersonnelDocument: apiMocks.updatePersonnelDocument,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

describe('PersonnelDocumentFormPage', () => {
  it('creates a personnel document linked to a driver', async () => {
    apiMocks.listDrivers.mockResolvedValue([
      {
        driver_id: '10000000-0000-0000-0000-000000000001',
        route_no: 101,
        company_id: '30000000-0000-0000-0000-000000000001',
        fleet_id: '40000000-0000-0000-0000-000000000001',
        name: '홍길동',
        ev_id: 'EV-1001',
        phone_number: '010-1111-2222',
        address: '서울',
      },
    ]);
    apiMocks.createPersonnelDocument.mockResolvedValue({
      personnel_document_id: '90000000-0000-0000-0000-000000000001',
      driver_id: '10000000-0000-0000-0000-000000000001',
      document_type: 'contract',
      status: 'active',
      title: '2026 근로 계약서',
      document_number: 'C-2026-001',
      issuer_name: 'CLEVER',
      issued_on: '2026-04-01',
      expires_on: '2027-03-31',
      notes: '',
      external_reference: '',
      payload: {},
    });

    render(
      <MemoryRouter initialEntries={['/personnel-documents/new']}>
        <Routes>
          <Route
            path="/personnel-documents/new"
            element={<PersonnelDocumentFormPage client={{ request: vi.fn() }} mode="create" />}
          />
          <Route path="/personnel-documents/:documentRef" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '인사문서 등록' })).toBeInTheDocument();
    expect(screen.getByText('기사 연결 상태를 유지한 채 문서 메타데이터를 입력합니다.')).toBeInTheDocument();
    expect(screen.getByText('기사 선택과 문서 수명주기 설정을 먼저 고정합니다.')).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('기사'), { target: { value: '10000000-0000-0000-0000-000000000001' } });
    fireEvent.change(screen.getByLabelText('문서 종류'), { target: { value: 'contract' } });
    fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'active' } });
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '2026 근로 계약서' } });
    fireEvent.change(screen.getByLabelText('문서 번호'), { target: { value: 'C-2026-001' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    await waitFor(() => {
      expect(apiMocks.createPersonnelDocument).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        driver_id: '10000000-0000-0000-0000-000000000001',
        document_type: 'contract',
        status: 'active',
        title: '2026 근로 계약서',
      }));
    });
  });
});
