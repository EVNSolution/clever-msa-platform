import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountsPage } from './AccountsPage';

const apiMocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
}));

vi.mock('../api/accounts', () => ({
  listAccounts: apiMocks.listAccounts,
  createAccount: apiMocks.createAccount,
  updateAccount: apiMocks.updateAccount,
}));

describe('AccountsPage', () => {
  it('uses autocomplete hints for account credential inputs', async () => {
    apiMocks.listAccounts.mockResolvedValue([]);

    render(<AccountsPage client={{ request: vi.fn() }} />);

    await waitFor(() => {
      expect(apiMocks.listAccounts).toHaveBeenCalled();
    });

    expect(screen.getByLabelText(/^이메일$/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/비밀번호/i)).toHaveAttribute('autocomplete', 'new-password');
  });
});
