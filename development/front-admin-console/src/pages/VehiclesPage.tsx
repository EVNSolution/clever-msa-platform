import { useEffect, useState, type FormEvent } from 'react';

import {
  createVehicleMaster,
  createVehicleOperatorAccess,
  listVehicleMasters,
  listVehicleOperatorAccesses,
  updateVehicleMaster,
  updateVehicleOperatorAccess,
  type VehicleMasterPayload,
  type VehicleOperatorAccessPayload,
} from '../api/vehicles';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { VehicleMaster, VehicleOperatorAccess } from '../types';

type VehiclesPageProps = {
  client: HttpClient;
};

type VehicleMasterFormState = {
  manufacturer_company_id: string;
  plate_number: string;
  vin: string;
  manufacturer_vehicle_code: string;
  model_name: string;
  vehicle_status: string;
};

type OperatorAccessFormState = {
  vehicle_id: string;
  operator_company_id: string;
};

function createEmptyVehicleMasterForm(): VehicleMasterFormState {
  return {
    manufacturer_company_id: '',
    plate_number: '',
    vin: '',
    manufacturer_vehicle_code: '',
    model_name: '',
    vehicle_status: 'active',
  };
}

function createEmptyOperatorAccessForm(): OperatorAccessFormState {
  return {
    vehicle_id: '',
    operator_company_id: '',
  };
}

function createTimestamp() {
  return new Date().toISOString();
}

function toVehicleMasterPayload(form: VehicleMasterFormState): VehicleMasterPayload {
  return {
    manufacturer_company_id: form.manufacturer_company_id.trim(),
    plate_number: form.plate_number.trim(),
    vin: form.vin.trim(),
    manufacturer_vehicle_code: form.manufacturer_vehicle_code.trim() || null,
    model_name: form.model_name.trim(),
    vehicle_status: form.vehicle_status,
  };
}

function toOperatorAccessPayload(form: OperatorAccessFormState): VehicleOperatorAccessPayload {
  return {
    vehicle_id: form.vehicle_id.trim(),
    operator_company_id: form.operator_company_id.trim(),
    access_status: 'active',
    started_at: createTimestamp(),
    ended_at: null,
  };
}

