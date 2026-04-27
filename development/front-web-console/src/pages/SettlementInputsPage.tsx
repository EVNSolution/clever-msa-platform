import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { listDrivers } from '../api/drivers';
import { FormModal } from '../components/FormModal';
import { useSettlementFlow } from '../components/SettlementFlowContext';
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
  dispatchBoardsPath?: string;
  settlementRunsPath?: string;
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

function isDispatchUploadRecord(record: DeliveryRecord) {
  return record.source_reference.startsWith('dispatch-upload-row:');
}

function getPayloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}

function getPayloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === 'number' ? value : 0;
}

export function SettlementInputsPage({
  client,
  dispatchBoardsPath = '/dispatch/boards',
  settlementRunsPath = '/settlements/runs',
}: SettlementInputsPageProps) {
  const {
    availableFleets,
    isLoading: isContextLoading,
    selectedCompanyId,
    selectedFleetId,
    showCompanySelector,
    showFleetSelector,
  } = useSettlementFlow();
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [snapshots, setSnapshots] = useState<DailyDeliveryInputSnapshot[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [recordForm, setRecordForm] = useState(DEFAULT_RECORD_FORM);
  const [snapshotForm, setSnapshotForm] = useState(DEFAULT_SNAPSHOT_FORM);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingSnapshotId, setEditingSnapshotId] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isScopeReady = Boolean(selectedCompanyId) && (!showFleetSelector || Boolean(selectedFleetId));

  function getScopeFilters() {
    return {
      ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
      ...(selectedFleetId ? { fleet_id: selectedFleetId } : {}),
    };
  }

  function getDriverOptions(companyId: string, fleetId: string) {
    return drivers.filter((driver) => driver.company_id === companyId && driver.fleet_id === fleetId);
  }

  function getScopedFleetOptions(fleetList: Fleet[], companyId: string) {
    return showCompanySelector ? getFleetOptions(fleetList, companyId) : availableFleets;
  }

  async function loadAll() {
    const scopeFilters = getScopeFilters();

    const [recordResponse, snapshotResponse, companyResponse, fleetResponse, driverResponse] = await Promise.all([
      listDeliveryRecords(client, scopeFilters),
      listDailyDeliveryInputSnapshots(client, scopeFilters),
      listCompanies(client),
      listFleets(client),
      listDrivers(client),
    ]);

    const nextRecords = Array.isArray(recordResponse) ? recordResponse : [];
    const nextSnapshots = Array.isArray(snapshotResponse) ? snapshotResponse : [];
    const nextCompanies = Array.isArray(companyResponse) ? companyResponse : [];
    const nextFleets = Array.isArray(fleetResponse) ? fleetResponse : [];
    const nextDrivers = Array.isArray(driverResponse) ? driverResponse : [];

    setRecords(nextRecords);
    setSnapshots(nextSnapshots);
    setCompanies(nextCompanies);
    setFleets(nextFleets);
    setDrivers(nextDrivers);

    setRecordForm((current) => {
      const nextCompanyId = current.company_id || nextCompanies[0]?.company_id || '';
      const fleetOptions = getScopedFleetOptions(nextFleets, nextCompanyId);
      const nextFleetId =
        (showFleetSelector
          ? fleetOptions.find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ?? fleetOptions[0]?.fleet_id
          : selectedFleetId) ??
        nextFleets[0]?.fleet_id ??
        '';
      const nextDriverId =
        nextDrivers.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
        getDriverOptionsFromList(nextDrivers, nextCompanyId, nextFleetId)[0]?.driver_id ??
        nextDrivers[0]?.driver_id ??
        '';

      return {
        ...current,
        company_id: showCompanySelector ? nextCompanyId : selectedCompanyId || nextCompanyId,
        fleet_id: nextFleetId,
        driver_id: nextDriverId,
      };
    });

    setSnapshotForm((current) => {
      const nextCompanyId = current.company_id || nextCompanies[0]?.company_id || '';
      const fleetOptions = getScopedFleetOptions(nextFleets, nextCompanyId);
      const nextFleetId =
        (showFleetSelector
          ? fleetOptions.find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ?? fleetOptions[0]?.fleet_id
          : selectedFleetId) ??
        nextFleets[0]?.fleet_id ??
        '';
      const nextDriverId =
        nextDrivers.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
        getDriverOptionsFromList(nextDrivers, nextCompanyId, nextFleetId)[0]?.driver_id ??
        nextDrivers[0]?.driver_id ??
        '';

      return {
        ...current,
        company_id: showCompanySelector ? nextCompanyId : selectedCompanyId || nextCompanyId,
        fleet_id: nextFleetId,
        driver_id: nextDriverId,
      };
    });
  }

  useEffect(() => {
    let ignore = false;

    if (isContextLoading || !isScopeReady) {
      setIsLoading(true);
      return () => {
        ignore = true;
      };
    }

    async function load() {
      const scopeFilters = getScopeFilters();

      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [recordResponse, snapshotResponse, companyResponse, fleetResponse, driverResponse] = await Promise.all([
          listDeliveryRecords(client, scopeFilters),
          listDailyDeliveryInputSnapshots(client, scopeFilters),
          listCompanies(client),
          listFleets(client),
          listDrivers(client),
        ]);

        if (ignore) {
          return;
        }

        const nextRecords = Array.isArray(recordResponse) ? recordResponse : [];
        const nextSnapshots = Array.isArray(snapshotResponse) ? snapshotResponse : [];
        const nextCompanies = Array.isArray(companyResponse) ? companyResponse : [];
        const nextFleets = Array.isArray(fleetResponse) ? fleetResponse : [];
        const nextDrivers = Array.isArray(driverResponse) ? driverResponse : [];

        setRecords(nextRecords);
        setSnapshots(nextSnapshots);
        setCompanies(nextCompanies);
        setFleets(nextFleets);
        setDrivers(nextDrivers);
        setRecordForm((current) => {
          const nextCompanyId = current.company_id || nextCompanies[0]?.company_id || '';
          const fleetOptions = getScopedFleetOptions(nextFleets, nextCompanyId);
          const nextFleetId =
            (showFleetSelector
              ? fleetOptions.find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ?? fleetOptions[0]?.fleet_id
              : selectedFleetId) ??
            nextFleets[0]?.fleet_id ??
            '';
          const nextDriverId =
            nextDrivers.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
            getDriverOptionsFromList(nextDrivers, nextCompanyId, nextFleetId)[0]?.driver_id ??
            nextDrivers[0]?.driver_id ??
            '';

          return {
            ...current,
            company_id: showCompanySelector ? nextCompanyId : selectedCompanyId || nextCompanyId,
            fleet_id: nextFleetId,
            driver_id: nextDriverId,
          };
        });
        setSnapshotForm((current) => {
          const nextCompanyId = current.company_id || nextCompanies[0]?.company_id || '';
          const fleetOptions = getScopedFleetOptions(nextFleets, nextCompanyId);
          const nextFleetId =
            (showFleetSelector
              ? fleetOptions.find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ?? fleetOptions[0]?.fleet_id
              : selectedFleetId) ??
            nextFleets[0]?.fleet_id ??
            '';
          const nextDriverId =
            nextDrivers.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
            getDriverOptionsFromList(nextDrivers, nextCompanyId, nextFleetId)[0]?.driver_id ??
            nextDrivers[0]?.driver_id ??
            '';

          return {
            ...current,
            company_id: showCompanySelector ? nextCompanyId : selectedCompanyId || nextCompanyId,
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
  }, [availableFleets, client, isContextLoading, isScopeReady, selectedCompanyId, selectedFleetId, showCompanySelector, showFleetSelector]);

  function getDriverOptionsFromList(driverList: DriverProfile[], companyId: string, fleetId: string) {
    return driverList.filter((driver) => driver.company_id === companyId && driver.fleet_id === fleetId);
  }

  function resetRecordForm() {
    const companyId = selectedCompanyId || companies[0]?.company_id || '';
    const fleetOptions = getScopedFleetOptions(fleets, companyId);
    const fleetId = (showFleetSelector ? selectedFleetId || fleetOptions[0]?.fleet_id : selectedFleetId) || fleets[0]?.fleet_id || '';
    setEditingRecordId(null);
    setRecordForm({
      ...DEFAULT_RECORD_FORM,
      company_id: companyId,
      fleet_id: fleetId,
      driver_id: getDriverOptions(companyId, fleetId)[0]?.driver_id ?? drivers[0]?.driver_id ?? '',
    });
  }

  function resetSnapshotForm() {
    const companyId = selectedCompanyId || companies[0]?.company_id || '';
    const fleetOptions = getScopedFleetOptions(fleets, companyId);
    const fleetId = (showFleetSelector ? selectedFleetId || fleetOptions[0]?.fleet_id : selectedFleetId) || fleets[0]?.fleet_id || '';
    setEditingSnapshotId(null);
    setSnapshotForm({
      ...DEFAULT_SNAPSHOT_FORM,
      company_id: companyId,
      fleet_id: fleetId,
      driver_id: getDriverOptions(companyId, fleetId)[0]?.driver_id ?? drivers[0]?.driver_id ?? '',
    });
  }

  function handleRecordCompanyChange(companyId: string) {
    const fleetId = getScopedFleetOptions(fleets, companyId)[0]?.fleet_id ?? '';
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
    const fleetId = getScopedFleetOptions(fleets, companyId)[0]?.fleet_id ?? '';
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
      setIsRecordModalOpen(false);
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
      setIsSnapshotModalOpen(false);
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
        setIsRecordModalOpen(false);
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
        setIsSnapshotModalOpen(false);
        resetSnapshotForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleActivateSnapshot(snapshotId: string) {
    setErrorMessage(null);
    try {
      await updateDailyDeliveryInputSnapshot(client, snapshotId, { status: 'active' });
      await loadAll();
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
    setIsRecordModalOpen(true);
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
    setIsSnapshotModalOpen(true);
  }

  function openCreateRecordModal() {
    resetRecordForm();
    setIsRecordModalOpen(true);
  }

  function closeRecordModal() {
    setIsRecordModalOpen(false);
    resetRecordForm();
  }

  function openCreateSnapshotModal() {
    resetSnapshotForm();
    setIsSnapshotModalOpen(true);
  }

  function closeSnapshotModal() {
    setIsSnapshotModalOpen(false);
    resetSnapshotForm();
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

  const filteredRecords = records.filter((record) => {
    if (selectedCompanyId && record.company_id !== selectedCompanyId) {
      return false;
    }
    if (selectedFleetId && record.fleet_id !== selectedFleetId) {
      return false;
    }
    return true;
  });

  const filteredSnapshots = snapshots.filter((snapshot) => {
    if (selectedCompanyId && snapshot.company_id !== selectedCompanyId) {
      return false;
    }
    if (selectedFleetId && snapshot.fleet_id !== selectedFleetId) {
      return false;
    }
    return true;
  });

  const confirmedRecordCount = filteredRecords.filter((record) => record.status === 'confirmed').length;
  const draftSnapshotCount = filteredSnapshots.filter((snapshot) => snapshot.status === 'draft').length;
  const activeSnapshotCount = filteredSnapshots.filter((snapshot) => snapshot.status === 'active').length;
  const readyDriverCount = new Set(filteredSnapshots.map((snapshot) => snapshot.driver_id)).size;
  const uploadDerivedRecords = filteredRecords.filter(isDispatchUploadRecord);
  const uploadDerivedBoxCount = uploadDerivedRecords.reduce((sum, record) => sum + record.delivery_count, 0);
  const uploadDerivedDriverCount = new Set(uploadDerivedRecords.map((record) => record.driver_id)).size;
  const uploadDerivedServiceDateCount = new Set(uploadDerivedRecords.map((record) => record.service_date)).size;

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 입력</p>
          <h2>정산 입력 요약</h2>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 입력을 불러오는 중입니다...</p>
        ) : (
          <>
            <div className="summary-strip">
              <article className="summary-item">
                <span>Confirmed Record</span>
                <strong>{confirmedRecordCount}</strong>
                <small>정산 실행으로 바로 넘길 수 있는 원천 입력</small>
              </article>
              <article className="summary-item">
                <span>Draft Snapshot</span>
                <strong>{draftSnapshotCount}</strong>
                <small>검토 중인 일별 입력 스냅샷</small>
              </article>
              <article className="summary-item">
                <span>Active Snapshot</span>
                <strong>{activeSnapshotCount}</strong>
                <small>실행 대상 일별 입력 스냅샷</small>
              </article>
              <article className="summary-item">
                <span>Target Drivers</span>
                <strong>{readyDriverCount}</strong>
                <small>현재 문맥에서 입력이 잡힌 배송원 수</small>
              </article>
            </div>
            <div className="panel-toolbar">
              <span className="table-meta">
                업로드 결과로 만들어진 정산 대상 snapshot을 먼저 검토하고, 필요한 예외만 수동 보정합니다.
              </span>
              <div className="panel-toolbar-actions">
                <span className="table-meta">record {filteredRecords.length}건</span>
                <span className="table-meta">snapshot {filteredSnapshots.length}건</span>
                <Link className="button ghost small" to={dispatchBoardsPath}>
                  배차 보드로 이동
                </Link>
                <Link className="button ghost small" to={settlementRunsPath}>
                  정산 실행으로 이동
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="panel-kicker">업로드 검토</p>
            <h2>업로드 기준 검토</h2>
          </div>
        </div>
        <div className="panel-toolbar">
          <span className="table-meta">
            배차표에서 확정된 row만 정산 대상 record로 취급합니다. 권역과 가구 수는 검토 참고값으로만 남기고,
            박스 수를 정산 기준으로 사용합니다.
          </span>
        </div>
        <div className="summary-strip">
          <article className="summary-item">
            <span>업로드 기반 record</span>
            <strong>{uploadDerivedRecords.length}</strong>
            <small>배차 업로드에서 넘어온 정산 대상 row</small>
          </article>
          <article className="summary-item">
            <span>총 박스 수</span>
            <strong>{uploadDerivedBoxCount}</strong>
            <small>정산 계산에 직접 쓰는 box 기준 수량</small>
          </article>
          <article className="summary-item">
            <span>대상 배송원</span>
            <strong>{uploadDerivedDriverCount}</strong>
            <small>업로드 row가 연결된 배송원 수</small>
          </article>
          <article className="summary-item">
            <span>서비스 일자</span>
            <strong>{uploadDerivedServiceDateCount}</strong>
            <small>현재 문맥에서 검토 중인 배차 일자 수</small>
          </article>
        </div>
        {uploadDerivedRecords.length ? (
          <div className="stack tight">
            {uploadDerivedRecords.map((record) => {
              const householdCount = getPayloadNumber(record.payload, 'household_count');
              const smallRegionText = getPayloadText(record.payload, 'small_region_text');
              const detailedRegionText = getPayloadText(record.payload, 'detailed_region_text');

              return (
                <div className="list-card" key={record.delivery_record_id}>
                  <div className="list-card-header">
                    <div>
                      <h3>{getDriverName(drivers, record.driver_id)}</h3>
                      <p>
                        {record.service_date} · 박스 {record.delivery_count}
                        {householdCount ? ` · 가구 ${householdCount}` : ''}
                      </p>
                    </div>
                    <span className="status-badge">{formatDeliveryRecordStatusLabel(record.status)}</span>
                  </div>
                  <div className="stack tight">
                    <p>
                      권역 {smallRegionText || '-'}
                      {detailedRegionText ? ` / ${detailedRegionText}` : ''}
                    </p>
                    <p>{record.source_reference}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">
            아직 업로드에서 만들어진 정산 대상이 없습니다. 배차 보드에서 배차표를 확정한 뒤 정산 입력으로 넘기세요.
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">수동 보정</p>
            <h2>배송 원천 입력 목록</h2>
          </div>
          <button className="button primary" onClick={openCreateRecordModal} type="button">
            원천 입력 생성
          </button>
        </div>
        <div className="panel-toolbar">
          <span className="table-meta">기본 입력은 업로드를 기준으로 하고, 필요한 예외만 여기서 수동 보정합니다.</span>
          <div className="panel-toolbar-actions">
            <span className="table-meta">확정 {confirmedRecordCount}건</span>
            <span className="table-meta">전체 {filteredRecords.length}건</span>
          </div>
        </div>
        {isLoading ? (
          <p className="empty-state">배송 원천 입력을 불러오는 중입니다...</p>
        ) : filteredRecords.length ? (
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
              {filteredRecords.map((record) => (
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
          <p className="empty-state">현재 문맥에 배송 원천 입력이 없습니다.</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">수동 보정</p>
            <h2>일별 입력 스냅샷</h2>
          </div>
          <button className="button primary" onClick={openCreateSnapshotModal} type="button">
            스냅샷 생성
          </button>
        </div>
        <div className="panel-toolbar">
          <span className="table-meta">정산 실행으로 넘길 수 있는 일별 입력 묶음입니다. draft는 검토 중, active만 실행 대상으로 봅니다.</span>
          <div className="panel-toolbar-actions">
            <span className="table-meta">draft {draftSnapshotCount}건</span>
            <span className="table-meta">active {activeSnapshotCount}건</span>
          </div>
        </div>
        {isLoading ? (
          <p className="empty-state">일별 스냅샷을 불러오는 중입니다...</p>
        ) : filteredSnapshots.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>회사</th>
                <th>플릿</th>
                <th>배송원</th>
                <th>서비스 일자</th>
                <th>record 수</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredSnapshots.map((snapshot) => (
                <tr
                  key={snapshot.daily_delivery_input_snapshot_id}
                  className={`interactive-row${editingSnapshotId === snapshot.daily_delivery_input_snapshot_id ? ' is-selected' : ''}`}
                  onClick={() => selectSnapshot(snapshot)}
                  onKeyDown={(event) => handleSnapshotRowKeyDown(event, snapshot)}
                  tabIndex={0}
                >
                  <td>{getCompanyName(companies, snapshot.company_id)}</td>
                  <td>{getFleetName(fleets, snapshot.fleet_id)}</td>
                  <td>{getDriverName(drivers, snapshot.driver_id)}</td>
                  <td>{snapshot.service_date}</td>
                  <td>{snapshot.source_record_count}</td>
                  <td>{formatDeliverySnapshotStatusLabel(snapshot.status)}</td>
                  <td>
                    <div className="inline-actions">
                      {snapshot.status === 'draft' ? (
                        <button
                          className="button ghost small"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleActivateSnapshot(snapshot.daily_delivery_input_snapshot_id);
                          }}
                          type="button"
                        >
                          활성화
                        </button>
                      ) : null}
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-state">현재 문맥에 일별 입력 스냅샷이 없습니다.</p>
        )}
      </section>

      <FormModal
        isOpen={isRecordModalOpen}
        kicker="Delivery Record"
        onClose={closeRecordModal}
        title={editingRecordId ? '배송 원천 입력 수정' : '배송 원천 입력 생성'}
      >
        <form className="form-stack" onSubmit={handleRecordSubmit}>
          {showCompanySelector ? (
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
          ) : null}
          {showFleetSelector ? (
            <label className="field">
              <span>플릿</span>
              <select onChange={(event) => handleRecordFleetChange(event.target.value)} value={recordForm.fleet_id}>
                {getScopedFleetOptions(fleets, recordForm.company_id).map((fleet) => (
                  <option key={fleet.fleet_id} value={fleet.fleet_id}>
                    {fleet.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
            <button className="button ghost" onClick={closeRecordModal} type="button">
              취소
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        isOpen={isSnapshotModalOpen}
        kicker="Daily Snapshot"
        onClose={closeSnapshotModal}
        title={editingSnapshotId ? '일별 snapshot 수정' : '일별 snapshot 생성'}
      >
        <form className="form-stack" onSubmit={handleSnapshotSubmit}>
          {showCompanySelector ? (
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
          ) : null}
          {showFleetSelector ? (
            <label className="field">
              <span>플릿</span>
              <select
                onChange={(event) => handleSnapshotFleetChange(event.target.value)}
                value={snapshotForm.fleet_id}
              >
                {getScopedFleetOptions(fleets, snapshotForm.company_id).map((fleet) => (
                  <option key={fleet.fleet_id} value={fleet.fleet_id}>
                    {fleet.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
            <button className="button ghost" onClick={closeSnapshotModal} type="button">
              취소
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
