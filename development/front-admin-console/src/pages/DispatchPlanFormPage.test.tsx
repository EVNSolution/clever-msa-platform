import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { DispatchPlanFormPage } from './DispatchPlanFormPage';

const apiMocks = vi.hoisted(() => ({
  getDispatchPlan: vi.fn(),
  updateDispatchPlan: vi.fn(),
}));

vi.mock('../api/dispatchRegistry', () => ({
  getDispatchPlan: apiMocks.getDispatchPlan,
  updateDispatchPlan: apiMocks.updateDispatchPlan,
}));

vi.mock('../api/organization', () => ({
  listCompanies: vi.fn().mockResolvedValue([
    {
      company_id: '30000000-0000-0000-0000-000000000001',
      route_no: 31,
      name: '알파 회사',
    },
  ]),
  listFleets: vi.fn().mockResolvedValue([
    {
      fleet_id: '40000000-0000-0000-0000-000000000001',
      route_no: 41,
      company_id: '30000000-0000-0000-0000-000000000001',
      name: '서울 플릿',
    },
  ]),
}));

describe('DispatchPlanFormPage', () => {
  it('updates an existing dispatch plan expected volume', async () => {
    apiMocks.getDispatchPlan.mockResolvedValue({
      dispatch_plan_id: 'dispatch-plan-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      planned_volume: 120,
      dispatch_status: 'draft',
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
    });
    apiMocks.updateDispatchPlan.mockResolvedValue({
      dispatch_plan_id: 'dispatch-plan-1',
      company_id: '30000000-0000-0000-0000-000000000001',
      fleet_id: '40000000-0000-0000-0000-000000000001',
      dispatch_date: '2026-03-24',
      planned_volume: 180,
      dispatch_status: 'draft',
      created_at: '2026-03-20T00:00:00Z',
      updated_at: '2026-03-21T00:00:00Z',
    });

    render(
      <MemoryRouter initialEntries={['/dispatch/plans/dispatch-plan-1/edit']}>
        <Routes>
          <Route
            path="/dispatch/plans/:dispatchPlanRef/edit"
            element={<DispatchPlanFormPage client={{ request: vi.fn() }} mode="edit" />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('120');
    fireEvent.change(screen.getByLabelText('예상 물량'), { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: '예상 물량 수정' }));
    await waitFor(() => {
      expect(apiMocks.updateDispatchPlan).toHaveBeenCalledWith(
        expect.anything(),
        'dispatch-plan-1',
        expect.objectContaining({
          planned_volume: 180,
        }),
      );
    });
  });
});
