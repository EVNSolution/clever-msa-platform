import { useEffect, useMemo, useState, type FormEvent } from 'react';

import type { Company } from '../types';
import loginSideImage from '../assets/login-side-image.svg';

type SignupFormPayload = {
  name: string;
  birthDate: string;
  email: string;
  password: string;
  companyId: string;
  requestTypes: string[];
  privacyPolicyConsented: boolean;
  locationPolicyConsented: boolean;
};

type PasswordResetDraft = {
  email: string;
  password: string;
  passwordConfirm: string;
};

type LoginPageProps = {
  companies: Company[];
  companyErrorMessage?: string | null;
  errorMessage?: string | null;
  isLoadingCompanies?: boolean;
  isSubmitting: boolean;
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>;
  onSignup: (payload: SignupFormPayload) => void | Promise<void>;
  statusMessage?: string | null;
};

export function LoginPage({
  companies,
  companyErrorMessage,
  errorMessage,
  isLoadingCompanies = false,
  isSubmitting,
  onLogin,
  onSignup,
  statusMessage,
}: LoginPageProps) {
  const [view, setView] = useState<'login' | 'signup' | 'password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupBirthDate, setSignupBirthDate] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [companySearch, setCompanySearch] = useState('');
  const [signupCompanyId, setSignupCompanyId] = useState('');
  const [signupManagerRequested, setSignupManagerRequested] = useState(false);
  const [signupDriverRequested, setSignupDriverRequested] = useState(false);
  const [signupPrivacyConsented, setSignupPrivacyConsented] = useState(false);
  const [signupLocationConsented, setSignupLocationConsented] = useState(false);
  const [passwordResetDraft, setPasswordResetDraft] = useState<PasswordResetDraft>({
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);
  const [passwordResetStatus, setPasswordResetStatus] = useState<string | null>(null);

  const filteredCompanies = useMemo(() => {
    const keyword = companySearch.trim().toLowerCase();
    if (!keyword) {
      return companies;
    }
    return companies.filter((company) => {
      const routeNo = company.route_no ? String(company.route_no) : '';
      return company.name.toLowerCase().includes(keyword) || routeNo.includes(keyword);
    });
  }, [companies, companySearch]);

  useEffect(() => {
    if (!filteredCompanies.length) {
      setSignupCompanyId('');
      return;
    }
    if (!filteredCompanies.some((company) => company.company_id === signupCompanyId)) {
      setSignupCompanyId(filteredCompanies[0].company_id);
    }
  }, [filteredCompanies, signupCompanyId]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onLogin({ email, password });
  }

  async function handleSignupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestTypes = [
      signupManagerRequested ? 'manager_account_create' : null,
      signupDriverRequested ? 'driver_account_create' : null,
    ].filter(Boolean) as string[];
    if (!signupCompanyId || requestTypes.length === 0) {
      return;
    }
    await onSignup({
      name: signupName,
      birthDate: signupBirthDate,
      email: signupEmail,
      password: signupPassword,
      companyId: signupCompanyId,
      requestTypes,
      privacyPolicyConsented: signupPrivacyConsented,
      locationPolicyConsented: signupLocationConsented,
    });
  }

  async function handlePasswordResetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordResetError(null);
    setPasswordResetStatus(null);
    if (passwordResetDraft.password !== passwordResetDraft.passwordConfirm) {
      setPasswordResetError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    setPasswordResetStatus('비밀번호 변경 기능은 준비 중입니다.');
  }

  return (
    <div className="auth-shell admin-auth-shell">
      <div className="login-landing-frame">
        <div className="login-landing-content">
          <section className="login-media-panel">
            <div className="login-media-frame">
              <img alt="EV&Solution Logistics" src={loginSideImage} />
              <div className="login-media-overlay">
                <strong>EV&amp;Solution</strong>
                <span>통합 운영 웹 콘솔</span>
              </div>
            </div>
          </section>

          <section className="login-auth-panel">
            <div className="login-form-shell">
              <h1 className="login-page-title">
                {view === 'login' ? '로그인' : view === 'signup' ? '회원가입 요청' : '비밀번호 변경'}
              </h1>

              {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
              {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
              {companyErrorMessage ? <div className="error-banner">{companyErrorMessage}</div> : null}
              {passwordResetError ? <div className="error-banner">{passwordResetError}</div> : null}
              {passwordResetStatus ? <div className="success-banner">{passwordResetStatus}</div> : null}

              {view === 'login' ? (
                <>
                  <form className="stack login-form-stack" onSubmit={(event) => void handleLoginSubmit(event)}>
                    <label className="field">
                      <span>이메일</span>
                      <input
                        autoComplete="email"
                        name="email"
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="admin@example.com"
                        type="email"
                        value={email}
                      />
                    </label>
                    <label className="field">
                      <span>비밀번호</span>
                      <input
                        autoComplete="current-password"
                        name="password"
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="change-me"
                        type="password"
                        value={password}
                      />
                    </label>
                    <button className="button primary" disabled={isSubmitting} type="submit">
                      {isSubmitting ? '로그인 중...' : '로그인'}
                    </button>
                  </form>

                  <div className="auth-link-row" aria-label="로그인 보조 링크">
                    <button className="auth-text-link" onClick={() => setView('signup')} type="button">
                      회원가입 요청
                    </button>
                    <button className="auth-text-link" onClick={() => setView('password')} type="button">
                      비밀번호 찾기
                    </button>
                  </div>
                </>
              ) : null}

              {view === 'signup' ? (
                <>
                  <form className="stack login-form-stack" onSubmit={(event) => void handleSignupSubmit(event)}>
                    <label className="field">
                      <span>이름</span>
                      <input aria-label="이름" onChange={(event) => setSignupName(event.target.value)} value={signupName} />
                    </label>
                    <label className="field">
                      <span>생년월일</span>
                      <input
                        aria-label="생년월일"
                        onChange={(event) => setSignupBirthDate(event.target.value)}
                        type="date"
                        value={signupBirthDate}
                      />
                    </label>
                    <label className="field">
                      <span>가입 이메일</span>
                      <input
                        aria-label="가입 이메일"
                        autoComplete="email"
                        onChange={(event) => setSignupEmail(event.target.value)}
                        type="email"
                        value={signupEmail}
                      />
                    </label>
                    <label className="field">
                      <span>가입 비밀번호</span>
                      <input
                        aria-label="가입 비밀번호"
                        autoComplete="new-password"
                        onChange={(event) => setSignupPassword(event.target.value)}
                        type="password"
                        value={signupPassword}
                      />
                    </label>
                    <label className="field">
                      <span>회사 검색</span>
                      <input
                        aria-label="회사 검색"
                        onChange={(event) => setCompanySearch(event.target.value)}
                        placeholder="회사명 검색"
                        value={companySearch}
                      />
                    </label>
                    <label className="field">
                      <span>회사 선택</span>
                      <select
                        aria-label="회사 선택"
                        disabled={isLoadingCompanies || filteredCompanies.length === 0}
                        onChange={(event) => setSignupCompanyId(event.target.value)}
                        value={signupCompanyId}
                      >
                        {filteredCompanies.length === 0 ? <option value="">선택 가능한 회사가 없습니다.</option> : null}
                        {filteredCompanies.map((company) => (
                          <option key={company.company_id} value={company.company_id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="auth-check-row">
                      <input
                        aria-label="관리자 계정 신청"
                        checked={signupManagerRequested}
                        onChange={(event) => setSignupManagerRequested(event.target.checked)}
                        type="checkbox"
                      />
                      <span>관리자 계정 신청</span>
                    </label>
                    <label className="auth-check-row">
                      <input
                        aria-label="배송원 계정 신청"
                        checked={signupDriverRequested}
                        onChange={(event) => setSignupDriverRequested(event.target.checked)}
                        type="checkbox"
                      />
                      <span>배송원 계정 신청</span>
                    </label>
                    <label className="auth-check-row">
                      <input
                        aria-label="개인정보처리 동의"
                        checked={signupPrivacyConsented}
                        onChange={(event) => setSignupPrivacyConsented(event.target.checked)}
                        type="checkbox"
                      />
                      <span>개인정보처리 동의</span>
                    </label>
                    <label className="auth-check-row">
                      <input
                        aria-label="위치기반 동의"
                        checked={signupLocationConsented}
                        onChange={(event) => setSignupLocationConsented(event.target.checked)}
                        type="checkbox"
                      />
                      <span>위치기반 동의</span>
                    </label>
                    <button className="button primary" disabled={isSubmitting} type="submit">
                      {isSubmitting ? '요청 제출 중...' : '요청 제출'}
                    </button>
                  </form>

                  <div className="auth-link-row" aria-label="회원가입 보조 링크">
                    <button className="auth-text-link" onClick={() => setView('login')} type="button">
                      로그인
                    </button>
                    <button className="auth-text-link" onClick={() => setView('password')} type="button">
                      비밀번호 찾기
                    </button>
                  </div>
                </>
              ) : null}

              {view === 'password' ? (
                <>
                  <form className="stack login-form-stack" onSubmit={(event) => void handlePasswordResetSubmit(event)}>
                    <label className="field">
                      <span>변경 이메일</span>
                      <input
                        aria-label="변경 이메일"
                        autoComplete="email"
                        onChange={(event) =>
                          setPasswordResetDraft((current) => ({ ...current, email: event.target.value }))
                        }
                        type="email"
                        value={passwordResetDraft.email}
                      />
                    </label>
                    <label className="field">
                      <span>새 비밀번호</span>
                      <input
                        aria-label="새 비밀번호"
                        autoComplete="new-password"
                        onChange={(event) =>
                          setPasswordResetDraft((current) => ({ ...current, password: event.target.value }))
                        }
                        type="password"
                        value={passwordResetDraft.password}
                      />
                    </label>
                    <label className="field">
                      <span>새 비밀번호 확인</span>
                      <input
                        aria-label="새 비밀번호 확인"
                        autoComplete="new-password"
                        onChange={(event) =>
                          setPasswordResetDraft((current) => ({ ...current, passwordConfirm: event.target.value }))
                        }
                        type="password"
                        value={passwordResetDraft.passwordConfirm}
                      />
                    </label>
                    <button className="button primary" type="submit">
                      비밀번호 변경
                    </button>
                  </form>

                  <div className="auth-link-row" aria-label="비밀번호 변경 보조 링크">
                    <button className="auth-text-link" onClick={() => setView('login')} type="button">
                      로그인
                    </button>
                    <button className="auth-text-link" onClick={() => setView('signup')} type="button">
                      회원가입 요청
                    </button>
                  </div>
                </>
              ) : null}

              <div className="login-support-note">
                <span>문의가 필요하시면</span>
                <strong>info@evnsolution.com</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
