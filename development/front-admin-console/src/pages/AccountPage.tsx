import { useEffect, useMemo, useState } from 'react';

import { getErrorMessage, type HttpClient, type SessionPayload } from '../api/http';
import {
  cancelMySignupRequest,
  createIdentityLoginMethod,
  createMySignupRequest,
  deleteIdentityLoginMethod,
  getIdentityConsent,
  getIdentityProfile,
  listIdentityLoginMethods,
  listMySignupRequests,
  updateIdentityPassword,
  updateIdentityProfile,
  withdrawIdentityConsent,
} from '../api/identity';
import { listCompanies } from '../api/organization';
import { getManagerRole, isSystemAdmin } from '../authScopes';
import { PageLayout } from '../components/PageLayout';
import type {
  Company,
  IdentityConsentCurrent,
  IdentityLoginMethod,
  IdentityProfile,
  IdentitySignupRequestList,
} from '../types';
import { formatRoleLabel } from '../uiLabels';

type AccountPageProps = {
  client: HttpClient;
  session: SessionPayload;
  onSessionChange?: (session: SessionPayload) => void;
};

export function AccountPage({ client, session, onSessionChange }: AccountPageProps) {
  const [profile, setProfile] = useState<IdentityProfile | null>(null);
  const [consent, setConsent] = useState<IdentityConsentCurrent | null>(null);
  const [loginMethods, setLoginMethods] = useState<IdentityLoginMethod[]>([]);
  const [requestList, setRequestList] = useState<IdentitySignupRequestList | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newLoginMethodType, setNewLoginMethodType] = useState<'email' | 'phone'>('email');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [requestType, setRequestType] = useState<'manager_account_create' | 'driver_account_create'>(
    'manager_account_create',
  );
  const [isReRequest, setIsReRequest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeMethodCount = useMemo(() => loginMethods.length, [loginMethods]);
  const companyNameById = useMemo(
    () => Object.fromEntries(companies.map((company) => [company.company_id, company.name])),
    [companies],
  );
  const currentRoleLabel = useMemo(() => {
    if (isSystemAdmin(session)) {
      return formatRoleLabel('system_admin');
    }

    const role = getManagerRole(session);
    if (role) {
      return formatRoleLabel(role);
    }

    return '승인 대기';
  }, [session]);
  const currentCompanyName = useMemo(() => {
    const companyId = session.activeAccount?.companyId;
    if (!companyId) {
      return '미지정';
    }

    return companyNameById[companyId] ?? companyId;
  }, [companyNameById, session.activeAccount?.companyId]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [profileResponse, consentResponse, methodsResponse, requestResponse, companyResponse] = await Promise.all([
          getIdentityProfile(client),
          getIdentityConsent(client),
          listIdentityLoginMethods(client),
          listMySignupRequests(client),
          listCompanies(client),
        ]);
        if (ignore) {
          return;
        }
        setProfile(profileResponse);
        setConsent(consentResponse);
        setLoginMethods(methodsResponse.methods);
        setRequestList(requestResponse);
        setCompanies(companyResponse);
        setName(profileResponse.name);
        setBirthDate(profileResponse.birth_date);
        setSelectedCompanyId(session.activeAccount?.companyId ?? companyResponse[0]?.company_id ?? '');
      } catch (error) {
        if (!ignore) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [client]);

  async function reloadRequests() {
    const nextRequestList = await listMySignupRequests(client);
    setRequestList(nextRequestList);
  }

  async function reloadMethods() {
    const nextMethods = await listIdentityLoginMethods(client);
    setLoginMethods(nextMethods.methods);
  }

  async function handleProfileSave() {
    setErrorMessage(null);
    try {
      const nextProfile = await updateIdentityProfile(client, {
        name,
        birth_date: birthDate,
      });
      setProfile(nextProfile);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handlePasswordSave() {
    setErrorMessage(null);
    try {
      await updateIdentityPassword(client, {
        current_password: currentPassword || undefined,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleAddLoginMethod() {
    setErrorMessage(null);
    try {
      if (newLoginMethodType === 'email') {
        await createIdentityLoginMethod(client, { method_type: 'email', email: newEmail });
        setNewEmail('');
      } else {
        await createIdentityLoginMethod(client, { method_type: 'phone', phone_number: newPhoneNumber });
        setNewPhoneNumber('');
      }
      await reloadMethods();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDeleteLoginMethod(methodId: string) {
    setErrorMessage(null);
    try {
      await deleteIdentityLoginMethod(client, methodId, {
        confirm: activeMethodCount === 1,
        current_password: deletePassword || undefined,
      });
      setDeletePassword('');
      await reloadMethods();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleWithdrawConsent(consentType: 'privacy_policy' | 'location_policy') {
    setErrorMessage(null);
    try {
      const nextSession = await withdrawIdentityConsent(client, { consent_type: consentType });
      onSessionChange?.(nextSession);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleCreateRequest() {
    setErrorMessage(null);
    try {
      await createMySignupRequest(client, {
        company_id: selectedCompanyId,
        request_type: requestType,
        is_re_request: isReRequest,
      });
      await reloadRequests();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleCancelRequest(requestId: string) {
    setErrorMessage(null);
    try {
      await cancelMySignupRequest(client, requestId);
      await reloadRequests();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <PageLayout subtitle="프로필, 로그인 수단, 요청 이력을 한 화면에서 관리합니다." title="내 계정">
    <div className="stack">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">현재 접근</p>
          <h2>현재 웹 권한</h2>
        </div>
        <div className="stack">
          <p>현재 권한: {currentRoleLabel}</p>
          <p>현재 회사: {currentCompanyName}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">내 계정</p>
          <h2>{session.identity.name} self-service</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        {isLoading ? <p className="empty-state">계정 정보를 불러오는 중입니다...</p> : null}
        {profile ? (
          <div className="stack">
            <label className="field">
              <span>이름</span>
              <input aria-label="이름" onChange={(event) => setName(event.target.value)} value={name} />
            </label>
            <label className="field">
              <span>생년월일</span>
              <input
                aria-label="생년월일"
                onChange={(event) => setBirthDate(event.target.value)}
                type="date"
                value={birthDate}
              />
            </label>
            <button className="button primary" onClick={() => void handleProfileSave()} type="button">
              프로필 저장
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">동의 상태</p>
          <h2>필수 동의</h2>
        </div>
        {consent ? (
          <div className="stack">
            <p>개인정보처리: {consent.privacy_policy_consented ? '동의됨' : '미동의'}</p>
            <p>위치기반: {consent.location_policy_consented ? '동의됨' : '미동의'}</p>
            <div className="inline-actions">
              <button className="button ghost small" onClick={() => void handleWithdrawConsent('privacy_policy')} type="button">
                개인정보처리 철회
              </button>
              <button className="button ghost small" onClick={() => void handleWithdrawConsent('location_policy')} type="button">
                위치기반 철회
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">로그인 수단</p>
          <h2>로그인 수단 관리</h2>
        </div>
        <div className="stack">
          {loginMethods.map((method) => (
            <div className="inline-actions" key={method.identity_login_method_id}>
              <span>{typeof method.value === 'string' ? method.value : `${method.value.provider_type}:${method.value.provider_subject}`}</span>
              <button className="button ghost small" onClick={() => void handleDeleteLoginMethod(method.identity_login_method_id)} type="button">
                삭제
              </button>
            </div>
          ))}
          <label className="field">
            <span>추가 방식</span>
            <select onChange={(event) => setNewLoginMethodType(event.target.value as 'email' | 'phone')} value={newLoginMethodType}>
              <option value="email">이메일</option>
              <option value="phone">전화번호</option>
            </select>
          </label>
          {newLoginMethodType === 'email' ? (
            <label className="field">
              <span>이메일</span>
              <input onChange={(event) => setNewEmail(event.target.value)} value={newEmail} />
            </label>
          ) : (
            <label className="field">
              <span>전화번호</span>
              <input onChange={(event) => setNewPhoneNumber(event.target.value)} value={newPhoneNumber} />
            </label>
          )}
          <label className="field">
            <span>마지막 수단 삭제용 현재 비밀번호</span>
            <input
              onChange={(event) => setDeletePassword(event.target.value)}
              type="password"
              value={deletePassword}
            />
          </label>
          <button className="button primary" onClick={() => void handleAddLoginMethod()} type="button">
            로그인 수단 추가
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">비밀번호</p>
          <h2>공통 비밀번호 변경</h2>
        </div>
        <div className="stack">
          <label className="field">
            <span>현재 비밀번호</span>
            <input
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              value={currentPassword}
            />
          </label>
          <label className="field">
            <span>새 비밀번호</span>
            <input onChange={(event) => setNewPassword(event.target.value)} type="password" value={newPassword} />
          </label>
          <button className="button primary" onClick={() => void handlePasswordSave()} type="button">
            비밀번호 저장
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">계정 요청</p>
          <h2>요청 생성과 회사 변경</h2>
        </div>
        {requestList ? (
          <div className="stack">
            <p>{requestList.inquiry_message}</p>
            {isReRequest ? (
              <p className="hero-copy">회사 변경 요청은 승인되면 기존 세션이 종료되고 새 회사 기준으로 다시 진입합니다.</p>
            ) : null}
            <label className="field">
              <span>회사 선택</span>
              <select aria-label="회사 선택" onChange={(event) => setSelectedCompanyId(event.target.value)} value={selectedCompanyId}>
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>요청 종류</span>
              <select
                aria-label="요청 종류"
                onChange={(event) =>
                  setRequestType(event.target.value as 'manager_account_create' | 'driver_account_create')
                }
                value={requestType}
              >
                <option value="manager_account_create">관리자 계정 신청</option>
                <option value="driver_account_create">배송원 계정 신청</option>
              </select>
            </label>
            <label className="field-inline">
              <input
                aria-label="회사 변경 요청으로 제출"
                checked={isReRequest}
                onChange={(event) => setIsReRequest(event.target.checked)}
                type="checkbox"
              />
              <span>회사 변경 요청으로 제출</span>
            </label>
            <button
              className="button primary"
              disabled={!selectedCompanyId}
              onClick={() => void handleCreateRequest()}
              type="button"
            >
              {isReRequest ? '회사 변경 요청 제출' : '요청 제출'}
            </button>
            <div className="stack">
              {requestList.requests.map((request) => (
                <div className="panel section-card" key={request.identity_signup_request_id}>
                  <p>{request.request_display_name}</p>
                  <p>{request.status_message}</p>
                  <p>회사: {companyNameById[request.company_id] ?? request.company_id}</p>
                  <p>요청 시각: {new Date(request.requested_at).toLocaleString('ko-KR')}</p>
                  {(request.status === 'pending' || request.status === 'awaiting_setup') ? (
                    <button
                      className="button ghost small"
                      onClick={() => void handleCancelRequest(request.identity_signup_request_id)}
                      type="button"
                    >
                      요청 취소
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
    </PageLayout>
  );
}
