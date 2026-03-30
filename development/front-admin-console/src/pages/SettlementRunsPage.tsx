import { useEffect, useState, type FormEvent } from 'react';

import {
  createSettlementRun,
  deleteSettlementRun,
  listSettlementRuns,
  updateSettlementRun,
  type SettlementRunPayload,
} from '../api/settlements';
import { FormModal } from '../components/FormModal';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import type { Company, Fleet, SettlementRun } from '../types';
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
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [runForm, setRunForm] = useState<SettlementRunPayload>(DEFAULT_RUN_FORM);
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadAll() {
    const [runResponse, companyResponse, fleetResponse] = await Promise.all([
      listSettlementRuns(client),
      listCompanies(client),
      listFleets(client),
    ]);

    setRuns(runResponse);
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
        const [runResponse, companyResponse, fleetResponse] = await Promise.all([
          listSettlementRuns(client),
          listCompanies(client),
          listFleets(client),
        ]);
        if (ignore) {
          return;
        }
        setRuns(runResponse);
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
    const companyId = companies[0]?.company_id ?? '';
    setEditingRunId(null);
    setRunForm({
      ...DEFAULT_RUN_FORM,
      company_id: companyId,
      fleet_id: getFleetOptions(fleets, companyId)[0]?.fleet_id ?? fleets[0]?.fleet_id ?? '',
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

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

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
        {isLoading ? (
          <p className="empty-state">정산 실행을 불러오는 중입니다...</p>
        ) : runs.length ? (
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
              {runs.map((run) => (
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
          <p className="empty-state">정산 실행이 없습니다.</p>
        )}
      </section>

      <FormModal
        isOpen={isRunModalOpen}
        kicker="정산 실행"
        onClose={closeRunModal}
        title={editingRunId ? '정산 실행 수정' : '정산 실행 생성'}
      >
        <form className="form-stack" onSubmit={handleRunSubmit}>
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
