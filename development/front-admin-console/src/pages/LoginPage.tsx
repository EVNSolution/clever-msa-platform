import { useEffect, useMemo, useState, type FormEvent } from 'react';

import type { Company } from '../types';

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

type RecoveryFormPayload = {
  name: string;
  birthDate: string;
  email: string;
  password: string;
  privacyPolicyConsented: boolean;
  locationPolicyConsented: boolean;
};

type LoginPageProps = {
  companies: Company[];
  companyErrorMessage?: string | null;
  errorMessage?: string | null;
  isLoadingCompanies?: boolean;
  isSubmitting: boolean;
  onLogin: (credentials: { email: string; password: string }) => void | Promise<void>;
  onRecover: (payload: RecoveryFormPayload) => void | Promise<void>;
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
  onRecover,
  onSignup,
  statusMessage,
}: LoginPageProps) {
  const [view, setView] = useState<'login' | 'signup' | 'recovery'>('login');
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
  const [recoveryName, setRecoveryName] = useState('');
  const [recoveryBirthDate, setRecoveryBirthDate] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [recoveryPrivacyConsented, setRecoveryPrivacyConsented] = useState(false);
  const [recoveryLocationConsented, setRecoveryLocationConsented] = useState(false);

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

  async function handleRecoverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onRecover({
      name: recoveryName,
      birthDate: recoveryBirthDate,
      email: recoveryEmail,
      password: recoveryPassword,
      privacyPolicyConsented: recoveryPrivacyConsented,
      locationPolicyConsented: recoveryLocationConsented,
    });
  }

  return (
    <div className="auth-shell admin-auth-shell">
      <section className="auth-hero admin-hero">
        <p className="eyebrow">웹 콘솔</p>
        <h1>계정, 조직, 배송원, 정산 도메인을 직접 관리하는 통합 웹 콘솔입니다.</h1>
        <p className="hero-copy">
          모든 요청은 게이트웨이를 거치며, Refresh 토큰은 <code>HttpOnly</code> 쿠키로 유지됩니다.
        </p>
      </section>
      <section className="auth-panel panel">
        <div className="panel-header panel-header-inline">
          <div>
            <p className="panel-kicker">
              {view === 'login' ? '웹 콘솔 로그인' : view === 'signup' ? '회원가입 요청' : 'identity 복구'}
            </p>
            <h2>
              {view === 'login'
                ? '시드 관리자 계정으로 로그인할 수 있습니다.'
                : view === 'signup'
                  ? '회사와 계정 유형을 선택해 승인 요청을 만들 수 있습니다.'
                  : 'archive된 identity를 새 로그인 수단으로 복구합니다.'}
            </h2>
          </div>
          <div className="inline-actions">
            <button
              className={view === 'login' ? 'button primary small' : 'button ghost small'}
              onClick={() => setView('login')}
              type="button"
            >
              로그인 화면
            </button>
            <button
              className={view === 'signup' ? 'button primary small' : 'button ghost small'}
              onClick={() => setView('signup')}
              type="button"
            >
              회원가입 요청
            </button>
            <button
              className={view === 'recovery' ? 'button primary small' : 'button ghost small'}
              onClick={() => setView('recovery')}
              type="button"
            >
              identity 복구
            </button>
          </div>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
        {companyErrorMessage ? <div className="error-banner">{companyErrorMessage}</div> : null}

        {view === 'login' ? (
          <form className="stack" onSubmit={(event) => void handleLoginSubmit(event)}>
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
        ) : null}

        {view === 'signup' ? (
          <form className="stack" onSubmit={(event) => void handleSignupSubmit(event)}>
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
            <label className="inline-actions">
              <input
                aria-label="관리자 계정 신청"
                checked={signupManagerRequested}
                onChange={(event) => setSignupManagerRequested(event.target.checked)}
                type="checkbox"
              />
              <span>관리자 계정 신청</span>
            </label>
            <label className="inline-actions">
              <input
                aria-label="배송원 계정 신청"
                checked={signupDriverRequested}
                onChange={(event) => setSignupDriverRequested(event.target.checked)}
                type="checkbox"
              />
              <span>배송원 계정 신청</span>
            </label>
            <label className="inline-actions">
              <input
                aria-label="개인정보처리 동의"
                checked={signupPrivacyConsented}
                onChange={(event) => setSignupPrivacyConsented(event.target.checked)}
                type="checkbox"
              />
              <span>개인정보처리 동의</span>
            </label>
            <label className="inline-actions">
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
        ) : null}

        {view === 'recovery' ? (
          <form className="stack" onSubmit={(event) => void handleRecoverySubmit(event)}>
            <label className="field">
              <span>복구 이름</span>
              <input aria-label="복구 이름" onChange={(event) => setRecoveryName(event.target.value)} value={recoveryName} />
            </label>
            <label className="field">
              <span>복구 생년월일</span>
              <input
                aria-label="복구 생년월일"
                onChange={(event) => setRecoveryBirthDate(event.target.value)}
                type="date"
                value={recoveryBirthDate}
              />
            </label>
            <label className="field">
              <span>복구 이메일</span>
              <input
                aria-label="복구 이메일"
                autoComplete="email"
                onChange={(event) => setRecoveryEmail(event.target.value)}
                type="email"
                value={recoveryEmail}
              />
            </label>
            <label className="field">
              <span>복구 비밀번호</span>
              <input
                aria-label="복구 비밀번호"
                autoComplete="new-password"
                onChange={(event) => setRecoveryPassword(event.target.value)}
                type="password"
                value={recoveryPassword}
              />
            </label>
            <label className="inline-actions">
              <input
                aria-label="복구 개인정보처리 동의"
                checked={recoveryPrivacyConsented}
                onChange={(event) => setRecoveryPrivacyConsented(event.target.checked)}
                type="checkbox"
              />
              <span>복구 개인정보처리 동의</span>
            </label>
            <label className="inline-actions">
              <input
                aria-label="복구 위치기반 동의"
                checked={recoveryLocationConsented}
                onChange={(event) => setRecoveryLocationConsented(event.target.checked)}
                type="checkbox"
              />
              <span>복구 위치기반 동의</span>
            </label>
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? '복구 중...' : '복구하고 로그인'}
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
