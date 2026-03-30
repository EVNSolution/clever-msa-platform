import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AccountsPage } from './AccountsPage';

const apiMocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
}));

vi.mock('../api/accounts', () => ({
  listAccounts: apiMocks.listAccounts,
}));

describe('AccountsPage', () => {
  it('renders account list without an inline form', async () => {
    apiMocks.listAccounts.mockResolvedValue([
      {
        account_id: '20000000-0000-0000-0000-000000000001',
        email: 'admin@example.com',
        role: 'admin',
        is_active: true,
      },
    ]);

    render(
      <MemoryRouter>
        <AccountsPage client={{ request: vi.fn() }} />
      </MemoryRouter>,
    );

    await screen.findByText('admin@example.com');
    expect(screen.getByRole('link', { name: /계정 생성/i })).toHaveAttribute('href', '/accounts/new');
    expect(screen.queryByLabelText(/^이메일$/i)).not.toBeInTheDocument();
  });
});
