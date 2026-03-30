import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { createDriver, listDrivers, updateDriver, type DriverPayload } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { AccountSummary, Company, DriverProfile, Fleet } from '../types';
type DriversPageProps = {
  account: AccountSummary;
  client: HttpClient;
};

type DriverFormState = DriverPayload;

function createEmptyForm(accountId: string, companies: Company[], fleets: Fleet[]): DriverFormState {
  return {
    account_id: accountId,
    company_id: companies[0]?.company_id ?? '',
    fleet_id: fleets[0]?.fleet_id ?? '',
    name: '',
    ev_id: '',
    phone_number: '',
    address: '',
  };
}

export function DriversPage({ account, client }: DriversPageProps) {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [form, setForm] = useState<DriverFormState>(createEmptyForm(account.account_id, [], []));
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [driverResponse, companyResponse, fleetResponse] = await Promise.all([
          listDrivers(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setDrivers(driverResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setForm((current) => {
          const seeded = createEmptyForm(account.account_id, companyResponse, fleetResponse);
          return {
            ...seeded,
            ...current,
            account_id: current.account_id || seeded.account_id,
            company_id: current.company_id || seeded.company_id,
            fleet_id: current.fleet_id || seeded.fleet_id,
          };
        });
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
  }, [account.account_id, client]);

  function handleFieldChange(field: keyof DriverFormState, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleEdit(driver: DriverProfile) {
    setEditingDriverId(driver.driver_id);
    setForm({
      account_id: driver.account_id ?? '',
      company_id: driver.company_id,
      fleet_id: driver.fleet_id,
      name: driver.name,
      ev_id: driver.ev_id,
      phone_number: driver.phone_number,
      address: driver.address,
    });
  }

  function handleReset() {
    setEditingDriverId(null);
    setForm(createEmptyForm(account.account_id, companies, fleets));
  }

  async function refreshDrivers() {
    const response = await listDrivers(client);
    setDrivers(response);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      if (editingDriverId) {
        await updateDriver(client, editingDriverId, form);
      } else {
        await createDriver(client, form);
      }
      await refreshDrivers();
      handleReset();
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
          <p className="panel-kicker">배송원 등록</p>
          <h2>{editingDriverId ? '배송원 프로필 수정' : '배송원 프로필 생성'}</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>계정 ID</span>
            <input
              onChange={(event) => handleFieldChange('account_id', event.target.value)}
              value={form.account_id ?? ''}
            />
          </label>
          <label className="field">
            <span>회사 ID</span>
            <input
              onChange={(event) => handleFieldChange('company_id', event.target.value)}
              value={form.company_id}
            />
          </label>
          <label className="field">
            <span>플릿 ID</span>
            <input
              onChange={(event) => handleFieldChange('fleet_id', event.target.value)}
              value={form.fleet_id}
            />
          </label>
          <label className="field">
            <span>이름</span>
            <input
              onChange={(event) => handleFieldChange('name', event.target.value)}
              value={form.name}
            />
          </label>
          <label className="field">
            <span>EV ID</span>
            <input
              onChange={(event) => handleFieldChange('ev_id', event.target.value)}
              value={form.ev_id}
            />
          </label>
          <label className="field">
            <span>연락처</span>
            <input
              onChange={(event) => handleFieldChange('phone_number', event.target.value)}
              value={form.phone_number}
            />
          </label>
          <label className="field">
            <span>주소</span>
            <input
              onChange={(event) => handleFieldChange('address', event.target.value)}
              value={form.address}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" disabled={isSaving} type="submit">
              {isSaving ? '저장 중...' : editingDriverId ? '배송원 수정' : '배송원 생성'}
            </button>
            <button className="button ghost" onClick={handleReset} type="button">
              초기화
            </button>
          </div>
        </form>
        <div className="reference-strip">
          <span className="chip">회사: {companies.length}</span>
          <span className="chip">플릿: {fleets.length}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">현재 프로필</p>
          <h2>Driver Profile HR 정본 데이터</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">배송원을 불러오는 중입니다...</p>
        ) : drivers.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>이름</th>
                <th>연락처</th>
                <th>계정 연결</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.driver_id}>
                  <td>{driver.name}</td>
                  <td>{driver.phone_number}</td>
                  <td>{driver.account_id ? '연결됨' : '미연결'}</td>
                  <td>
                    <Link className="button ghost small" to={`/drivers/${driver.driver_id}`}>
                      보기
                    </Link>
                    <button className="button ghost small" onClick={() => handleEdit(driver)} type="button">
                      수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 배송원이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
