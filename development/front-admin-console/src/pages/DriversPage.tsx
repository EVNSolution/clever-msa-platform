import { useEffect, useState, type FormEvent } from 'react';

import { listAccounts } from '../api/accounts';
import { createDriver, deleteDriver, listDrivers, updateDriver, type DriverPayload } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { AccountSummary, Company, DriverProfile, Fleet } from '../types';

type DriversPageProps = {
  account: AccountSummary;
  client: HttpClient;
};

function createEmptyForm(
  currentAccountId: string,
  accounts: AccountSummary[],
  companies: Company[],
  fleets: Fleet[],
): DriverPayload {
  const defaultCompanyId = companies[0]?.company_id ?? '';
  const fleetOptions = fleets.filter((fleet) => fleet.company_id === defaultCompanyId);
  return {
    account_id: accounts[0]?.account_id ?? currentAccountId,
    company_id: defaultCompanyId,
    fleet_id: fleetOptions[0]?.fleet_id ?? fleets[0]?.fleet_id ?? '',
    name: '',
    ev_id: '',
    phone_number: '',
    address: '',
  };
}

export function DriversPage({ account, client }: DriversPageProps) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [form, setForm] = useState<DriverPayload>(createEmptyForm(account.account_id, [], [], []));
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [driverResponse, accountResponse, companyResponse, fleetResponse] = await Promise.all([
          listDrivers(client),
          listAccounts(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setDrivers(driverResponse);
        setAccounts(accountResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setForm((current) => ({
          ...createEmptyForm(account.account_id, accountResponse, companyResponse, fleetResponse),
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

  function getFleetOptions(companyId: string) {
    return fleets.filter((fleet) => fleet.company_id === companyId);
  }

  function getCompanyName(companyId: string) {
    return companies.find((company) => company.company_id === companyId)?.name ?? '미확인 회사';
  }

  function getFleetName(fleetId: string) {
    return fleets.find((fleet) => fleet.fleet_id === fleetId)?.name ?? '미확인 플릿';
  }

  function handleCompanyChange(companyId: string) {
    const nextFleetId = getFleetOptions(companyId)[0]?.fleet_id ?? '';
    setForm((current) => ({
      ...current,
      company_id: companyId,
      fleet_id: getFleetOptions(companyId).some((fleet) => fleet.fleet_id === current.fleet_id)
        ? current.fleet_id
        : nextFleetId,
    }));
  }

  function resetForm() {
    setEditingDriverId(null);
    setForm(createEmptyForm(account.account_id, accounts, companies, fleets));
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
          <label className="field">
            <span>계정</span>
            <select onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))} value={form.account_id ?? ''}>
              {accounts.map((entry) => (
                <option key={entry.account_id} value={entry.account_id}>
                  {entry.email}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>회사</span>
            <select onChange={(event) => handleCompanyChange(event.target.value)} value={form.company_id}>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>플릿</span>
            <select onChange={(event) => setForm((current) => ({ ...current, fleet_id: event.target.value }))} value={form.fleet_id}>
              {getFleetOptions(form.company_id).map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
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
            <thead><tr><th>이름</th><th>회사</th><th>플릿</th><th /><th /></tr></thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.driver_id}>
                  <td>{driver.name}</td>
                  <td>{getCompanyName(driver.company_id)}</td>
                  <td>{getFleetName(driver.fleet_id)}</td>
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
