import { useEffect, useState, type FormEvent } from 'react';

import { createDriver, deleteDriver, listDrivers, updateDriver, type DriverPayload } from '../api/drivers';
import { listCompanies, listFleets } from '../api/organization';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { AccountSummary, Company, DriverProfile, Fleet } from '../types';

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
          <p className="panel-kicker">Driver Admin</p>
          <h2>{editingDriverId ? 'Update driver' : 'Create driver'}</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field"><span>Account ID</span><input onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))} value={form.account_id ?? ''} /></label>
          <label className="field"><span>Company ID</span><input onChange={(event) => setForm((current) => ({ ...current, company_id: event.target.value }))} value={form.company_id} /></label>
          <label className="field"><span>Fleet ID</span><input onChange={(event) => setForm((current) => ({ ...current, fleet_id: event.target.value }))} value={form.fleet_id} /></label>
          <label className="field"><span>Name</span><input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} /></label>
          <label className="field"><span>EV ID</span><input onChange={(event) => setForm((current) => ({ ...current, ev_id: event.target.value }))} value={form.ev_id} /></label>
          <label className="field"><span>Phone Number</span><input onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))} value={form.phone_number} /></label>
          <label className="field"><span>Address</span><input onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} value={form.address} /></label>
          <div className="form-actions">
            <button className="button primary" type="submit">{editingDriverId ? 'Update driver' : 'Create driver'}</button>
            <button className="button ghost" onClick={resetForm} type="button">Reset</button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Current Drivers</p>
          <h2>Admin CRUD over Driver Profile HR</h2>
        </div>
        {isLoading ? <p className="empty-state">Loading drivers...</p> : (
          <table className="table compact">
            <thead><tr><th>Driver</th><th>Name</th><th>EV ID</th><th /><th /></tr></thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.driver_id}>
                  <td><code>{driver.driver_id}</code></td>
                  <td>{driver.name}</td>
                  <td>{driver.ev_id}</td>
                  <td><button className="button ghost small" onClick={() => { setEditingDriverId(driver.driver_id); setForm({ account_id: driver.account_id ?? '', company_id: driver.company_id, fleet_id: driver.fleet_id, name: driver.name, ev_id: driver.ev_id, phone_number: driver.phone_number, address: driver.address }); }} type="button">Edit</button></td>
                  <td><button className="button ghost small" onClick={() => void handleDelete(driver.driver_id)} type="button">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
