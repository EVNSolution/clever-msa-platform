import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import {
  listDailyDeliveryInputSnapshots,
  listDeliveryRecords,
} from '../api/deliveryRecords';
import {
  createSettlementRun,
  deleteSettlementRun,
  listSettlementRuns,
  updateSettlementRun,
  type SettlementRunPayload,
} from '../api/settlements';
import { FormModal } from '../components/FormModal';
import { useSettlementFlow } from '../components/SettlementFlowContext';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import type { Company, DailyDeliveryInputSnapshot, DeliveryRecord, Fleet, SettlementRun } from '../types';
import { formatSettlementStatusLabel } from '../uiLabels';
import { getCompanyName, getFleetName, getFleetOptions } from './settlementAdminHelpers';

type SettlementRunsPageProps = {
  client: HttpClient;
};

const DEFAULT_RUN_FORM: SettlementRunPayload = {
  company_id: '',
  fleet_id: '',
  period_start: '2026-03-01',
  period_end: '2026-03-31',
  status: 'draft',
};

export function SettlementRunsPage({ client }: SettlementRunsPageProps) {
  const { selectedCompanyId, selectedFleetId } = useSettlementFlow();
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [records, setRecords] = useState<DeliveryRecord[]>([]);
  const [snapshots, setSnapshots] = useState<DailyDeliveryInputSnapshot[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [runForm, setRunForm] = useState<SettlementRunPayload>(DEFAULT_RUN_FORM);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadAll() {
    const [runResponse, recordResponse, snapshotResponse, companyResponse, fleetResponse] = await Promise.all([
      listSettlementRuns(client),
      listDeliveryRecords(client),
      listDailyDeliveryInputSnapshots(client),
      listCompanies(client),
      listFleets(client),
    ]);

    setRuns(runResponse);
    setRecords(recordResponse);
    setSnapshots(snapshotResponse);
    setCompanies(companyResponse);
    setFleets(fleetResponse);

    setRunForm((current) => {
      const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
      const nextFleetId =
        getFleetOptions(fleetResponse, nextCompanyId).find((fleet) => fleet.fleet_id === current.fleet_id)
          ?.fleet_id ??
        getFleetOptions(fleetResponse, nextCompanyId)[0]?.fleet_id ??
        fleetResponse[0]?.fleet_id ??
        '';

      return {
        ...current,
        company_id: nextCompanyId,
        fleet_id: nextFleetId,
      };
    });
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [runResponse, recordResponse, snapshotResponse, companyResponse, fleetResponse] = await Promise.all([
          listSettlementRuns(client),
          listDeliveryRecords(client),
          listDailyDeliveryInputSnapshots(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setRuns(runResponse);
        setRecords(recordResponse);
        setSnapshots(snapshotResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setRunForm((current) => {
          const nextCompanyId = current.company_id || companyResponse[0]?.company_id || '';
          const nextFleetId =
            getFleetOptions(fleetResponse, nextCompanyId).find((fleet) => fleet.fleet_id === current.fleet_id)
              ?.fleet_id ??
            getFleetOptions(fleetResponse, nextCompanyId)[0]?.fleet_id ??
            fleetResponse[0]?.fleet_id ??
            '';

          return {
            ...current,
            company_id: nextCompanyId,
            fleet_id: nextFleetId,
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

  function resetRunForm() {
    const companyId = selectedCompanyId || companies[0]?.company_id || '';
    setEditingRunId(null);
    setRunForm({
      ...DEFAULT_RUN_FORM,
      company_id: companyId,
      fleet_id:
        selectedFleetId ||
        getFleetOptions(fleets, companyId)[0]?.fleet_id ||
        fleets[0]?.fleet_id ||
        '',
    });
  }

  function handleRunCompanyChange(companyId: string) {
    setRunForm((current) => ({
      ...current,
      company_id: companyId,
      fleet_id:
        getFleetOptions(fleets, companyId).find((fleet) => fleet.fleet_id === current.fleet_id)?.fleet_id ??
        getFleetOptions(fleets, companyId)[0]?.fleet_id ??
        '',
    }));
  }

  async function handleRunSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (editingRunId) {
        await updateSettlementRun(client, editingRunId, runForm);
      } else {
        await createSettlementRun(client, runForm);
      }
      await loadAll();
      setIsRunModalOpen(false);
      resetRunForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDelete(runId: string) {
    setErrorMessage(null);
    try {
      await deleteSettlementRun(client, runId);
      await loadAll();
      if (editingRunId === runId) {
        setIsRunModalOpen(false);
        resetRunForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function selectRun(run: SettlementRun) {
    setEditingRunId(run.settlement_run_id);
    setRunForm({
      company_id: run.company_id,
      fleet_id: run.fleet_id,
      period_start: run.period_start,
      period_end: run.period_end,
      status: run.status,
    });
    setIsRunModalOpen(true);
  }

  function openCreateRunModal() {
    resetRunForm();
    setIsRunModalOpen(true);
  }

  function closeRunModal() {
    setIsRunModalOpen(false);
    resetRunForm();
  }

  function handleRunRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, run: SettlementRun) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectRun(run);
  }

  const filteredRuns = runs.filter((run) => {
    if (selectedCompanyId && run.company_id !== selectedCompanyId) {
      return false;
    }
    if (selectedFleetId && run.fleet_id !== selectedFleetId) {
      return false;
    }
    return true;
  });

  const confirmedRecordCount = records.filter((record) => {
    if (record.status !== 'confirmed') {
      return false;
    }
    if (selectedCompanyId && record.company_id !== selectedCompanyId) {
      return false;
    }
    if (selectedFleetId && record.fleet_id !== selectedFleetId) {
      return false;
    }
    return true;
  }).length;

  const activeSnapshotCount = snapshots.filter((snapshot) => {
    if (snapshot.status !== 'active') {
      return false;
    }
    if (selectedCompanyId && snapshot.company_id !== selectedCompanyId) {
      return false;
    }
    if (selectedFleetId && snapshot.fleet_id !== selectedFleetId) {
      return false;
    }
    return true;
  }).length;
  const draftSnapshotCount = snapshots.filter((snapshot) => {
    if (snapshot.status !== 'draft') {
      return false;
    }
    if (selectedCompanyId && snapshot.company_id !== selectedCompanyId) {
      return false;
    }
    if (selectedFleetId && snapshot.fleet_id !== selectedFleetId) {
      return false;
    }
    return true;
  }).length;

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">정산 실행</p>
          <h2>정산 실행 요약</h2>
        </div>
        <div className="summary-strip">
          <article className="summary-item">
            <span>Confirmed Record</span>
            <strong>{confirmedRecordCount}</strong>
            <small>실행 기준이 되는 확정 원천 입력</small>
          </article>
          <article className="summary-item">
            <span>Active Snapshot</span>
            <strong>{activeSnapshotCount}</strong>
            <small>현재 문맥에서 실행 가능한 입력 묶음</small>
          </article>
          <article className="summary-item">
            <span>Draft Snapshot</span>
            <strong>{draftSnapshotCount}</strong>
            <small>검토 중이어서 실행에 포함되지 않는 입력</small>
          </article>
          <article className="summary-item">
            <span>Settlement Run</span>
            <strong>{filteredRuns.length}</strong>
            <small>현재 문맥에 생성된 정산 실행 수</small>
          </article>
        </div>
        <div className="panel-toolbar">
          <span className="table-meta">활성 snapshot을 기준으로 정산 실행을 만들고, 이후 결과 단계에서 기사별 지급 항목을 확인합니다.</span>
          <div className="panel-toolbar-actions">
            <Link className="button ghost small" to="/settlements/results">
              정산 결과로 이동
            </Link>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">현재 실행</p>
            <h2>정산 실행 목록</h2>
          </div>
          <button className="button primary" onClick={openCreateRunModal} type="button">
            정산 실행 생성
          </button>
        </div>
        <div className="panel-toolbar">
          <span className="table-meta">
            현재 문맥에서 입력 스냅샷을 기준으로 실행을 만들고, 이후 결과 단계에서 기사별 항목으로 넘깁니다.
          </span>
          <div className="panel-toolbar-actions">
            <span className="table-meta">draft snapshot {draftSnapshotCount}건</span>
            <span className="table-meta">확정 record {confirmedRecordCount}건</span>
            <span className="table-meta">활성 snapshot {activeSnapshotCount}건</span>
          </div>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 실행을 불러오는 중입니다...</p>
        ) : filteredRuns.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>회사</th>
                <th>플릿</th>
                <th>기간</th>
                <th>상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr
                  key={run.settlement_run_id}
                  className={`interactive-row${editingRunId === run.settlement_run_id ? ' is-selected' : ''}`}
                  onClick={() => selectRun(run)}
                  onKeyDown={(event) => handleRunRowKeyDown(event, run)}
                  tabIndex={0}
                >
                  <td>{getCompanyName(companies, run.company_id)}</td>
                  <td>{getFleetName(fleets, run.fleet_id)}</td>
                  <td>
                    {run.period_start} ~ {run.period_end}
                  </td>
                  <td>{formatSettlementStatusLabel(run.status)}</td>
                  <td>
                    <button
                      className="button ghost small"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(run.settlement_run_id);
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
          <p className="empty-state">현재 문맥에 정산 실행이 없습니다.</p>
        )}
      </section>

      <FormModal
        isOpen={isRunModalOpen}
        kicker="정산 실행"
        onClose={closeRunModal}
        title={editingRunId ? '정산 실행 수정' : '정산 실행 생성'}
      >
        <form className="form-stack" onSubmit={handleRunSubmit}>
          <div className="summary-strip">
            <article className="summary-item">
              <span>회사</span>
              <strong>{getCompanyName(companies, runForm.company_id)}</strong>
              <small>정산 실행이 귀속될 회사 문맥입니다.</small>
            </article>
            <article className="summary-item">
              <span>플릿</span>
              <strong>{getFleetName(fleets, runForm.fleet_id)}</strong>
              <small>선택한 플릿 기준으로 입력과 결과가 이어집니다.</small>
            </article>
          </div>
          <label className="field">
            <span>회사</span>
            <select onChange={(event) => handleRunCompanyChange(event.target.value)} value={runForm.company_id}>
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
              onChange={(event) => setRunForm((current) => ({ ...current, fleet_id: event.target.value }))}
              value={runForm.fleet_id}
            >
              {getFleetOptions(fleets, runForm.company_id).map((fleet) => (
                <option key={fleet.fleet_id} value={fleet.fleet_id}>
                  {fleet.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>시작일</span>
            <input
              onChange={(event) => setRunForm((current) => ({ ...current, period_start: event.target.value }))}
              type="date"
              value={runForm.period_start}
            />
          </label>
          <label className="field">
            <span>종료일</span>
            <input
              onChange={(event) => setRunForm((current) => ({ ...current, period_end: event.target.value }))}
              type="date"
              value={runForm.period_end}
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              onChange={(event) => setRunForm((current) => ({ ...current, status: event.target.value }))}
              value={runForm.status}
            >
              <option value="draft">초안</option>
              <option value="calculated">계산 완료</option>
              <option value="reviewed">검토 완료</option>
              <option value="approved">승인됨</option>
              <option value="paid">지급됨</option>
              <option value="closed">마감</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingRunId ? '정산 실행 수정' : '정산 실행 생성'}
            </button>
            <button className="button ghost" onClick={closeRunModal} type="button">
              취소
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
