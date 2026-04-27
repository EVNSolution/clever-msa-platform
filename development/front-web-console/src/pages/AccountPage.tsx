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
import { FormModal } from '../components/FormModal';
import { PageLayout } from '../components/PageLayout';
import type {
  Company,
  IdentityConsentCurrent,
  IdentityLoginMethod,
  IdentityProfile,
  IdentitySignupRequestList,
} from '../types';
import { formatActiveAccountRoleLabel, formatRoleLabel } from '../uiLabels';

type AccountPageProps = {
  client: HttpClient;
  session: SessionPayload;
  onSessionChange?: (session: SessionPayload) => void;
};

const accountPageDateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function formatAccountPageDate(value: string) {
  return accountPageDateFormatter.format(new Date(value));
}

function formatLoginMethodValue(method: IdentityLoginMethod) {
  return typeof method.value === 'string'
    ? method.value
    : `${method.value.provider_type}:${method.value.provider_subject}`;
}

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
  const [deleteTargetMethod, setDeleteTargetMethod] = useState<IdentityLoginMethod | null>(null);
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

    if (session.activeAccount?.roleDisplayName) {
      return session.activeAccount.roleDisplayName;
    }

    const role = getManagerRole(session);
    if (role) {
      return formatActiveAccountRoleLabel(session.activeAccount);
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

  function closeDeleteLoginMethodModal() {
    setDeleteTargetMethod(null);
    setDeletePassword('');
  }

  async function deleteLoginMethodWithConfirmation(
    methodId: string,
    payload: { confirm: boolean; current_password?: string },
  ) {
    setErrorMessage(null);
    try {
      await deleteIdentityLoginMethod(client, methodId, payload);
      closeDeleteLoginMethodModal();
      await reloadMethods();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDeleteLoginMethod(method: IdentityLoginMethod) {
    if (activeMethodCount === 1) {
      setDeleteTargetMethod(method);
      setDeletePassword('');
      return;
    }

    await deleteLoginMethodWithConfirmation(method.identity_login_method_id, { confirm: false });
  }

  async function handleConfirmDeleteLoginMethod() {
    if (!deleteTargetMethod) {
      return;
    }

    await deleteLoginMethodWithConfirmation(deleteTargetMethod.identity_login_method_id, {
      confirm: true,
      current_password: deletePassword || undefined,
    });
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
    <PageLayout
      contentClassName="account-page-content"
      subtitle="프로필, 로그인 수단, 요청 이력을 한 화면에서 관리합니다."
      title="내 계정"
    >
      <div className="account-page-shell">
        <section className="panel account-page-summary-card">
          <div className="panel-header">
            <h2>현재 접근</h2>
          </div>
          <dl className="account-page-summary-grid">
            <div className="account-page-summary-item">
              <dt>현재 권한</dt>
              <dd>{currentRoleLabel}</dd>
            </div>
            <div className="account-page-summary-item">
              <dt>현재 회사</dt>
              <dd>{currentCompanyName}</dd>
            </div>
          </dl>
        </section>

        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

        {isLoading ? (
          <section className="panel account-page-card">
            <p className="empty-state">계정 정보를 불러오는 중입니다...</p>
          </section>
        ) : (
          <>
            <div className="account-page-grid">
              <div className="account-page-column">
                <section className="panel account-page-card">
                  <div className="panel-header">
                    <h2>기본 정보</h2>
                  </div>
                  {profile ? (
                    <div className="account-page-card-body">
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
                      </div>
                      <div className="account-page-card-actions">
                        <button className="button primary" onClick={() => void handleProfileSave()} type="button">
                          프로필 저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="empty-state">표시할 기본 정보가 없습니다.</p>
                  )}
                </section>

                <section className="panel account-page-card">
                  <div className="panel-header">
                    <h2>필수 동의</h2>
                  </div>
                  {consent ? (
                    <div className="account-page-card-body">
                      <dl className="account-page-status-list">
                        <div>
                          <dt>개인정보처리</dt>
                          <dd>{consent.privacy_policy_consented ? '동의됨' : '미동의'}</dd>
                        </div>
                        <div>
                          <dt>위치기반</dt>
                          <dd>{consent.location_policy_consented ? '동의됨' : '미동의'}</dd>
                        </div>
                      </dl>
                      <div className="account-page-card-actions account-page-inline-actions">
                        <button
                          className="button ghost small"
                          onClick={() => void handleWithdrawConsent('privacy_policy')}
                          type="button"
                        >
                          개인정보처리 철회
                        </button>
                        <button
                          className="button ghost small"
                          onClick={() => void handleWithdrawConsent('location_policy')}
                          type="button"
                        >
                          위치기반 철회
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="empty-state">동의 상태를 불러오지 못했습니다.</p>
                  )}
                </section>
              </div>

              <div className="account-page-column">
                <section className="panel account-page-card">
                  <div className="panel-header">
                    <h2>로그인 수단</h2>
                  </div>
                  <div className="account-page-card-body">
                    {loginMethods.length === 0 ? (
                      <p className="empty-state">등록된 로그인 수단이 없습니다.</p>
                    ) : (
                      <ul className="account-page-method-list">
                        {loginMethods.map((method) => (
                          <li className="account-page-method-row" key={method.identity_login_method_id}>
                            <span className="account-page-method-value">{formatLoginMethodValue(method)}</span>
                            <button
                              className="button ghost small"
                              onClick={() => void handleDeleteLoginMethod(method)}
                              type="button"
                            >
                              삭제
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="account-page-compact-form">
                      <label className="field">
                        <span>추가 방식</span>
                        <select
                          onChange={(event) => setNewLoginMethodType(event.target.value as 'email' | 'phone')}
                          value={newLoginMethodType}
                        >
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
                    </div>

                    <div className="account-page-card-actions">
                      <button className="button primary" onClick={() => void handleAddLoginMethod()} type="button">
                        로그인 수단 추가
                      </button>
                    </div>
                  </div>
                </section>

                <section className="panel account-page-card">
                  <div className="panel-header">
                    <h2>내 요청</h2>
                  </div>
                  {requestList ? (
                    <div className="account-page-card-body">
                      {requestList.inquiry_message ? (
                        <p className="account-page-helper-text">{requestList.inquiry_message}</p>
                      ) : null}

                      <div className="account-page-compact-form">
                        <label className="field">
                          <span>회사 선택</span>
                          <select
                            aria-label="회사 선택"
                            onChange={(event) => setSelectedCompanyId(event.target.value)}
                            value={selectedCompanyId}
                          >
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
                      </div>

                      <div className="account-page-card-actions account-page-request-actions">
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
                      </div>

                      {isReRequest ? (
                        <p className="account-page-helper-text">
                          회사 변경 요청은 승인되면 기존 세션이 종료되고 새 회사 기준으로 다시 진입합니다.
                        </p>
                      ) : null}

                      <ul aria-label="내 요청 이력" className="account-page-request-list">
                        {requestList.requests.map((request) => (
                          <li className="account-page-request-row" key={request.identity_signup_request_id}>
                            <div className="account-page-request-main">
                              <strong>{request.request_display_name}</strong>
                              <span>{request.status_message}</span>
                            </div>
                            <div className="account-page-request-meta">
                              <span>회사: {companyNameById[request.company_id] ?? request.company_id}</span>
                              <span>요청일: {formatAccountPageDate(request.requested_at)}</span>
                            </div>
                            {(request.status === 'pending' || request.status === 'awaiting_setup') ? (
                              <button
                                className="button ghost small"
                                onClick={() => void handleCancelRequest(request.identity_signup_request_id)}
                                type="button"
                              >
                                요청 취소
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="empty-state">표시할 요청 이력이 없습니다.</p>
                  )}
                </section>
              </div>
            </div>

            <section className="panel account-page-card account-page-password-card">
              <div className="panel-header">
                <h2>비밀번호 변경</h2>
              </div>
              <div className="account-page-card-body">
                <div className="account-page-compact-form">
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
                    <input
                      onChange={(event) => setNewPassword(event.target.value)}
                      type="password"
                      value={newPassword}
                    />
                  </label>
                </div>
                <div className="account-page-card-actions">
                  <button className="button primary" onClick={() => void handlePasswordSave()} type="button">
                    비밀번호 저장
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
      <FormModal
        isOpen={deleteTargetMethod !== null}
        kicker="로그인 수단"
        onClose={closeDeleteLoginMethodModal}
        title="로그인 수단 삭제"
      >
        <div className="stack">
          <p className="account-page-helper-text">
            마지막 로그인 수단을 삭제하려면 현재 비밀번호가 필요합니다.
          </p>
          {deleteTargetMethod ? <p>{formatLoginMethodValue(deleteTargetMethod)}</p> : null}
          <label className="field">
            <span>현재 비밀번호</span>
            <input
              onChange={(event) => setDeletePassword(event.target.value)}
              type="password"
              value={deletePassword}
            />
          </label>
          <div className="account-page-card-actions">
            <button className="button ghost small" onClick={closeDeleteLoginMethodModal} type="button">
              취소
            </button>
            <button
              className="button danger"
              disabled={!deletePassword.trim()}
              onClick={() => void handleConfirmDeleteLoginMethod()}
              type="button"
            >
              삭제 진행
            </button>
          </div>
        </div>
      </FormModal>
    </PageLayout>
  );
}
