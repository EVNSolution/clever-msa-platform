import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('submits the entered credentials and shows the current error message', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSignup = vi.fn();
    const onRecover = vi.fn();

    render(
      <LoginPage
        companies={[{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Alpha Company' }]}
        errorMessage="로그인 실패"
        isSubmitting={false}
        onLogin={onLogin}
        onRecover={onRecover}
        onSignup={onSignup}
      />,
    );

    await user.type(screen.getByLabelText(/이메일/i), 'user@example.com');
    await user.type(screen.getByLabelText(/비밀번호/i), 'password1234');
    await user.click(screen.getByRole('button', { name: /^로그인$/i }));

    expect(onLogin).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password1234',
    });
    expect(screen.getByRole('button', { name: /^로그인$/i }).closest('form')).not.toBeNull();
    expect(screen.getByLabelText(/이메일/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/비밀번호/i)).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByText('로그인 실패')).toBeInTheDocument();
  });

  it('submits a signup request from the public auth entry screen', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSignup = vi.fn();
    const onRecover = vi.fn();

    render(
      <LoginPage
        companies={[
          { company_id: '30000000-0000-0000-0000-000000000001', name: 'Alpha Company' },
          { company_id: '30000000-0000-0000-0000-000000000002', name: 'Beta Company' },
        ]}
        isSubmitting={false}
        onLogin={onLogin}
        onRecover={onRecover}
        onSignup={onSignup}
      />,
    );

    await user.click(screen.getByRole('button', { name: /회원가입 요청/i }));
    await user.type(screen.getByLabelText(/이름/i), '운영 사용자');
    await user.type(screen.getByLabelText(/생년월일/i), '1991-03-04');
    await user.type(screen.getByLabelText(/가입 이메일/i), 'ops@example.com');
    await user.type(screen.getByLabelText(/가입 비밀번호/i), 'signup-pass-123');
    await user.type(screen.getByLabelText(/회사 검색/i), 'Alpha');
    await user.selectOptions(screen.getByLabelText(/회사 선택/i), '30000000-0000-0000-0000-000000000001');
    await user.click(screen.getByLabelText(/관리자 계정 신청/i));
    await user.click(screen.getByLabelText(/개인정보처리 동의/i));
    await user.click(screen.getByLabelText(/위치기반 동의/i));
    await user.click(screen.getByRole('button', { name: /요청 제출/i }));

    expect(onSignup).toHaveBeenCalledWith({
      name: '운영 사용자',
      birthDate: '1991-03-04',
      email: 'ops@example.com',
      password: 'signup-pass-123',
      companyId: '30000000-0000-0000-0000-000000000001',
      requestTypes: ['manager_account_create'],
      privacyPolicyConsented: true,
      locationPolicyConsented: true,
    });
  });

  it('submits identity recovery from the login screen', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSignup = vi.fn();
    const onRecover = vi.fn();

    render(
      <LoginPage
        companies={[]}
        isSubmitting={false}
        onLogin={onLogin}
        onRecover={onRecover}
        onSignup={onSignup}
      />,
    );

    await user.click(screen.getByRole('button', { name: /identity 복구/i }));
    await user.type(screen.getByLabelText(/복구 이름/i), '복구 사용자');
    await user.type(screen.getByLabelText(/복구 생년월일/i), '1990-01-02');
    await user.type(screen.getByLabelText(/복구 이메일/i), 'recover@example.com');
    await user.type(screen.getByLabelText(/복구 비밀번호/i), 'recover-pass-123');
    await user.click(screen.getByLabelText(/복구 개인정보처리 동의/i));
    await user.click(screen.getByLabelText(/복구 위치기반 동의/i));
    await user.click(screen.getByRole('button', { name: /복구하고 로그인/i }));

    expect(onRecover).toHaveBeenCalledWith({
      name: '복구 사용자',
      birthDate: '1990-01-02',
      email: 'recover@example.com',
      password: 'recover-pass-123',
      privacyPolicyConsented: true,
      locationPolicyConsented: true,
    });
  });
});
