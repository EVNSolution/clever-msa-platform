import { useEffect, useState, type FormEvent } from 'react';

import { listDrivers } from '../api/drivers';
import {
  createDailyDeliveryInputSnapshot,
  createDeliveryRecord,
  deleteDailyDeliveryInputSnapshot,
  deleteDeliveryRecord,
  listDailyDeliveryInputSnapshots,
  listDeliveryRecords,
  updateDailyDeliveryInputSnapshot,
  updateDeliveryRecord,
  type DailyDeliveryInputSnapshotPayload,
  type DeliveryRecordPayload,
} from '../api/deliveryRecords';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import type {
  Company,
  DailyDeliveryInputSnapshot,
  DeliveryRecord,
  DriverProfile,
  Fleet,
} from '../types';
import {
  formatDeliveryRecordStatusLabel,
  formatDeliverySnapshotStatusLabel,
} from '../uiLabels';
import {
  getCompanyName,
  getDriverName,
  getFleetName,
  getFleetOptions,
  parseJsonInput,
  stringifyJson,
} from './settlementAdminHelpers';

type SettlementInputsPageProps = {
  client: HttpClient;
};

const DEFAULT_RECORD_FORM = {
  company_id: '',
  fleet_id: '',
  driver_id: '',
  service_date: '2026-03-30',
  source_reference: '',
  delivery_count: '0',
  distance_km: '0.00',
  base_amount: '0.00',
  status: 'draft',
  payload_text: '{\n  "note": ""\n}',
};

const DEFAULT_SNAPSHOT_FORM = {
  company_id: '',
  fleet_id: '',
  driver_id: '',
  service_date: '2026-03-30',
  delivery_count: '0',
  total_distance_km: '0.00',
  total_base_amount: '0.00',
  source_record_count: '0',
  status: 'active',
};

