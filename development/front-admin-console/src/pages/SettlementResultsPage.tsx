import { useEffect, useState, type FormEvent } from 'react';

import { listDrivers } from '../api/drivers';
import { FormModal } from '../components/FormModal';
import { useSettlementFlow } from '../components/SettlementFlowContext';
import { getErrorMessage, type HttpClient } from '../api/http';
import { listCompanies, listFleets } from '../api/organization';
import {
  createSettlementItem,
  deleteSettlementItem,
  listSettlementItems,
  listSettlementRuns,
  updateSettlementItem,
  type SettlementItemPayload,
} from '../api/settlements';
import type { Company, DriverProfile, Fleet, SettlementItem, SettlementRun } from '../types';
import { formatPayoutStatusLabel } from '../uiLabels';
import { getCompanyName, getDriverName, getFleetName } from './settlementAdminHelpers';

type SettlementResultsPageProps = {
  client: HttpClient;
};

const DEFAULT_ITEM_FORM: SettlementItemPayload = {
  settlement_run_id: '',
  driver_id: '',
  amount: '0.00',
  payout_status: 'pending',
};

export function SettlementResultsPage({ client }: SettlementResultsPageProps) {
  const { selectedCompanyId, selectedFleetId } = useSettlementFlow();
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [itemForm, setItemForm] = useState<SettlementItemPayload>(DEFAULT_ITEM_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadAll() {
    const [itemResponse, runResponse, driverResponse, companyResponse, fleetResponse] = await Promise.all([
      listSettlementItems(client),
      listSettlementRuns(client),
      listDrivers(client),
      listCompanies(client),
      listFleets(client),
    ]);

    setItems(itemResponse);
    setRuns(runResponse);
    setDrivers(driverResponse);
    setCompanies(companyResponse);
    setFleets(fleetResponse);
    setItemForm((current) => ({
      ...current,
      settlement_run_id: current.settlement_run_id || runResponse[0]?.settlement_run_id || '',
      driver_id: current.driver_id || driverResponse[0]?.driver_id || '',
    }));
  }

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [itemResponse, runResponse, driverResponse, companyResponse, fleetResponse] = await Promise.all([
          listSettlementItems(client),
          listSettlementRuns(client),
          listDrivers(client),
          listCompanies(client),
          listFleets(client),
        ]);

        if (ignore) {
          return;
        }

        setItems(itemResponse);
        setRuns(runResponse);
        setDrivers(driverResponse);
        setCompanies(companyResponse);
        setFleets(fleetResponse);
        setItemForm((current) => ({
          ...current,
          settlement_run_id: current.settlement_run_id || runResponse[0]?.settlement_run_id || '',
          driver_id: current.driver_id || driverResponse[0]?.driver_id || '',
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
  }, [client]);

  function getRunLabel(runId: string) {
    const run = runs.find((entry) => entry.settlement_run_id === runId);
    if (!run) {
      return '미확인 실행';
    }
    return `${getCompanyName(companies, run.company_id)} / ${getFleetName(fleets, run.fleet_id)} / ${run.period_start}~${run.period_end}`;
  }

  function resetItemForm() {
    setEditingItemId(null);
    setItemForm({
      ...DEFAULT_ITEM_FORM,
      settlement_run_id: runs[0]?.settlement_run_id ?? '',
      driver_id: drivers[0]?.driver_id ?? '',
    });
  }

  async function handleItemSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      if (editingItemId) {
        await updateSettlementItem(client, editingItemId, itemForm);
      } else {
        await createSettlementItem(client, itemForm);
      }
      await loadAll();
      setIsItemModalOpen(false);
      resetItemForm();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDelete(itemId: string) {
    setErrorMessage(null);
    try {
      await deleteSettlementItem(client, itemId);
      await loadAll();
      if (editingItemId === itemId) {
        setIsItemModalOpen(false);
        resetItemForm();
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  function selectItem(item: SettlementItem) {
    setEditingItemId(item.settlement_item_id);
    setItemForm({
      settlement_run_id: item.settlement_run_id,
      driver_id: item.driver_id,
      amount: item.amount,
      payout_status: item.payout_status,
    });
    setIsItemModalOpen(true);
  }

  function openCreateItemModal() {
    resetItemForm();
    setIsItemModalOpen(true);
  }

  function closeItemModal() {
    setIsItemModalOpen(false);
    resetItemForm();
  }

  function handleItemRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, item: SettlementItem) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    selectItem(item);
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
  const filteredRunIds = new Set(filteredRuns.map((run) => run.settlement_run_id));
  const filteredItems = items.filter((item) => filteredRunIds.has(item.settlement_run_id));
  const totalAmount = filteredItems.reduce((sum, item) => sum + Number.parseFloat(item.amount), 0);
  const currentContextLabel =
    selectedCompanyId && selectedFleetId
      ? `${getCompanyName(companies, selectedCompanyId)} / ${getFleetName(fleets, selectedFleetId)}`
      : '문맥 미선택';

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      <section className="panel">
        <div className="panel-header">
          <p className="panel-kicker">결과 handoff</p>
          <h2>결과 요약</h2>
          <p className="empty-state">실행이 끝난 뒤에는 현재 문맥 기준 결과만 확인합니다.</p>
        </div>
        <div className="settlement-flow-shell">
          <article className="shell-card">
            <strong>현재 문맥</strong>
            <span>{currentContextLabel}</span>
            <dl className="shell-metric-list">
              <div>
                <dt>정산 실행</dt>
                <dd>{filteredRuns.length}</dd>
              </div>
              <div>
                <dt>정산 항목</dt>
                <dd>{filteredItems.length}</dd>
              </div>
              <div>
                <dt>총 금액</dt>
                <dd>{totalAmount.toFixed(2)}</dd>
              </div>
            </dl>
          </article>
          <article className="shell-card">
            <strong>예외 보정</strong>
            <span>결과 수정이 필요할 때만 항목 생성/수정을 사용합니다.</span>
            <div className="inline-actions">
              <button className="button primary" onClick={openCreateItemModal} type="button">
                정산 항목 생성
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header panel-header-inline">
          <div className="stack">
            <p className="panel-kicker">현재 항목</p>
            <h2>정산 결과 목록</h2>
          </div>
          <button className="button primary" onClick={openCreateItemModal} type="button">
            정산 항목 생성
          </button>
        </div>
        {isLoading ? (
          <p className="empty-state">정산 항목을 불러오는 중입니다...</p>
        ) : filteredItems.length ? (
          <table className="table compact">
            <thead>
              <tr>
                <th>정산 실행</th>
                <th>대상</th>
                <th>금액</th>
                <th>지급 상태</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr
                  key={item.settlement_item_id}
                  className={`interactive-row${editingItemId === item.settlement_item_id ? ' is-selected' : ''}`}
                  onClick={() => selectItem(item)}
                  onKeyDown={(event) => handleItemRowKeyDown(event, item)}
                  tabIndex={0}
                >
                  <td>{getRunLabel(item.settlement_run_id)}</td>
                  <td>{getDriverName(drivers, item.driver_id)}</td>
                  <td>{item.amount}</td>
                  <td>{formatPayoutStatusLabel(item.payout_status)}</td>
                  <td>
                    <button
                      className="button ghost small"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(item.settlement_item_id);
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
          <p className="empty-state">현재 문맥에 정산 항목이 없습니다.</p>
        )}
      </section>

      <FormModal
        isOpen={isItemModalOpen}
        kicker="정산 결과"
        onClose={closeItemModal}
        title={editingItemId ? '정산 항목 수정' : '정산 항목 생성'}
      >
        <form className="form-stack" onSubmit={handleItemSubmit}>
          <label className="field">
            <span>정산 실행</span>
            <select
              onChange={(event) => setItemForm((current) => ({ ...current, settlement_run_id: event.target.value }))}
              value={itemForm.settlement_run_id}
            >
              {runs.map((run) => (
                <option key={run.settlement_run_id} value={run.settlement_run_id}>
                  {getRunLabel(run.settlement_run_id)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>배송원</span>
            <select
              onChange={(event) => setItemForm((current) => ({ ...current, driver_id: event.target.value }))}
              value={itemForm.driver_id}
            >
              {drivers.map((driver) => (
                <option key={driver.driver_id} value={driver.driver_id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>금액</span>
            <input
              onChange={(event) => setItemForm((current) => ({ ...current, amount: event.target.value }))}
              value={itemForm.amount}
            />
          </label>
          <label className="field">
            <span>지급 상태</span>
            <select
              onChange={(event) => setItemForm((current) => ({ ...current, payout_status: event.target.value }))}
              value={itemForm.payout_status}
            >
              <option value="pending">대기</option>
              <option value="paid">지급 완료</option>
            </select>
          </label>
          <div className="form-actions">
            <button className="button primary" type="submit">
              {editingItemId ? '정산 항목 수정' : '정산 항목 생성'}
            </button>
            <button className="button ghost" onClick={closeItemModal} type="button">
              취소
            </button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
