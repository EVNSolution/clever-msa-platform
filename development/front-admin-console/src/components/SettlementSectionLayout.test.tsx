import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SettlementSectionLayout } from './SettlementSectionLayout';

const apiMocks = vi.hoisted(() => ({
  listCompanies: vi.fn(),
  listFleets: vi.fn(),
}));

vi.mock('../api/organization', () => ({
  listCompanies: apiMocks.listCompanies,
  listFleets: apiMocks.listFleets,
}));

function SettlementContextEcho() {
  return <div>child route</div>;
}

describe('SettlementSectionLayout', () => {
  it('keeps selected company and fleet across settlement route navigation', async () => {
    apiMocks.listCompanies.mockResolvedValue([
      { company_id: '30000000-0000-0000-0000-000000000001', route_no: 1, name: 'Seed Company' },
      { company_id: '30000000-0000-0000-0000-000000000002', route_no: 2, name: 'Ops Company' },
    ]);
    apiMocks.listFleets.mockResolvedValue([
      {
        fleet_id: '40000000-0000-0000-0000-000000000001',
        route_no: 1,
        company_id: '30000000-0000-0000-0000-000000000001',
        name: 'Seed Fleet',
      },
      {
        fleet_id: '40000000-0000-0000-0000-000000000002',
        route_no: 2,
        company_id: '30000000-0000-0000-0000-000000000002',
        name: 'Ops Fleet',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/settlements/inputs']}>
        <Routes>
          <Route
            path="/settlements"
            element={<SettlementSectionLayout client={{ request: vi.fn() }} />}
          >
            <Route path="inputs" element={<SettlementContextEcho />} />
            <Route path="runs" element={<SettlementContextEcho />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: '정산' });
    fireEvent.change(screen.getByLabelText('회사'), {
      target: { value: '30000000-0000-0000-0000-000000000002' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('플릿')).toHaveValue('40000000-0000-0000-0000-000000000002');
    });

    fireEvent.click(screen.getByRole('link', { name: '정산 실행' }));

    await waitFor(() => {
      expect(screen.getByLabelText('회사')).toHaveValue('30000000-0000-0000-0000-000000000002');
      expect(screen.getByLabelText('플릿')).toHaveValue('40000000-0000-0000-0000-000000000002');
    });
  });
});
