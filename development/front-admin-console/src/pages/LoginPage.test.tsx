import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from './LoginPage';

describe('Admin LoginPage', () => {
  it(
    'submits credentials inside a form and preserves login autocomplete hints',
    async () => {
      const user = userEvent.setup();
      const onLogin = vi.fn();
      const onSignup = vi.fn();

      const { container } = render(
        <LoginPage
          companies={[{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Alpha Company', route_no: 1 }]}
          errorMessage="로그인 실패"
          isSubmitting={false}
          onLogin={onLogin}
          onSignup={onSignup}
        />,
      );

      await user.type(screen.getByLabelText(/이메일/i), 'admin@example.com');
      await user.type(screen.getByLabelText(/비밀번호/i), 'change-me');
      await user.click(screen.getByRole('button', { name: /^로그인$/i }));

      expect(onLogin).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'change-me',
      });
      expect(screen.getByRole('button', { name: /^로그인$/i }).closest('form')).not.toBeNull();
      expect(screen.getByLabelText(/이메일/i)).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByLabelText(/비밀번호/i)).toHaveAttribute('autocomplete', 'current-password');
      expect(screen.getByText('로그인 실패')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /로그인 화면/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /회원가입 요청/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /비밀번호 찾기/i })).toBeInTheDocument();
      expect(container.querySelector('.login-browser-frame')).toBeNull();
      expect(screen.getByAltText(/EV&Solution Logistics/i)).toHaveAttribute(
        'src',
        expect.stringContaining('login-side-image.svg'),
      );
    },
    10_000,
  );

  it('submits a signup request with selected company and account types', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSignup = vi.fn();

    render(
      <LoginPage
        companies={[
          { company_id: '30000000-0000-0000-0000-000000000001', name: 'Alpha Company', route_no: 1 },
          { company_id: '30000000-0000-0000-0000-000000000002', name: 'Beta Company', route_no: 2 },
        ]}
        isSubmitting={false}
        onLogin={onLogin}
        onSignup={onSignup}
      />,
    );

    await user.click(screen.getByRole('button', { name: /회원가입 요청/i }));
    await user.type(screen.getByLabelText(/이름/i), '홍길동');
    await user.type(screen.getByLabelText(/생년월일/i), '1990-01-02');
    await user.type(await screen.findByLabelText(/가입 이메일/i), 'hong@example.com');
    await user.type(screen.getByLabelText(/가입 비밀번호/i), 'signup-pass-123');
    await user.type(screen.getByLabelText(/회사 검색/i), 'Beta');
    await user.selectOptions(screen.getByLabelText(/회사 선택/i), '30000000-0000-0000-0000-000000000002');
    await user.click(screen.getByLabelText(/관리자 계정 신청/i));
    await user.click(screen.getByLabelText(/개인정보처리 동의/i));
    await user.click(screen.getByLabelText(/위치기반 동의/i));
    await user.click(screen.getByRole('button', { name: /요청 제출/i }));

    expect(onSignup).toHaveBeenCalledWith({
      name: '홍길동',
      birthDate: '1990-01-02',
      email: 'hong@example.com',
      password: 'signup-pass-123',
      companyId: '30000000-0000-0000-0000-000000000002',
      requestTypes: ['manager_account_create'],
      privacyPolicyConsented: true,
      locationPolicyConsented: true,
    });
  });

  it('shows a simplified password reset view from a text link', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSignup = vi.fn();

    render(
      <LoginPage
        companies={[]}
        isSubmitting={false}
        onLogin={onLogin}
        onSignup={onSignup}
      />,
    );

    await user.click(screen.getByRole('button', { name: /비밀번호 찾기/i }));

    expect(await screen.findByRole('heading', { name: /비밀번호 변경/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/변경 이메일/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/^새 비밀번호$/i)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText(/^새 비밀번호 확인$/i)).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.queryByLabelText(/복구 이름/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/복구 생년월일/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^로그인$/i })).toBeInTheDocument();
  });
});
