import { useEffect, useState, type FormEvent } from 'react';

import { createAccount, listAccounts, updateAccount, type AccountPayload } from '../api/accounts';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { AccountSummary } from '../types';

type AccountsPageProps = {
  client: HttpClient;
};

const EMPTY_FORM: AccountPayload = {
  email: '',
  password: '',
  role: 'user',
  is_active: true,
};

export function AccountsPage({ client }: AccountsPageProps) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [form, setForm] = useState<AccountPayload>(EMPTY_FORM);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const response = await listAccounts(client);
        if (!ignore) {
          setAccounts(response);
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
  }, [client]);

  async function refreshAccounts() {
    const response = await listAccounts(client);
    setAccounts(response);
  }

  function resetForm() {
    setEditingAccountId(null);
    setForm(EMPTY_FORM);
  }

  function handleEdit(account: AccountSummary) {
    setEditingAccountId(account.account_id);
    setForm({
      email: account.email,
      password: '',
      role: account.role,
      is_active: account.is_active,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (editingAccountId) {
        const payload: Partial<AccountPayload> = {
          email: form.email,
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password) {
          payload.password = form.password;
        }
        await updateAccount(client, editingAccountId, payload);
      } else {
        await createAccount(client, form);
      }
      await refreshAccounts();
      resetForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="data-grid two-columns wide-left">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Identity Access</p>
          <h2>{editingAccountId ? 'Update account' : 'Create account'}</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>
          <label className="field">
            <span>Password {editingAccountId ? '(optional)' : ''}</span>
            <input
              autoComplete="new-password"
              name="password"
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              value={form.password ?? ''}
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              value={form.role}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label className="field">
            <span>Active</span>
            <select
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.value === 'true' }))
              }
              value={String(form.is_active)}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : editingAccountId ? 'Update account' : 'Create account'}
            </button>
            <button className="button ghost" onClick={resetForm} type="button">
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Current Accounts</p>
          <h2>Admin-visible account list</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">Loading accounts...</p>
        ) : (
          <table className="table compact">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.account_id}>
                  <td>{account.email}</td>
                  <td>{account.role}</td>
                  <td>{String(account.is_active)}</td>
                  <td>
                    <button className="button ghost small" onClick={() => handleEdit(account)} type="button">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
