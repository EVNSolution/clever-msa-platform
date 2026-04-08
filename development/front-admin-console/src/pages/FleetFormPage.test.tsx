import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { FleetFormPage } from './FleetFormPage';

const apiMocks = vi.hoisted(() => ({
  createFleet: vi.fn(),
  getCompany: vi.fn(),
  getFleet: vi.fn(),
  updateFleet: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  createFleet: apiMocks.createFleet,
  getCompany: apiMocks.getCompany,
  getFleet: apiMocks.getFleet,
  updateFleet: apiMocks.updateFleet,
}));

describe('FleetFormPage', () => {
  it('renders fleet create form in shared page layout', async () => {
    apiMocks.getCompany.mockResolvedValue({
      company_id: '30000000-0000-0000-0000-000000000001',
      route_no: 1,
      name: 'Seed Company',
    });

    render(
      <MemoryRouter initialEntries={['/companies/1/fleets/new']}>
        <Routes>
          <Route path="/companies/:companyRef/fleets/new" element={<FleetFormPage client={{ request: vi.fn() }} mode="create" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText('플릿 생성')).length).toBeGreaterThan(0);
    expect(screen.getByText('회사 문맥을 유지한 채 플릿 정보를 입력합니다.')).toBeInTheDocument();
    expect(screen.getByText('입력 요약')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Seed Company')).toBeInTheDocument();
  });
});
