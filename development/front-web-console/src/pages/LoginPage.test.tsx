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

      await user.type(screen.getByLabelText(/아이디/i), 'admin@example.com');
      await user.type(screen.getByLabelText(/비밀번호/i), 'change-me');
      await user.click(screen.getByRole('button', { name: /^로그인$/i }));

      expect(onLogin).toHaveBeenCalledWith({
        email: 'admin@example.com',
        password: 'change-me',
      });
      expect(screen.getByRole('button', { name: /^로그인$/i }).closest('form')).not.toBeNull();
      expect(screen.getByLabelText(/아이디/i)).toHaveAttribute('autocomplete', 'email');
      expect(screen.getByLabelText(/비밀번호/i)).toHaveAttribute('autocomplete', 'current-password');
      expect(screen.getByText('로그인 실패')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /로그인 화면/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /회원가입/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /비밀번호 찾기/i })).toBeInTheDocument();
      expect(container.querySelector('.login-browser-frame')).toBeNull();
      expect(screen.getByAltText(/EV&Solution Logistics/i)).toHaveAttribute(
        'src',
        expect.stringContaining('login-side-image.svg'),
      );
      expect(screen.getByText('support@example.com')).toBeInTheDocument();
      expect(screen.queryByText('이메일 형식으로 입력하세요.')).not.toBeInTheDocument();
      expect(screen.getByText('비밀번호는 영문 대문자, 소문자, 기호를 각각 1개 이상 포함해야 합니다.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'google 로그인' })).toBeDisabled();
      expect(screen.getByRole('button', { name: '카카오 로그인' })).toBeDisabled();
      expect(screen.queryByRole('heading', { name: 'Alpha Company' })).not.toBeInTheDocument();
      expect(screen.queryByText('회사 전용 로그인')).not.toBeInTheDocument();
      expect(screen.getByText('통합 운영 웹 콘솔')).toBeInTheDocument();
    },
    10_000,
  );

  it('renders a centered company identity block without introducing another page heading for subdomain login', () => {
    render(
      <LoginPage
        companies={[{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Alpha Company', route_no: 1 }]}
        isSubmitting={false}
        onLogin={vi.fn()}
        onSignup={vi.fn()}
        presetCompany={{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Alpha Company', route_no: 1 }}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: '로그인' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alpha Company' })).not.toBeInTheDocument();
    expect(screen.getByText('Alpha Company')).toBeInTheDocument();
    expect(screen.getByText('회사 전용 로그인')).toBeInTheDocument();
    expect(screen.getByText('Alpha Company 전용 콘솔')).toBeInTheDocument();
  });

  it('shows email and password helpers only after input starts', async () => {
    const user = userEvent.setup();

    render(
      <LoginPage
        companies={[]}
        isSubmitting={false}
        onLogin={vi.fn()}
        onSignup={vi.fn()}
      />,
    );

    expect(screen.queryByText('이메일 형식으로 입력하세요.')).not.toBeInTheDocument();
    expect(screen.queryByText('비밀번호는 영문 대문자, 소문자, 기호를 각각 1개 이상 포함해야 합니다.')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('아이디'), 'a');
    expect(screen.getByText('이메일 형식으로 입력하세요.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('아이디'), '@');
    expect(screen.queryByText('이메일 형식으로 입력하세요.')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('비밀번호'), 'A');
    expect(screen.getByText('비밀번호는 영문 대문자, 소문자, 기호를 각각 1개 이상 포함해야 합니다.')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('비밀번호'), 'a!');
    expect(
      screen.queryByText('비밀번호는 영문 대문자, 소문자, 기호를 각각 1개 이상 포함해야 합니다.'),
    ).not.toBeInTheDocument();
  });

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

    await user.click(screen.getByRole('button', { name: /^회원가입$/i }));
    await user.type(screen.getByLabelText(/이름/i), '홍길동');
    await user.type(screen.getByLabelText(/생년월일/i), '1990-01-02');
    await user.type(await screen.findByLabelText(/가입 이메일/i), 'hong@example.com');
    await user.type(screen.getByLabelText(/가입 비밀번호/i), 'Signup-pass!');
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
      password: 'Signup-pass!',
      companyId: '30000000-0000-0000-0000-000000000002',
      requestTypes: ['manager_account_create'],
      privacyPolicyConsented: true,
      locationPolicyConsented: true,
    });
    expect(screen.getByRole('button', { name: 'google 로그인' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '카카오 로그인' })).toBeDisabled();
  });

  it('blocks signup when the password does not satisfy the frontend rule', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSignup = vi.fn();

    render(
      <LoginPage
        companies={[{ company_id: '30000000-0000-0000-0000-000000000001', name: 'Alpha Company', route_no: 1 }]}
        isSubmitting={false}
        onLogin={onLogin}
        onSignup={onSignup}
      />,
    );

    await user.click(screen.getByRole('button', { name: /^회원가입$/i }));
    await user.type(screen.getByLabelText(/이름/i), '홍길동');
    await user.type(screen.getByLabelText(/생년월일/i), '1990-01-02');
    await user.type(screen.getByLabelText(/가입 이메일/i), 'hong@example.com');
    await user.type(screen.getByLabelText(/가입 비밀번호/i), 'weakpassword');
    await user.click(screen.getByLabelText(/관리자 계정 신청/i));
    await user.click(screen.getByLabelText(/개인정보처리 동의/i));
    await user.click(screen.getByLabelText(/위치기반 동의/i));
    await user.click(screen.getByRole('button', { name: /요청 제출/i }));

    expect(onSignup).not.toHaveBeenCalled();
    expect(
      screen.getByText('비밀번호는 영문 대문자, 소문자, 기호를 각각 1개 이상 포함해야 합니다.', {
        selector: '.error-banner',
      }),
    ).toBeInTheDocument();
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

  it('blocks password reset when the new password does not satisfy the frontend rule', async () => {
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
    await user.type(screen.getByLabelText(/변경 이메일/i), 'hong@example.com');
    await user.type(screen.getByLabelText(/^새 비밀번호$/i), 'weakpassword');
    await user.type(screen.getByLabelText(/^새 비밀번호 확인$/i), 'weakpassword');
    await user.click(screen.getByRole('button', { name: /비밀번호 변경/i }));

    expect(
      screen.getByText('비밀번호는 영문 대문자, 소문자, 기호를 각각 1개 이상 포함해야 합니다.', {
        selector: '.error-banner',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('비밀번호 변경 기능은 준비 중입니다.')).not.toBeInTheDocument();
  });
});
