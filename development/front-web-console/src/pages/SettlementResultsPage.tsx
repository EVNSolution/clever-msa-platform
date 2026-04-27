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
  const { isLoading: isContextLoading, selectedCompanyId, selectedFleetId, showFleetSelector } = useSettlementFlow();
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
  const isScopeReady = Boolean(selectedCompanyId) && (!showFleetSelector || Boolean(selectedFleetId));

  function getScopeFilters() {
    return {
      ...(selectedCompanyId ? { company_id: selectedCompanyId } : {}),
      ...(selectedFleetId ? { fleet_id: selectedFleetId } : {}),
    };
  }

  function filterRunsByScope(runList: SettlementRun[]) {
    return runList.filter((run) => {
      if (selectedCompanyId && run.company_id !== selectedCompanyId) {
        return false;
      }
      if (selectedFleetId && run.fleet_id !== selectedFleetId) {
        return false;
      }
      return true;
    });
  }

  function filterDriversByScope(driverList: DriverProfile[]) {
    return driverList.filter((driver) => {
      if (selectedCompanyId && driver.company_id !== selectedCompanyId) {
        return false;
      }
      if (selectedFleetId && driver.fleet_id !== selectedFleetId) {
        return false;
      }
      return true;
    });
  }

  async function loadAll() {
    const scopeFilters = getScopeFilters();

    const [itemResponse, runResponse, driverResponse, companyResponse, fleetResponse] = await Promise.all([
      listSettlementItems(client, scopeFilters),
      listSettlementRuns(client, scopeFilters),
      listDrivers(client),
      listCompanies(client),
      listFleets(client),
    ]);

    setItems(itemResponse);
    setRuns(runResponse);
    setDrivers(driverResponse);
    setCompanies(companyResponse);
    setFleets(fleetResponse);
    const scopedRuns = filterRunsByScope(runResponse);
    const scopedDrivers = filterDriversByScope(driverResponse);
    setItemForm((current) => ({
      ...current,
      settlement_run_id:
        scopedRuns.find((run) => run.settlement_run_id === current.settlement_run_id)?.settlement_run_id ??
        scopedRuns[0]?.settlement_run_id ??
        '',
      driver_id:
        scopedDrivers.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
        scopedDrivers[0]?.driver_id ??
        '',
    }));
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
        const [itemResponse, runResponse, driverResponse, companyResponse, fleetResponse] = await Promise.all([
          listSettlementItems(client, scopeFilters),
          listSettlementRuns(client, scopeFilters),
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
        const scopedRuns = filterRunsByScope(runResponse);
        const scopedDrivers = filterDriversByScope(driverResponse);
        setItemForm((current) => ({
          ...current,
          settlement_run_id:
            scopedRuns.find((run) => run.settlement_run_id === current.settlement_run_id)?.settlement_run_id ??
            scopedRuns[0]?.settlement_run_id ??
            '',
          driver_id:
            scopedDrivers.find((driver) => driver.driver_id === current.driver_id)?.driver_id ??
            scopedDrivers[0]?.driver_id ??
            '',
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
  }, [client, isContextLoading, isScopeReady, selectedCompanyId, selectedFleetId]);

  function getRunLabel(runId: string) {
    const run = runs.find((entry) => entry.settlement_run_id === runId);
    if (!run) {
      return '미확인 실행';
    }
    return `${getCompanyName(companies, run.company_id)} / ${getFleetName(fleets, run.fleet_id)} / ${run.period_start}~${run.period_end}`;
  }

  function resetItemForm() {
    const scopedRuns = filterRunsByScope(runs);
    const scopedDrivers = filterDriversByScope(drivers);
    setEditingItemId(null);
    setItemForm({
      ...DEFAULT_ITEM_FORM,
      settlement_run_id: scopedRuns[0]?.settlement_run_id ?? '',
      driver_id: scopedDrivers[0]?.driver_id ?? '',
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

  const filteredRuns = filterRunsByScope(runs);
  const filteredDrivers = filterDriversByScope(drivers);
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
          <p className="panel-kicker">정산 결과</p>
          <h2>정산 결과 요약</h2>
        </div>
        <div className="summary-strip">
          <article className="summary-item">
            <span>Current Context</span>
            <strong>{currentContextLabel}</strong>
            <small>선택한 회사와 플릿 기준 결과만 보여줍니다.</small>
          </article>
          <article className="summary-item">
            <span>Settlement Run</span>
            <strong>{filteredRuns.length}</strong>
            <small>현재 문맥에서 확인 가능한 실행 수</small>
          </article>
          <article className="summary-item">
            <span>Settlement Item</span>
            <strong>{filteredItems.length}</strong>
            <small>기사별 지급 항목 수</small>
          </article>
          <article className="summary-item">
            <span>Total Amount</span>
            <strong>{totalAmount.toFixed(2)}</strong>
            <small>현재 문맥 기준 결과 합계</small>
          </article>
        </div>
        <div className="panel-toolbar">
          <span className="table-meta">실행이 끝난 결과를 확인하는 화면입니다. 수동 보정이 필요할 때만 결과 항목을 추가하거나 수정합니다.</span>
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
        <div className="panel-toolbar">
          <span className="table-meta">결과 항목은 실행별 기사 지급 상태를 보여주며, 필요한 경우에만 수동 보정합니다.</span>
          <div className="panel-toolbar-actions">
            <span className="table-meta">실행 {filteredRuns.length}건</span>
            <span className="table-meta">항목 {filteredItems.length}건</span>
            <span className="table-meta">총액 {totalAmount.toFixed(2)}</span>
          </div>
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
          <div className="summary-strip">
            <article className="summary-item">
              <span>현재 실행</span>
              <strong>{itemForm.settlement_run_id ? getRunLabel(itemForm.settlement_run_id) : '미선택'}</strong>
              <small>결과 항목이 귀속될 실행입니다.</small>
            </article>
            <article className="summary-item">
              <span>배송원</span>
              <strong>{itemForm.driver_id ? getDriverName(drivers, itemForm.driver_id) : '미선택'}</strong>
              <small>기사별 결과 항목으로 지급 상태를 관리합니다.</small>
            </article>
          </div>
          <label className="field">
            <span>정산 실행</span>
            <select
              onChange={(event) => setItemForm((current) => ({ ...current, settlement_run_id: event.target.value }))}
              value={itemForm.settlement_run_id}
            >
              {filteredRuns.map((run) => (
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
              {filteredDrivers.map((driver) => (
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
