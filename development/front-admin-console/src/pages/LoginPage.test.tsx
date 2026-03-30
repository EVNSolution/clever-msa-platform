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
        errorMessage="로그인 실패"
        isSubmitting={false}
        onLogin={onLogin}
      />,
    );

    await user.type(screen.getByLabelText(/이메일/i), 'admin@example.com');
    await user.type(screen.getByLabelText(/비밀번호/i), 'change-me');
    await user.click(screen.getByRole('button', { name: /로그인/i }));

    expect(onLogin).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'change-me',
    });
    expect(screen.getByRole('button', { name: /로그인/i }).closest('form')).not.toBeNull();
    expect(screen.getByLabelText(/이메일/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/비밀번호/i)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('로그인 실패')).toBeInTheDocument();
  });
});
