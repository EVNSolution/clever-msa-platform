import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('submits the entered credentials and shows the current error message', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    render(
      <LoginPage
        errorMessage="Login failed."
        isSubmitting={false}
        onLogin={onLogin}
      />,
    );

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onLogin).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password1234',
    });
    expect(screen.getByRole('button', { name: /sign in/i }).closest('form')).not.toBeNull();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('Login failed.')).toBeInTheDocument();
  });
});
