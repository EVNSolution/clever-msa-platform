import { useEffect, useState, type FormEvent } from 'react';

import {
  createSettlementItem,
  createSettlementRun,
  deleteSettlementItem,
  deleteSettlementRun,
  listSettlementItems,
  listSettlementRuns,
  updateSettlementItem,
  updateSettlementRun,
  type SettlementItemPayload,
  type SettlementRunPayload,
} from '../api/settlements';
import { getErrorMessage, type HttpClient } from '../api/http';
import type { SettlementItem, SettlementRun } from '../types';
import {
  formatPayoutStatusLabel,
  formatProtectedIdentifier,
  formatSettlementStatusLabel,
} from '../uiLabels';

type SettlementsPageProps = {
  client: HttpClient;
};

export function SettlementsPage({ client }: SettlementsPageProps) {
  const [runs, setRuns] = useState<SettlementRun[]>([]);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [runForm, setRunForm] = useState<SettlementRunPayload>({
    company_id: '',
    fleet_id: '',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    status: 'draft',
  });
  const [itemForm, setItemForm] = useState<SettlementItemPayload>({
    settlement_run_id: '',
    driver_id: '',
    amount: '0.00',
    payout_status: 'pending',
  });
  const [editingRunId, setEditingRunId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [runResponse, itemResponse] = await Promise.all([
          listSettlementRuns(client),
          listSettlementItems(client),
        ]);
        if (ignore) {
          return;
        }
        setRuns(runResponse);
        setItems(itemResponse);
        setItemForm((current) => ({
          ...current,
          settlement_run_id: current.settlement_run_id || runResponse[0]?.settlement_run_id || '',
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

  async function refreshAll() {
    const [runResponse, itemResponse] = await Promise.all([
      listSettlementRuns(client),
      listSettlementItems(client),
    ]);
    setRuns(runResponse);
    setItems(itemResponse);
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
      await refreshAll();
      setEditingRunId(null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
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
      await refreshAll();
      setEditingItemId(null);
      setItemForm((current) => ({ ...current, driver_id: '', amount: '0.00', payout_status: 'pending' }));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  async function handleDelete(kind: 'run' | 'item', id: string) {
    setErrorMessage(null);
    try {
      if (kind === 'run') {
        await deleteSettlementRun(client, id);
      } else {
        await deleteSettlementItem(client, id);
      }
      await refreshAll();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }

  return (
    <div className="stack large-gap">
      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      <div className="data-grid two-columns">
        <section className="panel">
          <div className="panel-header"><p className="panel-kicker">정산 실행</p><h2>{editingRunId ? '정산 실행 수정' : '정산 실행 생성'}</h2></div>
          <form className="form-grid" onSubmit={handleRunSubmit}>
            <label className="field"><span>회사 ID</span><input onChange={(event) => setRunForm((current) => ({ ...current, company_id: event.target.value }))} value={runForm.company_id} /></label>
            <label className="field"><span>플릿 ID</span><input onChange={(event) => setRunForm((current) => ({ ...current, fleet_id: event.target.value }))} value={runForm.fleet_id} /></label>
            <label className="field"><span>시작일</span><input onChange={(event) => setRunForm((current) => ({ ...current, period_start: event.target.value }))} type="date" value={runForm.period_start} /></label>
            <label className="field"><span>종료일</span><input onChange={(event) => setRunForm((current) => ({ ...current, period_end: event.target.value }))} type="date" value={runForm.period_end} /></label>
            <label className="field"><span>상태</span><select onChange={(event) => setRunForm((current) => ({ ...current, status: event.target.value }))} value={runForm.status}><option value="draft">초안</option><option value="closed">마감</option></select></label>
            <div className="form-actions"><button className="button primary" type="submit">{editingRunId ? '정산 실행 수정' : '정산 실행 생성'}</button></div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header"><p className="panel-kicker">정산 항목</p><h2>{editingItemId ? '정산 항목 수정' : '정산 항목 생성'}</h2></div>
          <form className="form-grid" onSubmit={handleItemSubmit}>
            <label className="field"><span>정산 실행</span><select onChange={(event) => setItemForm((current) => ({ ...current, settlement_run_id: event.target.value }))} value={itemForm.settlement_run_id}>{runs.map((run) => <option key={run.settlement_run_id} value={run.settlement_run_id}>{formatProtectedIdentifier(run.settlement_run_id)}</option>)}</select></label>
            <label className="field"><span>배송원 ID</span><input onChange={(event) => setItemForm((current) => ({ ...current, driver_id: event.target.value }))} value={itemForm.driver_id} /></label>
            <label className="field"><span>금액</span><input onChange={(event) => setItemForm((current) => ({ ...current, amount: event.target.value }))} value={itemForm.amount} /></label>
            <label className="field"><span>지급 상태</span><select onChange={(event) => setItemForm((current) => ({ ...current, payout_status: event.target.value }))} value={itemForm.payout_status}><option value="pending">대기</option><option value="paid">지급 완료</option></select></label>
            <div className="form-actions"><button className="button primary" type="submit">{editingItemId ? '정산 항목 수정' : '정산 항목 생성'}</button></div>
          </form>
        </section>
      </div>

      <div className="data-grid two-columns">
        <section className="panel">
          <div className="panel-header"><p className="panel-kicker">현재 실행</p><h2>관리자 쓰기 화면</h2></div>
          {isLoading ? <p className="empty-state">정산 실행을 불러오는 중입니다...</p> : (
            <table className="table compact"><tbody>{runs.map((run) => (
              <tr key={run.settlement_run_id}>
                <td><code>{formatProtectedIdentifier(run.settlement_run_id)}</code></td>
                <td>{formatSettlementStatusLabel(run.status)}</td>
                <td><button className="button ghost small" onClick={() => { setEditingRunId(run.settlement_run_id); setRunForm({ company_id: run.company_id, fleet_id: run.fleet_id, period_start: run.period_start, period_end: run.period_end, status: run.status }); }} type="button">수정</button></td>
                <td><button className="button ghost small" onClick={() => void handleDelete('run', run.settlement_run_id)} type="button">삭제</button></td>
              </tr>
            ))}</tbody></table>
          )}
        </section>

        <section className="panel">
          <div className="panel-header"><p className="panel-kicker">현재 항목</p><h2>정산 항목 목록</h2></div>
          {isLoading ? <p className="empty-state">정산 항목을 불러오는 중입니다...</p> : (
            <table className="table compact"><tbody>{items.map((item) => (
              <tr key={item.settlement_item_id}>
                <td><code>{formatProtectedIdentifier(item.settlement_item_id)}</code></td>
                <td>{item.amount}</td>
                <td>{formatPayoutStatusLabel(item.payout_status)}</td>
                <td><button className="button ghost small" onClick={() => { setEditingItemId(item.settlement_item_id); setItemForm({ settlement_run_id: item.settlement_run_id, driver_id: item.driver_id, amount: item.amount, payout_status: item.payout_status }); }} type="button">수정</button></td>
                <td><button className="button ghost small" onClick={() => void handleDelete('item', item.settlement_item_id)} type="button">삭제</button></td>
              </tr>
            ))}</tbody></table>
          )}
        </section>
      </div>
    </div>
  );
}