export function SettlementInputsPage({ client }: SettlementInputsPageProps) {
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [snapshots, setSnapshots] = useState<DailyDeliveryInputSnapshot[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [recordForm, setRecordForm] = useState(DEFAULT_RECORD_FORM);
  const [snapshotForm, setSnapshotForm] = useState(DEFAULT_SNAPSHOT_FORM);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  function getDriverOptions(companyId: string, fleetId: string) {
    return drivers.filter((driver) => driver.company_id === companyId && driver.fleet_id === fleetId);
  }

  async function loadAll() {
    const [recordResponse, snapshotResponse, companyResponse, fleetResponse, driverResponse] = await Promise.all([
      listDeliveryRecords(client),
      listDailyDeliveryInputSnapshots(client),
      listCompanies(client),
      listFleets(client),
      listDrivers(client),
    ]);

    setRecords(recordResponse);
    setSnapshots(snapshotResponse);
    setCompanies(companyResponse);
    setFleets(fleetResponse);
    setDrivers(driverResponse);

    setRecordForm((current) => {
      const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
      const nextFleetId =
        getFleetOptions(fleetResponse, nextCompanyId).find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ??
        getFleetOptions(fleetResponse, nextCompanyId)[0]?.fleet_id ??
        fleetResponse[0]?.fleet_id ??
        '';
      const nextDriverId =
        driverResponse.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
        getDriverOptionsFromList(driverResponse, nextCompanyId, nextFleetId)[0]?.driver_id ??
        driverResponse[0]?.driver_id ??
        '';

      return {
        ...current,
        company_id: nextCompanyId,
        fleet_id: nextFleetId,
        driver_id: nextDriverId,
      };
    });

    setSnapshotForm((current) => {
      const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
      const nextFleetId =
        getFleetOptions(fleetResponse, nextCompanyId).find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ??
        getFleetOptions(fleetResponse, nextCompanyId)[0]?.fleet_id ??
        fleetResponse[0]?.fleet_id ??
        '';
      const nextDriverId =
        driverResponse.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
        getDriverOptionsFromList(driverResponse, nextCompanyId, nextFleetId)[0]?.driver_id ??
        driverResponse[0]?.driver_id ??
        '';

      return {
        ...current,
        company_id: nextCompanyId,
        fleet_id: nextFleetId,
        driver_id: nextDriverId,
      };
    });
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [recordResponse, snapshotResponse, companyResponse, fleetResponse, driverResponse] = await Promise.all([
          listDeliveryRecords(client),
          listDailyDeliveryInputSnapshots(client),
          listCompanies(client),
          listFleets(client),
          listDrivers(client),
        ]);

        if (ignore) {
          return;
        }

        setRecords(recordResponse);
        setSnapshots(snapshotResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setDrivers(driverResponse);
        setRecordForm((current) => {
          const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
          const nextFleetId =
            getFleetOptions(fleetResponse, nextCompanyId).find((fleet) => fleet.fleet_id === current.fleet_id)
              ?.fleet_id ??
            getFleetOptions(fleetResponse, nextCompanyId)[0]?.fleet_id ??
            fleetResponse[0]?.fleet_id ??
            '';
          const nextDriverId =
            driverResponse.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
            getDriverOptionsFromList(driverResponse, nextCompanyId, nextFleetId)[0]?.driver_id ??
            driverResponse[0]?.driver_id ??
            '';

          return {
            ...current,
            company_id: nextCompanyId,
            fleet_id: nextFleetId,
            driver_id: nextDriverId,
          };
        });
        setSnapshotForm((current) => {
          const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
          const nextFleetId =
            getFleetOptions(fleetResponse, nextCompanyId).find((fleet) => fleet.fleet_id === current.fleet_id)
              ?.fleet_id ??
            getFleetOptions(fleetResponse, nextCompanyId)[0]?.fleet_id ??
            fleetResponse[0]?.fleet_id ??
            '';
          const nextDriverId =
            driverResponse.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
            getDriverOptionsFromList(driverResponse, nextCompanyId, nextFleetId)[0]?.driver_id ??
            driverResponse[0]?.driver_id ??
            '';

          return {
            ...current,
            company_id: nextCompanyId,
            fleet_id: nextFleetId,
            driver_id: nextDriverId,
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
  }, [client]);

  function getDriverOptionsFromList(driverList: DriverProfile[], companyId: string, fleetId: string) {
    return driverList.filter((driver) => driver.company_id === companyId && driver.fleet_id === fleetId);
  }

  function resetRecordForm() {
    const companyId = companies[0]?.company_id ?? '';
    const fleetId = getFleetOptions(fleets, companyId)[0]?.fleet_id ?? fleets[0]?.fleet_id ?? '';
    setEditingRecordId(null);
    setRecordForm({
      ...DEFAULT_RECORD_FORM,
      company_id: companyId,
      fleet_id: fleetId,
      driver_id: getDriverOptions(companyId, fleetId)[0]?.driver_id ?? drivers[0]?.driver_id ?? '',
    });
  }

  function resetSnapshotForm() {
    const companyId = companies[0]?.company_id ?? '';
    const fleetId = getFleetOptions(fleets, companyId)[0]?.fleet_id ?? fleets[0]?.fleet_id ?? '';
    setEditingSnapshotId(null);
    setSnapshotForm({
      ...DEFAULT_SNAPSHOT_FORM,
      company_id: companyId,
      fleet_id: fleetId,
      driver_id: getDriverOptions(companyId, fleetId)[0]?.driver_id ?? drivers[0]?.driver_id ?? '',
    });
  }

  function handleRecordCompanyChange(companyId: string) {
    const fleetId = getFleetOptions(fleets, companyId)[0]?.fleet_id ?? '';
    setRecordForm((current) => ({
      ...current,
      company_id: companyId,
      fleet_id: fleetId,
      driver_id: getDriverOptions(companyId, fleetId)[0]?.driver_id ?? '',
    }));
  }

  function handleRecordFleetChange(fleetId: string) {
    setRecordForm((current) => ({
      ...current,
      fleet_id: fleetId,
      driver_id: getDriverOptions(current.company_id, fleetId)[0]?.driver_id ?? '',
    }));
  }

  function handleSnapshotCompanyChange(companyId: string) {
    const fleetId = getFleetOptions(fleets, companyId)[0]?.fleet_id ?? '';
    setSnapshotForm((current) => ({
      ...current,
      company_id: companyId,
      fleet_id: fleetId,
      driver_id: getDriverOptions(companyId, fleetId)[0]?.driver_id ?? '',
    }));
  }

  function handleSnapshotFleetChange(fleetId: string) {
    setSnapshotForm((current) => ({
      ...current,
      fleet_id: fleetId,
      driver_id: getDriverOptions(current.company_id, fleetId)[0]?.driver_id ?? '',
    }));
  }

  async function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const payload: DeliveryRecordPayload = {
        company_id: recordForm.company_id,
        fleet_id: recordForm.fleet_id,
        driver_id: recordForm.driver_id,
        service_date: recordForm.service_date,
        source_reference: recordForm.source_reference,
        delivery_count: Number.parseInt(recordForm.delivery_count, 10),
        distance_km: recordForm.distance_km,
        base_amount: recordForm.base_amount,
        status: recordForm.status,
        payload: parseJsonInput(recordForm.payload_text),
      };

      if (editingRecordId) {
        await updateDeliveryRecord(client, editingRecordId, payload);
      } else {
        await createDeliveryRecord(client, payload);
      }
      await loadAll();
      resetRecordForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleSnapshotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const payload: DailyDeliveryInputSnapshotPayload = {
        company_id: snapshotForm.company_id,
        fleet_id: snapshotForm.fleet_id,
        driver_id: snapshotForm.driver_id,
        service_date: snapshotForm.service_date,
        delivery_count: Number.parseInt(snapshotForm.delivery_count, 10),
        total_distance_km: snapshotForm.total_distance_km,
        total_base_amount: snapshotForm.total_base_amount,
        source_record_count: Number.parseInt(snapshotForm.source_record_count, 10),
        status: snapshotForm.status,
      };

      if (editingSnapshotId) {
        await updateDailyDeliveryInputSnapshot(client, editingSnapshotId, payload);
      } else {
        await createDailyDeliveryInputSnapshot(client, payload);
      }
      await loadAll();
      resetSnapshotForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleRecordDelete(deliveryRecordId: string) {
    setErrorMessage(null);
    try {
      await deleteDeliveryRecord(client, deliveryRecordId);
      await loadAll();
      if (editingRecordId === deliveryRecordId) {
        resetRecordForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleSnapshotDelete(snapshotId: string) {
    setErrorMessage(null);
    try {
      await deleteDailyDeliveryInputSnapshot(client, snapshotId);
      await loadAll();
      if (editingSnapshotId === snapshotId) {
        resetSnapshotForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function selectRecord(record: DeliveryRecord) {
    setEditingRecordId(record.delivery_record_id);
    setRecordForm({
      company_id: record.company_id,
      fleet_id: record.fleet_id,
      driver_id: record.driver_id,
      service_date: record.service_date,
      source_reference: record.source_reference,
      delivery_count: String(record.delivery_count),
      distance_km: record.distance_km,
      base_amount: record.base_amount,
      status: record.status,
      payload_text: stringifyJson(record.payload),
    });
  }

  function selectSnapshot(snapshot: DailyDeliveryInputSnapshot) {
    setEditingSnapshotId(snapshot.daily_delivery_input_snapshot_id);
    setSnapshotForm({
      company_id: snapshot.company_id,
      fleet_id: snapshot.fleet_id,
      driver_id: snapshot.driver_id,
      service_date: snapshot.service_date,
      delivery_count: String(snapshot.delivery_count),
      total_distance_km: snapshot.total_distance_km,
      total_base_amount: snapshot.total_base_amount,
      source_record_count: String(snapshot.source_record_count),
      status: snapshot.status,
    });
  }

  function handleRecordRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, record: DeliveryRecord) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectRecord(record);
  }

  function handleSnapshotRowKeyDown(
    event: React.KeyboardEvent<HTMLTableRowElement>,
    snapshot: DailyDeliveryInputSnapshot,
  ) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectSnapshot(snapshot);
  }

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 입력</p>
          <h2>배송이력 입력 요약</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 입력을 불러오는 중입니다...</p>
        ) : (
          <div className="metric-grid">
            <article className="metric-card">
              <span className="panel-kicker">Record</span>
              <strong>{records.length}</strong>
              <span className="empty-state">배송 원천 record 수</span>
            </article>
            <article className="metric-card">
              <span className="panel-kicker">Snapshot</span>
              <strong>{snapshots.length}</strong>
              <span className="empty-state">일별 snapshot 수</span>
            </article>
            <article className="metric-card">
              <span className="panel-kicker">Driver</span>
              <strong>{drivers.length}</strong>
              <span className="empty-state">연결 가능한 배송원 수</span>
            </article>
          </div>
        )}
      </section>

      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">Delivery Record</p>
          <h2>{editingRecordId ? '배송 원천 입력 수정' : '배송 원천 입력 생성'}</h2>
        </div>
        <form className="form-stack" onSubmit={handleRecordSubmit}>
          <label className="field">
            <span>회사</span>
            <select onChange={(event) => handleRecordCompanyChange(event.target.value)} value={recordForm.company_id}>
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>플릿</span>
            <select onChange={(event) => handleRecordFleetChange(event.target.value)} value={recordForm.fleet_id}>
              {getFleetOptions(fleets, recordForm.company_id).map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>배송원</span>
            <select
              onChange={(event) => setRecordForm((current) => ({ ...current, driver_id: event.target.value }))}
              value={recordForm.driver_id}
            >
              {getDriverOptions(recordForm.company_id, recordForm.fleet_id).map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>서비스 일자</span>
            <input
              onChange={(event) => setRecordForm((current) => ({ ...current, service_date: event.target.value }))}
              type="date"
              value={recordForm.service_date}
            />
          </label>
          <label className="field">
            <span>원천 참조값</span>
            <input
              onChange={(event) => setRecordForm((current) => ({ ...current, source_reference: event.target.value }))}
              value={recordForm.source_reference}
            />
          </label>
          <label className="field">
            <span>배송 건수</span>
            <input
              min="0"
              onChange={(event) => setRecordForm((current) => ({ ...current, delivery_count: event.target.value }))}
              step="1"
              type="number"
              value={recordForm.delivery_count}
            />
          </label>
          <label className="field">
            <span>거리 km</span>
            <input
              min="0"
              onChange={(event) => setRecordForm((current) => ({ ...current, distance_km: event.target.value }))}
              step="0.01"
              type="number"
              value={recordForm.distance_km}
            />
          </label>
          <label className="field">
            <span>기준 금액</span>
            <input
              min="0"
              onChange={(event) => setRecordForm((current) => ({ ...current, base_amount: event.target.value }))}
              step="0.01"
              type="number"
              value={recordForm.base_amount}
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              onChange={(event) => setRecordForm((current) => ({ ...current, status: event.target.value }))}
              value={recordForm.status}
            >
              <option value="draft">초안</option>
              <option value="confirmed">확정</option>
              <option value="void">무효</option>
            </select>
          </label>
          <label className="field">
            <span>payload JSON</span>
            <textarea
              onChange={(event) => setRecordForm((current) => ({ ...current, payload_text: event.target.value }))}
              value={recordForm.payload_text}
            />
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingRecordId ? '원천 입력 수정' : '원천 입력 생성'}
            </button>
            <button className="button ghost" onClick={resetRecordForm} type="button">
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Delivery Record List</p>
          <h2>배송 원천 입력 목록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">배송 원천 입력을 불러오는 중입니다...</p>
        ) : records.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>회사</th>
                <th>플릿</th>
                <th>배송원</th>
                <th>서비스 일자</th>
                <th>건수</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr
                  key={record.delivery_record_id}
                  className={`interactive-row${editingRecordId === record.delivery_record_id ? ' is-selected' : ''}`}
                  onClick={() => selectRecord(record)}
                  onKeyDown={(event) => handleRecordRowKeyDown(event, record)}
                  tabIndex={0}
                >
                  <td>{getCompanyName(companies, record.company_id)}</td>
                  <td>{getFleetName(fleets, record.fleet_id)}</td>
                  <td>{getDriverName(drivers, record.driver_id)}</td>
                  <td>{record.service_date}</td>
                  <td>{record.delivery_count}</td>
                  <td>{formatDeliveryRecordStatusLabel(record.status)}</td>
                  <td>
                    <button
                      className="button ghost small"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleRecordDelete(record.delivery_record_id);
                      }}
                      type="button"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">배송 원천 입력이 없습니다.</p>
        )}
      </section>

      <section className="panel form-panel">
        <div className="panel-header">
          <p className="panel-kicker">Daily Snapshot</p>
          <h2>{editingSnapshotId ? '일별 snapshot 수정' : '일별 snapshot 생성'}</h2>
        </div>
        <form className="form-stack" onSubmit={handleSnapshotSubmit}>
          <label className="field">
            <span>회사</span>
            <select
              onChange={(event) => handleSnapshotCompanyChange(event.target.value)}
              value={snapshotForm.company_id}
            >
              {companies.map((company) => (
                <option key={company.company_id} value={company.company_id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>플릿</span>
            <select
              onChange={(event) => handleSnapshotFleetChange(event.target.value)}
              value={snapshotForm.fleet_id}
            >
              {getFleetOptions(fleets, snapshotForm.company_id).map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>배송원</span>
            <select
              onChange={(event) => setSnapshotForm((current) => ({ ...current, driver_id: event.target.value }))}
              value={snapshotForm.driver_id}
            >
              {getDriverOptions(snapshotForm.company_id, snapshotForm.fleet_id).map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>서비스 일자</span>
            <input
              onChange={(event) => setSnapshotForm((current) => ({ ...current, service_date: event.target.value }))}
              type="date"
              value={snapshotForm.service_date}
            />
          </label>
          <label className="field">
            <span>배송 건수</span>
            <input
              min="0"
              onChange={(event) => setSnapshotForm((current) => ({ ...current, delivery_count: event.target.value }))}
              step="1"
              type="number"
              value={snapshotForm.delivery_count}
            />
          </label>
          <label className="field">
            <span>총 거리 km</span>
            <input
              min="0"
              onChange={(event) =>
                setSnapshotForm((current) => ({ ...current, total_distance_km: event.target.value }))
              }
              step="0.01"
              type="number"
              value={snapshotForm.total_distance_km}
            />
          </label>
          <label className="field">
            <span>총 금액</span>
            <input
              min="0"
              onChange={(event) =>
                setSnapshotForm((current) => ({ ...current, total_base_amount: event.target.value }))
              }
              step="0.01"
              type="number"
              value={snapshotForm.total_base_amount}
            />
          </label>
          <label className="field">
            <span>원천 record 수</span>
            <input
              min="0"
              onChange={(event) =>
                setSnapshotForm((current) => ({ ...current, source_record_count: event.target.value }))
              }
              step="1"
              type="number"
              value={snapshotForm.source_record_count}
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              onChange={(event) => setSnapshotForm((current) => ({ ...current, status: event.target.value }))}
              value={snapshotForm.status}
            >
              <option value="active">활성</option>
              <option value="superseded">대체됨</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingSnapshotId ? 'snapshot 수정' : 'snapshot 생성'}
            </button>
            <button className="button ghost" onClick={resetSnapshotForm} type="button">
              초기화
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">Snapshot List</p>
          <h2>일별 snapshot 목록</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">일별 snapshot을 불러오는 중입니다...</p>
        ) : snapshots.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>회사</th>
                <th>플릿</th>
                <th>배송원</th>
                <th>서비스 일자</th>
                <th>건수</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.daily_delivery_input_snapshot_id}
                  className={`interactive-row${
                    editingSnapshotId === snapshot.daily_delivery_input_snapshot_id ? ' is-selected' : ''
                  }`}
                  onClick={() => selectSnapshot(snapshot)}
                  onKeyDown={(event) => handleSnapshotRowKeyDown(event, snapshot)}
                  tabIndex={0}
                >
                  <td>{getCompanyName(companies, snapshot.company_id)}</td>
                  <td>{getFleetName(fleets, snapshot.fleet_id)}</td>
                  <td>{getDriverName(drivers, snapshot.driver_id)}</td>
                  <td>{snapshot.service_date}</td>
                  <td>{snapshot.delivery_count}</td>
                  <td>{formatDeliverySnapshotStatusLabel(snapshot.status)}</td>
                  <td>
                    <button
                      className="button ghost small"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleSnapshotDelete(snapshot.daily_delivery_input_snapshot_id);
                      }}
                      type="button"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">일별 snapshot이 없습니다.</p>
        )}
      </section>
    </div>
  );
}
