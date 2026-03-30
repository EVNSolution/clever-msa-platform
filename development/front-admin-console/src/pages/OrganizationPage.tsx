import { useEffect, useState, type FormEvent } from 'react';

import {
  createCompany,
  createFleet,
  deleteCompany,
  deleteFleet,
  listCompanies,
  listFleets,
  updateCompany,
  updateFleet,
} from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { Company, Fleet } from '../types';

type OrganizationPageProps = {
  client: HttpClient;
};

export function OrganizationPage({ client }: OrganizationPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [companyForm, setCompanyForm] = useState({ name: '' });
  const [fleetForm, setFleetForm] = useState({ company_id: '', name: '' });
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingFleetId, setEditingFleetId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [companyResponse, fleetResponse] = await Promise.all([
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setFleetForm((current) => ({
          ...current,
          company_id: current.company_id || companyResponse[0]?.company_id || '',
        }));
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

  async function refreshAll() {
    const [companyResponse, fleetResponse] = await Promise.all([
      listCompanies(client),
      listFleets(client),
    ]);
    setCompanies(companyResponse);
    setFleets(fleetResponse);
  }

  async function handleCompanySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (editingCompanyId) {
        await updateCompany(client, editingCompanyId, companyForm);
      } else {
        await createCompany(client, companyForm);
      }
      await refreshAll();
      setEditingCompanyId(null);
      setCompanyForm({ name: '' });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleFleetSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (editingFleetId) {
        await updateFleet(client, editingFleetId, fleetForm);
      } else {
        await createFleet(client, fleetForm);
      }
      await refreshAll();
      setEditingFleetId(null);
      setFleetForm({ company_id: companies[0]?.company_id ?? '', name: '' });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDelete(kind: 'company' | 'fleet', id: string) {
    setErrorMessage(null);
    try {
      if (kind === 'company') {
        await deleteCompany(client, id);
      } else {
        await deleteFleet(client, id);
      }
      await refreshAll();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      <div className="sub-grid two-columns">
        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">회사</p>
            <h2>회사 마스터 레지스트리</h2>
          </div>
          <form className="stack" onSubmit={handleCompanySubmit}>
            <label className="field">
              <span>이름</span>
              <input
                onChange={(event) => setCompanyForm({ name: event.target.value })}
                value={companyForm.name}
              />
            </label>
            <div className="form-actions">
              <button className="button primary" type="submit">
                {editingCompanyId ? '회사 수정' : '회사 생성'}
              </button>
              <button className="button ghost" onClick={() => { setEditingCompanyId(null); setCompanyForm({ name: '' }); }} type="button">
                초기화
              </button>
            </div>
          </form>
          {isLoading ? <p className="empty-state">회사를 불러오는 중입니다...</p> : (
            <table className="table compact">
              <tbody>
                {companies.map((company) => (
                  <tr key={company.company_id}>
                    <td>{company.name}</td>
                    <td>
                      <button className="button ghost small" onClick={() => { setEditingCompanyId(company.company_id); setCompanyForm({ name: company.name }); }} type="button">수정</button>
                    </td>
                    <td>
                      <button className="button ghost small" onClick={() => void handleDelete('company', company.company_id)} type="button">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <p className="panel-kicker">플릿</p>
            <h2>플릿 배정</h2>
          </div>
          <form className="stack" onSubmit={handleFleetSubmit}>
            <label className="field">
              <span>회사 ID</span>
              <select
                onChange={(event) => setFleetForm((current) => ({ ...current, company_id: event.target.value }))}
                value={fleetForm.company_id}
              >
                {companies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>{company.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>이름</span>
              <input
                onChange={(event) => setFleetForm((current) => ({ ...current, name: event.target.value }))}
                value={fleetForm.name}
              />
            </label>
            <div className="form-actions">
              <button className="button primary" type="submit">
                {editingFleetId ? '플릿 수정' : '플릿 생성'}
              </button>
              <button className="button ghost" onClick={() => { setEditingFleetId(null); setFleetForm({ company_id: companies[0]?.company_id ?? '', name: '' }); }} type="button">
                초기화
              </button>
            </div>
          </form>
          {isLoading ? <p className="empty-state">플릿을 불러오는 중입니다...</p> : (
            <table className="table compact">
              <tbody>
                {fleets.map((fleet) => (
                  <tr key={fleet.fleet_id}>
                    <td>{fleet.name}</td>
                    <td>
                      <button className="button ghost small" onClick={() => { setEditingFleetId(fleet.fleet_id); setFleetForm({ company_id: fleet.company_id, name: fleet.name }); }} type="button">수정</button>
                    </td>
                    <td>
                      <button className="button ghost small" onClick={() => void handleDelete('fleet', fleet.fleet_id)} type="button">삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
