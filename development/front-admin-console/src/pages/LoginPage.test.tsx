import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

describe('Admin LoginPage', () => {
  it('submits credentials inside a form and preserves login autocomplete hints', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    render(
      <LoginPage
        errorMessage="Login failed."
        isSubmitting={false}
        onLogin={onLogin}
      />,
    );

    await user.type(screen.getByLabelText(/email/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/password/i), 'change-me');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'change-me',
    });
    expect(screen.getByRole('button', { name: /sign in/i }).closest('form')).not.toBeNull();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('Login failed.')).toBeInTheDocument();
  });
});
