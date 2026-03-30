import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createAccount, getAccount, updateAccount, type AccountPayload } from '../api/accounts';
import { getErrorMessage, type HttpClient } from '../api/http';

type AccountFormPageProps = {
  client: HttpClient;
  mode: 'create' | 'edit';
};

const EMPTY_FORM: AccountPayload = {
  email: '',
  password: '',
  role: 'user',
  is_active: true,
};

export function AccountFormPage({ client, mode }: AccountFormPageProps) {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const isEdit = mode === 'edit';
  const [form, setForm] = useState<AccountPayload>(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !accountId) {
      setIsLoading(false);
      return;
    }

    const selectedAccountId = accountId;
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const account = await getAccount(client, selectedAccountId);
        if (!ignore) {
          setForm({
            email: account.email,
            password: '',
            role: account.role,
            is_active: account.is_active,
          });
        }
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
  }, [accountId, client, isEdit]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (isEdit && accountId) {
        const payload: Partial<AccountPayload> = {
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password) {
          payload.password = form.password;
        }
        await updateAccount(client, accountId, payload);
        navigate(`/accounts/${accountId}`);
        return;
      }

      const created = await createAccount(client, form);
      navigate(`/accounts/${created.account_id}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const cancelHref = isEdit && accountId ? `/accounts/${accountId}` : '/accounts';

  return (
    <section className="panel form-panel">
      <div className="panel-header">
        <p className="panel-kicker">계정 입력</p>
        <h2>{isEdit ? '계정 수정' : '계정 생성'}</h2>
      </div>
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {isLoading ? (
        <p className="empty-state">계정을 불러오는 중입니다...</p>
      ) : (
        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>이메일</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>
          <label className="field">
            <span>비밀번호 {isEdit ? '(선택)' : ''}</span>
            <input
              autoComplete="new-password"
              name="password"
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password ?? ''}
            />
          </label>
          <label className="field">
            <span>권한</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              value={form.role}
            >
              <option value="user">사용자</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <label className="field">
            <span>활성 여부</span>
            <select
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.value === 'true' }))
              }
              value={String(form.is_active)}
            >
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : isEdit ? '계정 수정' : '계정 생성'}
            </button>
            <Link className="button ghost" to={cancelHref}>
              취소
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
