import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PersonnelDocumentsPage } from './PersonnelDocumentsPage';

const apiMocks = vi.hoisted(() => ({
  listPersonnelDocuments: vi.fn(),
  listDrivers: vi.fn(),
}));

vi.mock('../api/personnelDocuments', () => ({
  listPersonnelDocuments: apiMocks.listPersonnelDocuments,
}));

vi.mock('../api/drivers', () => ({
  listDrivers: apiMocks.listDrivers,
}));

describe('PersonnelDocumentsPage', () => {
  it('renders document rows with driver context and filter controls', async () => {
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
    apiMocks.listPersonnelDocuments.mockResolvedValue([
      {
        personnel_document_id: '90000000-0000-0000-0000-000000000001',
        driver_id: '10000000-0000-0000-0000-000000000001',
        document_type: 'contract',
        status: 'active',
        title: '2026 근로 계약서',
        document_number: 'C-2026-001',
        issuer_name: 'CLEVER',
        issued_on: '2026-04-01',
        expires_on: '2027-03-31',
        notes: '정상',
        external_reference: 'hr://contracts/001',
        payload: { signed: true },
      },
    ]);

    render(
      <MemoryRouter>
        <PersonnelDocumentsPage client={{ request: vi.fn() }} session={{ activeAccount: { roleType: 'company_super_admin' } } as never} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '인사문서 목록' })).toBeInTheDocument();
    expect(screen.getByLabelText('기사 필터')).toBeInTheDocument();
    expect(screen.getByLabelText('문서 종류 필터')).toBeInTheDocument();
    expect(await screen.findByText('2026 근로 계약서')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('홍길동')).toBeInTheDocument();
    expect(within(table).getByText('계약서')).toBeInTheDocument();
    expect(within(table).getByText('활성')).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.listPersonnelDocuments).toHaveBeenCalledWith(expect.anything(), {});
    });
  });
});