export function VehiclesPage({ client }: VehiclesPageProps) {
  const [vehicleMasters, setVehicleMasters] = useState<VehicleMaster[]>([]);
  const [vehicleOperatorAccesses, setVehicleOperatorAccesses] = useState<VehicleOperatorAccess[]>([]);
  const [masterForm, setMasterForm] = useState<VehicleMasterFormState>(createEmptyVehicleMasterForm());
  const [accessForm, setAccessForm] = useState<OperatorAccessFormState>(createEmptyOperatorAccessForm());
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshData() {
    const [masters, accesses] = await Promise.all([
      listVehicleMasters(client),
      listVehicleOperatorAccesses(client),
    ]);
    setVehicleMasters(masters);
    setVehicleOperatorAccesses(accesses);
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [masters, accesses] = await Promise.all([
          listVehicleMasters(client),
          listVehicleOperatorAccesses(client),
        ]);
        if (!ignore) {
          setVehicleMasters(masters);
          setVehicleOperatorAccesses(accesses);
        }
      } catch (error) {
        if (!ignore) {
          setVehicleMasters([]);
          setVehicleOperatorAccesses([]);
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

  function resetVehicleMasterForm() {
    setEditingVehicleId(null);
    setMasterForm(createEmptyVehicleMasterForm());
  }

  function resetOperatorAccessForm() {
    setAccessForm(createEmptyOperatorAccessForm());
  }

  function handleEditVehicleMaster(vehicleMaster: VehicleMaster) {
    setErrorMessage(null);
    setEditingVehicleId(vehicleMaster.vehicle_id);
    setMasterForm({
      manufacturer_company_id: vehicleMaster.manufacturer_company_id,
      plate_number: vehicleMaster.plate_number,
      vin: vehicleMaster.vin,
      manufacturer_vehicle_code: vehicleMaster.manufacturer_vehicle_code ?? '',
      model_name: vehicleMaster.model_name,
      vehicle_status: vehicleMaster.vehicle_status,
    });
  }

  async function handleVehicleMasterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const payload = toVehicleMasterPayload(masterForm);
      if (editingVehicleId) {
        await updateVehicleMaster(client, editingVehicleId, payload);
      } else {
        await createVehicleMaster(client, payload);
      }
      await refreshData();
      resetVehicleMasterForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleOperatorAccessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      await createVehicleOperatorAccess(client, toOperatorAccessPayload(accessForm));
      await refreshData();
      resetOperatorAccessForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleEndAccess(vehicleOperatorAccessId: string) {
    setErrorMessage(null);
    try {
      await updateVehicleOperatorAccess(client, vehicleOperatorAccessId, {
        access_status: 'ended',
        ended_at: createTimestamp(),
      });
      await refreshData();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="data-grid two-columns wide-left">
      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Vehicle Master Admin</p>
          <h2>{editingVehicleId ? 'Update vehicle master' : 'Create vehicle master'}</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleVehicleMasterSubmit}>
          <label className="field">
            <span>Manufacturer Company ID</span>
            <input
              onChange={(event) =>
                setMasterForm((current) => ({ ...current, manufacturer_company_id: event.target.value }))
              }
              value={masterForm.manufacturer_company_id}
            />
          </label>
          <label className="field">
            <span>Plate Number</span>
            <input
              onChange={(event) => setMasterForm((current) => ({ ...current, plate_number: event.target.value }))}
              value={masterForm.plate_number}
            />
          </label>
          <label className="field">
            <span>VIN</span>
            <input
              onChange={(event) => setMasterForm((current) => ({ ...current, vin: event.target.value }))}
              value={masterForm.vin}
            />
          </label>
          <label className="field">
            <span>Manufacturer Vehicle Code</span>
            <input
              onChange={(event) =>
                setMasterForm((current) => ({ ...current, manufacturer_vehicle_code: event.target.value }))
              }
              value={masterForm.manufacturer_vehicle_code}
            />
          </label>
          <label className="field">
            <span>Model Name</span>
            <input
              onChange={(event) => setMasterForm((current) => ({ ...current, model_name: event.target.value }))}
              value={masterForm.model_name}
            />
          </label>
          <label className="field">
            <span>Vehicle Status</span>
            <select
              onChange={(event) => setMasterForm((current) => ({ ...current, vehicle_status: event.target.value }))}
              value={masterForm.vehicle_status}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
              <option value="retired">retired</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingVehicleId ? 'Update vehicle master' : 'Create vehicle master'}
            </button>
            <button className="button ghost" onClick={resetVehicleMasterForm} type="button">
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Vehicle Master Registry</p>
          <h2>Vehicle master registry</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">Loading vehicle masters...</p>
        ) : errorMessage ? null : vehicleMasters.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Plate Number</th>
                <th>Manufacturer</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vehicleMasters.map((vehicleMaster) => (
                <tr key={vehicleMaster.vehicle_id}>
                  <td><code>{vehicleMaster.vehicle_id}</code></td>
                  <td>{vehicleMaster.plate_number}</td>
                  <td><code>{vehicleMaster.manufacturer_company_id}</code></td>
                  <td>{vehicleMaster.vehicle_status}</td>
                  <td>
                    <button
                      className="button ghost small"
                      onClick={() => handleEditVehicleMaster(vehicleMaster)}
                      type="button"
                    >
                      Edit master
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No vehicle masters yet.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Operator Access Admin</p>
          <h2>Create operator access</h2>
        </div>
        <form className="form-grid" onSubmit={handleOperatorAccessSubmit}>
          <label className="field">
            <span>Access Vehicle ID</span>
            <input
              onChange={(event) => setAccessForm((current) => ({ ...current, vehicle_id: event.target.value }))}
              value={accessForm.vehicle_id}
            />
          </label>
          <label className="field">
            <span>Operator Company ID</span>
            <input
              onChange={(event) =>
                setAccessForm((current) => ({ ...current, operator_company_id: event.target.value }))
              }
              value={accessForm.operator_company_id}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              Create operator access
            </button>
            <button className="button ghost" onClick={resetOperatorAccessForm} type="button">
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Operator Access Registry</p>
          <h2>Operator access registry</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">Loading operator access...</p>
        ) : errorMessage ? null : vehicleOperatorAccesses.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Operator Company</th>
                <th>Status</th>
                <th>Started</th>
                <th>Ended</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vehicleOperatorAccesses.map((vehicleOperatorAccess) => (
                <tr key={vehicleOperatorAccess.vehicle_operator_access_id}>
                  <td><code>{vehicleOperatorAccess.vehicle_id}</code></td>
                  <td><code>{vehicleOperatorAccess.operator_company_id}</code></td>
                  <td>{vehicleOperatorAccess.access_status}</td>
                  <td>{vehicleOperatorAccess.started_at}</td>
                  <td>{vehicleOperatorAccess.ended_at ?? '-'}</td>
                  <td>
                    {vehicleOperatorAccess.access_status === 'active' ? (
                      <button
                        className="button ghost small"
                        onClick={() => void handleEndAccess(vehicleOperatorAccess.vehicle_operator_access_id)}
                        type="button"
                      >
                        End access
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">No operator access yet.</p>
        )}
      </section>
    </div>
  );
}
