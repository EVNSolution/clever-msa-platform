import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { Driver360Page } from './Driver360Page';

const apiMocks = vi.hoisted(() => ({
  getDriver360: vi.fn(),
}));

vi.mock('../api/driver360', () => ({
  getDriver360: apiMocks.getDriver360,
}));

describe('Driver360Page', () => {
  function renderPage() {
    return render(
      <MemoryRouter
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        initialEntries={['/drivers/1']}
      >
        <Routes>
          <Route path="/drivers/:driverRef" element={<Driver360Page client={{ request: vi.fn() }} />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('renders driver summary with linked account and settlement', async () => {
    apiMocks.getDriver360.mockResolvedValue({
      driver_id: '10000000-0000-0000-0000-000000000001',
      driver_name: 'Kim Driver',
      ev_id: 'EV-001',
      phone_number: '010-1234-5678',
      address: 'Seoul',
      company_id: '20000000-0000-0000-0000-000000000001',
      company_name: 'EVN Company',
      fleet_id: '30000000-0000-0000-0000-000000000001',
      fleet_name: 'Central Fleet',
      driver_account_link_id: '41000000-0000-0000-0000-000000000001',
      driver_account_id: '40000000-0000-0000-0000-000000000001',
      driver_account_identity_name: 'Kim Driver',
      driver_account_email: 'driver@example.com',
      driver_account_status: 'active',
      latest_settlement_run_id: '50000000-0000-0000-0000-000000000001',
      latest_settlement_period_start: '2026-03-01',
      latest_settlement_period_end: '2026-03-31',
      latest_settlement_status: 'closed',
      latest_payout_status: 'paid',
      latest_settlement_amount: '125000.50',
      warnings: [],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: /kim driver/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /배송원 수정/i })).toHaveAttribute('href', '/drivers/1/edit');
    expect(screen.getByText(/driver@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/EV-001/i)).toBeInTheDocument();
    expect(screen.getByText(/125000.50/i)).toBeInTheDocument();
    expect(screen.getByText(/주의 사항이 없습니다/i)).toBeInTheDocument();
  });

  it('renders empty states when account and settlement are missing', async () => {
    apiMocks.getDriver360.mockResolvedValue({
      driver_id: '10000000-0000-0000-0000-000000000001',
      driver_name: 'Kim Driver',
      ev_id: 'EV-001',
      phone_number: '010-1234-5678',
      address: 'Seoul',
      company_id: '20000000-0000-0000-0000-000000000001',
      company_name: null,
      fleet_id: '30000000-0000-0000-0000-000000000001',
      fleet_name: null,
      driver_account_link_id: null,
      driver_account_id: null,
      driver_account_identity_name: null,
      driver_account_email: null,
      driver_account_status: null,
      latest_settlement_run_id: null,
      latest_settlement_period_start: null,
      latest_settlement_period_end: null,
      latest_settlement_status: null,
      latest_payout_status: null,
      latest_settlement_amount: null,
      warnings: ['Company not found.'],
    });

    renderPage();

    expect(await screen.findByText(/연결된 배송원 계정이 없습니다/i)).toBeInTheDocument();
    expect(screen.getByText(/정산 정보가 없습니다/i)).toBeInTheDocument();
    expect(screen.getByText(/company not found/i)).toBeInTheDocument();
  });

  it('renders an error banner when the summary request fails', async () => {
    apiMocks.getDriver360.mockRejectedValue(new Error('Driver 360 unavailable.'));

    renderPage();

    expect(await screen.findByText(/driver 360 unavailable/i)).toBeInTheDocument();
  });
});
