import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AccountFormPage } from './AccountFormPage';

const apiMocks = vi.hoisted(() => ({
  getAccount: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

vi.mock('../api/accounts', () => ({
  getAccount: apiMocks.getAccount,
  createAccount: apiMocks.createAccount,
  updateAccount: apiMocks.updateAccount,
}));

describe('AccountFormPage', () => {
  it('uses autocomplete hints for credential inputs', async () => {
    render(
      <MemoryRouter initialEntries={['/accounts/new']}>
        <Routes>
          <Route path="/accounts/new" element={<AccountFormPage client={{ request: vi.fn() }} mode="create" />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/^이메일$/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/비밀번호/i)).toHaveAttribute('autocomplete', 'new-password');
  });

  it('loads account data on edit route', async () => {
    const client = { request: vi.fn() };
    apiMocks.getAccount.mockResolvedValue({
      account_id: '20000000-0000-0000-0000-000000000001',
      email: 'admin@example.com',
      role: 'admin',
      is_active: true,
    });

    render(
      <MemoryRouter initialEntries={['/accounts/20000000-0000-0000-0000-000000000001/edit']}>
        <Routes>
          <Route path="/accounts/:accountId/edit" element={<AccountFormPage client={client} mode="edit" />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiMocks.getAccount).toHaveBeenCalledWith(
        client,
        '20000000-0000-0000-0000-000000000001',
      );
    });
    expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument();
  });
});
