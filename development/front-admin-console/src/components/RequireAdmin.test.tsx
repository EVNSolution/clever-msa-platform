import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { RequireAdmin } from './RequireAdmin';

describe('RequireAdmin', () => {
  it('blocks non-admin accounts and offers a sign-out action', async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();

    render(
      <RequireAdmin
        account={{
          account_id: '10000000-0000-0000-0000-000000000001',
          email: 'user@example.com',
          role: 'user',
          is_active: true,
        }}
        onLogout={onLogout}
      >
        <div>Admin content</div>
      </RequireAdmin>,
    );

    expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin content')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /return to sign in/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('renders children for admin accounts', () => {
    render(
      <RequireAdmin
        account={{
          account_id: '20000000-0000-0000-0000-000000000001',
          email: 'admin@example.com',
          role: 'admin',
          is_active: true,
        }}
        onLogout={() => undefined}
      >
        <div>Admin content</div>
      </RequireAdmin>,
    );

    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
