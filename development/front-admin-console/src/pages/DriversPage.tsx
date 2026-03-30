import { useEffect, useState, type FormEvent } from 'react';

import { createDriver, deleteDriver, listDrivers, updateDriver, type DriverPayload } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { AccountSummary, Company, DriverProfile, Fleet } from '../types';
import { formatProtectedIdentifier } from '../uiLabels';

type DriversPageProps = {
  account: AccountSummary;
  client: HttpClient;
};

function createEmptyForm(accountId: string, companies: Company[], fleets: Fleet[]): DriverPayload {
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
  const [form, setForm] = useState<DriverPayload>(createEmptyForm(account.account_id, [], []));
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setForm((current) => ({
          ...createEmptyForm(account.account_id, companyResponse, fleetResponse),
          ...current,
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
  }, [account.account_id, client]);

  async function refreshDrivers() {
    const response = await listDrivers(client);
    setDrivers(response);
  }

  function resetForm() {
    setEditingDriverId(null);
    setForm(createEmptyForm(account.account_id, companies, fleets));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (editingDriverId) {
        await updateDriver(client, editingDriverId, form);
      } else {
        await createDriver(client, form);
      }
      await refreshDrivers();
      resetForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDelete(driverId: string) {
    setErrorMessage(null);
    try {
      await deleteDriver(client, driverId);
      await refreshDrivers();
      if (editingDriverId === driverId) {
        resetForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="data-grid two-columns wide-left">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">배송원 관리</p>
          <h2>{editingDriverId ? '배송원 수정' : '배송원 생성'}</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field"><span>계정 ID</span><input onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))} value={form.account_id ?? ''} /></label>
          <label className="field"><span>회사 ID</span><input onChange={(event) => setForm((current) => ({ ...current, company_id: event.target.value }))} value={form.company_id} /></label>
          <label className="field"><span>플릿 ID</span><input onChange={(event) => setForm((current) => ({ ...current, fleet_id: event.target.value }))} value={form.fleet_id} /></label>
          <label className="field"><span>이름</span><input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} /></label>
          <label className="field"><span>EV ID</span><input onChange={(event) => setForm((current) => ({ ...current, ev_id: event.target.value }))} value={form.ev_id} /></label>
          <label className="field"><span>연락처</span><input onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))} value={form.phone_number} /></label>
          <label className="field"><span>주소</span><input onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} value={form.address} /></label>
          <div className="form-actions">
            <button className="button primary" type="submit">{editingDriverId ? '배송원 수정' : '배송원 생성'}</button>
            <button className="button ghost" onClick={resetForm} type="button">초기화</button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">현재 배송원</p>
          <h2>Driver Profile HR 관리자 CRUD</h2>
        </div>
        {isLoading ? <p className="empty-state">배송원을 불러오는 중입니다...</p> : (
          <table className="table compact">
            <thead><tr><th>배송원</th><th>이름</th><th>EV ID</th><th /><th /></tr></thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.driver_id}>
                  <td><code>{formatProtectedIdentifier(driver.driver_id)}</code></td>
                  <td>{driver.name}</td>
                  <td>{formatProtectedIdentifier(driver.ev_id)}</td>
                  <td><button className="button ghost small" onClick={() => { setEditingDriverId(driver.driver_id); setForm({ account_id: driver.account_id ?? '', company_id: driver.company_id, fleet_id: driver.fleet_id, name: driver.name, ev_id: driver.ev_id, phone_number: driver.phone_number, address: driver.address }); }} type="button">수정</button></td>
                  <td><button className="button ghost small" onClick={() => void handleDelete(driver.driver_id)} type="button">삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
