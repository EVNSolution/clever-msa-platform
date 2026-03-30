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
import {
  formatAccessStatusLabel,
  formatLifecycleStatusLabel,
  formatProtectedIdentifier,
} from '../uiLabels';

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
          <p className="panel-kicker">차량 마스터 관리</p>
          <h2>{editingVehicleId ? '차량 마스터 수정' : '차량 마스터 생성'}</h2>
        </div>
        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
        <form className="form-grid" onSubmit={handleVehicleMasterSubmit}>
          <label className="field">
            <span>제조사 회사 ID</span>
            <input
              onChange={(event) =>
                setMasterForm((current) => ({ ...current, manufacturer_company_id: event.target.value }))
              }
              value={masterForm.manufacturer_company_id}
            />
          </label>
          <label className="field">
            <span>번호판</span>
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
            <span>제조사 차량 코드</span>
            <input
              onChange={(event) =>
                setMasterForm((current) => ({ ...current, manufacturer_vehicle_code: event.target.value }))
              }
              value={masterForm.manufacturer_vehicle_code}
            />
          </label>
          <label className="field">
            <span>모델명</span>
            <input
              onChange={(event) => setMasterForm((current) => ({ ...current, model_name: event.target.value }))}
              value={masterForm.model_name}
            />
          </label>
          <label className="field">
            <span>차량 상태</span>
            <select
              onChange={(event) => setMasterForm((current) => ({ ...current, vehicle_status: event.target.value }))}
              value={masterForm.vehicle_status}
            >
              <option value="active">운영</option>
              <option value="inactive">중지</option>
              <option value="retired">퇴역</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingVehicleId ? '차량 마스터 수정' : '차량 마스터 생성'}
            </button>
            <button className="button ghost" onClick={resetVehicleMasterForm} type="button">
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">차량 마스터 레지스트리</p>
          <h2>차량 마스터 목록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">차량 마스터를 불러오는 중입니다...</p>
        ) : errorMessage ? null : vehicleMasters.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>차량</th>
                <th>번호판</th>
                <th>제조사</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vehicleMasters.map((vehicleMaster) => (
                <tr key={vehicleMaster.vehicle_id}>
                  <td><code>{formatProtectedIdentifier(vehicleMaster.vehicle_id)}</code></td>
                  <td>{vehicleMaster.plate_number}</td>
                  <td><code>{formatProtectedIdentifier(vehicleMaster.manufacturer_company_id)}</code></td>
                  <td>{formatLifecycleStatusLabel(vehicleMaster.vehicle_status)}</td>
                  <td>
                    <button
                      className="button ghost small"
                      onClick={() => handleEditVehicleMaster(vehicleMaster)}
                      type="button"
                    >
                      마스터 수정
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 차량 마스터가 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">운영사 접근 관리</p>
          <h2>운영사 접근 생성</h2>
        </div>
        <form className="form-grid" onSubmit={handleOperatorAccessSubmit}>
          <label className="field">
            <span>접근 차량 ID</span>
            <input
              onChange={(event) => setAccessForm((current) => ({ ...current, vehicle_id: event.target.value }))}
              value={accessForm.vehicle_id}
            />
          </label>
          <label className="field">
            <span>운영사 회사 ID</span>
            <input
              onChange={(event) =>
                setAccessForm((current) => ({ ...current, operator_company_id: event.target.value }))
              }
              value={accessForm.operator_company_id}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              운영사 접근 생성
            </button>
            <button className="button ghost" onClick={resetOperatorAccessForm} type="button">
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">운영사 접근 레지스트리</p>
          <h2>운영사 접근 목록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">운영사 접근 정보를 불러오는 중입니다...</p>
        ) : errorMessage ? null : vehicleOperatorAccesses.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>차량</th>
                <th>운영사</th>
                <th>상태</th>
                <th>시작</th>
                <th>종료</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {vehicleOperatorAccesses.map((vehicleOperatorAccess) => (
                <tr key={vehicleOperatorAccess.vehicle_operator_access_id}>
                  <td><code>{formatProtectedIdentifier(vehicleOperatorAccess.vehicle_id)}</code></td>
                  <td><code>{formatProtectedIdentifier(vehicleOperatorAccess.operator_company_id)}</code></td>
                  <td>{formatAccessStatusLabel(vehicleOperatorAccess.access_status)}</td>
                  <td>{vehicleOperatorAccess.started_at}</td>
                  <td>{vehicleOperatorAccess.ended_at ?? '-'}</td>
                  <td>
                    {vehicleOperatorAccess.access_status === 'active' ? (
                      <button
                        className="button ghost small"
                        onClick={() => void handleEndAccess(vehicleOperatorAccess.vehicle_operator_access_id)}
                        type="button"
                      >
                        접근 종료
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">등록된 운영사 접근 정보가 없습니다.</p>
        )}
      </section>
    </div>
  );
}
